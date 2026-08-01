const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('✅ Verifizierungs-Panel senden')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(o =>
      o.setName('rolle')
        .setDescription('Rolle die nach Verifizierung vergeben wird')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('regelwerk_link')
        .setDescription('Link zum Regelwerk (optional)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const rolle         = interaction.options.getRole('rolle')
    const regelwerkLink = interaction.options.getString('regelwerk_link') || null

    // Rolle in ENV speichern für den Button-Handler
    process.env.VERIFY_ROLE_ID = rolle.id

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('✅ Verifizierung — Zenith Roleplay')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setDescription(
        `**Willkommen auf ${interaction.guild.name}!**\n\n` +
        `Bevor du Zugang zu allen Kanälen erhältst, lies bitte unser Regelwerk sorgfältig durch und verifiziere dich.\n\n` +
        `📋 **Mit der Verifizierung bestätigst du:**\n` +
        `> • Du hast das Regelwerk gelesen und verstanden\n` +
        `> • Du akzeptierst alle Server-Regeln\n` +
        `> • Du verhältst dich respektvoll gegenüber allen Mitgliedern\n` +
        `> • Du bist mindestens **16 Jahre** alt\n` +
        `> • Verstöße gegen die Regeln führen zu Sanktionen\n\n` +
        `⚠️ **Wichtig:** Regelwerk-Unwissenheit schützt nicht vor Strafe!\n\n` +
        `*Klicke auf ✅ Verifizieren um Zugang zum Server zu erhalten.*`
      )
      .setFooter({
        text: `${interaction.guild.name} • Regelwerk beachten`,
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_confirm_${rolle.id}`)
        .setLabel('Verifizieren')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
    )

    // Regelwerk-Button nur wenn Link angegeben
    if (regelwerkLink) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('📋 Regelwerk')
          .setStyle(ButtonStyle.Link)
          .setURL(regelwerkLink),
      )
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('verify_rules')
          .setLabel('📋 Regelwerk')
          .setStyle(ButtonStyle.Secondary),
      )
    }

    await interaction.channel.send({ embeds: [embed], components: [row] })
    await interaction.reply({
      content: `${config.emojis.success} Verifizierungs-Panel wurde gesendet! Rolle: <@&${rolle.id}>`,
      ephemeral: true,
    })
  },
}
