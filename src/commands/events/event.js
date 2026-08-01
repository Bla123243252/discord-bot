const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');
const EventModel = require('../../models/Event');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('🎉 Event-System')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand(sub =>
      sub.setName('erstellen')
        .setDescription('🎉 Neues Event erstellen')
        .addStringOption(o => o.setName('name').setDescription('Event-Name').setRequired(true))
        .addStringOption(o => o.setName('datum').setDescription('Datum & Zeit (DD.MM.YYYY HH:MM)').setRequired(true))
        .addStringOption(o => o.setName('beschreibung').setDescription('Beschreibung').setRequired(false))
        .addStringOption(o => o.setName('ort').setDescription('Ort').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('📋 Aktive Events anzeigen')
    )
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('🔍 Details zu einem Event')
        .addStringOption(o => o.setName('event_id').setDescription('Event-ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('absagen')
        .setDescription('❌ Event absagen')
        .addStringOption(o => o.setName('event_id').setDescription('Event-ID').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('countdown')
        .setDescription('⏳ Countdown bis zum nächsten Event')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // ── Event erstellen ──────────────────────────────────────
    if (sub === 'erstellen') {
      const name         = interaction.options.getString('name');
      const datumRaw     = interaction.options.getString('datum');
      const beschreibung = interaction.options.getString('beschreibung') || '';
      const ort          = interaction.options.getString('ort') || 'Wird bekannt gegeben';

      const [datePart, timePart] = datumRaw.split(' ');
      const [day, month, year]   = (datePart||'').split('.');
      const [hour, minute]       = (timePart||'00:00').split(':');
      const datum = new Date(year, month-1, day, hour||0, minute||0);

      if (isNaN(datum.getTime()) || datum < new Date()) {
        return interaction.reply({
          content: `${config.emojis.error} Ungültiges oder vergangenes Datum! Format: \`DD.MM.YYYY HH:MM\``,
          ephemeral: true,
        });
      }

      const joinRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('event_join')
          .setLabel('Teilnehmen')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('event_leave')
          .setLabel('Austragen')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      );

      const embed = buildEventEmbed({ name, beschreibung, ort, datum, createdBy: interaction.user.id, teilnehmer: [] }, interaction.guild);

      const msg = await interaction.channel.send({ embeds: [embed], components: [joinRow] });

      await EventModel.create({
        guildId:    interaction.guild.id,
        channelId:  interaction.channel.id,
        messageId:  msg.id,
        name, beschreibung, ort, datum,
        createdBy:  interaction.user.id,
      });

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} Event **${name}** wurde erstellt! <t:${Math.floor(datum.getTime()/1000)}:R>`)
        ],
        ephemeral: true,
      });
    }

    // ── Event-Liste ──────────────────────────────────────────
    else if (sub === 'liste') {
      const events = await EventModel.find({
        guildId:   interaction.guild.id,
        abgesagt:  false,
        datum:     { $gte: new Date() },
      }).sort({ datum: 1 });

      if (!events.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.info} Keine kommenden Events!`)
          ],
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎉 Kommende Events — ${interaction.guild.name}`)
        .setDescription(
          events.slice(0,10).map((e, i) =>
            `**${i+1}.** 🎉 **${e.name}**\n` +
            `> 📅 <t:${Math.floor(e.datum.getTime()/1000)}:F> (<t:${Math.floor(e.datum.getTime()/1000)}:R>)\n` +
            `> 📍 ${e.ort} | 👥 ${e.teilnehmer.length} Teilnehmer\n` +
            `> 🆔 \`${e._id}\``
          ).join('\n\n')
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    // ── Event-Info ───────────────────────────────────────────
    else if (sub === 'info') {
      const id    = interaction.options.getString('event_id');
      const event = await EventModel.findById(id).catch(() => null);

      if (!event || event.guildId !== interaction.guild.id) {
        return interaction.reply({ content: `${config.emojis.error} Event nicht gefunden!`, ephemeral: true });
      }

      const embed = buildEventEmbed(event, interaction.guild);
      await interaction.reply({ embeds: [embed] });
    }

    // ── Event absagen ────────────────────────────────────────
    else if (sub === 'absagen') {
      const id    = interaction.options.getString('event_id');
      const grund = interaction.options.getString('grund') || 'Kein Grund angegeben';
      const event = await EventModel.findById(id).catch(() => null);

      if (!event || event.guildId !== interaction.guild.id) {
        return interaction.reply({ content: `${config.emojis.error} Event nicht gefunden!`, ephemeral: true });
      }

      event.abgesagt = true;
      await event.save();

      // Original-Message updaten
      try {
        const channel = interaction.guild.channels.cache.get(event.channelId);
        const msg = await channel?.messages.fetch(event.messageId);
        if (msg) {
          await msg.edit({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle(`~~🎉 ${event.name}~~ — ❌ ABGESAGT`)
              .setDescription(`Dieses Event wurde **abgesagt**.\n\n📋 Grund: ${grund}`)
              .setTimestamp()
            ],
            components: [],
          });
        }
      } catch {}

      // Teilnehmer benachrichtigen
      for (const userId of event.teilnehmer) {
        try {
          const user = await client.users.fetch(userId);
          await user.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle(`❌ Event abgesagt: ${event.name}`)
              .setDescription(`Das Event **${event.name}** auf **${interaction.guild.name}** wurde leider abgesagt.\n\n📋 Grund: ${grund}`)
              .setTimestamp()
            ]
          });
        } catch {}
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${config.emojis.success} Event **${event.name}** wurde abgesagt. ${event.teilnehmer.length} Teilnehmer wurden benachrichtigt.`)
          .setTimestamp()
        ],
      });
    }

    // ── Countdown ────────────────────────────────────────────
    else if (sub === 'countdown') {
      const next = await EventModel.findOne({
        guildId:  interaction.guild.id,
        abgesagt: false,
        datum:    { $gte: new Date() },
      }).sort({ datum: 1 });

      if (!next) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.info} Keine bevorstehenden Events!`)
          ],
          ephemeral: true,
        });
      }

      const ts   = Math.floor(next.datum.getTime() / 1000);
      const diff = next.datum.getTime() - Date.now();
      const d    = Math.floor(diff / 86400000);
      const h    = Math.floor((diff % 86400000) / 3600000);
      const m    = Math.floor((diff % 3600000) / 60000);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle(`⏳ Countdown — ${next.name}`)
          .setDescription(
            `Das nächste Event startet in:\n\n` +
            `> 📅 **${d} Tage, ${h} Stunden, ${m} Minuten**\n` +
            `> 🕐 <t:${ts}:F> (<t:${ts}:R>)\n` +
            `> 📍 ${next.ort}\n` +
            `> 👥 ${next.teilnehmer.length} angemeldet`
          )
          .setTimestamp()
        ],
      });
    }
  },
};

function buildEventEmbed(event, guild) {
  const ts = Math.floor(new Date(event.datum).getTime() / 1000);
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🎉 ${event.name}`)
    .setDescription(event.beschreibung || '*Keine Beschreibung*')
    .addFields(
      { name: '📅 Datum',       value: `<t:${ts}:F>`,              inline: true },
      { name: '⏰ In',          value: `<t:${ts}:R>`,              inline: true },
      { name: '📍 Ort',         value: event.ort || 'Wird bekannt gegeben', inline: true },
      { name: '👤 Erstellt von',value: `<@${event.createdBy}>`,     inline: true },
      { name: `👥 Teilnehmer (${event.teilnehmer.length})`,
        value: event.teilnehmer.length ? event.teilnehmer.slice(0,20).map(id => `<@${id}>`).join(', ') : '*Noch niemand*',
        inline: false,
      },
    )
    .setFooter({ text: `${guild.name} • Klicke ✅ um teilzunehmen`, iconURL: guild.iconURL({ dynamic: true }) })
    .setTimestamp();
}

module.exports.buildEventEmbed = buildEventEmbed;
