const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ Avatar eines Benutzers anzeigen')
    .addUserOption(o => o.setName('user').setDescription('Benutzer (Standard: Du)').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
    const guildAvatar  = member?.displayAvatarURL({ dynamic: true, size: 4096 });
    const hasDifferent = guildAvatar && guildAvatar !== globalAvatar;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🖼️ Avatar von ${user.tag}`)
      .setImage(hasDifferent ? guildAvatar : globalAvatar)
      .setDescription(hasDifferent ? '📌 *Server-Avatar wird angezeigt*' : null)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ extension: 'png', size: 4096 })),
      new ButtonBuilder()
        .setLabel('WebP')
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ extension: 'webp', size: 4096 })),
    );

    if (user.displayAvatarURL().includes('.gif')) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(user.displayAvatarURL({ extension: 'gif', size: 4096 }))
      );
    }

    const components = [row];

    if (hasDifferent) {
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Globaler Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(globalAvatar),
        new ButtonBuilder()
          .setLabel('Server-Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(guildAvatar),
      );
      components.push(row2);
    }

    await interaction.reply({ embeds: [embed], components });
  },
};
