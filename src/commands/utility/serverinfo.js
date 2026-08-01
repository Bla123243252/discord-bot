const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('🌐 Informationen über den Server'),

  async execute(interaction, client) {
    const guild = interaction.guild;
    await guild.fetch();

    const owner        = await guild.fetchOwner();
    const memberCount  = guild.memberCount;
    const botCount     = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount   = memberCount - botCount;
    const channels     = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels= channels.filter(c => c.type === 2).size;
    const catChannels  = channels.filter(c => c.type === 4).size;
    const roleCount    = guild.roles.cache.size - 1;
    const emojiCount   = guild.emojis.cache.size;
    const boostCount   = guild.premiumSubscriptionCount || 0;
    const boostTier    = guild.premiumTier;

    const verificationLevels = ['Keine', 'Niedrig', 'Mittel', 'Hoch', '👁 Höchste'];
    const boostTierLabel     = [`Keine`, `Stufe 1`, `Stufe 2`, `Stufe 3`];

    const features = guild.features.map(f =>
      f.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).slice(0, 8).join(', ') || 'Keine';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${config.emojis.server} ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '📋 Allgemein',
          value:
            `> 🆔 **ID:** \`${guild.id}\`\n` +
            `> 👑 **Besitzer:** <@${owner.id}>\n` +
            `> 📅 **Erstellt:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)\n` +
            `> 🔒 **Verifikation:** ${verificationLevels[guild.verificationLevel] || 'Unbekannt'}\n` +
            `> 🌍 **Region:** Auto`,
          inline: false,
        },
        {
          name: '👥 Mitglieder',
          value:
            `> 👥 **Gesamt:** ${memberCount}\n` +
            `> 👤 **Menschen:** ${humanCount}\n` +
            `> 🤖 **Bots:** ${botCount}`,
          inline: true,
        },
        {
          name: '📁 Kanäle',
          value:
            `> 💬 **Text:** ${textChannels}\n` +
            `> 🔊 **Voice:** ${voiceChannels}\n` +
            `> 📂 **Kategorien:** ${catChannels}`,
          inline: true,
        },
        {
          name: '✨ Extras',
          value:
            `> 🎭 **Rollen:** ${roleCount}\n` +
            `> 😀 **Emojis:** ${emojiCount}\n` +
            `> 💎 **Boosts:** ${boostCount} (${boostTierLabel[boostTier] || 'Keine'})`,
          inline: true,
        },
        {
          name: '🌟 Server-Features',
          value: features,
          inline: false,
        },
      )
      .setImage(guild.bannerURL({ size: 1024 }) || null)
      .setFooter({ text: `Angefragt von ${interaction.user.tag}` })
      .setTimestamp();

    if (guild.description) {
      embed.setDescription(`*${guild.description}*`);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
