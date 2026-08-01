const { openTicket } = require('../../utils/ticketUtil');

// Verhindert doppelte Ausführung
const processing = new Set();

module.exports = {
  async execute(interaction, client) {
    if (interaction.customId !== 'ticket_open') return;

    const key = `${interaction.user.id}-${interaction.guild.id}`;

    // Doppelklick-Schutz
    if (processing.has(key)) {
      return interaction.reply({
        content: '⏳ Dein Ticket wird bereits erstellt, bitte warte...',
        flags: 64,
      });
    }

    processing.add(key);
    setTimeout(() => processing.delete(key), 10000);

    const type = interaction.values[0];
    await openTicket(interaction, type, client);
  }
};
