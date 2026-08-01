const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('⏰ Zeigt wie lange der Bot läuft'),

  async execute(interaction, client) {
    const uptime   = client.uptime;
    const days     = Math.floor(uptime / 86400000);
    const hours    = Math.floor((uptime % 86400000) / 3600000);
    const minutes  = Math.floor((uptime % 3600000) / 60000);
    const seconds  = Math.floor((uptime % 60000) / 1000);

    const startedAt = Math.floor((Date.now() - uptime) / 1000);

    // Speicherverbrauch
    const memUsed  = process.memoryUsage();
    const heapMB   = (memUsed.heapUsed / 1024 / 1024).toFixed(1);
    const totalMB  = (memUsed.heapTotal / 1024 / 1024).toFixed(1);
    const rssMB    = (memUsed.rss / 1024 / 1024).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('⏰ Bot-Status')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '🕐 Laufzeit',
          value:
            `> **${days}** Tage, **${hours}** Stunden, **${minutes}** Minuten, **${seconds}** Sekunden\n` +
            `> Online seit: <t:${startedAt}:F>`,
          inline: false,
        },
        {
          name: '💾 Speicher',
          value:
            `> **Heap:** ${heapMB}MB / ${totalMB}MB\n` +
            `> **RSS:** ${rssMB}MB`,
          inline: true,
        },
        {
          name: '📊 Statistiken',
          value:
            `> 🌐 **Server:** ${client.guilds.cache.size}\n` +
            `> 👥 **Benutzer:** ${client.users.cache.size}\n` +
            `> 📦 **Commands:** ${client.commands.size}`,
          inline: true,
        },
        {
          name: '🤖 Bot-Info',
          value:
            `> **Tag:** ${client.user.tag}\n` +
            `> **ID:** \`${client.user.id}\`\n` +
            `> **Node.js:** ${process.version}\n` +
            `> **discord.js:** v14`,
          inline: false,
        },
      )
      .setFooter({ text: 'RP Server Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
