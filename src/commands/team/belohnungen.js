const {
  SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
} = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('belohnungen')
    .setDescription('🏆 Belohnungs-System')
    .addSubcommand(sub =>
      sub.setName('mitarbeiter')
        .setDescription('🌟 Mitarbeiter des Monats küren')
        .addUserOption(o => o.setName('user').setDescription('Mitarbeiter des Monats').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Begründung').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('rangliste')
        .setDescription('📊 Aktivitätsrangliste nach Punkten')
    )
    .addSubcommand(sub =>
      sub.setName('auto')
        .setDescription('🤖 Automatische Belohnung vergeben')
        .addUserOption(o => o.setName('user').setDescription('Mitglied').setRequired(true))
        .addStringOption(o =>
          o.setName('typ')
            .setDescription('Art der Belohnung')
            .setRequired(true)
            .addChoices(
              { name: '🎫 Ticket geschlossen (+5)',    value: 'ticket' },
              { name: '⏱️ Schicht absolviert (+3)',    value: 'schicht' },
              { name: '📝 Bewerbung bearbeitet (+2)', value: 'bewerbung' },
              { name: '⭐ Bonuspunkte (+10)',          value: 'bonus' },
            )
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'mitarbeiter') {
      const user  = interaction.options.getUser('user');
      const grund = interaction.options.getString('grund') || 'Herausragende Teamarbeit!';

      const month = new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' });

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🌟 Mitarbeiter des Monats — ${month}`)
        .setDescription(
          `Herzlichen Glückwunsch **${user.username}**!\n\n` +
          `Du wurdest zum **Mitarbeiter des Monats ${month}** gewählt!\n\n` +
          `📋 Begründung:\n*${grund}*\n\n` +
          `Vielen Dank für deinen unermüdlichen Einsatz! ⭐`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.channel.send({ content: `🎉 <@${user.id}>`, embeds: [embed] });
      await interaction.reply({ content: `${config.emojis.success} Mitarbeiter des Monats wurde bekannt gegeben!`, ephemeral: true });

      // Punkte vergeben
      await TeamMember.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: user.id },
        { $inc: { punkte: 50 } },
        { upsert: true }
      );

      // DM
      try {
        await user.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle(`🌟 Glückwunsch! Mitarbeiter des Monats`)
            .setDescription(`Du wurdest auf **${interaction.guild.name}** zum Mitarbeiter des Monats **${month}** gewählt!\n\n*${grund}*\n\n+50 Punkte wurden dir gutgeschrieben! ⭐`)
            .setTimestamp()
          ]
        });
      } catch {}
    }

    else if (sub === 'rangliste') {
      const members = await TeamMember.find({ guildId: interaction.guild.id }).sort({ punkte: -1 }).limit(10);

      if (!members.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`${config.emojis.info} Noch keine Punkte vergeben.`)
          ],
          ephemeral: true,
        });
      }

      const medals = ['🥇','🥈','🥉'];
      const list   = members.map((m, i) =>
        `${medals[i] || `**${i+1}.**`} <@${m.userId}> — ⭐ **${m.punkte}** Punkte`
      ).join('\n');

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('⭐ Punkte-Rangliste')
          .setDescription(list)
          .setFooter({ text: 'Top 10 Teammitglieder' })
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'auto') {
      const user   = interaction.options.getUser('user');
      const typ    = interaction.options.getString('typ');

      const punkteMap = { ticket: 5, schicht: 3, bewerbung: 2, bonus: 10 };
      const labelMap  = { ticket: '🎫 Ticket geschlossen', schicht: '⏱️ Schicht absolviert', bewerbung: '📝 Bewerbung bearbeitet', bonus: '⭐ Bonuspunkte' };
      const punkte    = punkteMap[typ];

      await TeamMember.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: user.id },
        { $inc: { punkte } },
        { upsert: true }
      );

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(
            `${config.emojis.star} <@${user.id}> hat **+${punkte} Punkte** erhalten!\n` +
            `📋 Grund: ${labelMap[typ]}`
          )
          .setTimestamp()
        ],
      });
    }
  },
};
