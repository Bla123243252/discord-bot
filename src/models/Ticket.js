const { Schema, model } = require('mongoose');

const ticketSchema = new Schema({
  guildId:     { type: String, required: true },
  channelId:   { type: String, required: true },
  userId:      { type: String, required: true },
  type:        { type: String, enum: ['support', 'highteam', 'fraktion', 'unban'], required: true },
  status:      { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  claimedBy:   { type: String, default: null },
  assignedTo:  { type: String, default: null },
  priority:    { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  notes:       [{ authorId: String, content: String, createdAt: { type: Date, default: Date.now } }],
  ticketNumber:{ type: Number, required: true },
  createdAt:   { type: Date, default: Date.now },
  closedAt:    { type: Date, default: null },
}, { timestamps: true });

module.exports = model('Ticket', ticketSchema);
