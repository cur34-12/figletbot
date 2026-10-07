require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
        await guild.commands.set([
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
        ]);

        console.log(`Registered commands in ${guild.name}`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'nickname') return;

    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('name');
    const member = interaction.options.getMember('user');

    if (!member) {
        await interaction.reply({
            content: 'Could not find that member.',
            ephemeral: true
        });
        return;
    }

    try {
        await member.setNickname(nickname);

        await interaction.reply(
            `Changed ${user}'s nickname to **${nickname}**.`
        );
    } catch (error) {
        console.error(error);

        await interaction.reply({
            content: 'I cannot change that member’s nickname. Check the Discord role hierarchy.',
            ephemeral: true
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
