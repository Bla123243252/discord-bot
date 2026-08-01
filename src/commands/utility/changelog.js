const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('📋 Changelog / Update veröffentlichen')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('post')
        .setDescription('🆕 Neuen Changelog posten')
        .addChannelOption(o =>
          o.setName('kanal')
            .setDescription('Kanal in dem der Changelog gepostet wird')
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;

    // ── Modal öffnen ──────────────────────────────────────────
    const modal = new ModalBuilder()
      .setCustomId(`changelog_post_${targetChannel.id}`)
      .setTitle('📋 Changelog erstellen');

    const titleInput = new TextInputBuilder()
      .setCustomId('changelog_title')
      .setLabel('📌 Titel (z.B. "Neues Update auf Revo City")')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Neues Update auf Revo City gepusht')
      .setRequired(true)
      .setMaxLength(100);

    const changesInput = new TextInputBuilder()
      .setCustomId('changelog_changes')
      .setLabel('📝 Änderungen (jede Zeile = ein Punkt)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        'Fishing Fixxed\nCoinshop fixxed + hinzugefügt Nightmarket & Decks\nCarshop fixxed\nClothshop fixxed\nNeue Routen erstellt'
      )
      .setRequired(true)
      .setMaxLength(2000);

    const kommentarInput = new TextInputBuilder()
      .setCustomId('changelog_kommentar')
      .setLabel('💬 Kommentar (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('all changes by Vision_OC')
      .setRequired(false)
      .setMaxLength(300);

    const versionInput = new TextInputBuilder()
      .setCustomId('changelog_version')
      .setLabel('🔢 Version (optional, z.B. v1.2.3)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('v1.2.3')
      .setRequired(false)
      .setMaxLength(20);

    const pingInput = new TextInputBuilder()
      .setCustomId('changelog_ping')
      .setLabel('🔔 Ping? (@here / @everyone / leer = kein Ping)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@here')
      .setRequired(false)
      .setMaxLength(20);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(changesInput),
      new ActionRowBuilder().addComponents(kommentarInput),
      new ActionRowBuilder().addComponents(versionInput),
      new ActionRowBuilder().addComponents(pingInput),
    );

    await interaction.showModal(modal);
  },
};
