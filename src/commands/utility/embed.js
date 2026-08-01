const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('📝 Erstelle einen individuellen Embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    // Modal mit allen Embed-Feldern
    const modal = new ModalBuilder()
      .setCustomId('embed_create')
      .setTitle('📝 Embed erstellen');

    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Titel')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. Server-Ankündigung 📢')
      .setRequired(false)
      .setMaxLength(256);

    const descInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Beschreibung')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Schreibe hier den Inhalt des Embeds...')
      .setRequired(true)
      .setMaxLength(4000);

    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Farbe (Hex-Code, z.B. #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('#5865F2')
      .setRequired(false)
      .setMaxLength(7);

    const footerInput = new TextInputBuilder()
      .setCustomId('embed_footer')
      .setLabel('Footer Text (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. © Mein RP Server')
      .setRequired(false)
      .setMaxLength(256);

    const imageInput = new TextInputBuilder()
      .setCustomId('embed_image')
      .setLabel('Bild-URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://example.com/bild.png')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(footerInput),
      new ActionRowBuilder().addComponents(imageInput),
    );

    await interaction.showModal(modal);
  },
};
