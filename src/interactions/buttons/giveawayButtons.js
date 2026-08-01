const { EmbedBuilder } = require('discord.js');
const config  = require('../../config');
const Giveaway = require('../../models/Giveaway');
const { buildGiveawayEmbed, buildJoinButton } = require('../../utils/giveawayUtil');

module.exports = {
  async execute(interaction, client) {
    if (interaction.customId !== 'giveaway_join') return;

    const giveaway = await Giveaway.findOne({
      messageId: interaction.message.id,
      guildId:   interaction.guild.id,
    });

    if (!giveaway) {
      return interaction.reply({ content: `${config.emojis.error} Giveaway nicht gefunden!`, ephemeral: true });
    }

    if (giveaway.ended) {
      return interaction.reply({ content: `${config.emojis.error} Dieses Giveaway ist bereits beendet!`, ephemeral: true });
    }

    const userId = interaction.user.id;
    const alreadyJoined = giveaway.participants.includes(userId);

    if (alreadyJoined) {
      // Teilnahme widerrufen
      giveaway.participants = giveaway.participants.filter(id => id !== userId);
      await giveaway.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.warning} Du hast deine Teilnahme am Giveaway **widerrufen**.\nDu nimmst jetzt **nicht** mehr teil.`)
        ],
        ephemeral: true,
      });
    } else {
      // Teilnehmen
      giveaway.participants.push(userId);
      await giveaway.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`${config.emojis.success} Erfolgreich teilgenommen!`)
          .setDescription(
            `Du nimmst jetzt am Giveaway teil!\n\n` +
            `**🎁 Preis:** ${giveaway.prize}\n` +
            `**⏰ Endet:** <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>\n` +
            `**👥 Teilnehmer:** ${giveaway.participants.length}\n\n` +
            `*Drücke erneut auf den Button um deine Teilnahme zu widerrufen.*`
          )
        ],
        ephemeral: true,
      });
    }

    // Embed & Button aktualisieren
    try {
      await interaction.message.edit({
        embeds: [buildGiveawayEmbed(giveaway)],
        components: [buildJoinButton(giveaway.participants.length)],
      });
    } catch {}
  }
};
