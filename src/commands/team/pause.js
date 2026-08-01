const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('☕ Pause starten oder beenden'),

  async execute(interaction, client) {
    const member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });

    if (!member?.dienst) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.error)
          .setDescription(`${config.emojis.error} Du bist nicht im Dienst! Starte zuerst deinen Dienst mit \`/dienst\`.`)
        ],
        ephemeral: true,
      });
    }

    if (!member.pause) {
      member.pause      = true;
      member.pauseStart = new Date();
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('☕ Pause begonnen')
          .setDescription(
            `<@${interaction.user.id}> macht **Pause**.\n\n` +
            `> 🕐 Pause seit: <t:${Math.floor(Date.now() / 1000)}:T>`
          )
          .setTimestamp()
        ],
      });
    } else {
      const pauseMinutes = Math.floor((new Date() - member.pauseStart) / 60000);
      member.pause      = false;
      member.pauseStart = null;
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ Pause beendet')
          .setDescription(
            `<@${interaction.user.id}> ist **zurück vom Dienst**.\n\n` +
            `> ⏱️ Pause Dauer: **${pauseMinutes} Minute(n)**`
          )
          .setTimestamp()
        ],
      });
    }
  },
};
