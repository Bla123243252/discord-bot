const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ComponentType,
} = require('discord.js');
const config  = require('../../config');
const Ticket  = require('../../models/Ticket');
const { closeTicket, generateTranscript } = require('../../utils/ticketUtil');

module.exports = {
  async execute(interaction, client) {
    const { customId } = interaction;

    // ── Ticket übernehmen ────────────────────────────────────────
    if (customId === 'ticket_claim') {
      await interaction.deferReply();

      const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
      if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

      if (ticket.claimedBy) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.warning)
            .setDescription(`⚠️ Dieses Ticket wurde bereits von <@${ticket.claimedBy}> übernommen!`)
          ],
        });
      }

      ticket.claimedBy = interaction.user.id;
      ticket.status    = 'claimed';
      await ticket.save();

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} **${interaction.user.tag}** hat dieses Ticket übernommen!`)
          .setTimestamp()
        ]
      });
      return;
    }

    // ── Ticket schließen (Button) ────────────────────────────────
    if (customId === 'ticket_close_btn') {
      await interaction.deferReply();

      const ticket = await Ticket.findOne({ channelId: interaction.channel.id, status: { $ne: 'closed' } });
      if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein aktives Ticket!` });

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_confirm')
          .setLabel('Ja, schließen')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_close_cancel')
          .setLabel('Abbrechen')
          .setEmoji('✖️')
          .setStyle(ButtonStyle.Secondary),
      );

      const msg = await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle('🔒 Ticket schließen?')
          .setDescription('Bist du sicher, dass du dieses Ticket schließen möchtest?\nEin Transcript wird automatisch erstellt.')
        ],
        components: [confirmRow],
        fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        max: 1,
      });

      collector.on('collect', async (btn) => {
        await btn.deferUpdate();

        if (btn.customId === 'ticket_close_cancel') {
          await interaction.editReply({ content: '✖️ Abgebrochen.', embeds: [], components: [] });
          return;
        }
        if (btn.customId === 'ticket_close_confirm') {
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor(config.colors.error)
              .setDescription('🔒 Ticket wird geschlossen... Transcript wird erstellt.')
            ],
            components: [],
          });
          await closeTicket(interaction.channel, ticket, btn.user, client);
        }
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') {
          interaction.editReply({ content: '⏰ Zeit abgelaufen.', embeds: [], components: [] }).catch(() => {});
        }
      });
      return;
    }

    // ── Transcript manuell ───────────────────────────────────────
    if (customId === 'ticket_transcript_btn') {
      await interaction.deferReply({ flags: 64 });

      const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticket) return interaction.editReply({ content: `${config.emojis.error} Kein Ticket gefunden!` });

      const transcript = await generateTranscript(interaction.channel);
      const attachment = new AttachmentBuilder(transcript, { name: `transcript-ticket-${ticket.ticketNumber}.html` });

      await interaction.editReply({
        content: `${config.emojis.success} Transcript wurde erstellt!`,
        files: [attachment],
      });
    }
  }
};
