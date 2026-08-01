const {
  SlashCommandBuilder, EmbedBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const config      = require('../../config');
const Application = require('../../models/Application');
const TeamMember  = require('../../models/TeamMember');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bewerbung')
    .setDescription('📝 Bewerbungs-System')
    .addSubcommand(sub =>
      sub.setName('senden')
        .setDescription('📝 Bewerbung einreichen')
        .addStringOption(o => o.setName('position').setDescription('Beworbene Position').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('annehmen')
        .setDescription('✅ Bewerbung annehmen')
        .addStringOption(o => o.setName('user_id').setDescription('User-ID des Bewerbers').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Begründung').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('ablehnen')
        .setDescription('❌ Bewerbung ablehnen')
        .addStringOption(o => o.setName('user_id').setDescription('User-ID des Bewerbers').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Begründung').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('warteliste')
        .setDescription('⏳ Bewerber auf Warteliste setzen')
        .addStringOption(o => o.setName('user_id').setDescription('User-ID des Bewerbers').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Begründung').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('📋 Offene Bewerbungen anzeigen')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'senden') {
      const position = interaction.options.getString('position');

      // Doppelbewerbung check
      const existing = await Application.findOne({
        guildId: interaction.guild.id,
        userId:  interaction.user.id,
        status:  'pending',
      });
      if (existing) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.error} Du hast bereits eine ausstehende Bewerbung!`)
          ],
          ephemeral: true,
        });
      }

      // Modal anzeigen
      const modal = new ModalBuilder()
        .setCustomId(`application_submit_${position}`)
        .setTitle(`📝 Bewerbung: ${position.substring(0, 40)}`);

      const ageInput = new TextInputBuilder()
        .setCustomId('app_age')
        .setLabel('Dein Alter')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. 18')
        .setRequired(true)
        .setMaxLength(3);

      const expInput = new TextInputBuilder()
        .setCustomId('app_experience')
        .setLabel('Erfahrung / Über dich')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Beschreibe deine Erfahrung und warum du geeignet bist...')
        .setRequired(true)
        .setMaxLength(1000);

      const motivationInput = new TextInputBuilder()
        .setCustomId('app_motivation')
        .setLabel('Warum möchtest du diese Position?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Deine Motivation für diese Stelle...')
        .setRequired(true)
        .setMaxLength(800);

      const availInput = new TextInputBuilder()
        .setCustomId('app_availability')
        .setLabel('Verfügbarkeit (Stunden/Woche)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. 10-15 Stunden/Woche, täglich abends')
        .setRequired(true)
        .setMaxLength(200);

      const extraInput = new TextInputBuilder()
        .setCustomId('app_extra')
        .setLabel('Sonstiges (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Weitere Infos, Discord-Handle, Referenzen...')
        .setRequired(false)
        .setMaxLength(500);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ageInput),
        new ActionRowBuilder().addComponents(expInput),
        new ActionRowBuilder().addComponents(motivationInput),
        new ActionRowBuilder().addComponents(availInput),
        new ActionRowBuilder().addComponents(extraInput),
      );

      await interaction.showModal(modal);
      return;
    }

    // ── Annehmen / Ablehnen / Warteliste ─────────────────────
    const action  = sub;
    const userId  = interaction.options.getString('user_id');
    const grund   = interaction.options.getString('grund') || 'Kein Grund angegeben';

    const application = await Application.findOne({
      guildId: interaction.guild.id,
      userId,
      status:  'pending',
    });

    if (!application) {
      return interaction.reply({
        content: `${config.emojis.error} Keine ausstehende Bewerbung von User-ID \`${userId}\` gefunden!`,
        ephemeral: true,
      });
    }

    const statusMap = {
      annehmen:   { status: 'accepted',  emoji: '✅', color: 0x57F287, label: 'angenommen' },
      ablehnen:   { status: 'rejected',  emoji: '❌', color: 0xED4245, label: 'abgelehnt' },
      warteliste: { status: 'waitlist',  emoji: '⏳', color: 0xFEE75C, label: 'auf die Warteliste gesetzt' },
    };
    const info = statusMap[action];
    if (!info) return;

    application.status     = info.status;
    application.reviewedBy = interaction.user.id;
    application.reason     = grund;
    await application.save();

    // Team-Stats
    if (info.status === 'accepted') {
      await TeamMember.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: interaction.user.id },
        { $inc: { 'stats.applications': 1 } },
        { upsert: true }
      );
    }

    // DM senden
    try {
      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`${info.emoji} Bewerbung ${info.label}`)
          .setDescription(
            `Deine Bewerbung für **${application.position}** auf **${interaction.guild.name}** wurde **${info.label}**!\n\n` +
            `📋 Begründung: ${grund}\n\n` +
            (info.status === 'accepted'
              ? '🎉 Herzlichen Glückwunsch! Wir freuen uns auf die Zusammenarbeit!'
              : info.status === 'waitlist'
              ? '⏳ Du wurdest auf die Warteliste gesetzt. Wir melden uns, sobald ein Platz frei wird.'
              : '😔 Leider war es diesmal nicht erfolgreich. Viel Erfolg beim nächsten Mal!')
          )
          .setTimestamp()
        ]
      });
    } catch {}

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(info.color)
        .setDescription(`${info.emoji} Bewerbung von <@${userId}> wurde **${info.label}**.\nEine DM wurde gesendet.`)
        .setTimestamp()
      ],
    });
  },
};
