const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!guildConfig?.logChannel) return;

    const logChannel = message.guild.channels.cache.get(guildConfig.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('🗑️ Nachricht gelöscht')
      .addFields(
        { name: 'Autor', value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : 'Unbekannt', inline: true },
        { name: 'Kanal', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Inhalt', value: message.content || '*Kein Text (Anhang/Embed)*', inline: false }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
