const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const ms      = require('ms');
const config  = require('../config');
const Giveaway = require('../models/Giveaway');

// ── Dauer parsen ─────────────────────────────────────────────────
function parseDuration(input) {
  // Unterstützt: 30s, 10m, 2h, 1d, 7d
  const parsed = ms(input);
  if (!parsed || parsed <= 0) return null;
  return parsed;
}

// ── Formatierte Zeit-Anzeige ─────────────────────────────────────
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);

  if (days > 0)    return `${days} Tag${days > 1 ? 'e' : ''}`;
  if (hours > 0)   return `${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (minutes > 0) return `${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  return `${seconds} Sekunde${seconds > 1 ? 'n' : ''}`;
}

// ── Gewinner auslosen ────────────────────────────────────────────
function pickWinners(participants, count) {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ── Giveaway-Embed bauen ─────────────────────────────────────────
function buildGiveawayEmbed(giveaway, ended = false) {
  const endsAt    = Math.floor(giveaway.endsAt.getTime() / 1000);
  const participants = giveaway.participants.length;

  const embed = new EmbedBuilder()
    .setColor(ended ? config.colors.gold : config.colors.primary)
    .setTitle(`🎁 GIVEAWAY${ended ? ' — BEENDET' : ''}`)
    .setDescription(
      `**🎉 Preis: ${giveaway.prize}**\n\n` +
      (giveaway.description ? `📝 ${giveaway.description}\n\n` : '') +
      (giveaway.requirement ? `📋 Bedingung: ${giveaway.requirement}\n\n` : '') +
      `> ⏰ ${ended ? 'Beendet' : 'Endet'}: <t:${endsAt}:R> (<t:${endsAt}:F>)\n` +
      `> 🏆 Gewinner: **${giveaway.winners}**\n` +
      `> 👥 Teilnehmer: **${participants}**\n` +
      `> 🎟️ Veranstalter: <@${giveaway.hostedBy}>\n\n` +
      (ended
        ? (giveaway.winnerIds.length
          ? `🎊 **Gewinner:** ${giveaway.winnerIds.map(id => `<@${id}>`).join(', ')}`
          : '😔 *Keine gültigen Teilnehmer*')
        : '**Klicke ✔️ Teilnehmen um am Giveaway teilzunehmen!**')
    )
    .setFooter({ text: ended ? 'Giveaway beendet' : `🎁 Giveaway • Viel Glück!` })
    .setTimestamp(giveaway.endsAt);

  return embed;
}

// ── Teilnehmen-Button ────────────────────────────────────────────
function buildJoinButton(count = 0, ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_join')
      .setLabel(ended ? 'Beendet' : `Teilnehmen  (${count})`)
      .setEmoji(ended ? '🏁' : '✔️')
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended),
  );
}

// ── Giveaway starten ─────────────────────────────────────────────
async function startGiveaway({ channel, prize, description, requirement, durationMs, winners, hostedBy }) {
  const endsAt = new Date(Date.now() + durationMs);

  // Platzhalter senden
  const msg = await channel.send({
    embeds: [new EmbedBuilder().setColor(config.colors.primary).setDescription('🎁 Giveaway wird erstellt...')],
  });

  const giveaway = await Giveaway.create({
    guildId:      channel.guild.id,
    channelId:    channel.id,
    messageId:    msg.id,
    prize,
    description:  description || '',
    requirement:  requirement || '',
    winners,
    endsAt,
    hostedBy,
    participants: [],
  });

  // Embed aktualisieren
  await msg.edit({
    embeds: [buildGiveawayEmbed(giveaway)],
    components: [buildJoinButton(0)],
  });

  return giveaway;
}

// ── Giveaway beenden ─────────────────────────────────────────────
async function endGiveaway(giveaway, client) {
  if (giveaway.ended) return;

  giveaway.ended = true;
  const winnerIds = pickWinners(giveaway.participants, giveaway.winners);
  giveaway.winnerIds = winnerIds;
  await giveaway.save();

  const guild   = client.guilds.cache.get(giveaway.guildId);
  const channel = guild?.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  let msg;
  try { msg = await channel.messages.fetch(giveaway.messageId); } catch { return; }

  // Embed updaten
  await msg.edit({
    embeds: [buildGiveawayEmbed(giveaway, true)],
    components: [buildJoinButton(giveaway.participants.length, true)],
  }).catch(() => {});

  // Gewinner-Nachricht
  if (winnerIds.length > 0) {
    await channel.send({
      content: winnerIds.map(id => `<@${id}>`).join(', '),
      embeds: [new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🎊 Giveaway Gewinner!')
        .setDescription(
          `Herzlichen Glückwunsch ${winnerIds.map(id => `<@${id}>`).join(', ')}!\n\n` +
          `**Preis:** 🎁 ${giveaway.prize}\n` +
          `**Veranstalter:** <@${giveaway.hostedBy}>\n\n` +
          `Bitte kontaktiere <@${giveaway.hostedBy}> um deinen Preis zu erhalten!`
        )
        .setTimestamp()
      ],
    }).catch(() => {});

    // DM an Gewinner
    for (const winnerId of winnerIds) {
      try {
        const user = await client.users.fetch(winnerId);
        await user.send({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle('🎊 Du hast ein Giveaway gewonnen!')
            .setDescription(
              `**Preis:** 🎁 ${giveaway.prize}\n` +
              `**Server:** ${guild.name}\n` +
              `**Veranstalter:** <@${giveaway.hostedBy}>\n\n` +
              `Bitte kontaktiere den Veranstalter um deinen Preis zu erhalten!`
            )
            .setTimestamp()
          ]
        });
      } catch {}
    }
  } else {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription('😔 Das Giveaway endete ohne Gewinner (keine Teilnehmer).')
        .setTimestamp()
      ]
    }).catch(() => {});
  }
}

// ── Automatischer Check (wird von cron aufgerufen) ────────────────
async function checkGiveaways(client) {
  const now = new Date();
  const expired = await Giveaway.find({ ended: false, endsAt: { $lte: now } });
  for (const giveaway of expired) {
    await endGiveaway(giveaway, client).catch(console.error);
  }
}

// ── giveawayUtil Objekt ──────────────────────────────────────────
const giveawayUtil = {
  async end(interaction, messageId, client) {
    const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });
    if (!giveaway) {
      return interaction.reply({ content: `${config.emojis.error} Giveaway nicht gefunden!`, flags: 64 });
    }
    if (giveaway.ended) {
      return interaction.reply({ content: `${config.emojis.error} Dieses Giveaway ist bereits beendet!`, flags: 64 });
    }

    await interaction.reply({ content: `${config.emojis.loading} Giveaway wird beendet...`, flags: 64 });
    await endGiveaway(giveaway, client);
    await interaction.editReply({ content: `${config.emojis.success} Giveaway wurde beendet!` });
  },

  async reroll(interaction, messageId, client) {
    const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });
    if (!giveaway || !giveaway.ended) {
      return interaction.reply({ content: `${config.emojis.error} Kein beendetes Giveaway mit dieser ID gefunden!`, flags: 64 });
    }

    const newWinners = pickWinners(giveaway.participants, giveaway.winners);
    giveaway.winnerIds = newWinners;
    await giveaway.save();

    const channel = interaction.guild.channels.cache.get(giveaway.channelId);
    await channel?.send({
      content: newWinners.map(id => `<@${id}>`).join(', '),
      embeds: [new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🔄 Giveaway Reroll!')
        .setDescription(
          `Neue Gewinner: ${newWinners.map(id => `<@${id}>`).join(', ')}\n\n` +
          `**Preis:** 🎁 ${giveaway.prize}\n` +
          `Neuauslösung von **${interaction.user.tag}**`
        )
        .setTimestamp()
      ]
    }).catch(() => {});

    await interaction.reply({ content: `${config.emojis.success} Neue Gewinner wurden ausgelost!`, flags: 64 });
  },

  async list(interaction, client) {
    const active = await Giveaway.find({ guildId: interaction.guild.id, ended: false });

    if (!active.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setDescription(`${config.emojis.info} Aktuell gibt es keine aktiven Giveaways!`)
        ],
        flags: 64,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('🎁 Aktive Giveaways')
      .setDescription(active.map((g, i) =>
        `**${i + 1}.** 🎁 **${g.prize}**\n` +
        `> Kanal: <#${g.channelId}> | Endet: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R> | Gewinner: ${g.winners} | Teilnehmer: ${g.participants.length}`
      ).join('\n\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};

module.exports = { giveawayUtil, startGiveaway, endGiveaway, checkGiveaways, buildGiveawayEmbed, buildJoinButton };
