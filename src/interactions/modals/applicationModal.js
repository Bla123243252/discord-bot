const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config      = require('../../config');
const Application = require('../../models/Application');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  async execute(interaction, client) {
    if (!interaction.customId.startsWith('application_submit_')) return;

    const position    = interaction.customId.replace('application_submit_', '');
    const age         = interaction.fields.getTextInputValue('app_age');
    const experience  = interaction.fields.getTextInputValue('app_experience');
    const motivation  = interaction.fields.getTextInputValue('app_motivation');
    const avail       = interaction.fields.getTextInputValue('app_availability');
    const extra       = interaction.fields.getTextInputValue('app_extra') || 'Keine';

    await interaction.deferReply({ flags: 64 });

    const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📝 Neue Bewerbung — ${position}`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Bewerber',      value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: '🎯 Position',      value: position,   inline: true },
        { name: '🎂 Alter',         value: age,        inline: true },
        { name: '📖 Erfahrung',     value: experience, inline: false },
        { name: '💡 Motivation',    value: motivation, inline: false },
        { name: '⏰ Verfügbarkeit', value: avail,      inline: true },
        { name: '📋 Sonstiges',     value: extra,      inline: false },
      )
      .setFooter({ text: `ID: ${interaction.user.id}` })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`application_accept_${interaction.user.id}`)
        .setLabel('Annehmen')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`application_reject_${interaction.user.id}`)
        .setLabel('Ablehnen')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`application_waitlist_${interaction.user.id}`)
        .setLabel('Warteliste')
        .setEmoji('⏳')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`application_message_${interaction.user.id}`)
        .setLabel('Nachricht senden')
        .setEmoji('✉️')
        .setStyle(ButtonStyle.Primary),
    );

    // Ins Bewerbungs-Kanal senden
    let msg = null;
    const appChannelId = guildConfig?.applications || process.env.CHANNEL_APPLICATIONS;
    if (appChannelId) {
      const appChannel = interaction.guild.channels.cache.get(appChannelId);
      if (appChannel) {
        msg = await appChannel.send({ embeds: [embed], components: [actionRow] }).catch(() => null);
      }
    }

    // DB speichern
    await Application.create({
      guildId:   interaction.guild.id,
      userId:    interaction.user.id,
      channelId: guildConfig?.applications || interaction.channel.id,
      messageId: msg?.id || null,
      position,
      answers: [
        { question: 'Alter',         answer: age },
        { question: 'Erfahrung',     answer: experience },
        { question: 'Motivation',    answer: motivation },
        { question: 'Verfügbarkeit', answer: avail },
        { question: 'Sonstiges',     answer: extra },
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Bewerbung eingereicht!`)
        .setDescription(
          `Deine Bewerbung für **${position}** wurde erfolgreich eingereicht!\n\n` +
          `Wir werden deine Bewerbung prüfen und dir per DM Bescheid geben.\n` +
          `Bitte habe etwas Geduld. 🙏`
        )
        .setTimestamp()
      ],
    });
  }
};
