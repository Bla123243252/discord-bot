const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giverole')
        .setDescription('Gibt allen Membern eine Rolle oder entfernt sie')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('rolle')
                .setDescription('Die Zielrolle')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('aktion')
                .setDescription('Hinzufügen oder Entfernen?')
                .setRequired(true)
                .addChoices(
                    { name: '➕ Hinzufügen', value: 'add' },
                    { name: '➖ Entfernen',  value: 'remove' }
                )
        ),

    async execute(interaction) {
        const rolle  = interaction.options.getRole('rolle');
        const aktion = interaction.options.getString('aktion');
        const guild  = interaction.guild;

        // Bot-Rolle Sicherheitscheck
        if (rolle.position >= guild.members.me.roles.highest.position) {
            return interaction.reply({
                content: `❌ Die Rolle **${rolle.name}** ist höher als meine Rolle. Ich kann sie nicht vergeben.`,
                ephemeral: true
            });
        }

        // Sofort antworten damit der Interaction nicht abläuft
        await interaction.reply({
            content: `⏳ Verarbeite... Dies kann einige Minuten dauern. Du wirst per DM benachrichtigt wenn es fertig ist.`,
            ephemeral: true
        });

        // Alle Member laden
        await guild.members.fetch();
        const members = guild.members.cache.filter(m => !m.user.bot);
        let success = 0;
        let failed  = 0;

        for (const [, member] of members) {
            try {
                if (aktion === 'add') {
                    if (!member.roles.cache.has(rolle.id)) {
                        await member.roles.add(rolle);
                    } else {
                        success++; // Hat die Rolle schon → zählt als OK
                        continue;
                    }
                } else {
                    if (member.roles.cache.has(rolle.id)) {
                        await member.roles.remove(rolle);
                    } else {
                        success++;
                        continue;
                    }
                }
                success++;
            } catch {
                failed++;
            }
        }

        // Ergebnis als DM an den ausführenden Admin
        const embed = new EmbedBuilder()
            .setColor(failed === 0 ? 0x3ddc84 : 0xff8c2a)
            .setTitle(aktion === 'add' ? '✅ Rolle vergeben' : '✅ Rolle entfernt')
            .addFields(
                { name: 'Rolle',           value: `<@&${rolle.id}>`,                          inline: true },
                { name: 'Server',          value: guild.name,                                  inline: true },
                { name: '✅ Erfolgreich',  value: String(success),                             inline: true },
                { name: '❌ Fehlgeschl.',  value: String(failed),                              inline: true },
                { name: 'Gesamt',          value: String(members.size),                        inline: true }
            )
            .setFooter({ text: `Ausgeführt von ${interaction.user.tag}` })
            .setTimestamp();

        // DM an Admin
        try {
            await interaction.user.send({ embeds: [embed] });
        } catch {
            // Falls DMs deaktiviert: in Channel followUp
            await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        // Log-Kanal
        if (process.env.MODLOG_CHANNEL_ID) {
            const ch = guild.channels.cache.get(process.env.MODLOG_CHANNEL_ID);
            if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
        }
    }
};
