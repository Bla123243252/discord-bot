const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fraktioncreate')
    .setDescription('🏘️ Neue Fraktion gründen (nur Fraktionsverwaltung)'),

  async execute(interaction, client) {
    // ── Rollen-Check: nur Fraktionsverwaltung ───────────────────
    const fvRoleId = config.roles.fraktionsverwaltung;
    if (fvRoleId && !interaction.member.roles.cache.has(fvRoleId)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`${config.emojis.error} Keine Berechtigung`)
          .setDescription(
            `Du benötigst die Rolle <@&${fvRoleId}> um Fraktionen zu erstellen!\n\n` +
            `Falls du denkst das ist ein Fehler, wende dich an einen Administrator.`
          )
        ],
        ephemeral: true,
      });
    }

    // ── Modal öffnen ────────────────────────────────────────────
    const modal = new ModalBuilder()
      .setCustomId('fraktion_create')
      .setTitle('🏘️ Fraktion gründen');

    const nameInput = new TextInputBuilder()
      .setCustomId('fraktion_name')
      .setLabel('📛 Name der Fraktion')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. Los Santos Police Department')
      .setRequired(true)
      .setMaxLength(60);

    const kuerzelInput = new TextInputBuilder()
      .setCustomId('fraktion_kuerzel')
      .setLabel('🔤 Kürzel (2–6 Zeichen)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. LSPD')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(6);

    const plzInput = new TextInputBuilder()
      .setCustomId('fraktion_plz')
      .setLabel('📮 PLZ / Gebiet / Hauptsitz')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z.B. PLZ 1234 | Vinewood Hills | Legion Square')
      .setRequired(true)
      .setMaxLength(100);

    const beschreibungInput = new TextInputBuilder()
      .setCustomId('fraktion_beschreibung')
      .setLabel('📝 Beschreibung der Fraktion')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Worum geht es bei eurer Fraktion? Was sind eure Ziele? Wer kann beitreten?')
      .setRequired(true)
      .setMaxLength(800);

    const extraInput = new TextInputBuilder()
      .setCustomId('fraktion_extra')
      .setLabel('⚙️ Leiter | Farbe (Hex) | Emoji | Status')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('@User | #FF5733 | 🚔 | aktiv  (mit | trennen)')
      .setRequired(false)
      .setMaxLength(200);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(kuerzelInput),
      new ActionRowBuilder().addComponents(plzInput),
      new ActionRowBuilder().addComponents(beschreibungInput),
      new ActionRowBuilder().addComponents(extraInput),
    );

    await interaction.showModal(modal);
  },
};
