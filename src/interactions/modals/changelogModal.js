const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  async execute(interaction, client) {
    if (!interaction.customId.startsWith('changelog_post_')) return;

    const channelId   = interaction.customId.replace('changelog_post_', '');
    const title       = interaction.fields.getTextInputValue('changelog_title').trim();
    const changesRaw  = interaction.fields.getTextInputValue('changelog_changes').trim();
    const kommentar   = interaction.fields.getTextInputValue('changelog_kommentar').trim() || null;
    const version     = interaction.fields.getTextInputValue('changelog_version').trim() || null;
    const pingRaw     = interaction.fields.getTextInputValue('changelog_ping').trim().toLowerCase() || null;

    // ── Zielkanal holen ───────────────────────────────────────
    const targetChannel = interaction.guild.channels.cache.get(channelId) || interaction.channel;

    // ── Änderungen formatieren (jede Zeile = "– Eintrag") ────
    const changeLines = changesRaw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        // Führende Bindestriche/Punkte entfernen falls schon vorhanden
        const clean = line.replace(/^[-–•*]\s*/, '');
        return `– ${clean}`;
      });

    const changesText = changeLines.join('\n');

    // ── Timestamp ─────────────────────────────────────────────
    const now    = new Date();
    const dateDE = now.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeDE = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    // ── Embed bauen (so nah wie möglich am Screenshot) ────────
    const embed = new EmbedBuilder()
      .setColor(0x1E2A4A)   // Dunkles Blau wie im Screenshot
      .setTitle(`» ${title}${version ? `  •  ${version}` : ''}`)
      .setDescription(
        `\`\`\`\n${changesText}\n\`\`\``
      )
      .setFooter({
        text: `${interaction.guild.name}  •  System\nMade by ${interaction.user.username}  •  ${dateDE} ${timeDE}`,
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    // Kommentar als separates Field
    if (kommentar) {
      embed.addFields({
        name: `💬 Kommentar von @${interaction.user.username}:`,
        value: `**${kommentar}**`,
        inline: false,
      });
    }

    // ── Ping bestimmen ────────────────────────────────────────
    let pingContent = '';
    if (pingRaw === '@everyone') pingContent = '@everyone';
    else if (pingRaw === '@here') pingContent = '@here';
    else if (pingRaw?.match(/^<@&\d+>$/)) pingContent = pingRaw;

    // ── Preview anzeigen ──────────────────────────────────────
    const previewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('changelog_confirm')
        .setLabel('Jetzt posten')
        .setEmoji('📤')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('changelog_cancel')
        .setLabel('Abbrechen')
        .setEmoji('✖️')
        .setStyle(ButtonStyle.Danger),
    );

    const preview = await interaction.reply({
      content: `👀 **Vorschau** — wird in <#${targetChannel.id}> gepostet:`,
      embeds:     [embed],
      components: [previewRow],
      flags: 64,
    });

    const collector = preview.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time:          60_000,
      max:           1,
      filter:        i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'changelog_cancel') {
        await btn.update({
          content:    `${config.emojis.error} Abgebrochen.`,
          embeds:     [],
          components: [],
        });
        return;
      }

      // Posten
      try {
        await targetChannel.send({
          content: pingContent || undefined,
          embeds:  [embed],
        });

        await btn.update({
          content:
            `${config.emojis.success} Changelog wurde in <#${targetChannel.id}> gepostet!`,
          embeds:     [],
          components: [],
        });
      } catch (err) {
        console.error('Changelog post error:', err);
        await btn.update({
          content:    `${config.emojis.error} Konnte nicht in <#${targetChannel.id}> senden (fehlende Rechte?).`,
          embeds:     [],
          components: [],
        });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content:    '⏰ Zeit abgelaufen.',
          embeds:     [],
          components: [],
        }).catch(() => {});
      }
    });
  },
};
