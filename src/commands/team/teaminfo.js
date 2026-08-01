const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teaminfo')
    .setDescription('📊 Teamdaten eines Mitglieds anzeigen')
    .addUserOption(o => o.setName('user').setDescription('Teammitglied (Standard: Du)').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user') || interaction.user;
    const member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: user.id });

    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.info} Keine Team-Daten für **${user.tag}** gefunden.`)
        ],
        ephemeral: true,
      });
    }

    const totalH = Math.floor(member.totalDienstzeit / 60);
    const totalM = member.totalDienstzeit % 60;

    // Wochenübersicht
    const days = [
      ['Montag',     member.woche.montag],
      ['Dienstag',   member.woche.dienstag],
      ['Mittwoch',   member.woche.mittwoch],
      ['Donnerstag', member.woche.donnerstag],
      ['Freitag',    member.woche.freitag],
      ['Samstag',    member.woche.samstag],
      ['Sonntag',    member.woche.sonntag],
    ];
    const wocheText = days.map(([d, m]) =>
      `> **${d}:** ${m ? `${Math.floor(m/60)}h ${m%60}m` : '—'}`
    ).join('\n');

    // Status
    let statusText = '🟢 Aktiv';
    if (member.urlaub)   statusText = '🏖️ Im Urlaub';
    else if (member.pause) statusText = '☕ Pause';
    else if (!member.dienst) statusText = '🔴 Außer Dienst';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${config.emojis.team} Teaminfo — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '📋 Status & Dienst',
          value:
            `> **Status:** ${statusText}\n` +
            `> **Gesamt-Dienstzeit:** ${totalH}h ${totalM}m\n` +
            (member.dienst
              ? `> **Im Dienst seit:** <t:${Math.floor(member.dienstStart.getTime() / 1000)}:R>\n`
              : '') +
            (member.urlaub && member.urlaubBis
              ? `> **Urlaub bis:** <t:${Math.floor(member.urlaubBis.getTime() / 1000)}:D>\n`
              : ''),
          inline: false,
        },
        {
          name: '📊 Statistiken',
          value:
            `> ${config.emojis.ticket} **Tickets:** ${member.stats.tickets}\n` +
            `> 🔒 **Geschlossene Tickets:** ${member.stats.closedTickets}\n` +
            `> 🔊 **Voice-Zeit:** ${Math.floor(member.stats.voiceMinutes / 60)}h ${member.stats.voiceMinutes % 60}m\n` +
            `> ⚠️ **Verwarnungen:** ${member.stats.warnings}\n` +
            `> 📝 **Bewerbungen:** ${member.stats.applications}\n` +
            `> ⭐ **Punkte:** ${member.punkte}`,
          inline: false,
        },
        {
          name: '📅 Wochenübersicht',
          value: wocheText,
          inline: false,
        },
      )
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
