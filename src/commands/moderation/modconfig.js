const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config      = require('../../config');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modconfig')
    .setDescription('⚙️ Bot-Konfiguration für diesen Server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('⚙️ Kanal/Einstellung konfigurieren')
        .addStringOption(o =>
          o.setName('einstellung')
            .setDescription('Was soll konfiguriert werden?')
            .setRequired(true)
            .addChoices(
              { name: '📝 Log-Kanal',            value: 'logChannel' },
              { name: '🔨 Mod-Log-Kanal',         value: 'modLogChannel' },
              { name: '🎫 Ticket-Logs',           value: 'ticketLogs' },
              { name: '📥 Join/Leave-Kanal',       value: 'joinLeaveChannel' },
              { name: '🔊 Voice-Log-Kanal',        value: 'voiceLogChannel' },
              { name: '👋 Willkommens-Kanal',      value: 'welcomeChannel' },
              { name: '🎫 Ticket-Kategorie',       value: 'ticketCategory' },
              { name: '🎭 Auto-Rolle',             value: 'autoRole' },
            )
        )
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal oder Kategorie').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('🔄 Feature aktivieren/deaktivieren')
        .addStringOption(o =>
          o.setName('feature')
            .setDescription('Feature')
            .setRequired(true)
            .addChoices(
              { name: '🤖 Anti-Spam',    value: 'antiSpam' },
              { name: '🔗 Anti-Link',    value: 'antiLink' },
              { name: '🛡️ Anti-Raid',   value: 'antiRaid' },
              { name: '🤖 Anti-Bot',     value: 'antiBot' },
              { name: '👋 Willkommen',   value: 'welcomeEnabled' },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('setwelcome')
        .setDescription('👋 Willkommensnachricht anpassen')
        .addStringOption(o =>
          o.setName('nachricht')
            .setDescription('Nachricht ({user}, {server}, {count} verfügbar)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('📋 Aktuelle Konfiguration anzeigen')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // findOneAndUpdate mit upsert verhindert den duplicate key Fehler
    let guildConfig = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { $setOnInsert: { guildId: interaction.guild.id } },
      { upsert: true, new: true }
    );

    await interaction.deferReply({ ephemeral: true });

    if (sub === 'set') {
      const setting = interaction.options.getString('einstellung');
      const channel = interaction.options.getChannel('kanal');
      guildConfig[setting] = channel.id;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`${config.emojis.success} **${setting}** wurde auf <#${channel.id}> gesetzt.`)
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'toggle') {
      const feature = interaction.options.getString('feature');
      guildConfig[feature] = !guildConfig[feature];
      await guildConfig.save();

      const state = guildConfig[feature] ? '✅ Aktiviert' : '❌ Deaktiviert';
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(guildConfig[feature] ? config.colors.success : config.colors.error)
          .setDescription(`${state}: **${feature}**`)
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'setwelcome') {
      const nachricht = interaction.options.getString('nachricht');
      guildConfig.welcomeMessage = nachricht;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('👋 Willkommensnachricht gesetzt')
          .setDescription(`**Vorschau:**\n${nachricht.replace('{user}', `@${interaction.user.username}`).replace('{server}', interaction.guild.name).replace('{count}', interaction.guild.memberCount)}`)
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'show') {
      const ch = (id) => id ? `<#${id}>` : '❌ Nicht gesetzt';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`⚙️ Konfiguration — ${interaction.guild.name}`)
          .addFields(
            { name: '📝 Kanäle', value:
              `> Log: ${ch(guildConfig.logChannel)}\n` +
              `> Mod-Log: ${ch(guildConfig.modLogChannel)}\n` +
              `> Ticket-Logs: ${ch(guildConfig.ticketLogs)}\n` +
              `> Join/Leave: ${ch(guildConfig.joinLeaveChannel)}\n` +
              `> Voice: ${ch(guildConfig.voiceLogChannel)}\n` +
              `> Willkommen: ${ch(guildConfig.welcomeChannel)}\n` +
              `> Ticket-Kategorie: ${ch(guildConfig.ticketCategory)}`,
              inline: false,
            },
            { name: '🔄 Features', value:
              `> Anti-Spam: ${guildConfig.antiSpam ? '✅' : '❌'}\n` +
              `> Anti-Link: ${guildConfig.antiLink ? '✅' : '❌'}\n` +
              `> Anti-Raid: ${guildConfig.antiRaid ? '✅' : '❌'}\n` +
              `> Anti-Bot: ${guildConfig.antiBot ? '✅' : '❌'}\n` +
              `> Willkommen: ${guildConfig.welcomeEnabled ? '✅' : '❌'}`,
              inline: false,
            },
          )
          .setTimestamp()
        ],
      });
    }
  },
};
