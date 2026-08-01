const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('🔒 Kanal sperren / entsperren')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('on')
        .setDescription('🔒 Kanal sperren (niemand kann schreiben)')
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal (Standard: dieser)').setRequired(false))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('off')
        .setDescription('🔓 Kanal entsperren')
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal (Standard: dieser)').setRequired(false))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub    = interaction.options.getSubcommand();
    const ch     = interaction.options.getChannel('kanal') || interaction.channel;
    const grund  = interaction.options.getString('grund') || 'Kein Grund angegeben';
    const locking = sub === 'on';

    await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: locking ? false : null,
    }, { reason: `${locking ? 'Lock' : 'Unlock'} von ${interaction.user.tag}: ${grund}` });

    const embed = new EmbedBuilder()
      .setColor(locking ? config.colors.error : config.colors.success)
      .setTitle(locking ? '🔒 Kanal gesperrt' : '🔓 Kanal entsperrt')
      .setDescription(
        `<#${ch.id}> wurde ${locking ? '**gesperrt**' : '**entsperrt**'}.\n\n` +
        `📋 Grund: ${grund}\n` +
        `🛡️ Von: ${interaction.user.tag}`
      )
      .setTimestamp();

    await ch.send({ embeds: [embed] }).catch(() => {});
    await interaction.reply({
      content: `${locking ? config.emojis.error : config.emojis.success} <#${ch.id}> wurde ${locking ? 'gesperrt' : 'entsperrt'}.`,
      ephemeral: true,
    });
  },
};
