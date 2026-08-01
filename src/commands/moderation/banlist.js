const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('📋 Liste aller gebannten Benutzer')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const bans = await interaction.guild.bans.fetch();
    if (!bans.size) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} Keine gebannten Benutzer auf diesem Server!`)
        ],
      });
    }

    const banList = [...bans.values()]
      .slice(0, 25)
      .map((b, i) => `**${i + 1}.** ${b.user.tag} (\`${b.user.id}\`)\n> 📋 ${b.reason || 'Kein Grund'}`)
      .join('\n\n');

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle(`🔨 Banliste — ${interaction.guild.name}`)
        .setDescription(banList)
        .setFooter({ text: `${bans.size} Bans gesamt (max. 25 angezeigt)` })
        .setTimestamp()
      ],
    });
  },
};
