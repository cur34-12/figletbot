require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    MessageFlags,
    SlashCommandBuilder
} = require('discord.js');

const { handleOwnerRename } = require('./ownerRename');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName('nickname')
        .setDescription("Change another member's nickname")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Member to rename')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('New nickname')
                .setRequired(true)
                .setMaxLength(32)
        )
        .toJSON()
];

async function registerCommands(guild) {
    try {
        await guild.commands.set(commands);
        console.log(`Registered commands in ${guild.name}`);
    } catch (error) {
        console.error(`Could not register commands in ${guild.name}:`, error);
    }
}

// Reply, or edit the reply if the interaction was already acknowledged.
async function respond(interaction, options) {
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(options);
    } else {
        await interaction.reply(options);
    }
}

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
        await registerCommands(guild);
    }
});

client.on('guildCreate', registerCommands);

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'nickname') return;

    try {
        const user = interaction.options.getUser('user');
        const nickname = interaction.options.getString('name');
        const member = interaction.options.getMember('user');

        if (!member) {
            await interaction.reply({
                content: 'Could not find that member.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (await handleOwnerRename(interaction, member, nickname)) {
            return;
        }

        try {
            await member.setNickname(nickname);

            await interaction.reply({
                content: `Changed ${user}'s nickname to **${nickname}**.`,
                // Ping the renamed member, but never @everyone/@here/roles
                // smuggled in through the nickname text.
                allowedMentions: { users: [user.id] }
            });
        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: 'I cannot change that member’s nickname. Check the Discord role hierarchy.',
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error('Unhandled /nickname error:', error);

        try {
            await respond(interaction, {
                content: 'Something went wrong handling that command.',
                flags: MessageFlags.Ephemeral
            });
        } catch (replyError) {
            console.error('Could not report the error to the user:', replyError);
        }
    }
});

client.on('error', error => console.error('Discord client error:', error));

// A stray rejection should be logged, not take the whole bot down with it.
process.on('unhandledRejection', error => {
    console.error('Unhandled rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
