const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Ticket-System verwalten')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('📋 Ticket-Panel in diesem Kanal senden')
    )
    .addSubcommand(sub =>
      sub.setName('close')
        .setDescription('🔒 Aktuelles Ticket schließen')
    )
    .addSubcommand(sub =>
      sub.setName('assign')
        .setDescription('👤 Ticket einem Teammitglied zuweisen')
        .addUserOption(o => o.setName('user').setDescription('Teammitglied').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('✋ Ticket übernehmen')
    )
    .addSubcommand(sub =>
      sub.setName('unclaim')
        .setDescription('↩️ Ticket zurückgeben')
    )
    .addSubcommand(sub =>
      sub.setName('priority')
        .setDescription('🔺 Ticket-Priorität setzen')
        .addStringOption(o =>
          o.setName('stufe')
            .setDescription('Status')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Offen',          value: 'offen' },
              { name: '🟠 In Bearbeitung', value: 'bearbeitung' },
              { name: '🔴 Fertig',          value: 'fertig' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('note')
        .setDescription('📋 Notiz zum Ticket hinzufügen')
        .addStringOption(o => o.setName('text').setDescription('Notiz-Text').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('transfer')
        .setDescription('🔄 Ticket an anderen Mitarbeiter weitergeben')
        .addUserOption(o => o.setName('user').setDescription('Neuer Bearbeiter').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { ticketSystem } = require('../../utils/ticketUtil');
    await ticketSystem[sub](interaction, client);
  },
};
