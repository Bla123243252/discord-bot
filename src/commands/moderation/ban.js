const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms     = require('ms');
const config = require('../../config');
const { sendModLog, sendDM } = require('../../utils/modUtil');

// Tempban-Tracker (in-memory, für persistente Daten DB nutzen)
const tempBans = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Ban-System')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('🔨 Benutzer dauerhaft bannen')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
        .addIntegerOption(o => o.setName('delete_days').setDescription('Nachrichten löschen (Tage, 0-7)').setMinValue(0).setMaxValue(7).setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('temp')
        .setDescription('⏰ Benutzer temporär bannen (Tempban)')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
        .addStringOption(o => o.setName('dauer').setDescription('Dauer (z.B. 1h, 1d, 7d)').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('soft')
        .setDescription('🧹 Softban (Nachrichten löschen + sofort entbannen)')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub   = interaction.options.getSubcommand();
    const user  = interaction.options.getUser('user');
    const grund = interaction.options.getString('grund') || 'Kein Grund angegeben';

    if (user.id === interaction.user.id) return interaction.reply({ content: `${config.emojis.error} Du kannst dich nicht selbst bannen!`, flags: 64 });
    if (user.id === client.user.id) return interaction.reply({ content: `${config.emojis.error} Ich kann mich nicht selbst bannen!`, flags: 64 });

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) return interaction.reply({ content: `${config.emojis.error} Ich kann diesen Benutzer nicht bannen!`, flags: 64 });

    // ── Permanenter Ban ──────────────────────────────────────
    if (sub === 'add') {
      const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
      await sendDM(user, { action: 'Du wurdest gebannt', emoji: '🔨', color: config.colors.error, guildName: interaction.guild.name, reason: grund });
      await interaction.guild.members.ban(user, { reason: grund, deleteMessageDays: deleteDays });

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.ban} Benutzer gebannt`)
          .addFields(
            { name: '👤 Benutzer',         value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: '🛡️ Moderator',        value: interaction.user.tag,           inline: true },
            { name: '🗑️ Nachrichten gel.', value: `${deleteDays} Tage`,           inline: true },
            { name: '📋 Grund',             value: grund,                          inline: false },
          )
          .setTimestamp()
        ],
      });
      await sendModLog(interaction.guild, { action: 'Ban', emoji: '🔨', color: config.colors.error, target: user, moderator: interaction.user, reason: grund });
    }

    // ── Tempban ──────────────────────────────────────────────
    else if (sub === 'temp') {
      const dauerRaw = interaction.options.getString('dauer');
      const duration = ms(dauerRaw);
      if (!duration) return interaction.reply({ content: `${config.emojis.error} Ungültige Dauer! Beispiel: \`1h\`, \`1d\`, \`7d\``, flags: 64 });

      const unbanAt = new Date(Date.now() + duration);
      await sendDM(user, { action: 'Du wurdest temporär gebannt', emoji: '⏰', color: config.colors.error, guildName: interaction.guild.name, reason: grund, duration: dauerRaw });
      await interaction.guild.members.ban(user, { reason: `Tempban (${dauerRaw}): ${grund}` });

      // Auto-Unban via setTimeout (für Produktionseinsatz DB-Scheduler verwenden)
      setTimeout(async () => {
        await interaction.guild.members.unban(user.id, 'Tempban abgelaufen').catch(() => {});
      }, duration);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`⏰ Benutzer temporär gebannt`)
          .addFields(
            { name: '👤 Benutzer',   value: `${user.tag} (<@${user.id}>)`,              inline: true },
            { name: '🛡️ Moderator', value: interaction.user.tag,                         inline: true },
            { name: '⏰ Dauer',      value: dauerRaw,                                    inline: true },
            { name: '📅 Entbannt am',value: `<t:${Math.floor(unbanAt.getTime() / 1000)}:F>`, inline: false },
            { name: '📋 Grund',      value: grund,                                       inline: false },
          )
          .setTimestamp()
        ],
      });
      await sendModLog(interaction.guild, { action: 'Tempban', emoji: '⏰', color: config.colors.error, target: user, moderator: interaction.user, reason: grund, duration: dauerRaw });
    }

    // ── Softban ──────────────────────────────────────────────
    else if (sub === 'soft') {
      await sendDM(user, { action: 'Du wurdest softgebannt (Nachrichten gelöscht)', emoji: '🧹', color: config.colors.warning, guildName: interaction.guild.name, reason: grund });
      await interaction.guild.members.ban(user, { reason: `Softban: ${grund}`, deleteMessageDays: 7 });
      await interaction.guild.members.unban(user.id, 'Softban: sofort entbannt').catch(() => {});

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`🧹 Softban ausgeführt`)
          .setDescription('Nachrichten der letzten 7 Tage wurden gelöscht. Benutzer kann dem Server sofort wieder beitreten.')
          .addFields(
            { name: '👤 Benutzer',   value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: '🛡️ Moderator', value: interaction.user.tag,           inline: true },
            { name: '📋 Grund',      value: grund,                          inline: false },
          )
          .setTimestamp()
        ],
      });
      await sendModLog(interaction.guild, { action: 'Softban', emoji: '🧹', color: config.colors.warning, target: user, moderator: interaction.user, reason: grund });
    }
  },
};
