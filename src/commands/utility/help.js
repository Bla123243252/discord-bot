const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ComponentType,
} = require('discord.js');
const config = require('../../config');

const categories = {
  moderation: {
    emoji: '🔨',
    name:  'Moderation',
    commands: [
      '`/warn add/list/remove/clear` — Warn-System',
      '`/mute` — Timeout vergeben',
      '`/kick` — Benutzer kicken',
      '`/ban add/temp/soft` — Ban-System',
      '`/unban` — Benutzer entbannen',
      '`/clear` — Nachrichten löschen',
      '`/slowmode` — Slowmode setzen',
      '`/lock on/off` — Kanal sperren',
      '`/banlist` — Ban-Liste anzeigen',
      '`/modconfig` — Bot konfigurieren',
    ],
  },
  tickets: {
    emoji: '🎫',
    name:  'Tickets',
    commands: [
      '`/ticket panel` — Ticket-Panel senden',
      '`/ticket close` — Ticket schließen',
      '`/ticket assign` — Ticket zuweisen',
      '`/ticket claim` — Ticket übernehmen',
      '`/ticket unclaim` — Ticket zurückgeben',
      '`/ticket priority` — Priorität setzen',
      '`/ticket note` — Notiz hinzufügen',
      '`/ticket transfer` — Ticket weitergeben',
    ],
  },
  team: {
    emoji: '👥',
    name:  'Team',
    commands: [
      '`/dienst` — Dienst starten/beenden',
      '`/pause` — Pause starten/beenden',
      '`/abmelden` — Für heute abmelden',
      '`/urlaub beantragen/beenden` — Urlaub',
      '`/teaminfo @User` — Teamdaten anzeigen',
      '`/teamliste` — Alle Teammitglieder',
      '`/teamstats rangliste/punkte` — Statistiken',
      '`/teamankuendigung` — Ankündigung senden',
    ],
  },
  fraktion: {
    emoji: '🏘️',
    name:  'Fraktionen',
    commands: [
      '`/fraktioncreate` — Fraktion gründen',
      '`/fraktionsinfo` — Fraktionsinfos anzeigen',
      '`/fraktionmember add/remove` — Mitglieder',
      '`/fraktionmember setleiter` — Leiter setzen',
      '`/fraktionmember setstatus` — Status ändern',
      '`/fraktionmember addevent` — Event hinzufügen',
    ],
  },
  giveaway: {
    emoji: '🎁',
    name:  'Giveaway',
    commands: [
      '`/giveaway start` — Giveaway starten',
      '`/giveaway end` — Giveaway beenden',
      '`/giveaway reroll` — Neu auslosen',
      '`/giveaway list` — Aktive Giveaways',
    ],
  },
  events: {
    emoji: '🎉',
    name:  'Events',
    commands: [
      '`/event erstellen` — Event erstellen',
      '`/event liste` — Alle Events anzeigen',
      '`/event info` — Event-Details',
      '`/event absagen` — Event absagen',
      '`/event countdown` — Nächstes Event',
    ],
  },
  bewerbung: {
    emoji: '📝',
    name:  'Bewerbungen',
    commands: [
      '`/bewerbung senden` — Bewerbung einreichen',
      '`/bewerbung annehmen` — Bewerbung annehmen',
      '`/bewerbung ablehnen` — Bewerbung ablehnen',
      '`/bewerbung warteliste` — Warteliste setzen',
    ],
  },
  abstimmung: {
    emoji: '🗳️',
    name:  'Abstimmungen & Belohnungen',
    commands: [
      '`/poll` — Abstimmung erstellen',
      '`/belohnungen mitarbeiter` — Mitarbeiter des Monats',
      '`/belohnungen rangliste` — Punkte-Rangliste',
      '`/belohnungen auto` — Auto-Belohnung',
    ],
  },
  utility: {
    emoji: '🔧',
    name:  'Utility',
    commands: [
      '`/embed` — Embed erstellen',
      '`/userinfo` — Benutzerinfos',
      '`/serverinfo` — Serverinfos',
      '`/avatar` — Avatar anzeigen',
      '`/roleinfo` — Rolleninfos',
      '`/ping` — Bot-Latenz',
      '`/uptime` — Bot-Laufzeit',
      '`/help` — Diese Hilfe',
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Zeigt alle verfügbaren Commands'),

  async execute(interaction, client) {
    const overviewEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🤖 ${client.user.username} — Hilfe`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `Wähle eine Kategorie aus dem Dropdown-Menü um die Commands anzuzeigen.\n\n` +
        Object.values(categories).map(c => `${c.emoji} **${c.name}**`).join(' • ')
      )
      .addFields(
        { name: '📊 Statistiken', value: `${client.commands.size} Commands in ${Object.keys(categories).length} Kategorien`, inline: true },
        { name: '🌐 Prefix',      value: '`/` Slash Commands',                                                                  inline: true },
      )
      .setFooter({ text: `Angefragt von ${interaction.user.tag}` })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('📚 Kategorie wählen...')
      .addOptions(
        Object.entries(categories).map(([key, cat]) => ({
          label:       cat.name,
          description: `${cat.commands.length} Commands`,
          value:       key,
          emoji:       cat.emoji,
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
      embeds:     [overviewEmbed],
      components: [row],
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time:          120_000,
      filter:        i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (select) => {
      const key = select.values[0];
      const cat = categories[key];

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${cat.emoji} ${cat.name} — Commands`)
        .setDescription(cat.commands.join('\n'))
        .setFooter({ text: `${cat.commands.length} Commands • /help für Übersicht` })
        .setTimestamp();

      await select.update({ embeds: [embed], components: [row] });
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
