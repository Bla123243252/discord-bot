const { Schema, model } = require('mongoose');

const giveawaySchema = new Schema({
  guildId:      { type: String, required: true },
  channelId:    { type: String, required: true },
  messageId:    { type: String, required: true },
  prize:        { type: String, required: true },
  winners:      { type: Number, required: true },
  endsAt:       { type: Date, required: true },
  hostedBy:     { type: String, required: true },
  participants: [String],
  ended:        { type: Boolean, default: false },
  winnerIds:    [String],
}, { timestamps: true });

module.exports = model('Giveaway', giveawaySchema);
