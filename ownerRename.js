// ownerRename.js
// When someone uses /nickname on the server owner, FigletBot can't apply it
// (role hierarchy), so it DMs the owner the requested name ready to copy.
// The owner applies it with the client's built-in /nick command.

const MAX_NICK = 32; // Discord's nickname limit

// guildId -> { nick, requestedById, requestedByName, channelId, at }
const pending = new Map();

// Stop the requested name from breaking out of the code block.
function codeSafe(s) {
  return s.replace(/`/g, 'ˋ');
}

/**
 * Call this at the start of your /nickname handler.
 * Returns true if it handled the request (target was the owner),
 * false if your normal setNickname path should run.
 */
async function handleOwnerRename(interaction, targetMember, nick) {
  const guild = interaction.guild;
  if (!guild || targetMember.id !== guild.ownerId) return false;

  if (nick.length > MAX_NICK) {
    await interaction.reply({
      content: `Nicknames can be at most ${MAX_NICK} characters.`,
      ephemeral: true,
    });
    return true;
  }

  const owner = await guild.fetchOwner();
  const requester = interaction.member?.displayName ?? interaction.user.username;

  pending.set(guild.id, {
    nick,
    requestedById: interaction.user.id,
    requestedByName: requester,
    channelId: interaction.channelId,
    at: Date.now(),
  });

  try {
    await owner.send(
      `**${requester}** wants to rename you in **${guild.name}** to:\n` +
      '```\n' + codeSafe(nick) + '\n```\n' +
      'Copy it, then run `/nick` in the server and paste it in.'
    );
  } catch {
    pending.delete(guild.id);
    await interaction.reply({
      content: "I couldn't DM the server owner (their DMs may be closed).",
      ephemeral: true,
    });
    return true;
  }

  await interaction.reply({
    content: `I can't rename the server owner directly, so I've sent <@${owner.id}> your request for **${nick}**.`,
    allowedMentions: { parse: [] }, // show the mention without pinging
  });
  return true;
}

/**
 * Optional: announce when the owner actually applies the requested name.
 * Needs the GuildMembers privileged intent (enable it in the Developer
 * Portal and add GatewayIntentBits.GuildMembers to your client).
 * Register with: client.on('guildMemberUpdate', onGuildMemberUpdate);
 */
async function onGuildMemberUpdate(oldMember, newMember) {
  const req = pending.get(newMember.guild.id);
  if (!req || newMember.id !== newMember.guild.ownerId) return;
  if (newMember.nickname !== req.nick) return;

  pending.delete(newMember.guild.id);
  const channel = newMember.guild.channels.cache.get(req.channelId);
  if (channel?.isTextBased()) {
    await channel.send({
      content: `<@${newMember.id}> accepted **${req.requestedByName}**'s rename to **${req.nick}**.`,
      allowedMentions: { parse: [] },
    });
  }
}

module.exports = { handleOwnerRename, onGuildMemberUpdate };