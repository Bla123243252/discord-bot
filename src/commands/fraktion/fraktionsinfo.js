const {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fraktionsinfo')
    .setDescription('🏘️ Offizielle Fraktions-Nachricht in einen Kanal posten')
    .addChannelOption(o =>
      o.setName('kanal')
        .setDescription('In welchen Kanal soll die Nachricht gepostet werden?')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const targetChannel = interaction.options.getChannel('kanal');

    const modal = new ModalBuilder()
      .setCustomId(`fraktionsinfo_post_${targetChannel.id}_none`)
      .setTitle('🏘️ Fraktions-Info posten');

    const titelInput = new TextInputBuilder()
      .setCustomId('fi_titel')
      .setLabel('Titel')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. Hiermit ist die Fraktion Valencia Offiziell!')
      .setRequired(true)
      .setMaxLength(100);

    const nachrichtInput = new TextInputBuilder()
      .setCustomId('fi_nachricht')
      .setLabel('Nachricht / Inhalt')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('z.B.\nTestphase: 3 Tage\n\nMit freundlichen Grüßen\n@Vision | marvin perry')
      .setRequired(true)
      .setMaxLength(2000);

    const extraInput = new TextInputBuilder()
      .setCustomId('fi_extra')
      .setLabel('Extra Infos (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('PLZ: 1234 | Anforderungen: ...')
      .setRequired(false)
      .setMaxLength(300);

    const pingInput = new TextInputBuilder()
      .setCustomId('fi_ping')
      .setLabel('Ping? (@here / @everyone / leer = kein Ping)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@here')
      .setRequired(false)
      .setMaxLength(20);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titelInput),
      new ActionRowBuilder().addComponents(nachrichtInput),
      new ActionRowBuilder().addComponents(extraInput),
      new ActionRowBuilder().addComponents(pingInput),
    );

    await interaction.showModal(modal);
  },
};
