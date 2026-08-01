const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamliste')
    .setDescription('👥 Alle Teammitglieder anzeigen'),

  async execute(interaction, client) {
    const members = await TeamMember.find({ guildId: interaction.guild.id });

    if (!members.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.info} Noch keine Teammitglieder registriert.`)
        ],
        flags: 64,
      });
    }

    const online   = members.filter(m => m.dienst && !m.pause && !m.urlaub);
    const pause    = members.filter(m => m.pause);
    const urlaub   = members.filter(m => m.urlaub);
    const offline  = members.filter(m => !m.dienst && !m.urlaub);

    const formatList = (list) =>
      list.length
        ? list.map(m => `<@${m.userId}>`).join(', ')
        : '*Niemand*';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${config.emojis.team} Teamliste — ${interaction.guild.name}`)
      .setDescription(`**${members.length}** Teammitglieder insgesamt`)
      .addFields(
        { name: `🟢 Im Dienst (${online.length})`,      value: formatList(online),  inline: false },
        { name: `☕ Pause (${pause.length})`,            value: formatList(pause),   inline: false },
        { name: `🏖️ Urlaub (${urlaub.length})`,        value: formatList(urlaub),  inline: false },
        { name: `🔴 Außer Dienst (${offline.length})`,  value: formatList(offline), inline: false },
      )
      .setFooter({ text: `Gesamt: ${members.length} Mitglieder` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
