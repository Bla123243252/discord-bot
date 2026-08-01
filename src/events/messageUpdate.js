const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const config = require('../config');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const guildConfig = await GuildConfig.findOne({ guildId: newMessage.guild.id });
    if (!guildConfig?.logChannel) return;

    const logChannel = newMessage.guild.channels.cache.get(guildConfig.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('✏️ Nachricht bearbeitet')
      .addFields(
        { name: 'Autor', value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`, inline: true },
        { name: 'Kanal', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: '📝 Vorher', value: oldMessage.content?.substring(0, 1024) || '*Unbekannt*', inline: false },
        { name: '📝 Nachher', value: newMessage.content?.substring(0, 1024) || '*Leer*', inline: false }
      )
      .setURL(newMessage.url)
      .setTimestamp();

    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
