const { Schema, model } = require('mongoose');

const warnSchema = new Schema({
  guildId:    { type: String, required: true },
  userId:     { type: String, required: true },
  warns: [{
    moderatorId: String,
    reason:      String,
    warnId:      String,
    createdAt:   { type: Date, default: Date.now },
  }],
});

module.exports = model('Warn', warnSchema);
