const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎁 Giveaway verwalten')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('🎉 Neues Giveaway starten')
    )
    .addSubcommand(sub =>
      sub.setName('end')
        .setDescription('🏁 Giveaway vorzeitig beenden')
        .addStringOption(o =>
          o.setName('message_id')
            .setDescription('Message-ID des Giveaways')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reroll')
        .setDescription('🔄 Gewinner neu auslosen')
        .addStringOption(o =>
          o.setName('message_id')
            .setDescription('Message-ID des Giveaways')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('📋 Aktive Giveaways anzeigen')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      // Modal öffnen
      const modal = new ModalBuilder()
        .setCustomId('giveaway_create')
        .setTitle('🎁 Giveaway erstellen');

      const prizeInput = new TextInputBuilder()
        .setCustomId('giveaway_prize')
        .setLabel('🎁 Preis / Was wird verlost?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. Nitro Classic, VIP-Rolle, 10€ Steam-Guthaben...')
        .setRequired(true)
        .setMaxLength(200);

      const durationInput = new TextInputBuilder()
        .setCustomId('giveaway_duration')
        .setLabel('⏰ Dauer (z.B. 10m, 2h, 1d, 7d)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10m = 10 Minuten | 2h = 2 Stunden | 1d = 1 Tag')
        .setRequired(true)
        .setMaxLength(10);

      const winnersInput = new TextInputBuilder()
        .setCustomId('giveaway_winners')
        .setLabel('🏆 Anzahl der Gewinner (1–9)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(true)
        .setMaxLength(1);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('giveaway_description')
        .setLabel('📝 Beschreibung (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Zusätzliche Infos zum Giveaway...')
        .setRequired(false)
        .setMaxLength(500);

      const requirementInput = new TextInputBuilder()
        .setCustomId('giveaway_requirement')
        .setLabel('📋 Teilnahmebedingung (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. Mindestens Level 5, Member-Rolle benötigt...')
        .setRequired(false)
        .setMaxLength(200);

      modal.addComponents(
        new ActionRowBuilder().addComponents(prizeInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(winnersInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(requirementInput),
      );

      await interaction.showModal(modal);
      return;
    }

    const { giveawayUtil } = require('../../utils/giveawayUtil');

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      await giveawayUtil.end(interaction, messageId, client);
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      await giveawayUtil.reroll(interaction, messageId, client);
    }

    if (sub === 'list') {
      await giveawayUtil.list(interaction, client);
    }
  },
};
