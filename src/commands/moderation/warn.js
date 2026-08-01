const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config  = require('../../config');
const Warn    = require('../../models/Warn');
const { sendModLog, sendDM, generateId } = require('../../utils/modUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Warn-System')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('⚠️ Benutzer verwarnen')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund der Verwarnung').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('📋 Verwarnungen eines Benutzers anzeigen')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('🗑️ Verwarnung entfernen')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
        .addStringOption(o => o.setName('warn_id').setDescription('Warn-ID (aus /warn list)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('🧹 Alle Verwarnungen eines Benutzers löschen')
        .addUserOption(o => o.setName('user').setDescription('Benutzer').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub  = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');

    // ── Warn hinzufügen ──────────────────────────────────────
    if (sub === 'add') {
      const grund  = interaction.options.getString('grund');
      const warnId = generateId();

      let warnDoc = await Warn.findOne({ guildId: interaction.guild.id, userId: user.id });
      if (!warnDoc) {
        warnDoc = new Warn({ guildId: interaction.guild.id, userId: user.id, warns: [] });
      }
      warnDoc.warns.push({ moderatorId: interaction.user.id, reason: grund, warnId });
      await warnDoc.save();

      const count = warnDoc.warns.length;

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`${config.emojis.warn} Benutzer verwarnt`)
          .addFields(
            { name: '👤 Benutzer',      value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: '🛡️ Moderator',    value: interaction.user.tag,           inline: true },
            { name: '📋 Grund',         value: grund,                          inline: false },
            { name: '🆔 Warn-ID',       value: `\`${warnId}\``,               inline: true },
            { name: '📊 Gesamt-Warns',  value: `${count}`,                    inline: true },
          )
          .setTimestamp()
        ],
      });

      await sendDM(user, {
        action: 'Du wurdest verwarnt',
        emoji: '⚠️',
        color: config.colors.warning,
        guildName: interaction.guild.name,
        reason: grund,
        extra: `Warn #${count} | ID: \`${warnId}\``,
        extraLabel: 'Info',
      });

      await sendModLog(interaction.guild, {
        action: 'Verwarnung',
        emoji: '⚠️',
        color: config.colors.warning,
        target: user,
        moderator: interaction.user,
        reason: grund,
        extra: `Warn #${count} | ID: \`${warnId}\``,
        extraLabel: 'Info',
      });

      // Auto-Aktionen bei mehreren Warns
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member) {
        if (count === 3) {
          await member.timeout(10 * 60 * 1000, `Auto-Mute: 3 Verwarnungen`).catch(() => {});
          await interaction.channel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.warning)
              .setDescription(`${config.emojis.mute} <@${user.id}> wurde automatisch für **10 Minuten** getimeouted (3 Verwarnungen).`)
            ]
          });
        } else if (count === 5) {
          await member.kick(`Auto-Kick: 5 Verwarnungen`).catch(() => {});
          await interaction.channel.send({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription(`${config.emojis.kick} <@${user.id}> wurde automatisch gekickt (5 Verwarnungen).`)
            ]
          });
        }
      }
      return;
    }

    // ── Warn-Liste anzeigen ──────────────────────────────────
    if (sub === 'list') {
      const warnDoc = await Warn.findOne({ guildId: interaction.guild.id, userId: user.id });

      if (!warnDoc || warnDoc.warns.length === 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`${config.emojis.success} **${user.tag}** hat keine Verwarnungen!`)
          ],
          flags: 64,
        });
      }

      const warnList = warnDoc.warns.map((w, i) =>
        `**${i + 1}.** \`${w.warnId}\` — <@${w.moderatorId}>\n📋 ${w.reason}\n📅 <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.warn} Verwarnungen — ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(warnList.substring(0, 4096))
        .setFooter({ text: `${warnDoc.warns.length} Verwarnung(en) gesamt` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // ── Warn entfernen ───────────────────────────────────────
    if (sub === 'remove') {
      const warnId  = interaction.options.getString('warn_id');
      const warnDoc = await Warn.findOne({ guildId: interaction.guild.id, userId: user.id });

      if (!warnDoc) return interaction.reply({ content: `${config.emojis.error} Keine Verwarnungen gefunden!`, flags: 64 });

      const before = warnDoc.warns.length;
      warnDoc.warns = warnDoc.warns.filter(w => w.warnId !== warnId);
      if (warnDoc.warns.length === before) {
        return interaction.reply({ content: `${config.emojis.error} Warn-ID \`${warnId}\` nicht gefunden!`, flags: 64 });
      }
      await warnDoc.save();

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} Verwarnung \`${warnId}\` von **${user.tag}** wurde entfernt.`)
          .setTimestamp()
        ],
      });
    }

    // ── Alle Warns löschen ───────────────────────────────────
    if (sub === 'clear') {
      await Warn.findOneAndUpdate(
        { guildId: interaction.guild.id, userId: user.id },
        { $set: { warns: [] } }
      );
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} Alle Verwarnungen von **${user.tag}** wurden gelöscht.`)
          .setTimestamp()
        ],
      });
    }
  },
};
