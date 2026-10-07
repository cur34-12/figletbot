// ownerRename.js
// When someone uses /nickname on the server owner, FigletBot can't apply it
// (role hierarchy), so it DMs the owner the requested name ready to copy.
// The owner applies it with the client's built-in /nick command.
// FigletBot doesn't track whether they do.

const { MessageFlags, escapeMarkdown } = require('discord.js');

const MAX_NICK = 32; // Discord's nickname limit
const REQUESTER_COOLDOWN_MS = 5 * 60 * 1000; // stops DM spam to the owner

// `${guildId}:${userId}` -> timestamp of their last request
const cooldowns = new Map();

// Stop the requested name from breaking out of the code block.
function codeSafe(s) {
  return s.replace(/`/g, 'ˋ');
}

function pruneCooldowns(now) {
  for (const [key, at] of cooldowns) {
    if (now - at >= REQUESTER_COOLDOWN_MS) cooldowns.delete(key);
  }
}

/**
 * Call this at the start of your /nickname handler.
 * Returns true if it handled the request (target was the owner),
 * false if your normal setNickname path should run.
 */
async function handleOwnerRename(interaction, targetMember, rawNick) {
  const guild = interaction.guild;
  if (!guild || targetMember.id !== guild.ownerId) return false;

  const ephemeral = { flags: MessageFlags.Ephemeral };

  if (interaction.user.id === guild.ownerId) {
    await interaction.reply({
      ...ephemeral,
      content: 'You own this server, so change your own nickname with `/nick`.',
    });
    return true;
  }

  // Fetching the owner and sending the DM can outlast Discord's 3 second
  // reply window, so acknowledge first. Only the requester sees the replies.
  await interaction.deferReply(ephemeral);

  // Discord trims nicknames, so match against the trimmed value.
  const nick = rawNick.trim();
  if (!nick) {
    await interaction.editReply('Nicknames cannot be empty.');
    return true;
  }
  if (nick.length > MAX_NICK) {
    await interaction.editReply(`Nicknames can be at most ${MAX_NICK} characters.`);
    return true;
  }

  const now = Date.now();
  pruneCooldowns(now);
  const cooldownKey = `${guild.id}:${interaction.user.id}`;
  if (cooldowns.has(cooldownKey)) {
    await interaction.editReply(
      'You already sent the server owner a rename request recently. Try again in a few minutes.'
    );
    return true;
  }

  const requester = interaction.member?.displayName ?? interaction.user.username;

  try {
    const owner = await guild.fetchOwner();
    await owner.send(
      `**${escapeMarkdown(requester)}** wants to rename you in **${escapeMarkdown(guild.name)}** to:\n` +
      '```\n' + codeSafe(nick) + '\n```\n' +
      'Copy it, then run `/nick` in the server and paste it in.'
    );
  } catch (error) {
    console.error('Could not DM the server owner:', error);
    await interaction.editReply("I couldn't DM the server owner (their DMs may be closed).");
    return true;
  }

  cooldowns.set(cooldownKey, now);

  await interaction.editReply(
    `Figlet is processing your request to change this nickname to **${escapeMarkdown(nick)}**.`
  );
  return true;
}

module.exports = { handleOwnerRename };
