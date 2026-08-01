const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');
const { sendModLog } = require('../../utils/modUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('🔓 Benutzer entbannen')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('User-ID des gebannten Benutzers').setRequired(true))
    .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false)),

  async execute(interaction, client) {
    const userId = interaction.options.getString('user_id');
    const grund  = interaction.options.getString('grund') || 'Kein Grund angegeben';

    // Ban prüfen
    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${config.emojis.error} Kein gebannter Benutzer mit der ID \`${userId}\` gefunden!`)
        ],
        flags: 64,
      });
    }

    await interaction.guild.members.unban(userId, grund);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`🔓 Benutzer entbannt`)
        .addFields(
          { name: '👤 Benutzer',       value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true },
          { name: '🛡️ Moderator',     value: interaction.user.tag,                   inline: true },
          { name: '📋 Alter Ban-Grund', value: ban.reason || 'Nicht angegeben',       inline: false },
          { name: '📋 Entbann-Grund',  value: grund,                                  inline: false },
        )
        .setTimestamp()
      ],
    });

    await sendModLog(interaction.guild, {
      action:    'Entbannung',
      emoji:     '🔓',
      color:     config.colors.success,
      target:    ban.user,
      moderator: interaction.user,
      reason:    grund,
    });
  },
};
