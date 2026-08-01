const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

// Anti-Raid: Join-Tracker
const joinTracker = new Map();

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const guild = member.guild;
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
    if (!guildConfig) return;

    // ── Anti-Raid Check ──────────────────────────────────────────
    if (guildConfig.antiRaid) {
      const now = Date.now();
      const key = guild.id;
      if (!joinTracker.has(key)) joinTracker.set(key, []);
      const joins = joinTracker.get(key);
      joins.push(now);

      // Nur Joins der letzten 10 Sekunden behalten
      const recent = joins.filter(t => now - t < 10000);
      joinTracker.set(key, recent);

      if (recent.length >= 10) {
        // Raid erkannt
        try {
          await member.ban({ reason: '🚨 Anti-Raid: Massenanmeldung erkannt' });
          if (guildConfig.modLogChannel) {
            const logChannel = guild.channels.cache.get(guildConfig.modLogChannel);
            if (logChannel) {
              logChannel.send({
                embeds: [new EmbedBuilder()
                  .setColor(config.colors.error)
                  .setTitle('🚨 Anti-Raid Ausgelöst')
                  .setDescription(`**${member.user.tag}** wurde gebannt.\n${recent.length} Joins in den letzten 10 Sekunden!`)
                  .setTimestamp()
                ]
              });
            }
          }
        } catch {}
        return;
      }
    }

    // ── Anti-Bot Check ────────────────────────────────────────────
    if (guildConfig.antiBot && member.user.bot) {
      try {
        await member.ban({ reason: '🤖 Anti-Bot: Automatische Bot-Verhinderung' });
        if (guildConfig.modLogChannel) {
          const ch = guild.channels.cache.get(guildConfig.modLogChannel);
          if (ch) {
            ch.send({
              embeds: [new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🤖 Bot-Beitritt verhindert')
                .setDescription(`Bot **${member.user.tag}** wurde gebannt.`)
                .setTimestamp()
              ]
            });
          }
        }
      } catch {}
      return;
    }

    // ── Auto-Rolle ────────────────────────────────────────────────
    if (guildConfig.autoRole) {
      const role = guild.roles.cache.get(guildConfig.autoRole);
      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // ── Willkommensnachricht ──────────────────────────────────────
    if (guildConfig.welcomeEnabled && guildConfig.welcomeChannel) {
      const welcomeChannel = guild.channels.cache.get(guildConfig.welcomeChannel);
      if (!welcomeChannel) return;

      const memberCount = guild.memberCount;
      const joinedTs    = Math.floor(Date.now() / 1000);
      const createdTs   = Math.floor(member.user.createdTimestamp / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name:    `${guild.name} • Willkommen!`,
          iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTitle(`👋 Hey ${member.user.username}, schön dass du da bist!`)
        .setDescription(
          `Willkommen auf **${guild.name}**!\n` +
          `Wir freuen uns, dich in unserer Community begrüßen zu dürfen. 🎉\n\n` +
          `📖 Lies unsere Regeln durch und verifiziere dich um Zugang zu allen Kanälen zu erhalten.\n` +
          `🎫 Bei Fragen öffne ein Support-Ticket.`
        )
        .addFields(
          {
            name: '👤 Dein Profil',
            value:
              `> 🪪 **Username:** ${member.user.username}\n` +
              `> 🔢 **Member:** #${memberCount}\n` +
              `> 📅 **Account erstellt:** <t:${createdTs}:R>\n` +
              `> 📥 **Beigetreten:** <t:${joinedTs}:R>`,
            inline: true,
          },
          {
            name: 'ℹ️ Server Info',
            value:
              `> 👥 **Mitglieder:** ${memberCount}\n` +
              `> 🌐 **Server:** ${guild.name}\n` +
              `> 📆 **Gegründet:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
            inline: true,
          },
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({
          text: `${guild.name} • Viel Spaß!`,
          iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTimestamp();

      await welcomeChannel.send({
        content: `<@${member.id}>`,
        embeds: [embed],
      }).catch(() => {});
    }

    // ── Join-Log ──────────────────────────────────────────────────
    if (guildConfig.joinLeaveChannel) {
      const logChannel = guild.channels.cache.get(guildConfig.joinLeaveChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('📥 Mitglied beigetreten')
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'Benutzer', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'Account-Alter', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Servermitglieder', value: `${guild.memberCount}`, inline: true }
          )
          .setTimestamp();
        logChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
};
