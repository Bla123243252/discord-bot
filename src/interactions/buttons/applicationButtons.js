const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config      = require('../../config');
const Application = require('../../models/Application');
const TeamMember  = require('../../models/TeamMember');

module.exports = {
  async execute(interaction, client) {
    const { customId } = interaction;

    // ── Nachricht senden Button → Modal öffnen ───────────────
    if (customId.startsWith('application_message_')) {
      const userId = customId.replace('application_message_', '');

      const modal = new ModalBuilder()
        .setCustomId(`appMsg_send_${userId}`)
        .setTitle('✉️ Nachricht an Bewerber senden');

      const textInput = new TextInputBuilder()
        .setCustomId('appMsg_text')
        .setLabel('Nachricht')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('z.B. Kannst du dich bitte im Teamspeak melden? Wir haben noch Fragen zu deiner Bewerbung...')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(new ActionRowBuilder().addComponents(textInput));
      await interaction.showModal(modal);
      return;
    }

    // ── Annehmen / Ablehnen / Warteliste ─────────────────────
    let action, userId;
    if (customId.startsWith('application_accept_')) {
      action = 'accepted'; userId = customId.replace('application_accept_', '');
    } else if (customId.startsWith('application_reject_')) {
      action = 'rejected'; userId = customId.replace('application_reject_', '');
    } else if (customId.startsWith('application_waitlist_')) {
      action = 'waitlist'; userId = customId.replace('application_waitlist_', '');
    } else return;

    const application = await Application.findOne({
      guildId: interaction.guild.id,
      userId,
      status:  'pending',
    });

    if (!application) {
      return interaction.reply({
        content: `${config.emojis.error} Bewerbung bereits bearbeitet!`,
        flags: 64,
      });
    }

    const statusMap = {
      accepted: { emoji: '✅', color: 0x57F287, label: 'angenommen',               dm: '🎉 Herzlichen Glückwunsch! Wir freuen uns auf die Zusammenarbeit!' },
      rejected: { emoji: '❌', color: 0xED4245, label: 'abgelehnt',                dm: '😔 Leider war es diesmal nicht erfolgreich. Viel Erfolg beim nächsten Mal!' },
      waitlist: { emoji: '⏳', color: 0xFEE75C, label: 'auf die Warteliste gesetzt', dm: '⏳ Du wurdest auf die Warteliste gesetzt. Wir melden uns sobald ein Platz frei wird.' },
    };
    const info = statusMap[action];

    application.status     = action;
    application.reviewedBy = interaction.user.id;
    await application.save();

    if (action === 'accepted') {
      await TeamMember.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: interaction.user.id },
        { $inc: { 'stats.applications': 1 } },
        { upsert: true }
      );
    }

    // DM an Bewerber
    try {
      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [new EmbedBuilder()
          .setColor(info.color)
          .setTitle(`${info.emoji} Bewerbung ${info.label}`)
          .setDescription(
            `Deine Bewerbung für **${application.position}** auf **${interaction.guild.name}** wurde **${info.label}**!\n\n${info.dm}`
          )
          .setTimestamp()
        ]
      });
    } catch {}

    // Embed + Buttons aktualisieren — Nachricht-senden Button bleibt
    const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(info.color)
      .setTitle(`${info.emoji} Bewerbung ${info.label} — ${application.position}`)
      .addFields({ name: '🛡️ Bearbeitet von', value: `${interaction.user.tag}`, inline: true });

    // Nachricht-Button bleibt immer verfügbar
    const msgRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`application_message_${userId}`)
        .setLabel('Nachricht senden')
        .setEmoji('✉️')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.update({ embeds: [newEmbed], components: [msgRow] });
  }
};
