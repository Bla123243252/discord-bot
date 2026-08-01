const { Schema, model } = require('mongoose');

const eventSchema = new Schema({
  guildId:       { type: String, required: true },
  channelId:     { type: String, required: true },
  messageId:     { type: String, default: null },
  name:          { type: String, required: true },
  beschreibung:  { type: String, default: '' },
  ort:           { type: String, default: 'Wird bekannt gegeben' },
  datum:         { type: Date, required: true },
  createdBy:     { type: String, required: true },
  teilnehmer:    [String],
  abgesagt:      { type: Boolean, default: false },
  erinnerungGesendet: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Event', eventSchema);
