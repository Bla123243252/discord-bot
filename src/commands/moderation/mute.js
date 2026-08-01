const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms     = require('ms');
const config = require('../../config');
const { sendModLog, sendDM } = require('../../utils/modUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('🔇 Benutzer timen (Timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
    .addStringOption(o => o.setName('dauer').setDescription('Dauer (z.B. 10m, 1h, 1d)').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user');
    const dauer  = interaction.options.getString('dauer');
    const grund  = interaction.options.getString('grund') || 'Kein Grund angegeben';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: `${config.emojis.error} Benutzer nicht gefunden!`, flags: 64 });
    if (!member.moderatable) return interaction.reply({ content: `${config.emojis.error} Ich kann diesen Benutzer nicht timen!`, flags: 64 });

    const duration = ms(dauer);
    if (!duration || duration > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: `${config.emojis.error} Ungültige Dauer! Max. 28 Tage. Beispiel: \`10m\`, \`2h\`, \`1d\``, flags: 64 });
    }

    await sendDM(user, { action: 'Du wurdest getimeouted', emoji: '🔇', color: config.colors.warning, guildName: interaction.guild.name, reason: grund, duration: dauer });
    await member.timeout(duration, grund);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.mute} Benutzer getimeouted`)
        .addFields(
          { name: '👤 Benutzer',   value: `${user.tag} (<@${user.id}>)`, inline: true },
          { name: '🛡️ Moderator', value: interaction.user.tag,           inline: true },
          { name: '⏰ Dauer',      value: dauer,                          inline: true },
          { name: '📋 Grund',      value: grund,                          inline: false },
        )
        .setTimestamp()
      ],
    });

    await sendModLog(interaction.guild, { action: 'Timeout', emoji: '🔇', color: config.colors.warning, target: user, moderator: interaction.user, reason: grund, duration: dauer });
  },
};
