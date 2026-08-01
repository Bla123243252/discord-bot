const { EmbedBuilder } = require('discord.js');
const config     = require('../config');
const EventModel = require('../models/Event');

// Wird von cron jede Minute aufgerufen
async function checkEvents(client) {
  const now = new Date();

  // Events die in 30 Minuten starten (Erinnerung)
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);
  const reminders = await EventModel.find({
    erinnerungGesendet: false,
    abgesagt:           false,
    datum:              { $gte: now, $lte: in30min },
  });

  for (const event of reminders) {
    event.erinnerungGesendet = true;
    await event.save();

    // Teilnehmer per DM benachrichtigen
    for (const userId of event.teilnehmer) {
      try {
        const user = await client.users.fetch(userId);
        const ts   = Math.floor(event.datum.getTime() / 1000);
        await user.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle(`${config.emojis.bell} Event Erinnerung: ${event.name}`)
            .setDescription(
              `Das Event **${event.name}** startet in ~30 Minuten!\n\n` +
              `> 📅 **Datum:** <t:${ts}:F>\n` +
              `> 📍 **Ort:** ${event.ort}\n\n` +
              `Viel Spaß! 🎉`
            )
            .setTimestamp()
          ]
        });
      } catch {}
    }

    // Kanal-Ping
    try {
      const guild   = client.guilds.cache.get(event.guildId);
      const channel = guild?.channels.cache.get(event.channelId);
      if (channel && event.teilnehmer.length > 0) {
        const ts = Math.floor(event.datum.getTime() / 1000);
        await channel.send({
          content: event.teilnehmer.map(id => `<@${id}>`).join(' '),
          embeds: [new EmbedBuilder()
            .setColor(config.colors.gold)
            .setDescription(
              `${config.emojis.bell} **Erinnerung:** Das Event **${event.name}** startet <t:${ts}:R>!\n📍 ${event.ort}`
            )
            .setTimestamp()
          ],
        });
      }
    } catch {}
  }
}

module.exports = { checkEvents };
