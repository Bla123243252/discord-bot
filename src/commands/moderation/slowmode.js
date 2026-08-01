const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('🐢 Slowmode für einen Kanal setzen')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName('sekunden')
        .setDescription('Cooldown in Sekunden (0 = deaktivieren)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(o => o.setName('kanal').setDescription('Kanal (Standard: dieser Kanal)').setRequired(false)),

  async execute(interaction, client) {
    const sekunden = interaction.options.getInteger('sekunden');
    const channel  = interaction.options.getChannel('kanal') || interaction.channel;

    await channel.setRateLimitPerUser(sekunden, `Slowmode gesetzt von ${interaction.user.tag}`);

    const msg = sekunden === 0
      ? `${config.emojis.success} Slowmode in <#${channel.id}> wurde **deaktiviert**.`
      : `🐢 Slowmode in <#${channel.id}> wurde auf **${sekunden}s** gesetzt.`;

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.info).setDescription(msg).setTimestamp()],
    });
  },
};
