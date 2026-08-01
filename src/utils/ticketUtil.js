const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config  = require('../config');
const Ticket  = require('../models/Ticket');
const GuildConfig = require('../models/GuildConfig');
const TeamMember  = require('../models/TeamMember');

// ── Priorität → Emoji/Farbe ──────────────────────────────────────
const PRIORITY = {
  offen:       { label: '🟢 Offen',          color: 0x57F287 },
  bearbeitung: { label: '🟠 In Bearbeitung',  color: 0xFFA500 },
  fertig:      { label: '🔴 Fertig',          color: 0xED4245 },
};

// ── Ticket-Typ → Label/Emoji ────────────────────────────────────
const TICKET_TYPES = {
  support:  { label: 'Support Ticket',   emoji: '🛠️', color: 0x5865F2 },
  highteam: { label: 'Highteam Ticket',  emoji: '👑', color: 0xFFD700 },
  fraktion: { label: 'Fraktions Ticket', emoji: '🏘️', color: 0x57F287 },
  unban:    { label: 'Entbannung',        emoji: '🔓', color: 0xED4245 },
};

// ── Transcript generieren ────────────────────────────────────────
async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted   = [...messages.values()].reverse();

  let html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Ticket Transcript - ${channel.name}</title>
<style>
  body { background:#313338; color:#dbdee1; font-family:'gg sans','Helvetica Neue',Helvetica,Arial,sans-serif; margin:0; padding:20px; }
  .header { background:#2b2d31; padding:20px; border-radius:8px; margin-bottom:20px; }
  .header h1 { color:#fff; margin:0; font-size:20px; }
  .header p { color:#949ba4; margin:5px 0 0; font-size:14px; }
  .message { display:flex; padding:8px 16px; gap:16px; }
  .message:hover { background:#2e3035; }
  .avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; }
  .content { flex:1; }
  .username { font-weight:600; color:#fff; font-size:15px; }
  .timestamp { color:#949ba4; font-size:12px; margin-left:8px; }
  .text { color:#dbdee1; font-size:15px; line-height:1.375; margin-top:2px; }
  .bot-badge { background:#5865F2; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; margin-left:4px; vertical-align:middle; }
</style>
</head>
<body>
<div class="header">
  <h1>📋 Transcript: ${channel.name}</h1>
  <p>Exportiert am ${new Date().toLocaleString('de-DE')}</p>
</div>
`;

  for (const msg of sorted) {
    const avatar = msg.author.displayAvatarURL({ extension: 'png', size: 64 });
    const time   = new Date(msg.createdTimestamp).toLocaleString('de-DE');
    const bot    = msg.author.bot ? '<span class="bot-badge">BOT</span>' : '';
    const text   = msg.content
      ? msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      : msg.embeds.length ? '[Embed]' : '[Anhang]';

    html += `<div class="message">
  <img class="avatar" src="${avatar}" alt="">
  <div class="content">
    <span class="username">${msg.author.username}${bot}</span>
    <span class="timestamp">${time}</span>
    <div class="text">${text}</div>
  </div>
</div>\n`;
  }

  html += '</body></html>';
  return Buffer.from(html);
}

// ── ticketSystem Objekt ──────────────────────────────────────────
const ticketSystem = {

  // /ticket panel
  async panel(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    const embed = new EmbedBuilder()
      .setColor(config.colors.ticket)
      .setTitle('🎫 Ticket System')
      .setDescription(
        '**Willkommen beim Support!**\n\n' +
        'Bitte wähle unten eine Kategorie aus um ein Ticket zu öffnen.\n' +
        'Unser Team wird sich so schnell wie möglich um dein Anliegen kümmern.\n\n' +
        '🛠️ **Support** — Allgemeine Hilfe & Fragen\n' +
        '👑 **Highteam** — Anliegen ans Highteam\n' +
        '🏘️ **Fraktion** — Fraktions-Angelegenheiten\n' +
        '🔓 **Entbannung** — Entbannungsantrag stellen\n\n' +
        '*Erstelle kein Spam-Ticket — Missbrauch wird bestraft.*'
      )
      .setFooter({ text: 'TicketSystem • Bitte wähle eine Kategorie', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_open')
      .setPlaceholder('📋 Wähle eine Ticket-Kategorie...')
      .addOptions([
        {
          label: 'Support Ticket',
          description: 'Allgemeine Hilfe, Fragen & Probleme',
          value: 'support',
          emoji: '🛠️',
        },
        {
          label: 'Highteam Ticket',
          description: 'Anliegen direkt ans Highteam',
          value: 'highteam',
          emoji: '👑',
        },
        {
          label: 'Fraktions Ticket',
          description: 'Fraktions-Anfragen & Angelegenheiten',
          value: 'fraktion',
          emoji: '🏘️',
        },
        {
          label: 'Entbannung',
          description: 'Entbannungsantrag stellen',
          value: 'unban',
          emoji: '🔓',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `${config.emojis.success} Ticket-Panel wurde gesendet!` });
  },

  // /ticket close
  async close(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) {
      return interaction.editReply({ content: `${config.emojis.error} Dieser Kanal ist kein aktives Ticket!` });
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription('⚠️ Ticket wird geschlossen... Transcript wird erstellt.')
      ]
    });

    await closeTicket(interaction.channel, ticket, interaction.user, client);
  },

  // /ticket assign
  async assign(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

    const target = interaction.options.getUser('user');
    ticket.assignedTo = target.id;
    await ticket.save();

    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription(`${config.emojis.team} Ticket wurde **<@${target.id}>** zugewiesen von **${interaction.user.tag}**`)
        .setTimestamp()
      ]
    });

    try {
      await target.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('📋 Ticket zugewiesen')
          .setDescription(`Dir wurde ein Ticket in **${interaction.guild.name}** zugewiesen!\n\nTicket: ${interaction.channel}`)
          .setTimestamp()
        ]
      });
    } catch {}
  },

  // /ticket claim
  async claim(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

    ticket.claimedBy = interaction.user.id;
    ticket.status    = 'claimed';
    await ticket.save();

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${config.emojis.success} **${interaction.user.tag}** hat dieses Ticket übernommen!`)
        .setTimestamp()
      ]
    });
  },

  // /ticket unclaim
  async unclaim(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: 'claimed' });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Dieses Ticket wurde nicht geclaimt!` });

    ticket.claimedBy = null;
    ticket.status    = 'open';
    await ticket.save();

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`↩️ **${interaction.user.tag}** hat das Ticket zurückgegeben.`)
        .setTimestamp()
      ]
    });
  },

  // /ticket priority
  async priority(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

    const stufe = interaction.options.getString('stufe');
    ticket.priority = stufe;
    await ticket.save();

    const prio = PRIORITY[stufe];
    await interaction.channel.setName(`${prio.label.split(' ')[0]}-ticket-${ticket.ticketNumber}`).catch(() => {});

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(prio.color)
        .setDescription(`${config.emojis.pin} Priorität wurde auf **${prio.label}** gesetzt von **${interaction.user.tag}**`)
        .setTimestamp()
      ]
    });
  },

  // /ticket note
  async note(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

    const text = interaction.options.getString('text');
    ticket.notes.push({ authorId: interaction.user.id, content: text });
    await ticket.save();

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`${config.emojis.note} Notiz hinzugefügt`)
        .setDescription(text)
        .setFooter({ text: `Von: ${interaction.user.tag}` })
        .setTimestamp()
      ]
    });
  },

  // /ticket transfer
  async transfer(interaction, client) {
    await interaction.deferReply();

    const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
    if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

    const target = interaction.options.getUser('user');
    const old    = ticket.claimedBy;
    ticket.claimedBy  = target.id;
    ticket.assignedTo = target.id;
    await ticket.save();

    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    });
    if (old) {
      await interaction.channel.permissionOverwrites.delete(old).catch(() => {});
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription(`🔄 Ticket wurde von **${interaction.user.tag}** an <@${target.id}> übergeben.`)
        .setTimestamp()
      ]
    });
  },
};

// ── Ticket öffnen (vom Select-Menu) ──────────────────────────────
async function openTicket(interaction, type, client) {
  await interaction.deferReply({ flags: 64 });

  const guild = interaction.guild;
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
  const typeInfo = TICKET_TYPES[type];

  // Doppel-Ticket Check
  const existing = await Ticket.findOne({ guildId: guild.id, userId: interaction.user.id, status: { $ne: 'closed' } });
  if (existing) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription(`${config.emojis.error} Du hast bereits ein offenes Ticket: <#${existing.channelId}>`)
      ],
    });
  }

  // Ticket-Nummer hochzählen
  if (!guildConfig) {
    return interaction.reply({ content: `${config.emojis.error} Bot nicht konfiguriert!`, flags: 64 });
  }
  guildConfig.ticketCounter = (guildConfig.ticketCounter || 0) + 1;
  await guildConfig.save();

  const ticketNumber = guildConfig.ticketCounter;
  const channelName  = `${typeInfo.emoji}-ticket-${String(ticketNumber).padStart(4, '0')}`;

  // Kategorie
  const category = guildConfig.ticketCategory
    ? guild.channels.cache.get(guildConfig.ticketCategory)
    : null;

  // Kanal erstellen
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category || undefined,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
      // Team-Rollen
      ...(config.roles.team ? [{ id: config.roles.team, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
    ],
  });

  // DB speichern
  const ticket = await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    userId: interaction.user.id,
    type,
    ticketNumber,
  });

  // Ticket-Embed senden
  const embed = new EmbedBuilder()
    .setColor(typeInfo.color)
    .setTitle(`${typeInfo.emoji} ${typeInfo.label} #${String(ticketNumber).padStart(4, '0')}`)
    .setDescription(
      `Willkommen <@${interaction.user.id}>!\n\n` +
      `Danke für dein Ticket. Unser Team wird sich so schnell wie möglich um dein Anliegen kümmern.\n\n` +
      `**Bitte schildere dein Anliegen** so detailliert wie möglich.\n\n` +
      `> 📋 Ticket-Typ: **${typeInfo.label}**\n` +
      `> 🔢 Ticket-Nr: **#${String(ticketNumber).padStart(4, '0')}**\n` +
      `> 👤 Geöffnet von: <@${interaction.user.id}>\n` +
      `> 📅 Datum: <t:${Math.floor(Date.now() / 1000)}:F>`
    )
    .setFooter({ text: 'Verwende die Buttons unten zum Verwalten des Tickets.', iconURL: guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Übernehmen')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_close_btn')
      .setLabel('Ticket schließen')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_transcript_btn')
      .setLabel('Transcript')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [controlRow] });

  // Antwort an User
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.success)
      .setDescription(`${config.emojis.success} Dein Ticket wurde erstellt: <#${channel.id}>`)
    ],
  });

  // Log
  if (guildConfig.ticketLogs) {
    const logCh = guild.channels.cache.get(guildConfig.ticketLogs);
    if (logCh) {
      logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(typeInfo.color)
          .setTitle(`${config.emojis.ticket} Neues Ticket geöffnet`)
          .addFields(
            { name: 'Typ', value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
            { name: 'Benutzer', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Kanal', value: `<#${channel.id}>`, inline: true },
            { name: 'Nr.', value: `#${String(ticketNumber).padStart(4, '0')}`, inline: true },
          )
          .setTimestamp()
        ]
      }).catch(() => {});
    }
  }
}

// ── Ticket schließen ─────────────────────────────────────────────
async function closeTicket(channel, ticket, closedBy, client) {
  const guild = channel.guild;
  const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

  // Transcript generieren
  const transcript = await generateTranscript(channel);
  const { AttachmentBuilder } = require('discord.js');
  const attachment = new AttachmentBuilder(transcript, { name: `transcript-ticket-${ticket.ticketNumber}.html` });

  // Log mit Transcript
  if (guildConfig?.ticketLogs) {
    const logCh = guild.channels.cache.get(guildConfig.ticketLogs);
    if (logCh) {
      const typeInfo = TICKET_TYPES[ticket.type] || { label: ticket.type, emoji: '🎫', color: 0x5865F2 };
      await logCh.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`🔒 Ticket geschlossen`)
          .addFields(
            { name: 'Typ', value: `${typeInfo.emoji} ${typeInfo.label}`, inline: true },
            { name: 'Geöffnet von', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Geschlossen von', value: `${closedBy.tag}`, inline: true },
            { name: 'Bearbeiter', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Niemand', inline: true },
            { name: 'Dauer', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>`, inline: true },
            { name: 'Notizen', value: ticket.notes.length ? `${ticket.notes.length} Notiz(en)` : 'Keine', inline: true },
          )
          .setTimestamp()
        ],
        files: [attachment],
      }).catch(() => {});
    }
  }

  // Transcript an Ticket-Ersteller senden
  try {
    const ticketUser = await client.users.fetch(ticket.userId);
    await ticketUser.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📋 Dein Ticket wurde geschlossen')
        .setDescription(`Dein Ticket **#${String(ticket.ticketNumber).padStart(4, '0')}** in **${guild.name}** wurde geschlossen.\nIm Anhang findest du den Transcript.`)
        .setTimestamp()
      ],
      files: [new AttachmentBuilder(transcript, { name: `transcript-ticket-${ticket.ticketNumber}.html` })],
    });
  } catch {}

  // Team-Stats aktualisieren
  if (ticket.claimedBy) {
    await TeamMember.findOneAndUpdate(
      { guildId: guild.id, userId: ticket.claimedBy },
      { $inc: { 'stats.closedTickets': 1 } }
    );
  }

  // DB aktualisieren
  ticket.status   = 'closed';
  ticket.closedAt = new Date();
  await ticket.save();

  // Kanal löschen nach 5 Sekunden
  setTimeout(() => channel.delete('Ticket geschlossen').catch(() => {}), 5000);
}

module.exports = { ticketSystem, openTicket, closeTicket, generateTranscript, TICKET_TYPES };
