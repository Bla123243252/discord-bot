const { Schema, model } = require('mongoose');

const applicationSchema = new Schema({
  guildId:     { type: String, required: true },
  userId:      { type: String, required: true },
  channelId:   { type: String, required: true },
  messageId:   { type: String, default: null },
  position:    { type: String, required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected', 'waitlist'], default: 'pending' },
  reviewedBy:  { type: String, default: null },
  reason:      { type: String, default: null },
  answers:     [{ question: String, answer: String }],
}, { timestamps: true });

module.exports = model('Application', applicationSchema);
