const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dienst')
    .setDescription('👮 Dienst starten oder beenden'),

  async execute(interaction, client) {
    let member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
    if (!member) {
      member = new TeamMember({ guildId: interaction.guild.id, userId: interaction.user.id });
    }

    if (!member.dienst) {
      // Dienst starten
      member.dienst      = true;
      member.dienstStart = new Date();
      member.pause       = false;
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${config.emojis.check} Dienst gestartet`)
          .setDescription(
            `<@${interaction.user.id}> ist jetzt **im Dienst**!\n\n` +
            `> 🕐 Beginn: <t:${Math.floor(Date.now() / 1000)}:T>\n` +
            `> 📅 Datum: <t:${Math.floor(Date.now() / 1000)}:D>`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
        ],
      });
    } else {
      // Dienst beenden
      const now      = new Date();
      const minutes  = Math.floor((now - member.dienstStart) / 60000);
      const hours    = Math.floor(minutes / 60);
      const mins     = minutes % 60;

      member.totalDienstzeit += minutes;
      member.dienst      = false;
      member.dienstStart = null;
      member.pause       = false;

      // Wochentag tracken
      const days = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
      const today = days[new Date().getDay()];
      member.woche[today] = (member.woche[today] || 0) + minutes;

      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`🔴 Dienst beendet`)
          .setDescription(
            `<@${interaction.user.id}> hat den Dienst **beendet**.\n\n` +
            `> ⏱️ Dienstzeit: **${hours}h ${mins}m**\n` +
            `> 📊 Gesamt (heute): **${Math.floor(member.woche[today] / 60)}h ${member.woche[today] % 60}m**\n` +
            `> 📅 Gesamtzeit (alle): **${Math.floor(member.totalDienstzeit / 60)}h ${member.totalDienstzeit % 60}m**`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
        ],
      });
    }
  },
};
