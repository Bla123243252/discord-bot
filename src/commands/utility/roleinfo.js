const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('🎭 Informationen über eine Rolle')
    .addRoleOption(o => o.setName('rolle').setDescription('Rolle').setRequired(true)),

  async execute(interaction, client) {
    const role    = interaction.options.getRole('rolle');
    const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(role.id));

    // Berechtigungen
    const perms = role.permissions.toArray()
      .map(p => `\`${p.replace(/_/g, ' ').toLowerCase()}\``)
      .slice(0, 15)
      .join(', ') || 'Keine';

    const colorHex = role.hexColor === '#000000' ? 'Standard' : role.hexColor;

    const embed = new EmbedBuilder()
      .setColor(role.color || config.colors.primary)
      .setTitle(`🎭 ${role.name}`)
      .addFields(
        {
          name: '📋 Allgemein',
          value:
            `> 🆔 **ID:** \`${role.id}\`\n` +
            `> 🎨 **Farbe:** ${colorHex}\n` +
            `> 📊 **Position:** ${role.position}\n` +
            `> 📅 **Erstellt:** <t:${Math.floor(role.createdTimestamp / 1000)}:F>`,
          inline: false,
        },
        {
          name: '⚙️ Einstellungen',
          value:
            `> 📌 **Gehisst:** ${role.hoist ? '✅' : '❌'}\n` +
            `> 🔒 **Verwaltbar:** ${role.managed ? '✅ (Bot/Integration)' : '❌'}\n` +
            `> 💬 **Erwähnbar:** ${role.mentionable ? '✅' : '❌'}`,
          inline: true,
        },
        {
          name: '👥 Mitglieder',
          value: `> **${members.size}** Mitglieder`,
          inline: true,
        },
        {
          name: '🔑 Berechtigungen',
          value: perms.length > 1024 ? perms.substring(0, 1020) + '...' : perms,
          inline: false,
        },
      )
      .setFooter({ text: `Angefragt von ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
