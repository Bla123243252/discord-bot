const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const TeamMember = require('../models/TeamMember');
const config = require('../config');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guild = newState.guild || oldState.guild;
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

    // ── Voice-Log ─────────────────────────────────────────────────
    if (guildConfig?.voiceLogChannel) {
      const logChannel = guild.channels.cache.get(guildConfig.voiceLogChannel);
      if (logChannel) {
        const member = newState.member || oldState.member;
        let description = '';

        if (!oldState.channel && newState.channel) {
          description = `🔊 **${member.user.tag}** hat **${newState.channel.name}** betreten`;
        } else if (oldState.channel && !newState.channel) {
          description = `🔇 **${member.user.tag}** hat **${oldState.channel.name}** verlassen`;
        } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
          description = `🔄 **${member.user.tag}** wechselte von **${oldState.channel.name}** zu **${newState.channel.name}**`;
        } else {
          return; // Nur Mute/Deafen - kein Log
        }

        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setDescription(description)
          .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // ── Team Voice-Zeit tracken ───────────────────────────────────
    const member = newState.member || oldState.member;
    if (!member) return;

    const teamMember = await TeamMember.findOne({ guildId: guild.id, userId: member.id });
    if (!teamMember) return;

    // Voice betritt
    if (!oldState.channel && newState.channel) {
      teamMember._voiceStart = Date.now();
      await teamMember.save();
    }
    // Voice verlässt
    else if (oldState.channel && !newState.channel) {
      if (teamMember._voiceStart) {
        const minutes = Math.floor((Date.now() - teamMember._voiceStart) / 60000);
        teamMember.stats.voiceMinutes += minutes;
        teamMember._voiceStart = null;
        await teamMember.save();
      }
    }
  }
};
