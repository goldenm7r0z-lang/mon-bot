const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionsBitField
} = require('discord.js');

const { QuickDB } = require('quick.db');
const ms = require('ms');
require('dotenv').config();

const db = new QuickDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ================== READY ==================

client.on('clientReady', () => {
    console.log(`${client.user.tag} est connecté !`);
});

// ================== SNIPE ==================

const snipes = new Map();

client.on('messageDelete', message => {

    if (!message.content) return;
    if (message.author?.bot) return;

    snipes.set(message.channel.id, {
        content: message.content,
        author: message.author.tag,
        avatar: message.author.displayAvatarURL({
            dynamic: true
        })
    });
});

// ================== COMMANDES ==================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // ================== XP / LEVEL ==================

    let xp = await db.get(`xp_${message.author.id}`) || 0;

    xp += 1;

    await db.set(`xp_${message.author.id}`, xp);

    const level = Math.floor(0.1 * Math.sqrt(xp));

    if (command === ';level') {

        const embed = new EmbedBuilder()
            .setColor('#ff4fd8')
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({
                    dynamic: true
                })
            })
            .setTitle('📊 Ton niveau')
            .setThumbnail(
                message.author.displayAvatarURL({
                    dynamic: true
                })
            )
            .setDescription(
                `⭐ **XP :** ${xp}\n🏆 **Niveau :** ${level}`
            )
            .setFooter({
                text: 'Système de niveaux'
            })
            .setTimestamp();

        return message.reply({
            embeds: [embed]
        });
    }

    // ================== +SNIPE ==================

    if (command === '+snipe') {

        const snipe = snipes.get(message.channel.id);

        if (!snipe) {
            return message.reply(
                '❌ Aucun message supprimé.'
            );
        }

        const embed = new EmbedBuilder()
            .setColor('#ff4fd8')
            .setAuthor({
                name: snipe.author,
                iconURL: snipe.avatar
            })
            .setDescription(`**${snipe.content}**`)
            .setFooter({
                text: 'Dernier message supprimé'
            })
            .setTimestamp();

        return message.channel.send({
            embeds: [embed]
        });
    }

    // ================== +TEMPBAN ==================

    if (command === '+tempban') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply(
                "❌ Tu n'as pas la permission de ban."
            );
        }

        const member = message.mentions.members.first();
        const duration = args[2];
        const reason = args.slice(3).join(' ') || 'Aucune raison';

        if (!member) {
            return message.reply('❌ Mentionne un membre.');
        }

        if (!duration) {
            return message.reply(
                '❌ Exemple : +tempban @user 10m spam'
            );
        }

        await member.ban({
            reason
        });

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('🔨 TempBan')
            .setDescription(
                `${member.user.tag} a été ban pendant **${duration}**`
            )
            .addFields(
                {
                    name: '👮 Modérateur',
                    value: message.author.tag
                },
                {
                    name: '📝 Raison',
                    value: reason
                }
            )
            .setTimestamp();

        message.channel.send({
            embeds: [embed]
        });

        setTimeout(async () => {

            try {

                await message.guild.members.unban(member.id);

                message.channel.send(
                    `✅ ${member.user.tag} a été débanni.`
                );

            } catch (err) {
                console.log(err);
            }

        }, ms(duration));
    }

    // ================== +TEMPMUTE ==================

    if (command === '+tempmute') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply(
                "❌ Tu n'as pas la permission."
            );
        }

        const member = message.mentions.members.first();
        const duration = args[2];

        if (!member) {
            return message.reply(
                '❌ Mentionne un membre.'
            );
        }

        if (!duration) {
            return message.reply(
                '❌ Exemple : +tempmute @user 10m'
            );
        }

        await member.timeout(ms(duration));

        const embed = new EmbedBuilder()
            .setColor('Orange')
            .setTitle('🔇 TempMute')
            .setDescription(
                `${member.user.tag} a été mute pendant **${duration}**`
            )
            .addFields({
                name: '👮 Modérateur',
                value: message.author.tag
            })
            .setTimestamp();

        return message.channel.send({
            embeds: [embed]
        });
    }

    // ================== +UNMUTE ==================

    if (command === '+unmute') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply(
                "❌ Tu n'as pas la permission."
            );
        }

        const member = message.mentions.members.first();

        if (!member) {
            return message.reply(
                '❌ Mentionne un membre.'
            );
        }

        await member.timeout(null);

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('🔊 UnMute')
            .setDescription(
                `${member.user.tag} a été unmute.`
            )
            .setTimestamp();

        return message.channel.send({
            embeds: [embed]
        });
    }

    // ================== +UNBAN ==================

    if (command === '+unban') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply(
                "❌ Tu n'as pas la permission."
            );
        }

        const userId = args[1];

        if (!userId) {
            return message.reply(
                '❌ Exemple : +unban 123456789'
            );
        }

        try {

            await message.guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('✅ UnBan')
                .setDescription(
                    `L'utilisateur \`${userId}\` a été débanni.`
                )
                .setTimestamp();

            return message.channel.send({
                embeds: [embed]
            });

        } catch {

            return message.reply(
                "❌ Impossible de débannir cet utilisateur."
            );
        }
    }
});

// ================== LOGIN ==================

client.login(process.env.TOKEN);