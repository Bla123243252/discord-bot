const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig   = require('../models/GuildConfig');
const TeamMember    = require('../models/TeamMember');
const Application   = require('../models/Application');
const config        = require('../config');

// Anti-Spam Tracker
const spamTracker = new Map();

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    // ── DM → Bewerbungs-Antwort Weiterleitung ─────────────────
    if (!message.guild) {
      await handleDMReply(message, client);
      return;
    }

    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!guildConfig) return;

    const member = message.member;

    // ── Anti-Link ─────────────────────────────────────────────
    if (guildConfig.antiLink) {
      const linkRegex = /(https?:\/\/|discord\.gg\/|discord\.com\/invite\/)/i;
      if (linkRegex.test(message.content)) {
        const isAllowed = config.allowedDomains.some(d => message.content.includes(d));
        const hasBypass = member?.permissions.has('ManageMessages');
        if (!isAllowed && !hasBypass) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription(`${config.emojis.error} <@${message.author.id}> Links sind hier nicht erlaubt!`)
            ]
          });
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }
      }
    }

    // ── Anti-Spam ─────────────────────────────────────────────
    if (guildConfig.antiSpam) {
      const hasBypass = member?.permissions.has('ManageMessages');
      if (!hasBypass) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        if (!spamTracker.has(key)) spamTracker.set(key, []);
        const msgs = spamTracker.get(key);
        msgs.push(now);

        const recent = msgs.filter(t => now - t < config.antiSpam.timeWindow);
        spamTracker.set(key, recent);

        if (recent.length >= config.antiSpam.maxMessages) {
          spamTracker.delete(key);
          try {
            await member.timeout(config.antiSpam.muteTime * 1000, 'Anti-Spam: Zu viele Nachrichten');
            await message.channel.send({
              embeds: [new EmbedBuilder()
                .setColor(config.colors.warning)
                .setDescription(`${config.emojis.mute} <@${message.author.id}> wurde für **5 Minuten** getimeouted *(Spam)*`)
              ]
            }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000));

            if (guildConfig.modLogChannel) {
              const logCh = message.guild.channels.cache.get(guildConfig.modLogChannel);
              if (logCh) {
                logCh.send({
                  embeds: [new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🤖 Anti-Spam ausgelöst')
                    .addFields(
                      { name: 'Benutzer',      value: `${message.author.tag}`, inline: true },
                      { name: 'Kanal',         value: `<#${message.channel.id}>`, inline: true },
                      { name: 'Nachrichten',   value: `${recent.length} in 5s`, inline: true }
                    )
                    .setTimestamp()
                  ]
                });
              }
            }
          } catch (err) {
            console.error('Anti-Spam Timeout Fehler:', err);
          }
        }
      }
    }
  }
};

// ── DM-Weiterleitung Handler ──────────────────────────────────────
async function handleDMReply(message, client) {
  try {
    // Offene Bewerbung des Users suchen (in allen Guilds)
    const application = await Application.findOne({
      userId: message.author.id,
      status: 'pending',
    });

    if (!application) {
      // Keine offene Bewerbung — stille Ignorierung
      return;
    }

    // Guild holen
    const guild = client.guilds.cache.get(application.guildId);
    if (!guild) return;

    // GuildConfig holen für Bewerbungs-Kanal
    const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
    const appChannelId = process.env.CHANNEL_APPLICATIONS || guildConfig?.applications;
    if (!appChannelId) return;

    const appChannel = guild.channels.cache.get(appChannelId);
    if (!appChannel) return;

    // Highteam-Rolle pingen
    const teamRoleId = process.env.ROLE_HIGHTEAM || process.env.ROLE_TEAM;
    const pingText   = teamRoleId ? `<@&${teamRoleId}>` : '';

    // Embed in Bewerbungs-Kanal senden
    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('📩 Antwort vom Bewerber')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setDescription(message.content || '*[Kein Text — möglicherweise ein Anhang]*')
      .addFields(
        { name: '👤 Bewerber',   value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
        { name: '🎯 Position',   value: application.position,                               inline: true },
        { name: '🆔 User-ID',    value: `\`${message.author.id}\``,                         inline: true },
      )
      .setFooter({ text: 'Antwort via DM' })
      .setTimestamp();

    await appChannel.send({
      content: pingText || undefined,
      embeds:  [embed],
    });

    // Anhänge weiterleiten falls vorhanden
    if (message.attachments.size > 0) {
      const attachmentEmbed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`📎 Anhang von ${message.author.tag}`)
        .setDescription(
          [...message.attachments.values()].map(a => `[${a.name}](${a.url})`).join('\n')
        );
      await appChannel.send({ embeds: [attachmentEmbed] });
    }

    // Bestätigung an User
    await message.author.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${config.emojis.success} Deine Nachricht wurde an das Team weitergeleitet. Wir melden uns so schnell wie möglich!`)
        .setTimestamp()
      ]
    }).catch(() => {});

  } catch (err) {
    console.error('DM-Weiterleitung Fehler:', err);
  }
}
