const { Schema, model } = require('mongoose');

const fraktionSchema = new Schema({
  guildId:      { type: String, required: true },
  name:         { type: String, required: true },
  kuerzel:      { type: String, required: true },
  beschreibung: { type: String, default: '' },
  plz:          { type: String, default: '' },
  leiter:       { type: String, default: '' },
  co_leiter:    { type: String, default: '' },
  farbe:        { type: String, default: '#5865F2' },
  emoji:        { type: String, default: '🏘️' },
  roleId:       { type: String, default: null },
  channelId:    { type: String, default: null },
  mitglieder:   [{ userId: String, rang: String, joinedAt: { type: Date, default: Date.now } }],
  status:       { type: String, enum: ['aktiv', 'inaktiv', 'testphase'], default: 'aktiv' },
  testphaseTage:{ type: Number, default: 0 },
  gruendung:    { type: Date, default: Date.now },
  events:       [{ name: String, datum: Date, beschreibung: String }],
}, { timestamps: true });

module.exports = model('Fraktion', fraktionSchema);
