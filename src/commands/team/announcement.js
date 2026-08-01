const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamankuendigung')
    .setDescription('📢 Team-Ankündigung senden')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('meeting')
        .setDescription('📅 Teammeeting ankündigen')
        .addStringOption(o => o.setName('datum').setDescription('Datum & Uhrzeit (DD.MM.YYYY HH:MM)').setRequired(true))
        .addStringOption(o => o.setName('thema').setDescription('Thema des Meetings').setRequired(true))
        .addStringOption(o => o.setName('ort').setDescription('Ort (Voice-Channel, Plattform...)').setRequired(false))
        .addBooleanOption(o => o.setName('ping').setDescription('Team anpingen?').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('allgemein')
        .setDescription('📢 Allgemeine Team-Ankündigung')
        .addStringOption(o => o.setName('titel').setDescription('Titel').setRequired(true))
        .addStringOption(o => o.setName('inhalt').setDescription('Inhalt der Ankündigung').setRequired(true))
        .addBooleanOption(o => o.setName('ping').setDescription('Team anpingen?').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub  = interaction.options.getSubcommand();
    const ping = interaction.options.getBoolean('ping') ?? false;
    const teamRoleId = process.env.ROLE_TEAM;
    const pingText   = ping && teamRoleId ? `<@&${teamRoleId}>` : '';

    if (sub === 'meeting') {
      const datumRaw = interaction.options.getString('datum');
      const thema    = interaction.options.getString('thema');
      const ort      = interaction.options.getString('ort') || 'Wird bekannt gegeben';

      const [datePart, timePart] = datumRaw.split(' ');
      const [day, month, year]   = (datePart||'').split('.');
      const [hour, minute]       = (timePart||'00:00').split(':');
      const datum = new Date(year, month-1, day, hour||0, minute||0);

      if (isNaN(datum.getTime())) {
        return interaction.reply({ content: `${config.emojis.error} Ungültiges Datum! Format: \`DD.MM.YYYY HH:MM\``, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('📅 Teammeeting')
        .setDescription(
          `Ein neues **Teammeeting** wurde angekündigt!\n\n` +
          `> 📋 **Thema:** ${thema}\n` +
          `> 📅 **Datum:** <t:${Math.floor(datum.getTime()/1000)}:F>\n` +
          `> ⏰ **In:** <t:${Math.floor(datum.getTime()/1000)}:R>\n` +
          `> 📍 **Ort:** ${ort}\n` +
          `> 👑 **Ausrichter:** <@${interaction.user.id}>`
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.channel.send({ content: pingText, embeds: [embed] });
      await interaction.reply({ content: `${config.emojis.success} Meeting-Ankündigung gesendet!`, ephemeral: true });
    }

    else if (sub === 'allgemein') {
      const titel  = interaction.options.getString('titel');
      const inhalt = interaction.options.getString('inhalt');

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📢 ${titel}`)
        .setDescription(inhalt)
        .addFields({ name: '👤 Von', value: `<@${interaction.user.id}>`, inline: true })
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.channel.send({ content: pingText, embeds: [embed] });
      await interaction.reply({ content: `${config.emojis.success} Ankündigung gesendet!`, ephemeral: true });
    }
  },
};
