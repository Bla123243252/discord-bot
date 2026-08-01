const { Events, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {

    // ── Autocomplete ────────────────────────────────────────────
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        await command.autocomplete(interaction, client).catch(console.error);
      }
      return;
    }

    // ── Slash Commands ──────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Cooldown-Check
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown ?? 3) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expiration = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expiration) {
          const remaining = ((expiration - now) / 1000).toFixed(1);
          return interaction.reply({
            embeds: [new EmbedBuilder()
              .setColor(0xFF4444)
              .setDescription(`⏳ Warte noch **${remaining}s** bevor du \`/${command.data.name}\` erneut nutzt.`)
            ],
            ephemeral: true
          });
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Fehler bei /${command.data.name}:`, err);
        const reply = { embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Ein Fehler ist aufgetreten.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // ── Button Interactions ─────────────────────────────────────
    if (interaction.isButton()) {
      const [prefix] = interaction.customId.split('_');

      // Dynamisches Button-Routing
      const buttonHandlers = {
        ticket:      '../interactions/buttons/ticketButtons',
        giveaway:    '../interactions/buttons/giveawayButtons',
        application: '../interactions/buttons/applicationButtons',
        team:        '../interactions/buttons/teamButtons',
        event:       '../interactions/buttons/eventButtons',
        poll:        '../interactions/buttons/pollButtons',
        verify:      '../interactions/buttons/verifyButtons',
      };

      const handlerPath = buttonHandlers[prefix];
      if (handlerPath) {
        try {
          const mod = require(handlerPath);
          await mod.execute(interaction, client);
        } catch (err) {
          console.error(`❌ Button-Handler Fehler [${prefix}]:`, err);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Fehler beim Verarbeiten.', ephemeral: true }).catch(() => {});
          }
        }
      }
      return;
    }

    // ── Select Menu Interactions ────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const [prefix] = interaction.customId.split('_');
      const selectHandlers = {
        ticket: '../interactions/selects/ticketSelects',
        moderation: '../interactions/selects/moderationSelects',
      };
      const handlerPath = selectHandlers[prefix];
      if (handlerPath) {
        try {
          const mod = require(handlerPath);
          await mod.execute(interaction, client);
        } catch (err) {
          console.error(`❌ Select-Handler Fehler [${prefix}]:`, err);
        }
      }
      return;
    }

    // ── Modal Interactions ──────────────────────────────────────
    if (interaction.isModalSubmit()) {
      const [prefix] = interaction.customId.split('_');
      const modalHandlers = {
        embed:          '../interactions/modals/embedModal',
        ticket:         '../interactions/modals/ticketModal',
        giveaway:       '../interactions/modals/giveawayModal',
        fraktion:       '../interactions/modals/fraktionModal',
        fraktionsinfo:  '../interactions/modals/fraktionsinfoModal',
        event:          '../interactions/modals/eventModal',
        note:           '../interactions/modals/noteModal',
        application:    '../interactions/modals/applicationModal',
        changelog:      '../interactions/modals/changelogModal',
        appMsg:         '../interactions/modals/appMsgModal',
      };
      const handlerPath = modalHandlers[prefix];
      if (handlerPath) {
        try {
          const mod = require(handlerPath);
          await mod.execute(interaction, client);
        } catch (err) {
          console.error(`❌ Modal-Handler Fehler [${prefix}]:`, err);
        }
      }
      return;
    }
  });
};
