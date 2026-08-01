const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits,
} = require('discord.js');
const config = require('../../config');

// In-memory Poll store (für persistente Daten DB nutzen)
const activePolls = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('🗳️ Abstimmung erstellen')
    .addStringOption(o => o.setName('frage').setDescription('Die Frage der Abstimmung').setRequired(true))
    .addStringOption(o => o.setName('optionen').setDescription('Optionen (mit | trennen, max. 5): Ja | Nein | Enthaltung').setRequired(false))
    .addStringOption(o => o.setName('dauer').setDescription('Dauer der Abstimmung (z.B. 10m, 1h, 1d)').setRequired(false))
    .addBooleanOption(o => o.setName('anonym').setDescription('Anonyme Abstimmung?').setRequired(false))
    .addBooleanOption(o => o.setName('team_only').setDescription('Nur für Team?').setRequired(false)),

  async execute(interaction, client) {
    const frage     = interaction.options.getString('frage');
    const optsRaw   = interaction.options.getString('optionen') || 'Ja | Nein | Enthaltung';
    const dauerRaw  = interaction.options.getString('dauer');
    const anonym    = interaction.options.getBoolean('anonym') ?? false;
    const teamOnly  = interaction.options.getBoolean('team_only') ?? false;

    const ms       = require('ms');
    const duration = dauerRaw ? ms(dauerRaw) : null;
    const endsAt   = duration ? new Date(Date.now() + duration) : null;

    const options = optsRaw.split('|').map(o => o.trim()).filter(Boolean).slice(0, 5);
    if (options.length < 2) return interaction.reply({ content: `${config.emojis.error} Mindestens 2 Optionen benötigt!`, flags: 64 });

    const optionEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
    const votes        = Object.fromEntries(options.map((_, i) => [i, []]));

    const buildEmbed = () => new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🗳️ ${frage}`)
      .setDescription(
        options.map((opt, i) => {
          const count   = votes[i].length;
          const total   = Object.values(votes).reduce((s, v) => s + v.length, 0);
          const pct     = total ? Math.round((count / total) * 100) : 0;
          const bar     = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
          return `${optionEmojis[i]} **${opt}**\n> \`${bar}\` ${pct}% (${count})`;
        }).join('\n\n')
      )
      .addFields(
        { name: '👥 Gesamt',    value: `${Object.values(votes).reduce((s,v) => s+v.length, 0)} Stimme(n)`, inline: true },
        { name: '👤 Erstellt',  value: `<@${interaction.user.id}>`,                                         inline: true },
        ...(endsAt ? [{ name: '⏰ Endet', value: `<t:${Math.floor(endsAt.getTime()/1000)}:R>`, inline: true }] : []),
        ...(teamOnly ? [{ name: '🔒 Team Only', value: 'Nur für Teammitglieder', inline: true }] : []),
      )
      .setFooter({ text: anonym ? '🔒 Anonyme Abstimmung' : '👁️ Öffentliche Abstimmung' })
      .setTimestamp();

    const buildButtons = (disabled = false) => {
      const rows = [];
      const chunks = options.reduce((acc, opt, i) => {
        const row = Math.floor(i / 5);
        if (!acc[row]) acc[row] = [];
        acc[row].push(new ButtonBuilder()
          .setCustomId(`poll_vote_${i}`)
          .setLabel(opt)
          .setEmoji(optionEmojis[i])
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled));
        return acc;
      }, []);

      for (const chunk of chunks) rows.push(new ActionRowBuilder().addComponents(chunk));

      if (!disabled) {
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('poll_end')
            .setLabel('Abstimmung beenden')
            .setEmoji('🏁')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
        ));
      }
      return rows;
    };

    await interaction.reply({ content: `${config.emojis.success} Abstimmung wird erstellt...`, flags: 64 });
    const msg = await interaction.channel.send({ embeds: [buildEmbed()], components: buildButtons() });

    // Poll speichern
    activePolls.set(msg.id, { votes, options, anonym, teamOnly, endsAt, createdBy: interaction.user.id });

    // Collector
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: duration || 24 * 60 * 60 * 1000,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'poll_end') {
        if (btn.user.id !== interaction.user.id && !btn.member.permissions.has('ManageGuild')) {
          return btn.reply({ content: `${config.emojis.error} Nur der Ersteller kann die Abstimmung beenden!`, flags: 64 });
        }
        collector.stop('manual');
        return btn.update({ embeds: [buildEmbed()], components: buildButtons(true) });
      }

      const idx = parseInt(btn.customId.replace('poll_vote_', ''));
      if (isNaN(idx)) return;

      const pollData = activePolls.get(msg.id);
      if (!pollData) return;

      // Alte Stimme entfernen
      for (const key of Object.keys(pollData.votes)) {
        pollData.votes[key] = pollData.votes[key].filter(id => id !== btn.user.id);
      }
      // Neue Stimme
      pollData.votes[idx].push(btn.user.id);

      await msg.edit({ embeds: [buildEmbed()], components: buildButtons() });

      await btn.reply({
        content: `${config.emojis.success} Du hast für **${options[idx]}** gestimmt!`,
        flags: 64,
      });
    });

    collector.on('end', async () => {
      const pollData = activePolls.get(msg.id);
      if (!pollData) return;

      const winner = Object.entries(pollData.votes)
        .sort((a, b) => b[1].length - a[1].length)[0];

      const finalEmbed = buildEmbed()
        .setTitle(`🏁 ${frage} — BEENDET`)
        .setColor(config.colors.gold)
        .addFields({ name: '🏆 Gewinner', value: `**${options[winner[0]]}** mit ${winner[1].length} Stimme(n)`, inline: false });

      await msg.edit({ embeds: [finalEmbed], components: buildButtons(true) }).catch(() => {});
      activePolls.delete(msg.id);
    });
  },
};
