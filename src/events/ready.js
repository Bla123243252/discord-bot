const { Events, ActivityType } = require('discord.js');
const cron = require('node-cron');
const Giveaway = require('../models/Giveaway');
const Event = require('../models/Event');
const { checkGiveaways } = require('../utils/giveawayUtil');
const { checkEvents } = require('../utils/eventUtil');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n🤖 Bot ist bereit: ${client.user.tag}`);
    console.log(`📊 Server: ${client.guilds.cache.size}`);
    console.log(`👥 User: ${client.users.cache.size}\n`);

    // Aktivitätsstatus setzen
    const activities = [
      { name: '🎮 RP Server', type: ActivityType.Playing },
      { name: '🛡️ Server schützen', type: ActivityType.Watching },
      { name: '🎫 Tickets bearbeiten', type: ActivityType.Watching },
      { name: '/help für Hilfe', type: ActivityType.Listening },
    ];

    let i = 0;
    setInterval(() => {
      client.user.setActivity(activities[i % activities.length].name, { type: activities[i % activities.length].type });
      i++;
    }, 15000);

    // Giveaway-Check alle 30 Sekunden
    cron.schedule('*/30 * * * * *', () => checkGiveaways(client));

    // Event-Check jede Minute
    cron.schedule('* * * * *', () => checkEvents(client));
  }
};
