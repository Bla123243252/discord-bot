const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    const guildConfig = await GuildConfig.findOne({ guildId: newMember.guild.id });
    if (!guildConfig?.logChannel) return;

    const logChannel = newMember.guild.channels.cache.get(guildConfig.logChannel);
    if (!logChannel) return;

    // ── Nickname-Änderung ─────────────────────────────────────────
    if (oldMember.nickname !== newMember.nickname) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('🏷️ Nickname geändert')
        .addFields(
          { name: 'Benutzer', value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: true },
          { name: 'Vorher', value: oldMember.nickname || '*Kein Nickname*', inline: true },
          { name: 'Nachher', value: newMember.nickname || '*Kein Nickname*', inline: true }
        )
        .setTimestamp();
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // ── Rollen-Änderung ───────────────────────────────────────────
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0 || removedRoles.size > 0) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('🎭 Rollen geändert')
        .addFields(
          { name: 'Benutzer', value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: false },
        )
        .setTimestamp();

      if (addedRoles.size > 0) {
        embed.addFields({ name: '➕ Hinzugefügt', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true });
      }
      if (removedRoles.size > 0) {
        embed.addFields({ name: '➖ Entfernt', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: true });
      }

      logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};
