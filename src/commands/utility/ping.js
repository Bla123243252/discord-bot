const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Zeigt die Latenz des Bots'),

  async execute(interaction, client) {
    const sent = await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription('🏓 Ping wird gemessen...')
      ],
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = client.ws.ping;

    const getColor = (ms) => {
      if (ms < 100) return config.colors.success;
      if (ms < 250) return config.colors.warning;
      return config.colors.error;
    };

    const getEmoji = (ms) => {
      if (ms < 100) return '🟢';
      if (ms < 250) return '🟡';
      return '🔴';
    };

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(getColor(latency))
        .setTitle('🏓 Pong!')
        .addFields(
          { name: `${getEmoji(latency)} Bot-Latenz`,      value: `\`${latency}ms\``,   inline: true },
          { name: `${getEmoji(wsLatency)} WebSocket`,      value: `\`${wsLatency}ms\``, inline: true },
        )
        .setFooter({ text: `discord.js v14 • Node.js ${process.version}` })
        .setTimestamp()
      ],
    });
  },
};
