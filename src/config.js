module.exports = {
  // ── Farben ──────────────────────────────────────────────────────
  colors: {
    primary:   0x5865F2,   // Discord Blau
    success:   0x57F287,   // Grün
    warning:   0xFEE75C,   // Gelb
    error:     0xED4245,   // Rot
    info:      0x5865F2,   // Blau
    gold:      0xFFD700,   // Gold
    dark:      0x2B2D31,   // Dunkel
    ticket:    0x00B0F4,   // Ticket Blau
    mod:       0xFF6B35,   // Mod Orange
  },

  // ── Emojis ──────────────────────────────────────────────────────
  emojis: {
    success:   '✅',
    error:     '❌',
    warning:   '⚠️',
    info:      'ℹ️',
    loading:   '🔄',
    ticket:    '🎫',
    support:   '🛠️',
    highteam:  '👑',
    fraktion:  '🏘️',
    unban:     '🔓',
    mod:       '🔨',
    team:      '👥',
    event:     '🎉',
    giveaway:  '🎁',
    log:       '📝',
    warn:      '⚠️',
    ban:       '🔨',
    kick:      '👢',
    mute:      '🔇',
    time:      '⏰',
    stats:     '📊',
    check:     '✔️',
    star:      '⭐',
    crown:     '👑',
    shield:    '🛡️',
    bell:      '🔔',
    pin:       '📌',
    note:      '📋',
    user:      '👤',
    server:    '🌐',
  },

  // ── Rollen-IDs (aus .env laden) ──────────────────────────────────
  get roles() {
    return {
      fraktionsverwaltung: process.env.ROLE_FRAKTIONSVERWALTUNG,
      highteam:            process.env.ROLE_HIGHTEAM,
      moderator:           process.env.ROLE_MODERATOR,
      supporter:           process.env.ROLE_SUPPORTER,
      team:                process.env.ROLE_TEAM,
      member:              process.env.ROLE_MEMBER,
    };
  },

  // ── Kanal-IDs (aus .env laden) ───────────────────────────────────
  get channels() {
    return {
      logs:            process.env.CHANNEL_LOGS,
      modLogs:         process.env.CHANNEL_MOD_LOGS,
      ticketLogs:      process.env.CHANNEL_TICKET_LOGS,
      joinLeave:       process.env.CHANNEL_JOIN_LEAVE,
      voiceLogs:       process.env.CHANNEL_VOICE_LOGS,
      welcome:         process.env.CHANNEL_WELCOME,
      ticketCategory:  process.env.CATEGORY_TICKETS,
      transcripts:     process.env.CHANNEL_TRANSCRIPTS,
      applications:    process.env.CHANNEL_APPLICATIONS,
      teamInfo:        process.env.CHANNEL_TEAM_INFO,
      teamUpdate:      process.env.CHANNEL_TEAM_UPDATE,
      giveaways:       process.env.CHANNEL_GIVEAWAYS,
    };
  },

  // ── Anti-Spam Einstellungen ──────────────────────────────────────
  antiSpam: {
    maxMessages:   5,
    timeWindow:    5000,   // 5 Sekunden
    muteTime:      300,    // 5 Minuten in Sekunden
  },

  // ── Anti-Raid Einstellungen ──────────────────────────────────────
  antiRaid: {
    joinThreshold:  10,    // Joins innerhalb von timeWindow
    timeWindow:     10000, // 10 Sekunden
  },

  // ── Erlaubte Domains (Anti-Link) ─────────────────────────────────
  allowedDomains: [
    'discord.gg',
    'discord.com',
  ],

  // ── Giveaway Einstellungen ───────────────────────────────────────
  giveaway: {
    emoji:     '🎁',
    joinEmoji: '✔️',
  },
};
