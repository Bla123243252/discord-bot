const { EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const EventModel = require('../../models/Event');
const { buildEventEmbed } = require('../../commands/events/event');

module.exports = {
  async execute(interaction, client) {
    const { customId } = interaction;
    if (!['event_join', 'event_leave'].includes(customId)) return;

    const event = await EventModel.findOne({
      messageId: interaction.message.id,
      guildId:   interaction.guild.id,
    });

    if (!event) return interaction.reply({ content: `${config.emojis.error} Event nicht gefunden!`, flags: 64 });
    if (event.abgesagt) return interaction.reply({ content: `${config.emojis.error} Dieses Event wurde abgesagt!`, flags: 64 });
    if (event.datum < new Date()) return interaction.reply({ content: `${config.emojis.error} Dieses Event hat bereits stattgefunden!`, flags: 64 });

    const userId = interaction.user.id;

    if (customId === 'event_join') {
      if (event.teilnehmer.includes(userId)) {
        return interaction.reply({
          content: `${config.emojis.info} Du bist bereits als Teilnehmer eingetragen!`,
          flags: 64,
        });
      }
      event.teilnehmer.push(userId);
      await event.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} Du nimmst jetzt am Event **${event.name}** teil!\n📅 <t:${Math.floor(event.datum.getTime()/1000)}:F>`)
        ],
        flags: 64,
      });
    } else {
      if (!event.teilnehmer.includes(userId)) {
        return interaction.reply({ content: `${config.emojis.info} Du bist nicht als Teilnehmer eingetragen!`, flags: 64 });
      }
      event.teilnehmer = event.teilnehmer.filter(id => id !== userId);
      await event.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.warning} Du hast dich vom Event **${event.name}** abgemeldet.`)
        ],
        flags: 64,
      });
    }

    // Embed aktualisieren
    try {
      await interaction.message.edit({ embeds: [buildEventEmbed(event, interaction.guild)] });
    } catch {}
  }
};
