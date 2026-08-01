// Einmaliges Setup-Script für Willkommensnachricht
require('dotenv').config();
const mongoose = require('mongoose');
const GuildConfig = require('../models/GuildConfig');

const GUILD_ID       = process.env.GUILD_ID;
const WELCOME_CHANNEL = '1480009212575536';

const WELCOME_MESSAGE = `👋 Willkommen auf **Zenith Roleplay**!

Hey {user}, willkommen auf unserem Discord! 🎉

Schön, dass du den Weg zu **Zenith Roleplay** gefunden hast. Wir freuen uns, dich in unserer Community begrüßen zu dürfen!

📌 Bevor du loslegst:
📖 Lies dir unsere Regeln sorgfältig durch.
🎭 Verifiziere dich, um Zugriff auf alle Kanäle zu erhalten.
🎫 Bei Fragen oder Problemen kannst du jederzeit ein Support-Ticket erstellen.

🚀 Das erwartet dich:
✨ Hochwertiges Roleplay
🚓 Viele Fraktionen und Jobs
🏎️ Eigene Fahrzeuge und einzigartige Scripts
🎁 Regelmäßige Events & Giveaways
🤝 Eine aktive und hilfsbereite Community

Wir wünschen dir viel Spaß und hoffen, dich bald auf unserem Server zu sehen!

**Dein Zenith Roleplay Team ❤️**`;

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await GuildConfig.findOneAndUpdate(
    { guildId: GUILD_ID },
    {
      $set: {
        welcomeChannel:  WELCOME_CHANNEL,
        welcomeMessage:  WELCOME_MESSAGE,
        welcomeEnabled:  true,
      }
    },
    { upsert: true, new: true }
  );
  console.log('✅ Willkommens-Konfiguration gespeichert!');
  console.log(`📢 Kanal: ${WELCOME_CHANNEL}`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
