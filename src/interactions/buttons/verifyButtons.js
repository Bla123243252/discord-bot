const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  async execute(interaction, client) {
    const { customId } = interaction;

    // ── Regelwerk anzeigen (wenn kein Link angegeben) ────────────
    if (customId === 'verify_rules') {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle('📋 Regelwerk — Zenith Roleplay')
          .setDescription(
            `**§1 Allgemeines Verhalten**\n` +
            `> • Respektvoller Umgang mit allen Mitgliedern\n` +
            `> • Keine Beleidigungen, Diskriminierung oder Harassment\n` +
            `> • Spam und Flooding sind verboten\n\n` +
            `**§2 Roleplay Regeln**\n` +
            `> • Kein RDM (Random Death Match)\n` +
            `> • Kein VDM (Vehicle Death Match)\n` +
            `> • Charakter muss glaubwürdig gespielt werden\n` +
            `> • No Powergaming / Metagaming\n\n` +
            `**§3 Kommunikation**\n` +
            `> • Kein Teamspeak/Discord Spam\n` +
            `> • Keine privaten Werbungen\n` +
            `> • Nur deutsche Sprache im öffentlichen Chat\n\n` +
            `**§4 Sanktionen**\n` +
            `> • Verwarnungen, Kicks und Bans bei Verstößen\n` +
            `> • Bei schweren Verstößen sofortiger permanenter Bann\n\n` +
            `*Das Team behält sich vor das Regelwerk jederzeit anzupassen.*`
          )
          .setFooter({ text: 'Zenith Roleplay • Regelwerk', iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()
        ],
        flags: 64,
      });
    }

    // ── Verifizierung ────────────────────────────────────────────
    if (customId.startsWith('verify_confirm_')) {
      const roleId = customId.replace('verify_confirm_', '');
      const member = interaction.member;

      // Bereits verifiziert?
      if (member.roles.cache.has(roleId)) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.info} Du bist bereits verifiziert!`)
          ],
          flags: 64,
        });
      }

      // Rolle vergeben
      try {
        await member.roles.add(roleId, 'Verifizierung');

        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle(`${config.emojis.success} Erfolgreich verifiziert!`)
            .setDescription(
              `Willkommen auf **${interaction.guild.name}**!\n\n` +
              `Du hast jetzt Zugang zu allen Kanälen.\n` +
              `Viel Spaß und halte dich an die Regeln! 🎉`
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
          ],
          flags: 64,
        });

      } catch (err) {
        console.error('Verify Rolle Fehler:', err);
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.error)
            .setDescription(`${config.emojis.error} Fehler beim Vergeben der Rolle. Hat der Bot die nötige Berechtigung?`)
          ],
          flags: 64,
        });
      }
    }
  }
};
