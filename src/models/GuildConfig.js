const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
  guildId:          { type: String, required: true, unique: true },
  antiSpam:         { type: Boolean, default: true },
  antiLink:         { type: Boolean, default: false },
  antiRaid:         { type: Boolean, default: true },
  antiBot:          { type: Boolean, default: false },
  welcomeEnabled:   { type: Boolean, default: false },
  welcomeChannel:   { type: String, default: null },
  welcomeMessage:   { type: String, default: 'Willkommen {user} auf {server}! 🎉' },
  leaveChannel:     { type: String, default: null },
  logChannel:       { type: String, default: null },
  modLogChannel:    { type: String, default: null },
  ticketCategory:   { type: String, default: null },
  ticketLogs:       { type: String, default: null },
  joinLeaveChannel: { type: String, default: null },
  voiceLogChannel:  { type: String, default: null },
  ticketCounter:    { type: Number, default: 0 },
  autoRole:         { type: String, default: null },
});

module.exports = model('GuildConfig', guildConfigSchema);
