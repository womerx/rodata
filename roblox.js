const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE = {
  users:     'https://users.roblox.com/v1',
  friends:   'https://friends.roblox.com/v1',
  inventory: 'https://inventory.roblox.com/v2',
  badges:    'https://badges.roblox.com/v1',
  avatar:    'https://avatar.roblox.com/v1',
  economy:   'https://economy.roblox.com/v1',
  thumbs:    'https://thumbnails.roblox.com/v1',
};

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

/** Resolve username → user object { id, name, displayName, description, created, isBanned } */
async function getUserByUsername(username) {
  const data = await fetchJSON(
    `${BASE.users}/usernames/users`,
  ).catch(() => null);
  // POST endpoint — use fetch directly
  const res = await fetch(`${BASE.users}/usernames/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!res.ok) throw new Error(`User lookup failed: ${res.status}`);
  const json = await res.json();
  if (!json.data || json.data.length === 0) throw new Error(`User "${username}" not found.`);
  return json.data[0]; // { id, name, displayName }
}

/** Full user profile */
async function getUserProfile(userId) {
  return fetchJSON(`${BASE.users}/users/${userId}`);
}

/** Follower / following / friends counts */
async function getSocialCounts(userId) {
  const [followers, following, friends] = await Promise.all([
    fetchJSON(`${BASE.friends}/users/${userId}/followers/count`),
    fetchJSON(`${BASE.friends}/users/${userId}/followings/count`),
    fetchJSON(`${BASE.friends}/users/${userId}/friends/count`),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    friends:   friends.count ?? 0,
  };
}

/** Badge count (pages through all pages up to a max) */
async function getBadgeCount(userId) {
  let count = 0;
  let cursor = '';
  do {
    const url = `${BASE.badges}/users/${userId}/badges?limit=100&sortOrder=Asc${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await fetchJSON(url);
    count += (data.data || []).length;
    cursor = data.nextPageCursor || '';
    if (count >= 2000) { count = '2000+'; break; } // safety cap
  } while (cursor);
  return count;
}

/** Avatar items (currently wearing) */
async function getAvatarItems(userId) {
  const data = await fetchJSON(`${BASE.avatar}/users/${userId}/currently-wearing`);
  return data.assetIds || [];
}

/** Avatar outfit value (sum of asset prices, best-effort) */
async function getAvatarOutfitCost(assetIds) {
  if (!assetIds.length) return 0;
  // Fetch product info for each asset in parallel (limit to first 30 to avoid rate limits)
  const slice = assetIds.slice(0, 30);
  const results = await Promise.allSettled(
    slice.map(id =>
      fetchJSON(`https://economy.roblox.com/v2/assets/${id}/details`)
    )
  );
  let total = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const price = r.value?.PriceInRobux ?? r.value?.price ?? 0;
      total += typeof price === 'number' ? price : 0;
    }
  }
  return total;
}

/** 2-D avatar headshot thumbnail URL */
async function getAvatarHeadshotUrl(userId) {
  const data = await fetchJSON(
    `${BASE.thumbs}/users/avatar?userIds=${userId}&size=150x150&format=Png&isCircular=false`
  );
  return data?.data?.[0]?.imageUrl ?? null;
}

/** Full body avatar thumbnail URL */
async function getAvatarFullUrl(userId) {
  const data = await fetchJSON(
    `${BASE.thumbs}/users/avatar-bust?userIds=${userId}&size=150x150&format=Png&isCircular=false`
  );
  return data?.data?.[0]?.imageUrl ?? null;
}

module.exports = {
  getUserByUsername,
  getUserProfile,
  getSocialCounts,
  getBadgeCount,
  getAvatarItems,
  getAvatarOutfitCost,
  getAvatarHeadshotUrl,
  getAvatarFullUrl,
};
