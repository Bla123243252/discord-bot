const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ComponentType,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  async execute(interaction, client) {
    if (interaction.customId !== 'embed_create') return;

    const title       = interaction.fields.getTextInputValue('embed_title') || null;
    const description = interaction.fields.getTextInputValue('embed_description');
    const colorRaw    = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
    const footer      = interaction.fields.getTextInputValue('embed_footer') || null;
    const imageUrl    = interaction.fields.getTextInputValue('embed_image') || null;

    // Farbe validieren
    const colorHex = /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw : '#5865F2';

    // Embed aufbauen
    const embed = new EmbedBuilder()
      .setColor(colorHex)
      .setDescription(description)
      .setTimestamp();

    if (title)   embed.setTitle(title);
    if (footer)  embed.setFooter({ text: footer, iconURL: interaction.guild.iconURL({ dynamic: true }) });
    if (imageUrl) {
      try { embed.setImage(imageUrl); } catch {}
    }

    // Preview + Kanal-Auswahl
    const previewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('embed_send_here')
        .setLabel('Hier senden')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('embed_send_other')
        .setLabel('In anderen Kanal senden')
        .setEmoji('📡')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('embed_cancel')
        .setLabel('Abbrechen')
        .setEmoji('✖️')
        .setStyle(ButtonStyle.Danger),
    );

    const preview = await interaction.reply({
      content: '👀 **Vorschau deines Embeds** — Wohin soll er gesendet werden?',
      embeds: [embed],
      components: [previewRow],
      flags: 64,
    });

    const collector = preview.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'embed_cancel') {
        await btn.update({ content: `${config.emojis.error} Abgebrochen.`, embeds: [], components: [] });
        return collector.stop();
      }

      if (btn.customId === 'embed_send_here') {
        await interaction.channel.send({ embeds: [embed] });
        await btn.update({ content: `${config.emojis.success} Embed wurde in <#${interaction.channel.id}> gesendet!`, embeds: [], components: [] });
        return collector.stop();
      }

      if (btn.customId === 'embed_send_other') {
        // Kanal-Auswahl via Select-Menu
        const channelSelect = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId('embed_channel_select')
            .setPlaceholder('📡 Kanal auswählen...')
            .setMinValues(1)
            .setMaxValues(1)
        );

        await btn.update({
          content: '📡 In welchen Kanal soll der Embed gesendet werden?',
          embeds: [embed],
          components: [channelSelect],
        });

        const selectCollector = preview.createMessageComponentCollector({
          componentType: ComponentType.ChannelSelect,
          time: 30_000,
          max: 1,
          filter: i => i.user.id === interaction.user.id,
        });

        selectCollector.on('collect', async (select) => {
          const targetChannel = select.channels.first();
          if (!targetChannel) return;
          try {
            await targetChannel.send({ embeds: [embed] });
            await select.update({
              content: `${config.emojis.success} Embed wurde in <#${targetChannel.id}> gesendet!`,
              embeds: [],
              components: [],
            });
          } catch {
            await select.update({
              content: `${config.emojis.error} Konnte nicht in diesen Kanal senden (fehlende Rechte?).`,
              embeds: [],
              components: [],
            });
          }
          collector.stop();
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
