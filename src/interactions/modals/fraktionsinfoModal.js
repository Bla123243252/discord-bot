const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const config   = require('../../config');
const Fraktion = require('../../models/Fraktion');

module.exports = {
  async execute(interaction, client) {
    if (!interaction.customId.startsWith('fraktionsinfo_post_')) return;

    // customId: fraktionsinfo_post_CHANNELID_FRAKTIONID
    const parts       = interaction.customId.replace('fraktionsinfo_post_', '').split('_');
    const channelId   = parts[0];
    const fraktionId  = parts[1];

    const titel    = interaction.fields.getTextInputValue('fi_titel').trim();
    const nachricht = interaction.fields.getTextInputValue('fi_nachricht').trim();
    const extra     = interaction.fields.getTextInputValue('fi_extra').trim() || null;
    const pingRaw   = interaction.fields.getTextInputValue('fi_ping').trim().toLowerCase() || null;

    // Fraktion laden falls vorhanden
    let fraktion = null;
    if (fraktionId && fraktionId !== 'none') {
      fraktion = await Fraktion.findById(fraktionId).catch(() => null);
    }

    // Zielkanal
    const targetChannel = interaction.guild.channels.cache.get(channelId);
    if (!targetChannel) {
      return interaction.reply({
        content: `${config.emojis.error} Kanal nicht gefunden!`,
        ephemeral: true,
      });
    }

    // Farbe der Fraktion oder Standard
    const farbe = fraktion?.farbe
      ? parseInt(fraktion.farbe.replace('#', ''), 16)
      : config.colors.primary;

    // ── Embed bauen (wie im Screenshot) ──────────────────────
    const embed = new EmbedBuilder()
      .setColor(farbe)
      .setTitle(`${fraktion?.emoji || '🏘️'} ${titel}`)
      .setDescription(nachricht)
      .setTimestamp();

    // Extra-Infos als Field
    if (extra) {
      embed.addFields({ name: '📋 Weitere Informationen', value: extra, inline: false });
    }

    // Fraktion-Infos
    if (fraktion) {
      embed.addFields(
        { name: '🔤 Fraktion', value: `${fraktion.emoji} **${fraktion.name}** [\`${fraktion.kuerzel}\`]`, inline: true },
        { name: '📮 PLZ',      value: fraktion.plz || 'Nicht angegeben',                                   inline: true },
      );
    }

    embed.setFooter({
      text: `${interaction.guild.name}  •  Mit freundlichen Grüßen`,
      iconURL: interaction.guild.iconURL({ dynamic: true }),
    });

    // Unterschrift
    embed.addFields({
      name: '\u200b',
      value: `*Mit freundlichen Grüßen*\n<@${interaction.user.id}> | ${interaction.member.displayName}`,
      inline: false,
    });

    // Ping
    let pingContent = '';
    if (pingRaw === '@everyone') pingContent = '@everyone';
    else if (pingRaw === '@here') pingContent = '@here';

    // ── Vorschau ──────────────────────────────────────────────
    const previewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('fi_confirm')
        .setLabel('Jetzt posten')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('fi_cancel')
        .setLabel('Abbrechen')
        .setEmoji('✖️')
        .setStyle(ButtonStyle.Danger),
    );

    const preview = await interaction.reply({
      content: `👀 **Vorschau** — wird in <#${channelId}> gepostet:`,
      embeds:     [embed],
      components: [previewRow],
      ephemeral:  true,
    });

    const collector = preview.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time:          60_000,
      max:           1,
      filter:        i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'fi_cancel') {
        await btn.update({ content: `${config.emojis.error} Abgebrochen.`, embeds: [], components: [] });
        return;
      }

      // Posten
      try {
        await targetChannel.send({
          content:  pingContent || undefined,
          embeds:   [embed],
        });

        await btn.update({
          content:    `${config.emojis.success} Erfolgreich in <#${channelId}> gepostet!`,
          embeds:     [],
          components: [],
        });
      } catch {
        await btn.update({
          content:    `${config.emojis.error} Konnte nicht senden — fehlende Rechte?`,
          embeds:     [],
          components: [],
        });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: '⏰ Zeit abgelaufen.', embeds: [], components: [] }).catch(() => {});
      }
    });
  }
};
