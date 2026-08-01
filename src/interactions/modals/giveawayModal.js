const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { startGiveaway } = require('../../utils/giveawayUtil');

module.exports = {
  async execute(interaction, client) {
    if (interaction.customId !== 'giveaway_create') return;

    const prize       = interaction.fields.getTextInputValue('giveaway_prize');
    const durationRaw = interaction.fields.getTextInputValue('giveaway_duration').trim();
    const winnersRaw  = interaction.fields.getTextInputValue('giveaway_winners').trim();
    const description = interaction.fields.getTextInputValue('giveaway_description') || null;
    const requirement = interaction.fields.getTextInputValue('giveaway_requirement') || null;

    // Dauer parsen
    const ms = require('ms');
    const durationMs = ms(durationRaw);
    if (!durationMs || durationMs <= 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.error} Ungültige Dauer`)
          .setDescription('Bitte gib eine gültige Dauer an.\n\n**Beispiele:** `30s`, `10m`, `2h`, `1d`, `7d`')
        ],
        flags: 64,
      });
    }

    // Max 30 Tage
    if (durationMs > 30 * 24 * 60 * 60 * 1000) {
      return interaction.reply({
        content: `${config.emojis.error} Maximale Giveaway-Dauer: **30 Tage**!`,
        flags: 64,
      });
    }

    // Gewinner parsen (1–9)
    const winners = parseInt(winnersRaw);
    if (isNaN(winners) || winners < 1 || winners > 9) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.error} Ungültige Gewinnerzahl`)
          .setDescription('Die Anzahl der Gewinner muss zwischen **1 und 9** liegen.')
        ],
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const giveaway = await startGiveaway({
        channel:     interaction.channel,
        prize,
        description,
        requirement,
        durationMs,
        winners,
        hostedBy:    interaction.user.id,
      });

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${config.emojis.success} Giveaway gestartet!`)
          .addFields(
            { name: '🎁 Preis',      value: prize,                                                          inline: true },
            { name: '⏰ Dauer',      value: durationRaw,                                                    inline: true },
            { name: '🏆 Gewinner',   value: `${winners}`,                                                   inline: true },
            { name: '📅 Endet am',   value: `<t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:F>`,       inline: false },
          )
        ],
      });
    } catch (err) {
      console.error('Giveaway-Start Fehler:', err);
      await interaction.editReply({ content: `${config.emojis.error} Fehler beim Erstellen des Giveaways.` });
    }
  }
};
