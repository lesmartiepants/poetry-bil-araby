/* =============================================================================
  SEEN POEMS DEDUP (localStorage)
  =============================================================================
  Tracks recently seen poem IDs to avoid repeats during discovery.
  Entries older than 30 days are pruned automatically.
*/

const SEEN_POEMS_KEY = 'seenPoems';
const SEEN_POEMS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SEEN_POEMS_MAX_EXCLUDE = 200;

/** Read seen poems from localStorage. Returns Array<{id: number, seenAt: number}>. */
export const getSeenPoems = () => {
  try {
    const raw = localStorage.getItem(SEEN_POEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Record a poem as seen. */
export const markPoemSeen = (poemId) => {
  try {
    const seen = getSeenPoems();
    // Avoid duplicate entries for the same poem
    if (seen.some((entry) => entry.id === poemId)) return;
    seen.push({ id: poemId, seenAt: Date.now() });
    localStorage.setItem(SEEN_POEMS_KEY, JSON.stringify(seen));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
};

/** Remove entries older than 30 days. */
export const pruneSeenPoems = () => {
  try {
    const seen = getSeenPoems();
    const cutoff = Date.now() - SEEN_POEMS_MAX_AGE_MS;
    const pruned = seen.filter((entry) => entry.seenAt > cutoff);
    if (pruned.length !== seen.length) {
      localStorage.setItem(SEEN_POEMS_KEY, JSON.stringify(pruned));
    }
  } catch {
    // silently ignore
  }
};

/** Get recent seen IDs for the exclude param (max 200). */
export const getRecentSeenIds = () => {
  const seen = getSeenPoems();
  return seen.slice(-SEEN_POEMS_MAX_EXCLUDE).map((entry) => entry.id);
};
