const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🗑️ Nachrichten löschen')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o =>
      o.setName('anzahl')
        .setDescription('Anzahl der Nachrichten (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(o => o.setName('user').setDescription('Nur Nachrichten von diesem Benutzer löschen').setRequired(false)),

  async execute(interaction, client) {
    const anzahl = interaction.options.getInteger('anzahl');
    const user   = interaction.options.getUser('user');

    await interaction.deferReply({ flags: 64 });

    // Nachrichten holen
    let messages = await interaction.channel.messages.fetch({ limit: 100 });

    // Filtern nach User falls angegeben
    if (user) messages = messages.filter(m => m.author.id === user.id);

    // Nur die gewünschte Anzahl
    const toDelete = [...messages.values()].slice(0, anzahl);

    // Nur Nachrichten < 14 Tage können gebulk-deleted werden
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const deleteable  = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);

    if (!deleteable.length) {
      return interaction.editReply({ content: `${config.emojis.error} Keine löschbaren Nachrichten gefunden (älter als 14 Tage)!` });
    }

    const deleted = await interaction.channel.bulkDelete(deleteable, true).catch(() => null);

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(
          `${config.emojis.success} **${deleted?.size ?? 0}** Nachricht(en) gelöscht` +
          (user ? ` von **${user.tag}**` : '') +
          (deleteable.length < toDelete.length ? `\n⚠️ ${toDelete.length - deleteable.length} Nachrichten waren zu alt (>14 Tage).` : '')
        )
        .setTimestamp()
      ],
    });
  },
};
