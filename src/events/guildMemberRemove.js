const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const guildConfig = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!guildConfig) return;

    if (guildConfig.joinLeaveChannel) {
      const logChannel = member.guild.channels.cache.get(guildConfig.joinLeaveChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('📤 Mitglied verlassen')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Benutzer', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'War dabei seit', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unbekannt', inline: true },
            { name: 'Rollen', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Keine', inline: false }
          )
          .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
};
