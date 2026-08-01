// Poll-Button-Handler - Routing wird durch poll.js Collector abgedeckt
// Dieser Handler dient als Fallback für persistente Polls nach Neustart
module.exports = {
  async execute(interaction, client) {
    // Polls werden direkt im Command via Collector behandelt
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ Diese Abstimmung ist nicht mehr aktiv (Bot-Neustart). Bitte eine neue Abstimmung erstellen.',
        ephemeral: true,
      }).catch(() => {});
    }
  }
};
