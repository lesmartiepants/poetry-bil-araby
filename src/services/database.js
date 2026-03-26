/**
 * Database API service — fetch poems, poets, and manage translations via the Express backend.
 */

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Normalise a poem returned by the database API:
 * - Replace the `*` line-break encoding with real newlines.
 * - Mark the poem as originating from the database.
 *
 * Returns a new object — does not mutate the original.
 *
 * @param {Object} poem - Raw poem object from the API
 * @returns {Object} New poem object with normalised fields
 */
const normalizeDbPoem = (poem) => {
  // The API converts snake_case DB columns to camelCase, but defensively handle both
  // in case the raw DB row leaks through (e.g. from the /api/poems/:id endpoint).
  const rawTranslation = poem.cachedTranslation || poem.cached_translation || poem.english || '';
  const translation = rawTranslation ? rawTranslation.replace(/\*/g, '\n') : '';
  return {
    ...poem,
    arabic: poem.arabic ? poem.arabic.replace(/\*/g, '\n') : poem.arabic,
    english: translation,
    cachedTranslation: translation || undefined,
    isFromDatabase: true,
  };
};

/**
 * Fetch a single poem by its database ID.
 *
 * @param {string|number} poemId - The poem's numeric database ID
 * @returns {Promise<Object>} Resolved poem object (normalised)
 */
export const fetchPoemById = async (poemId) => {
  const res = await fetch(`${apiUrl}/api/poems/${poemId}`);
  if (!res.ok) throw new Error(`Poem ${poemId} not found`);
  const poem = await res.json();
  return normalizeDbPoem(poem);
};

/**
 * Fetch a random poem from the database.
 *
 * @param {Object}   [options]            - Optional filters
 * @param {string}   [options.poet]       - Arabic poet name to filter by
 * @param {string[]} [options.excludeIds] - Poem IDs to exclude (dedup)
 * @returns {Promise<Object>} Resolved poem object (normalised)
 */
export const fetchRandomPoem = async ({ poet, excludeIds = [] } = {}) => {
  const queryParams = new URLSearchParams();
  if (poet) queryParams.set('poet', poet);
  if (excludeIds.length > 0) queryParams.set('exclude', excludeIds.join(','));
  const qs = queryParams.toString();
  const url = `${apiUrl}/api/poems/random${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Database API returned ${res.status} ${res.statusText}`);
  const poem = await res.json();
  return normalizeDbPoem(poem);
};

/**
 * Fetch the list of available poets from the database.
 *
 * @returns {Promise<Array<{name: string, poem_count?: number}>>} Array of poet objects
 */
export const fetchPoets = async () => {
  const res = await fetch(`${apiUrl}/api/poets`);
  if (!res.ok) throw new Error(`Failed to fetch poets: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Save a generated translation back to the database for future visitors.
 * Fire-and-forget — errors are silently swallowed.
 *
 * @param {string|number} poemId  - The poem's numeric database ID
 * @param {Object}        data    - Translation payload
 * @param {string}        data.translation  - Poetic English translation
 * @param {string|null}   [data.explanation] - Depth/explanation text
 * @param {string|null}   [data.authorBio]   - Author biography text
 */
export const saveTranslation = (poemId, { translation, explanation = null, authorBio = null }) => {
  fetch(`${apiUrl}/api/poems/${poemId}/translation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ translation, explanation, authorBio }),
  }).catch(() => {});
};

/**
 * Fetch multiple poems by the same poet for carousel pre-population.
 * Deduplicates by ID and excludes any IDs in `excludeIds`.
 *
 * @param {string}   poetName   - Arabic poet name to filter by
 * @param {number}   [count=5]  - Number of poems to fetch
 * @param {Array}    [excludeIds=[]] - Poem IDs to exclude
 * @returns {Promise<Array>} Array of normalised poem objects (may be shorter than count on error)
 */
export const fetchPoemsByPoet = async (poetName, count = 5, excludeIds = []) => {
  const seenIds = new Set(excludeIds.map(String));
  const results = [];

  await Promise.all(
    Array.from({ length: count }).map(async () => {
      try {
        const poem = await fetchRandomPoem({ poet: poetName, excludeIds: [...seenIds] });
        if (poem?.id && !seenIds.has(String(poem.id))) {
          seenIds.add(String(poem.id));
          results.push(poem);
        }
      } catch {
        // Silently skip failed individual fetches
      }
    })
  );

  return results;
};

/**
 * Ping the backend health endpoint.
 * Used for keep-alive to prevent Render free-tier cold starts.
 *
 * @returns {Promise<Response>} Fetch response (may reject on network error)
 */
export const pingHealth = () => fetch(`${apiUrl}/api/health`);
