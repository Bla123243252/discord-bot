const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { sendModLog, sendDM } = require('../../utils/modUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Benutzer kicken')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user');
    const grund  = interaction.options.getString('grund') || 'Kein Grund angegeben';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: `${config.emojis.error} Benutzer nicht auf dem Server!`, ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: `${config.emojis.error} Ich kann diesen Benutzer nicht kicken!`, ephemeral: true });
    if (user.id === interaction.user.id) return interaction.reply({ content: `${config.emojis.error} Du kannst dich nicht selbst kicken!`, ephemeral: true });

    await sendDM(user, { action: 'Du wurdest gekickt', emoji: '👢', color: config.colors.error, guildName: interaction.guild.name, reason: grund });
    await member.kick(grund);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle(`${config.emojis.kick} Benutzer gekickt`)
        .addFields(
          { name: '👤 Benutzer',   value: `${user.tag} (<@${user.id}>)`, inline: true },
          { name: '🛡️ Moderator', value: interaction.user.tag,           inline: true },
          { name: '📋 Grund',      value: grund,                          inline: false },
        )
        .setTimestamp()
      ],
    });

    await sendModLog(interaction.guild, { action: 'Kick', emoji: '👢', color: config.colors.error, target: user, moderator: interaction.user, reason: grund });
  },
};
