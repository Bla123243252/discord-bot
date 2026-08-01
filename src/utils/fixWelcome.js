require('dotenv').config();
const mongoose    = require('mongoose');
const GuildConfig = require('../models/GuildConfig');

mongoose.connect(process.env.MONGO_URI).then(async () => {

  const result = await GuildConfig.findOneAndUpdate(
    { guildId: process.env.GUILD_ID },
    {
      $set: {
        welcomeEnabled:  true,
        welcomeChannel:  process.env.CHANNEL_WELCOME,
        joinLeaveChannel: process.env.CHANNEL_JOIN_LEAVE,
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Welcome aktiviert!');
  console.log('   welcomeEnabled: ', result.welcomeEnabled);
  console.log('   welcomeChannel: ', result.welcomeChannel);
  console.log('   joinLeaveChannel:', result.joinLeaveChannel);
  console.log('   welcomeMessage:  ', result.welcomeMessage?.substring(0, 50) + '...');
  process.exit(0);

}).catch(err => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});
