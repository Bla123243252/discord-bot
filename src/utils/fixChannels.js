require('dotenv').config();
const mongoose    = require('mongoose');
const GuildConfig = require('../models/GuildConfig');

mongoose.connect(process.env.MONGO_URI).then(async () => {

  const result = await GuildConfig.findOneAndUpdate(
    { guildId: process.env.GUILD_ID },
    {
      $set: {
        logChannel:       process.env.CHANNEL_LOGS,
        modLogChannel:    process.env.CHANNEL_MOD_LOGS,
        ticketLogs:       process.env.CHANNEL_TICKET_LOGS,
        joinLeaveChannel: process.env.CHANNEL_JOIN_LEAVE,
        voiceLogChannel:  process.env.CHANNEL_VOICE_LOGS,
        welcomeChannel:   process.env.CHANNEL_WELCOME,
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Alle Kanäle in der Datenbank aktualisiert:');
  console.log('   logChannel:      ', result.logChannel);
  console.log('   modLogChannel:   ', result.modLogChannel);
  console.log('   ticketLogs:      ', result.ticketLogs);
  console.log('   joinLeaveChannel:', result.joinLeaveChannel);
  console.log('   voiceLogChannel: ', result.voiceLogChannel);
  console.log('   welcomeChannel:  ', result.welcomeChannel);
  process.exit(0);

}).catch(err => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});
