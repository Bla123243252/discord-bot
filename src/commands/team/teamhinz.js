const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamhinz')
    .setDescription('➕ Neues Teammitglied hinzufügen & ankündigen')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Das neue Teammitglied')
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName('rolle')
        .setDescription('Die Teamrolle die vergeben wird')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('grund')
        .setDescription('Warum wurde die Person aufgenommen?')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('datum')
        .setDescription('Eintrittsdatum (Standard: heute) — Format: DD.MM.YYYY')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('notiz')
        .setDescription('Optionale zusätzliche Notiz')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const user   = interaction.options.getUser('user');
    const rolle  = interaction.options.getRole('rolle');
    const grund  = interaction.options.getString('grund');
    const notiz  = interaction.options.getString('notiz') || null;
    const datumRaw = interaction.options.getString('datum');

    // Datum parsen
    let datum = new Date();
    if (datumRaw) {
      const [day, month, year] = datumRaw.split('.');
      const parsed = new Date(year, month - 1, day);
      if (!isNaN(parsed.getTime())) datum = parsed;
    }
    const datumTs = Math.floor(datum.getTime() / 1000);

    // Rolle vergeben
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: `${config.emojis.error} Benutzer nicht auf dem Server gefunden!` });
    }

    await member.roles.add(rolle.id, `Teamhinzufügung von ${interaction.user.tag}`).catch(() => {});

    // TeamMember DB Eintrag erstellen
    await TeamMember.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: user.id },
      { $setOnInsert: { guildId: interaction.guild.id, userId: user.id } },
      { upsert: true, new: true }
    );

    // ── Team-Update Embed ─────────────────────────────────────
    const updateEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('👥 Team Update — Neues Mitglied')
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setDescription(
        `Wir freuen uns, ein neues Mitglied in unserem Team begrüßen zu dürfen!\n\n` +
        `<@${user.id}> wurde offiziell ins Team aufgenommen. Herzlich Willkommen! 🎉`
      )
      .addFields(
        { name: '👤 Mitglied',      value: `<@${user.id}>`,                  inline: true },
        { name: '🎭 Rolle',         value: `<@&${rolle.id}>`,                 inline: true },
        { name: '📅 Eintrittsdatum', value: `<t:${datumTs}:D>`,               inline: true },
        { name: '📋 Grund',         value: grund,                             inline: false },
        ...(notiz ? [{ name: '📝 Notiz', value: notiz, inline: false }] : []),
        { name: '🛡️ Aufgenommen von', value: `<@${interaction.user.id}>`,    inline: true },
      )
      .setFooter({
        text: `${interaction.guild.name} • Team Management`,
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    // In Team-Update Channel senden
    const teamUpdateChannelId = process.env.CHANNEL_TEAM_UPDATE;
    let sentChannel = null;

    if (teamUpdateChannelId) {
      const updateChannel = interaction.guild.channels.cache.get(teamUpdateChannelId);
      if (updateChannel) {
        await updateChannel.send({
          content: `🎉 Willkommen im Team <@${user.id}>!`,
          embeds: [updateEmbed],
        }).catch(() => {});
        sentChannel = updateChannel;
      }
    }

    // DM an neues Teammitglied
    try {
      await user.send({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`🎉 Willkommen im Team von ${interaction.guild.name}!`)
          .setDescription(
            `Du wurdest offiziell ins Team aufgenommen!\n\n` +
            `> 🎭 **Rolle:** ${rolle.name}\n` +
            `> 📅 **Eintrittsdatum:** <t:${datumTs}:D>\n` +
            `> 📋 **Grund:** ${grund}\n\n` +
            `Viel Erfolg und willkommen an Bord! 🚀`
          )
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .setTimestamp()
        ]
      });
    } catch {}

    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} Teammitglied hinzugefügt`)
        .addFields(
          { name: '👤 Mitglied',   value: `<@${user.id}>`,   inline: true },
          { name: '🎭 Rolle',      value: `<@&${rolle.id}>`,  inline: true },
          { name: '📅 Datum',      value: `<t:${datumTs}:D>`, inline: true },
          { name: '📢 Gesendet in', value: sentChannel ? `<#${sentChannel.id}>` : '❌ Kein Team-Update-Kanal konfiguriert', inline: false },
        )
        .setTimestamp()
      ],
    });
  },
};
