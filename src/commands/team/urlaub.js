const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config     = require('../../config');
const TeamMember = require('../../models/TeamMember');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('urlaub')
    .setDescription('🏖️ Urlaub beantragen oder verwalten')
    .addSubcommand(sub =>
      sub.setName('beantragen')
        .setDescription('🏖️ Urlaub beantragen')
        .addStringOption(o => o.setName('bis').setDescription('Urlaub bis (DD.MM.YYYY)').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('beenden')
        .setDescription('✅ Urlaub vorzeitig beenden')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('📋 Urlaubs-Status eines Teammitglieds')
        .addUserOption(o => o.setName('user').setDescription('Teammitglied').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'beantragen') {
      const bisRaw = interaction.options.getString('bis');
      const grund  = interaction.options.getString('grund') || 'Kein Grund angegeben';

      const [day, month, year] = bisRaw.split('.');
      const urlaubBis = new Date(year, month - 1, day, 23, 59, 59);

      if (isNaN(urlaubBis.getTime()) || urlaubBis < new Date()) {
        return interaction.reply({
          content: `${config.emojis.error} Ungültiges oder vergangenes Datum! Format: \`DD.MM.YYYY\``,
          flags: 64,
        });
      }

      let member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
      if (!member) member = new TeamMember({ guildId: interaction.guild.id, userId: interaction.user.id });

      member.urlaub    = true;
      member.urlaubBis = urlaubBis;
      member.dienst    = false;
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('🏖️ Urlaub beantragt')
          .setDescription(
            `<@${interaction.user.id}> ist jetzt im **Urlaub**!\n\n` +
            `> 📅 Urlaub bis: <t:${Math.floor(urlaubBis.getTime() / 1000)}:D>\n` +
            `> 📋 Grund: ${grund}\n\n` +
            `*Kehre zurück mit \`/urlaub beenden\`.*`
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'beenden') {
      const member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
      if (!member?.urlaub) {
        return interaction.reply({ content: `${config.emojis.error} Du bist nicht im Urlaub!`, flags: 64 });
      }

      member.urlaub    = false;
      member.urlaubBis = null;
      await member.save();

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('✅ Urlaub beendet')
          .setDescription(`<@${interaction.user.id}> ist **zurück** und wieder aktiv!`)
          .setTimestamp()
        ],
      });
    }

    else if (sub === 'status') {
      const user   = interaction.options.getUser('user') || interaction.user;
      const member = await TeamMember.findOne({ guildId: interaction.guild.id, userId: user.id });

      if (!member?.urlaub) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(config.colors.info)
            .setDescription(`${config.emojis.info} **${user.tag}** ist aktuell nicht im Urlaub.`)
          ],
          flags: 64,
        });
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('🏖️ Urlaubs-Status')
          .addFields(
            { name: '👤 Teammitglied', value: `${user.tag}`, inline: true },
            { name: '📅 Urlaub bis',   value: `<t:${Math.floor(member.urlaubBis.getTime() / 1000)}:D>`, inline: true },
          )
          .setTimestamp()
        ],
        flags: 64,
      });
    }
  },
};
