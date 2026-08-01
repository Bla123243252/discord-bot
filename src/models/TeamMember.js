const { Schema, model } = require('mongoose');

const teamMemberSchema = new Schema({
  guildId:        { type: String, required: true },
  userId:         { type: String, required: true },
  dienst:         { type: Boolean, default: false },
  dienstStart:    { type: Date, default: null },
  totalDienstzeit:{ type: Number, default: 0 },     // in Minuten
  pause:          { type: Boolean, default: false },
  pauseStart:     { type: Date, default: null },
  urlaub:         { type: Boolean, default: false },
  urlaubBis:      { type: Date, default: null },
  woche: {
    montag:    { type: Number, default: 0 },
    dienstag:  { type: Number, default: 0 },
    mittwoch:  { type: Number, default: 0 },
    donnerstag:{ type: Number, default: 0 },
    freitag:   { type: Number, default: 0 },
    samstag:   { type: Number, default: 0 },
    sonntag:   { type: Number, default: 0 },
  },
  stats: {
    tickets:       { type: Number, default: 0 },
    voiceMinutes:  { type: Number, default: 0 },
    warnings:      { type: Number, default: 0 },
    applications:  { type: Number, default: 0 },
    closedTickets: { type: Number, default: 0 },
    punkte:        { type: Number, default: 0 },
  },
  punkte:          { type: Number, default: 0 },
  notes:           { type: String, default: '' },
}, { timestamps: true });

module.exports = model('TeamMember', teamMemberSchema);
