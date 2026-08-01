const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  async execute(interaction, client) {
    if (!interaction.customId.startsWith('appMsg_send_')) return;

    const userId = interaction.customId.replace('appMsg_send_', '');
    const text   = interaction.fields.getTextInputValue('appMsg_text');

    await interaction.deferReply({ flags: 64 });

    let dmGesendet = false;
    let gepingt    = false;

    // ── DM senden ─────────────────────────────────────────────
    try {
      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle(`✉️ Nachricht vom Team — ${interaction.guild.name}`)
          .setDescription(text)
          .addFields({ name: '👤 Von', value: `${interaction.user.tag}`, inline: true })
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()
        ]
      });
      dmGesendet = true;
    } catch {}

    // ── Im Bewerbungs-Channel pingen ──────────────────────────
    try {
      await interaction.message.channel.send({
        content: `<@${userId}>`,
        embeds: [new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('✉️ Nachricht vom Team')
          .setDescription(text)
          .addFields({ name: '👤 Von', value: `<@${interaction.user.id}>`, inline: true })
          .setTimestamp()
        ]
      });
      gepingt = true;
    } catch {}

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Nachricht gesendet`)
        .addFields(
          { name: '✉️ DM',    value: dmGesendet ? '✅ Gesendet' : '❌ DMs geschlossen', inline: true },
          { name: '🔔 Ping',  value: gepingt    ? '✅ Gepingt'  : '❌ Fehler',          inline: true },
        )
        .setTimestamp()
      ],
    });
  }
};
