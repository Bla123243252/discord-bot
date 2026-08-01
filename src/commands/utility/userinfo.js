const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('👤 Informationen über einen Benutzer')
    .addUserOption(o => o.setName('user').setDescription('Benutzer (Standard: Du)').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const badges = {
      ActiveDeveloper:          '🛠️ Aktiver Entwickler',
      BugHunterLevel1:          '🐛 Bug Hunter Lvl.1',
      BugHunterLevel2:          '🐛 Bug Hunter Lvl.2',
      CertifiedModerator:       '🛡️ Discord Moderator',
      HypeSquadOnlineHouse1:    '🏠 HypeSquad Bravery',
      HypeSquadOnlineHouse2:    '🏠 HypeSquad Brilliance',
      HypeSquadOnlineHouse3:    '🏠 HypeSquad Balance',
      Hypesquad:                '🏅 HypeSquad Events',
      Partner:                  '🤝 Discord Partner',
      PremiumEarlySupporter:    '⭐ Early Supporter',
      Staff:                    '👑 Discord Staff',
      VerifiedBot:              '✅ Verifizierter Bot',
      VerifiedDeveloper:        '🤖 Verifizierter Bot-Entwickler',
    };

    const userFlags   = user.flags?.toArray() || [];
    const badgeString = userFlags.map(f => badges[f]).filter(Boolean).join(', ') || 'Keine';

    const roles = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => `<@&${r.id}>`)
          .slice(0, 15)
          .join(', ') || 'Keine'
      : 'Nicht auf dem Server';

    const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };
    const presence    = member?.presence?.status || 'offline';

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || config.colors.primary)
      .setTitle(`${config.emojis.user} ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '📋 Allgemein',
          value:
            `> 🪪 **Name:** ${user.tag}\n` +
            `> 🆔 **ID:** \`${user.id}\`\n` +
            `> 🤖 **Bot:** ${user.bot ? 'Ja' : 'Nein'}\n` +
            `> 🏅 **Badges:** ${badgeString}\n` +
            `> 📅 **Account erstellt:** <t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`,
          inline: false,
        },
      );

    if (member) {
      embed.addFields(
        {
          name: '🖥️ Server-Info',
          value:
            `> ${statusEmoji[presence]} **Status:** ${presence}\n` +
            `> 📛 **Nickname:** ${member.nickname || 'Kein Nickname'}\n` +
            `> 📥 **Beigetreten:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)\n` +
            `> 🎭 **Höchste Rolle:** <@&${member.roles.highest.id}>`,
          inline: false,
        },
        {
          name: `🎭 Rollen (${member.roles.cache.size - 1})`,
          value: roles.length > 1024 ? roles.substring(0, 1020) + '...' : roles,
          inline: false,
        },
      );

      if (member.premiumSince) {
        embed.addFields({ name: '💎 Server Boost', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
      }
    }

    embed
      .setImage(user.bannerURL({ size: 512 }) || null)
      .setFooter({ text: `Angefragt von ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
