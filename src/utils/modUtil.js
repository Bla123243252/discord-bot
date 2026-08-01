const { EmbedBuilder } = require('discord.js');
const config  = require('../config');
const Warn    = require('../models/Warn');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomBytes(16).toString('hex') } : require('crypto');

// UUID ohne extra Package
function generateId() {
  return require('crypto').randomBytes(8).toString('hex');
}

// ── Mod-Log senden ────────────────────────────────────────────────
async function sendModLog(guild, data) {
  const GuildConfig = require('../models/GuildConfig');
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  if (!guildConfig?.modLogChannel) return;

  const logChannel = guild.channels.cache.get(guildConfig.modLogChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(data.color || config.colors.mod)
    .setTitle(`${data.emoji || '🔨'} ${data.action}`)
    .addFields(
      { name: '👤 Benutzer',   value: `${data.target.tag} (<@${data.target.id}>)`, inline: true },
      { name: '🛡️ Moderator', value: `${data.moderator.tag}`,                     inline: true },
      { name: '📋 Grund',      value: data.reason || 'Kein Grund angegeben',       inline: false },
    );

  if (data.duration) embed.addFields({ name: '⏰ Dauer', value: data.duration, inline: true });
  if (data.extra)    embed.addFields({ name: data.extraLabel || 'Info', value: data.extra, inline: true });

  embed.setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

// ── DM an Benutzer senden ─────────────────────────────────────────
async function sendDM(user, data) {
  try {
    const embed = new EmbedBuilder()
      .setColor(data.color || config.colors.mod)
      .setTitle(`${data.emoji || '🔨'} ${data.action} auf ${data.guildName}`)
      .addFields(
        { name: '📋 Grund', value: data.reason || 'Kein Grund angegeben', inline: false },
      );
    if (data.duration) embed.addFields({ name: '⏰ Dauer', value: data.duration, inline: true });
    if (data.extra)    embed.addFields({ name: data.extraLabel || 'Info', value: data.extra, inline: true });
    embed.setTimestamp();
    await user.send({ embeds: [embed] });
  } catch {}
}

module.exports = { sendModLog, sendDM, generateId };
