require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// ─── Client Setup ───────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.giveaways = new Collection();
client.antiSpam = new Collection();

// ─── Handler laden ───────────────────────────────────────────────
const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(f => f.endsWith('.js'));
for (const file of handlerFiles) {
  require(path.join(handlersPath, file))(client);
}

// ─── MongoDB verbinden ───────────────────────────────────────────
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB verbunden'))
    .catch(err => console.error('❌ MongoDB Fehler:', err));
}

// ─── Bot starten ─────────────────────────────────────────────────
client.login(process.env.BOT_TOKEN).then(() => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
});

module.exports = client;
