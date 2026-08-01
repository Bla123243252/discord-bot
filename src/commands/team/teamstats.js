const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamstats')
    .setDescription('🏆 Team-Statistiken & Rangliste')
    .addSubcommand(sub =>
      sub.setName('rangliste')
        .setDescription('🏆 Aktivitätsrangliste anzeigen')
        .addStringOption(o =>
          o.setName('kategorie')
            .setDescription('Ranglisten-Kategorie')
            .setRequired(false)
            .addChoices(
              { name: '⏱️ Dienstzeit',      value: 'dienstzeit' },
              { name: '🎫 Tickets',          value: 'tickets' },
              { name: '🔊 Voice-Zeit',       value: 'voice' },
              { name: '⭐ Punkte',           value: 'punkte' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('punkte')
        .setDescription('⭐ Punkte vergeben oder abziehen')
        .addUserOption(o => o.setName('user').setDescription('Teammitglied').setRequired(true))
        .addIntegerOption(o => o.setName('punkte').setDescription('Punkte (+/-).').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('🔄 Wochenstatistik zurücksetzen')
        .addUserOption(o => o.setName('user').setDescription('Teammitglied (leer = alle)').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'rangliste') {
      const kategorie = interaction.options.getString('kategorie') || 'dienstzeit';
      const members   = await TeamMember.find({ guildId: interaction.guild.id });

      let sorted;
      let title, valueF;
      switch (kategorie) {
        case 'tickets':
          sorted = members.sort((a, b) => b.stats.closedTickets - a.stats.closedTickets);
          title  = '🎫 Rangliste — Geschlossene Tickets';
          valueF = m => `${m.stats.closedTickets} Tickets`;
          break;
        case 'voice':
          sorted = members.sort((a, b) => b.stats.voiceMinutes - a.stats.voiceMinutes);
          title  = '🔊 Rangliste — Voice-Zeit';
          valueF = m => `${Math.floor(m.stats.voiceMinutes/60)}h ${m.stats.voiceMinutes%60}m`;
          break;
        case 'punkte':
          sorted = members.sort((a, b) => b.punkte - a.punkte);
          title  = '⭐ Rangliste — Punkte';
          valueF = m => `${m.punkte} Punkte`;
          break;
        default:
          sorted = members.sort((a, b) => b.totalDienstzeit - a.totalDienstzeit);
          title  = '⏱️ Rangliste — Dienstzeit';
          valueF = m => `${Math.floor(m.totalDienstzeit/60)}h ${m.totalDienstzeit%60}m`;
      }

      const medals = ['🥇', '🥈', '🥉'];
      const list   = sorted.slice(0, 10).map((m, i) =>
        `${medals[i] || `**${i+1}.**`} <@${m.userId}> — ${valueF(m)}`
      ).join('\n') || '*Keine Daten vorhanden*';

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle(title)
          .setDescription(list)
          .setFooter({ text: 'Top 10 Teammitglieder' })
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'punkte') {
      const user   = interaction.options.getUser('user');
      const punkte = interaction.options.getInteger('punkte');
      const grund  = interaction.options.getString('grund') || 'Kein Grund';

      let member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: user.id });
      if (!member) member = new TeamMember({ guildId: interaction.guild.id, userId: user.id });

      member.punkte += punkte;
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(punkte > 0 ? config.colors.success : config.colors.error)
          .setTitle(`⭐ Punkte ${punkte > 0 ? 'vergeben' : 'abgezogen'}`)
          .addFields(
            { name: '👤 Mitglied',   value: `<@${user.id}>`,      inline: true },
            { name: '⭐ Änderung',   value: `${punkte > 0 ? '+' : ''}${punkte}`, inline: true },
            { name: '📊 Gesamt',     value: `${member.punkte}`,   inline: true },
            { name: '📋 Grund',      value: grund,                inline: false },
          )
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'reset') {
      const user = interaction.options.getUser('user');

      if (user) {
        await TeamMember.findOneAndUpdate(
          { guildId: interaction.guild.id, userId: user.id },
          { $set: { woche: { montag:0,dienstag:0,mittwoch:0,donnerstag:0,freitag:0,samstag:0,sonntag:0 } } }
        );
        await interaction.reply({ content: `${config.emojis.success} Wochenstatistik von <@${user.id}> zurückgesetzt.`, flags: 64 });
      } else {
        await TeamMember.updateMany(
          { guildId: interaction.guild.id },
          { $set: { woche: { montag:0,dienstag:0,mittwoch:0,donnerstag:0,freitag:0,samstag:0,sonntag:0 } } }
        );
        await interaction.reply({ content: `${config.emojis.success} Alle Wochenstatistiken zurückgesetzt.`, flags: 64 });
      }
    }
  },
};
