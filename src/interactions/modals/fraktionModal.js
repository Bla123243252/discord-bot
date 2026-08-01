const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ComponentType,
} = require('discord.js');
const config   = require('../../config');
const Fraktion = require('../../models/Fraktion');

module.exports = {
  async execute(interaction, client) {
    if (interaction.customId !== 'fraktion_create') return;

    const name          = interaction.fields.getTextInputValue('fraktion_name').trim();
    const kuerzel       = interaction.fields.getTextInputValue('fraktion_kuerzel').trim().toUpperCase();
    const plz           = interaction.fields.getTextInputValue('fraktion_plz').trim();
    const beschreibung  = interaction.fields.getTextInputValue('fraktion_beschreibung').trim();
    const extraRaw      = interaction.fields.getTextInputValue('fraktion_extra') || '';

    // Extra-Feld parsen: @User | #FF5733 | 🚔 | aktiv
    const extraParts = extraRaw.split('|').map(s => s.trim());
    let leiter       = null;
    let farbe        = '#5865F2';
    let emoji        = '🏘️';
    let status       = 'aktiv';
    let testphaseTage = 0;

    for (const part of extraParts) {
      if (part.startsWith('#') && /^#[0-9A-Fa-f]{6}$/.test(part)) {
        farbe = part;
      } else if (/\p{Emoji}/u.test(part) && part.length <= 4) {
        emoji = part;
      } else if (['aktiv', 'inaktiv', 'testphase'].includes(part.toLowerCase())) {
        status = part.toLowerCase();
      } else if (part.match(/\d+/) && status === 'testphase') {
        testphaseTage = parseInt(part.match(/\d+/)[0]);
      } else if (part.match(/^<@!?(\d+)>$/) || part.match(/^\d+$/)) {
        const userId = part.replace(/[<@!>]/g, '');
        leiter = userId;
      } else if (part.match(/^@\w+/)) {
        // Versuche User per Username zu finden
        const username = part.replace('@', '');
        const member = interaction.guild.members.cache.find(m =>
          m.user.username.toLowerCase() === username.toLowerCase() ||
          m.displayName.toLowerCase() === username.toLowerCase()
        );
        if (member) leiter = member.id;
      }
    }

    // Doppel-Check Kürzel
    const exists = await Fraktion.findOne({ guildId: interaction.guild.id, kuerzel });
    if (exists) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${config.emojis.error} Eine Fraktion mit dem Kürzel \`${kuerzel}\` existiert bereits!`)
        ],
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    // ── Optionale Rolle & Kanal erstellen ────────────────────
    let roleId    = null;
    let channelId = null;

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('fraktion_create_full')
        .setLabel('Mit Rolle & Kanal erstellen')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('fraktion_create_simple')
        .setLabel('Nur Daten speichern')
        .setEmoji('💾')
        .setStyle(ButtonStyle.Secondary),
    );

    const colorInt = parseInt(farbe.replace('#', ''), 16);

    const previewEmbed = new EmbedBuilder()
      .setColor(colorInt || config.colors.primary)
      .setTitle(`${emoji} ${name} [\`${kuerzel}\`]`)
      .setDescription(`*${beschreibung}*`)
      .addFields(
        { name: '📮 PLZ / Gebiet', value: plz, inline: true },
        { name: '🏷️ Status',       value: status === 'testphase' ? `🟡 Testphase${testphaseTage ? ` (${testphaseTage} Tage)` : ''}` : status === 'aktiv' ? '🟢 Aktiv' : '🔴 Inaktiv', inline: true },
        { name: '👑 Leiter',       value: leiter ? `<@${leiter}>` : '*Noch nicht gesetzt*', inline: true },
        { name: '🎨 Farbe',        value: farbe, inline: true },
      )
      .setFooter({ text: 'Hiermit ist die Fraktion Offiziell!  •  Mit freundlichen Grüßen', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    const msg = await interaction.editReply({
      content: '👀 **Vorschau der neuen Fraktion** — Wie soll sie erstellt werden?',
      embeds: [previewEmbed],
      components: [confirmRow],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
      max: 1,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn) => {
      await btn.deferUpdate();

      if (btn.customId === 'fraktion_create_full') {
        // Rolle erstellen
        try {
          const role = await interaction.guild.roles.create({
            name: `${emoji} ${name}`,
            color: colorInt || 0x5865F2,
            reason: `Fraktion ${name} gegründet`,
          });
          roleId = role.id;
        } catch {}

        // Kanal erstellen
        try {
          const channel = await interaction.guild.channels.create({
            name: `${emoji}│${kuerzel.toLowerCase()}-info`,
            type: ChannelType.GuildText,
            reason: `Fraktion ${name} gegründet`,
          });
          channelId = channel.id;
        } catch {}
      }

      // DB speichern
      const fraktion = await Fraktion.create({
        guildId:     interaction.guild.id,
        name,
        kuerzel,
        beschreibung,
        plz,
        leiter:      leiter || interaction.user.id,
        farbe,
        emoji,
        status,
        testphaseTage,
        roleId,
        channelId,
        gruendung:   new Date(),
      });

      // Bestätigungs-Embed
      const successEmbed = new EmbedBuilder()
        .setColor(colorInt || config.colors.success)
        .setTitle(`${config.emojis.success} Fraktion gegründet!`)
        .setDescription(
          `**${emoji} ${name}** wurde erfolgreich gegründet!\n\n` +
          `> 🔤 **Kürzel:** \`${kuerzel}\`\n` +
          `> 📮 **PLZ / Gebiet:** ${plz}\n` +
          `> 👑 **Leiter:** ${leiter ? `<@${leiter}>` : `<@${interaction.user.id}>`}\n` +
          `> 🎨 **Farbe:** ${farbe}\n` +
          `> 🏷️ **Status:** ${status}\n` +
          (roleId ? `> 🎭 **Rolle:** <@&${roleId}>\n` : '') +
          (channelId ? `> 📢 **Kanal:** <#${channelId}>\n` : '') +
          `\n*Verwende \`/fraktionsinfo ${kuerzel}\` um die Fraktion anzuzeigen.*`
        )
        .setFooter({ text: `Gegründet von ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });

      // Öffentliche Ankündigung
      await interaction.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(colorInt || config.colors.primary)
          .setTitle(`🎉 Neue Fraktion gegründet: ${emoji} ${name}`)
          .setDescription(
            `**${emoji} ${name}** [\`${kuerzel}\`] wurde offiziell gegründet!\n\n` +
            `*${beschreibung}*\n\n` +
            `> 📮 **PLZ / Gebiet:** ${plz}\n` +
            `> 👑 **Leiter:** ${leiter ? `<@${leiter}>` : `<@${interaction.user.id}>`}\n` +
            `> 🏷️ **Status:** ${status === 'testphase' ? `🟡 Testphase${testphaseTage ? ` (${testphaseTage} Tage)` : ''}` : status === 'aktiv' ? '🟢 Aktiv' : '🔴 Inaktiv'}\n\n` +
            `*Hiermit ist die Fraktion **${name}** Offiziell!*\n\n` +
            `Mit freundlichen Grüßen\n@${interaction.user.username} | Fraktionsverwaltung`
          )
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .setFooter({ text: `${interaction.guild.name} • Fraktionsverwaltung`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()
        ]
      }).catch(() => {});
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({ content: '⏰ Zeit abgelaufen.', embeds: [], components: [] }).catch(() => {});
      }
    });
  }
};
