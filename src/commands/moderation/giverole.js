const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giverole')
        .setDescription('Gibt allen Membern auf dem Server eine Rolle')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('rolle')
                .setDescription('Die Rolle die alle Member bekommen sollen')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('aktion')
                .setDescription('Rolle hinzufügen oder entfernen?')
                .setRequired(true)
                .addChoices(
                    { name: '➕ Hinzufügen', value: 'add' },
                    { name: '➖ Entfernen',  value: 'remove' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const rolle   = interaction.options.getRole('rolle');
        const aktion  = interaction.options.getString('aktion');
        const guild   = interaction.guild;

        // Sicherheit: Bot-Rolle nicht höher als Zielrolle
        const botMember = guild.members.me;
        if (rolle.position >= botMember.roles.highest.position) {
            return interaction.editReply({
                content: `❌ Die Rolle **${rolle.name}** ist höher oder gleich meiner höchsten Rolle. Ich kann sie nicht vergeben.`
            });
        }

        // Alle Member fetchen
        await guild.members.fetch();
        const members = guild.members.cache.filter(m => !m.user.bot);

        const total    = members.size;
        let   success  = 0;
        let   failed   = 0;

        // Fortschritts-Update alle 10 Member
        let processed = 0;

        // Status-Embed schicken
        const progressEmbed = new EmbedBuilder()
            .setColor(0x1a1c1f)
            .setTitle(aktion === 'add' ? '➕ Rolle wird vergeben...' : '➖ Rolle wird entfernt...')
            .setDescription(`Verarbeite **${total}** Member...`)
            .addFields(
                { name: 'Rolle', value: `<@&${rolle.id}>`, inline: true },
                { name: 'Aktion', value: aktion === 'add' ? 'Hinzufügen' : 'Entfernen', inline: true },
                { name: 'Fortschritt', value: `0 / ${total}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [progressEmbed] });

        // Alle Member in Batches von 10 gleichzeitig verarbeiten
        const memberArray = [...members.values()];
        const batchSize = 10;

        for (let i = 0; i < memberArray.length; i += batchSize) {
            const batch = memberArray.slice(i, i + batchSize);

            await Promise.all(batch.map(async member => {
                try {
                    if (aktion === 'add') {
                        if (!member.roles.cache.has(rolle.id)) await member.roles.add(rolle);
                    } else {
                        if (member.roles.cache.has(rolle.id)) await member.roles.remove(rolle);
                    }
                    success++;
                } catch {
                    failed++;
                }
                processed++;
            }));

            // Update alle 50 Member
            if (processed % 50 === 0 || processed >= total) {
                progressEmbed.setFields(
                    { name: 'Rolle', value: `<@&${rolle.id}>`, inline: true },
                    { name: 'Aktion', value: aktion === 'add' ? 'Hinzufügen' : 'Entfernen', inline: true },
                    { name: 'Fortschritt', value: `${processed} / ${total}`, inline: true }
                );
                await interaction.editReply({ embeds: [progressEmbed] }).catch(() => {});
            }

            // Kurze Pause zwischen Batches
            await new Promise(r => setTimeout(r, 50));
        }

        // Abschluss-Embed
        const done = new EmbedBuilder()
            .setColor(failed === 0 ? 0x3ddc84 : 0xff8c2a)
            .setTitle(aktion === 'add' ? '✅ Rolle vergeben' : '✅ Rolle entfernt')
            .addFields(
                { name: 'Rolle', value: `<@&${rolle.id}>`, inline: true },
                { name: '✅ Erfolgreich', value: `${success}`, inline: true },
                { name: '❌ Fehlgeschlagen', value: `${failed}`, inline: true }
            )
            .setFooter({ text: `Ausgeführt von ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [done] });

        // Log in Kanal (falls MODLOG_CHANNEL_ID in .env gesetzt)
        const logChannelId = process.env.MODLOG_CHANNEL_ID;
        if (logChannelId) {
            const logChannel = guild.channels.cache.get(logChannelId);
            if (logChannel) {
                await logChannel.send({ embeds: [done] }).catch(() => {});
            }
        }
    }
};
