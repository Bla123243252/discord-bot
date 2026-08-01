const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abmelden')
    .setDescription('🚪 Für heute abmelden')
    .addStringOption(o =>
      o.setName('grund')
        .setDescription('Grund der Abmeldung')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const grund = interaction.options.getString('grund') || 'Kein Grund angegeben';

    let member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
    if (!member) member = new TeamMember({ guildId: interaction.guild.id, userId: interaction.user.id });

    // Falls noch im Dienst, Dienst automatisch beenden
    let dienstzeit = 0;
    if (member.dienst && member.dienstStart) {
      dienstzeit = Math.floor((new Date() - member.dienstStart) / 60000);
      member.totalDienstzeit += dienstzeit;
      member.dienst      = false;
      member.dienstStart = null;
    }
    member.pause = false;
    await member.save();

    const hours = Math.floor(dienstzeit / 60);
    const mins  = dienstzeit % 60;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🚪 Abgemeldet')
        .setDescription(
          `<@${interaction.user.id}> hat sich für heute **abgemeldet**.\n\n` +
          `> 📋 Grund: ${grund}\n` +
          (dienstzeit > 0 ? `> ⏱️ Dienstzeit heute: **${hours}h ${mins}m**\n` : '') +
          `> 📅 Datum: <t:${Math.floor(Date.now() / 1000)}:D>`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
      ],
    });
  },
};
