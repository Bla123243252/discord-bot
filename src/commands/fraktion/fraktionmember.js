const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config   = require('../../config');
const Fraktion = require('../../models/Fraktion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fraktionmember')
    .setDescription('👥 Fraktions-Mitglieder verwalten')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('➕ Mitglied zur Fraktion hinzufügen')
        .addStringOption(o => o.setName('kuerzel').setDescription('Kürzel der Fraktion').setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
        .addStringOption(o => o.setName('rang').setDescription('Rang in der Fraktion').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('➖ Mitglied aus Fraktion entfernen')
        .addStringOption(o => o.setName('kuerzel').setDescription('Kürzel der Fraktion').setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('setleiter')
        .setDescription('👑 Leiter der Fraktion setzen')
        .addStringOption(o => o.setName('kuerzel').setDescription('Kürzel der Fraktion').setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('Neuer Leiter').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('setstatus')
        .setDescription('🔄 Status der Fraktion ändern')
        .addStringOption(o =>
          o.setName('kuerzel').setDescription('Kürzel der Fraktion').setRequired(true)
        )
        .addStringOption(o =>
          o.setName('status').setDescription('Neuer Status').setRequired(true)
            .addChoices(
              { name: '🟢 Aktiv',    value: 'aktiv' },
              { name: '🔴 Inaktiv',  value: 'inaktiv' },
              { name: '🟡 Testphase',value: 'testphase' },
            )
        )
        .addIntegerOption(o =>
          o.setName('tage').setDescription('Testphase Tage (nur bei Testphase)').setRequired(false).setMinValue(1).setMaxValue(365)
        )
    )
    .addSubcommand(sub =>
      sub.setName('addevent')
        .setDescription('📅 Event zur Fraktion hinzufügen')
        .addStringOption(o => o.setName('kuerzel').setDescription('Kürzel').setRequired(true))
        .addStringOption(o => o.setName('name').setDescription('Event-Name').setRequired(true))
        .addStringOption(o => o.setName('datum').setDescription('Datum (DD.MM.YYYY HH:MM)').setRequired(true))
        .addStringOption(o => o.setName('beschreibung').setDescription('Beschreibung').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub     = interaction.options.getSubcommand();
    const kuerzel = interaction.options.getString('kuerzel')?.toUpperCase();

    const fraktion = await Fraktion.findOne({ guildId: interaction.guild.id, kuerzel });
    if (!fraktion) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${config.emojis.error} Fraktion mit Kürzel \`${kuerzel}\` nicht gefunden!`)
        ],
        ephemeral: true,
      });
    }

    // ── Member hinzufügen ────────────────────────────────────
    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const rang = interaction.options.getString('rang') || 'Mitglied';

      if (fraktion.mitglieder.some(m => m.userId === user.id)) {
        return interaction.reply({
          content: `${config.emojis.warning} <@${user.id}> ist bereits Mitglied dieser Fraktion!`,
          ephemeral: true,
        });
      }

      fraktion.mitglieder.push({ userId: user.id, rang });
      await fraktion.save();

      // Auto-Rolle vergeben
      if (fraktion.roleId) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.add(fraktion.roleId).catch(() => {});
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} <@${user.id}> wurde als **${rang}** zur Fraktion **${fraktion.emoji} ${fraktion.name}** hinzugefügt!`)
          .setTimestamp()
        ],
      });
    }

    // ── Member entfernen ─────────────────────────────────────
    else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      fraktion.mitglieder = fraktion.mitglieder.filter(m => m.userId !== user.id);
      await fraktion.save();

      if (fraktion.roleId) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member) await member.roles.remove(fraktion.roleId).catch(() => {});
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.warning} <@${user.id}> wurde aus **${fraktion.emoji} ${fraktion.name}** entfernt.`)
          .setTimestamp()
        ],
      });
    }

    // ── Leiter setzen ────────────────────────────────────────
    else if (sub === 'setleiter') {
      const user = interaction.options.getUser('user');
      fraktion.leiter = user.id;
      await fraktion.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setDescription(`${config.emojis.crown} <@${user.id}> ist jetzt **Leiter** der Fraktion **${fraktion.emoji} ${fraktion.name}**!`)
          .setTimestamp()
        ],
      });
    }

    // ── Status setzen ────────────────────────────────────────
    else if (sub === 'setstatus') {
      const status = interaction.options.getString('status');
      const tage   = interaction.options.getInteger('tage');
      fraktion.status = status;
      if (status === 'testphase' && tage) fraktion.testphaseTage = tage;
      await fraktion.save();

      const statusLabel = { aktiv: '🟢 Aktiv', inaktiv: '🔴 Inaktiv', testphase: '🟡 Testphase' };
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.info)
          .setDescription(
            `${config.emojis.info} Status von **${fraktion.emoji} ${fraktion.name}** wurde auf **${statusLabel[status]}** gesetzt.` +
            (status === 'testphase' && tage ? `\n🗓️ Testphase: **${tage} Tage**` : '')
          )
          .setTimestamp()
        ],
      });
    }

    // ── Event hinzufügen ─────────────────────────────────────
    else if (sub === 'addevent') {
      const eventName      = interaction.options.getString('name');
      const datumRaw       = interaction.options.getString('datum');
      const beschreibung   = interaction.options.getString('beschreibung') || '';

      // Datum parsen (DD.MM.YYYY HH:MM)
      const [datePart, timePart] = datumRaw.split(' ');
      const [day, month, year]   = (datePart || '').split('.');
      const [hour, minute]       = (timePart || '00:00').split(':');
      const datum = new Date(year, month - 1, day, hour || 0, minute || 0);

      if (isNaN(datum.getTime())) {
        return interaction.reply({
          content: `${config.emojis.error} Ungültiges Datum! Format: \`DD.MM.YYYY HH:MM\``,
          ephemeral: true,
        });
      }

      fraktion.events.push({ name: eventName, datum, beschreibung });
      await fraktion.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${config.emojis.event} Event hinzugefügt`)
          .addFields(
            { name: '📛 Name',   value: eventName,                                            inline: true },
            { name: '📅 Datum',  value: `<t:${Math.floor(datum.getTime() / 1000)}:F>`,        inline: true },
            { name: '🏘️ Fraktion', value: `${fraktion.emoji} ${fraktion.name}`,               inline: true },
          )
          .setTimestamp()
        ],
      });
    }
  },
};
