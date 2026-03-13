const { EmbedBuilder } = require('discord.js');
const {
  getUserByUsername,
  getUserProfile,
  getSocialCounts,
  getBadgeCount,
  getAvatarItems,
  getAvatarOutfitCost,
  getAvatarHeadshotUrl,
  getAvatarFullUrl,
} = require('../roblox');

/**
 * Format a date string → "Month Day, Year"
 */
function formatDate(iso) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Format large numbers with commas
 */
function fmt(n) {
  if (n === undefined || n === null) return '0';
  return Number(n).toLocaleString();
}

/**
 * Handle /get <username>
 */
async function handleGetCommand(interaction) {
  const username = interaction.options.getString('username');

  // Defer so we have time to fetch everything
  await interaction.deferReply();

  try {
    // ── 1. Resolve username → ID ──────────────────────────────────────────────
    const partial = await getUserByUsername(username);
    const userId  = partial.id;

    // ── 2. Fetch everything in parallel ──────────────────────────────────────
    const [profile, social, avatarItemIds, headshotUrl, bustUrl] = await Promise.all([
      getUserProfile(userId),
      getSocialCounts(userId),
      getAvatarItems(userId),
      getAvatarHeadshotUrl(userId),
      getAvatarFullUrl(userId),
    ]);

    // Badge count & outfit cost (can be slow, run after main fetch)
    const [badgeCount, outfitCost] = await Promise.all([
      getBadgeCount(userId),
      getAvatarOutfitCost(avatarItemIds),
    ]);

    const profileUrl = `https://www.roblox.com/users/${userId}/profile`;

    // ── 3. Build the embed ────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x00B2FF)                          // Roblox-ish blue
      .setTitle(`${profile.displayName}  (@${profile.name})`)
      .setURL(profileUrl)
      .setThumbnail(headshotUrl ?? bustUrl)        // 2-D avatar top-left
      .setDescription(
        profile.description
          ? profile.description.slice(0, 300) + (profile.description.length > 300 ? '…' : '')
          : '*No bio set.*'
      )
      .addFields(
        // Row 1
        {
          name: '📅  Joined',
          value: formatDate(profile.created),
          inline: true,
        },
        {
          name: '🆔  User ID',
          value: `\`${userId}\``,
          inline: true,
        },
        {
          name: '🚫  Banned',
          value: profile.isBanned ? '⚠️ Yes' : '✅ No',
          inline: true,
        },
        // Row 2 – Social
        {
          name: '👥  Friends',
          value: fmt(social.friends),
          inline: true,
        },
        {
          name: '👣  Followers',
          value: fmt(social.followers),
          inline: true,
        },
        {
          name: '➕  Following',
          value: fmt(social.following),
          inline: true,
        },
        // Row 3 – Avatar / Badges
        {
          name: '👕  Avatar Items',
          value: avatarItemIds.length > 0 ? `${avatarItemIds.length} item${avatarItemIds.length !== 1 ? 's' : ''}` : 'None',
          inline: true,
        },
        {
          name: '💰  Outfit Value',
          value: outfitCost > 0 ? `${fmt(outfitCost)} R$` : 'Free / N/A',
          inline: true,
        },
        {
          name: '🏅  Badges',
          value: String(badgeCount),
          inline: true,
        },
      )
      .setImage(bustUrl)                           // Full bust image at bottom
      .setFooter({
        text: `Roblox  •  Requested by ${interaction.user.tag}`,
        iconURL: 'https://www.roblox.com/favicon.ico',
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('[/get]', err);

    const errEmbed = new EmbedBuilder()
      .setColor(0xFF4040)
      .setTitle('❌ Error')
      .setDescription(
        err.message.includes('not found')
          ? `No Roblox user found with the username **${username}**.`
          : `Something went wrong while fetching **${username}**.\n\`${err.message}\``
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [errEmbed] });
  }
}

module.exports = { handleGetCommand };
