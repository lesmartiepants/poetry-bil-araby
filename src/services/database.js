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
export const normalizeDbPoem = (poem) => {
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
export const fetchPoets = async ({ all = false } = {}) => {
  const res = await fetch(`${apiUrl}/api/poets${all ? '?all=1' : ''}`);
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
  for (let i = 0; i < count; i++) {
    try {
      const poem = await fetchRandomPoem({ poet: poetName, excludeIds: [...seenIds] });
      if (poem?.id && !seenIds.has(String(poem.id))) {
        seenIds.add(String(poem.id));
        results.push(poem);
      }
    } catch {
      /* skip failed fetch */
    }
  }
  return results;
};

/**
 * Fetch the emotional-categorization taxonomy: dimensions (each with its values
 * + counts) and the curated families. Data-driven — callers should render
 * whatever comes back rather than hardcoding dimension keys.
 *
 * Also passes through `distributions` (the era x century and accessibility
 * histograms). Those are what let the era and difficulty onboarding steps show
 * REAL counts — `fetchCategoryBands` falls back to sampling ~300 poems and
 * showing percentages whenever they are missing, so dropping them here silently
 * downgrades two of the five steps even against a server that publishes them.
 * Older servers omit the key entirely; the empty shape below keeps that fallback
 * working without any null-checking at the call site.
 *
 * Gracefully returns the empty shape both when the backend reports
 * categorization is absent (pre-migration) and on any network / parse error, so
 * the UI can show a "not available yet" state without crashing.
 *
 * @returns {Promise<{dimensions: Array, families: Array, distributions: {eras: Array, accessibility: Array}}>}
 */
const EMPTY_DISTRIBUTIONS = { eras: [], accessibility: [] };

/**
 * @param {Object} [scope] answers already given, as by-category filter params
 *   (`family`, `mood`, `motif`, `centuryFrom`/`centuryTo`/`includeUndated`/
 *   `undated`, `minAccessibility`/`maxAccessibility`). When present the server
 *   adds a `scope` block carrying counts narrowed to those answers plus the
 *   running totals. Omit it and the payload is exactly what it always was.
 */
/**
 * Per-page-load memo of the UNSCOPED taxonomy.
 *
 * That one payload costs ~850ms of aggregates on the server and is asked for by
 * four unrelated consumers (the onboarding bands, the tag taxonomy, the
 * dimension pickers, the category explorer). Before this they each sent their
 * own request. Memoising here — the single place they all go through — collapses
 * them into one, and is what makes a boot-time prefetch worth doing: the warm-up
 * and the later mount share a request instead of racing two.
 *
 * Storing the PROMISE, not the value, is the point: a caller arriving while the
 * first request is still in flight joins it rather than starting a second.
 *
 * SCOPED calls are deliberately NOT memoised. Their key space is combinatorial
 * (that is what cascading counts are), the server already keeps a bounded LRU
 * for them, and a stale count on a step the reader is actively changing is
 * worse than a fast one.
 *
 * Memory only, and short-lived on purpose. Cross-reload freshness is the HTTP
 * layer's job — /api/categories ships Cache-Control with stale-while-revalidate
 * — so there is no fourth cache to keep in sync here. The TTL only exists so a
 * tab left open for hours eventually picks up a pipeline rerun.
 */
const CATEGORIES_MEMO_TTL_MS = 5 * 60 * 1000;
let _categoriesMemo = null; // { at, promise }

/** Drop the unscoped memo. Exported for tests and any explicit refresh. */
export const _resetCategoriesMemo = () => {
  _categoriesMemo = null;
};

export const fetchCategories = async (scope = null) => {
  const unscoped = !scope || Object.keys(scope).length === 0;
  if (unscoped) {
    const now = Date.now();
    if (_categoriesMemo && now - _categoriesMemo.at < CATEGORIES_MEMO_TTL_MS)
      return _categoriesMemo.promise;
    const promise = fetchCategoriesUncached(null);
    _categoriesMemo = { at: now, promise };
    return promise;
  }
  return fetchCategoriesUncached(scope);
};

const fetchCategoriesUncached = async (scope) => {
  try {
    const qs = new URLSearchParams();
    if (scope) {
      for (const [k, v] of Object.entries(scope)) {
        if (v == null || v === '') continue;
        const encoded = Array.isArray(v) ? v.join(',') : String(v);
        if (encoded) qs.set(k, encoded);
      }
    }
    const suffix = qs.toString() ? `?${qs}` : '';
    const res = await fetch(`${apiUrl}/api/categories${suffix}`);
    if (!res.ok) throw new Error(`Categories API returned ${res.status}`);
    const data = await res.json();
    return {
      dimensions: Array.isArray(data?.dimensions) ? data.dimensions : [],
      families: Array.isArray(data?.families) ? data.families : [],
      scope: data?.scope || null,
      distributions: {
        eras: Array.isArray(data?.distributions?.eras) ? data.distributions.eras : [],
        accessibility: Array.isArray(data?.distributions?.accessibility)
          ? data.distributions.accessibility
          : [],
      },
    };
  } catch {
    return { dimensions: [], families: [], scope: null, distributions: EMPTY_DISTRIBUTIONS };
  }
};

/**
 * Fetch poems matching a set of category filters.
 *
 * Filters are data-driven: any dimension key returned by `fetchCategories`
 * (e.g. mood/topic/motif) is a valid key here, alongside family, poet, era,
 * minIntensity, maxAccessibility, and limit. Array values are comma-joined;
 * null / empty values are dropped.
 *
 * Returns `[]` when categorization is absent (the API returns an empty array).
 * Non-OK HTTP responses throw so callers can surface a real error state.
 *
 * @param {Object} [filters] - e.g. { family, mood, topic, minIntensity, poet, limit }
 * @returns {Promise<Array>} Array of normalised poem objects (with category fields)
 */
export const fetchPoemsByCategory = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '') return;
    const encoded = Array.isArray(value) ? value.join(',') : String(value);
    if (encoded) queryParams.set(key, encoded);
  });
  const qs = queryParams.toString();
  const url = `${apiUrl}/api/poems/by-category${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Category query returned ${res.status} ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeDbPoem) : [];
};

/**
 * Full-text search over poem title, content and poet name.
 *
 * Backed by `GET /api/poems/search?q=&limit=`, which is text-only — it does NOT
 * accept category filters or a sort order. Callers that need both text and
 * facets should query one side and narrow the other client-side.
 *
 * @param {Object} params
 * @param {string} params.q - search text (required, max 200 chars server-side)
 * @param {number} [params.limit=20] - 1..100
 * @returns {Promise<Array>} Array of normalised poem objects
 */
export const searchPoems = async ({ q, limit = 20 } = {}) => {
  const text = String(q || '').trim();
  if (!text) return [];
  const qs = new URLSearchParams({ q: text, limit: String(limit) });
  const res = await fetch(`${apiUrl}/api/poems/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`Search returned ${res.status} ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeDbPoem) : [];
};

/**
 * Ping the backend health endpoint.
 * Used for keep-alive to prevent Render free-tier cold starts.
 *
 * @returns {Promise<Response>} Fetch response (may reject on network error)
 */
export const pingHealth = () => fetch(`${apiUrl}/api/health`);
