import Sentry from '../../sentry.js';
import { usePoemStore } from '../poemStore';
import { filterPoemsByCategory } from '../../utils/filterPoems.js';
import { CATEGORIES } from '../../constants/index.js';
import { DISCOVERY_SYSTEM_PROMPT } from '../../prompts';
import { repairAndParseJSON } from '../../utils/jsonRepair';
import { pruneSeenPoems, getRecentSeenIds } from '../../utils/seenPoems.js';
import { fetchRandomPoem, fetchPoemsByCategory } from '../../services/database.js';
import { geminiTextFetch } from '../../services/gemini.js';
import { readPrefs } from '../../services/preferences.js';
import { fetchCategoryBands } from '../../services/categoryBands.js';
import {
  hasPreferences,
  candidateQueries,
  drawFrom,
  attributionFor,
  MAX_SCORE,
} from '../../services/preferenceWeighting.js';
import { setLastDraw } from '../../services/lastDraw.js';

/**
 * Band definitions are needed to turn a stored era/difficulty band KEY back into
 * the numeric range the API wants. They only change when the corpus changes, so
 * fetch once per session and reuse. Failure is non-fatal: without bands the
 * era/difficulty constraints are dropped and the other answers still apply.
 */
let bandsPromise = null;
const getBands = () => {
  if (!bandsPromise) {
    bandsPromise = fetchCategoryBands().catch(() => ({ eraBands: [], difficultyBands: [] }));
  }
  return bandsPromise;
};

/** Test seam — lets the weighting be reset between cases. */
export const __resetPreferenceBands = () => {
  bandsPromise = null;
};

/**
 * Serve a poem biased by the reader's onboarding answers, by SCORING candidates
 * rather than filtering the corpus down to them.
 *
 * Three steps, each of which exists for a reason:
 *
 *   1. Fetch candidates from `candidateQueries` — an ANCHORED page carrying the
 *      reader's single broadest answer, plus an UNANCHORED page carrying nothing
 *      at all. The anchor is what makes a rare answer reachable at speed; the
 *      open page is what keeps every poem in the corpus reachable full stop.
 *      Both, always. Dropping either breaks a different guarantee.
 *   2. Score and sample (`drawFrom`). Sampling, not top-N: the top of a static
 *      ranking is the same poems every session, which is the lock-in this whole
 *      design exists to avoid.
 *   3. Record the draw for the two verification surfaces.
 *
 * Returns null only when there was nothing to draw from at all, and the caller
 * falls back to the plain random fetch. Note what is NOT a reason to return null
 * any more: under the pool system a `wild` draw and a `core` draw that matched
 * nothing both bailed to the fallback. Scoring has no unfiltered pool to bail
 * to, because the open page is already IN the candidate set.
 *
 * Only called when the reader actually has saved answers; see the call site,
 * which checks that synchronously so a reader who skipped onboarding hits the
 * plain fetch on exactly the same tick as before this existed.
 */
async function fetchWeightedPoem({ prefs, poet, excludeIds, addLog }) {
  const bands = await getBands();
  const poemsSeen = excludeIds?.length || 0;
  const queries = candidateQueries(prefs);

  const pages = await Promise.all(
    queries.map((q) => fetchPoemsByCategory(poet ? { ...q.query, poet } : q.query).catch(() => []))
  );

  // Deduplicate: the anchored and open pages can legitimately return the same
  // poem, and leaving it in twice would quietly double its draw weight.
  const byId = new Map();
  pages.flat().forEach((p) => {
    if (p?.id != null && !byId.has(p.id)) byId.set(p.id, p);
  });
  const all = [...byId.values()];

  // Prefer poems the reader has not seen, but fall back rather than starve — a
  // reader deep into a narrow corner can have seen every candidate on the page.
  const fresh = all.filter((p) => !excludeIds?.includes(p.id));
  const candidates = fresh.length ? fresh : all;
  if (!candidates.length) {
    addLog('Discovery Bias', 'No candidates returned — widening to a plain draw', 'info');
    return null;
  }

  const { poem, scored, temperature, index } = drawFrom(candidates, prefs, poemsSeen, bands);
  if (!poem) return null;

  const picked = scored[index];
  // Ride the score on the poem itself so the reader-facing line survives
  // scrolling back through the carousel; the module-level box below only ever
  // holds the LAST draw, which the carousel would outlive.
  poem.discoveryDraw = {
    score: picked.score,
    max: picked.max,
    ratio: picked.ratio,
    scaled: picked.scaled,
    matched: picked.matched,
    attribution: attributionFor(picked, bands, prefs),
  };

  setLastDraw({ scored, temperature, picked: poem, prefs, queries, poemsSeen, bands });

  addLog(
    'Discovery Bias',
    `Scored draw | ${picked.scaled.toFixed(2)}/${MAX_SCORE} | ${candidates.length} candidates | T=${temperature.toFixed(2)} | seen: ${poemsSeen}`,
    'info'
  );
  return poem;
}

/**
 * Fetch a new poem (DB mode or AI mode) and add it to the store.
 *
 * @param {Object} options - External dependencies injected from component
 * @param {Function} options.addLog - Logging function
 * @param {Function} options.track - Analytics tracking
 * @param {Function} options.emitEvent - Poem event emitter
 * @param {Function} options.navigate - Router navigation
 * @param {Function} options.markPoemSeen - Mark poem as seen for dedup
 */
export async function fetchPoem({ addLog, track, emitEvent, navigate, markPoemSeen }) {
  const store = usePoemStore.getState();
  const {
    selectedCategory,
    useDatabase,
    isFetching,
    setFetching,
    setPoems,
    setCurrentIndex,
    setAutoExplain,
  } = store;

  addLog(
    'UI Event',
    `🐰 Discover button clicked | Category: ${selectedCategory} | Source: ${useDatabase ? 'Database' : 'LLM'}`,
    'user'
  );

  if (isFetching) {
    addLog('Discovery', 'Discovery already in progress - please wait', 'info');
    return;
  }

  setFetching(true);

  try {
    const apiStart = performance.now();

    if (useDatabase) {
      await fetchFromDatabase({
        selectedCategory,
        apiStart,
        addLog,
        track,
        emitEvent,
        navigate,
        markPoemSeen,
        setPoems,
        setCurrentIndex,
        setAutoExplain,
      });
    } else {
      await fetchFromAI({
        selectedCategory,
        apiStart,
        addLog,
        track,
        emitEvent,
        navigate,
        setPoems,
        setCurrentIndex,
      });
    }
  } catch (e) {
    Sentry.captureException(e);
    addLog(
      'Discovery Error',
      `${e.message} | Source: ${useDatabase ? 'Database' : 'Gemini'}`,
      'error'
    );
  }
  setFetching(false);
}

async function fetchFromDatabase({
  selectedCategory,
  apiStart,
  addLog,
  track,
  emitEvent,
  navigate,
  markPoemSeen,
  setPoems,
  setCurrentIndex,
  setAutoExplain,
}) {
  addLog('Discovery DB', `→ Querying database | Category: ${selectedCategory}`, 'request');

  pruneSeenPoems();
  const seenIds = getRecentSeenIds();

  const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
  const poetName = categoryObj?.labelAr || selectedCategory;
  const poet = selectedCategory !== 'All' ? poetName : undefined;

  if (seenIds.length > 0) {
    addLog('Discovery DB', `Excluding ${seenIds.length} recently seen poems`, 'info');
  }

  // Bias the draw toward the reader's onboarding answers WITHOUT filtering the
  // corpus down to them — see src/services/preferenceWeighting.js. Returns null
  // when there are no saved answers or when the candidate pages came back empty;
  // in both cases we fall through to the plain random fetch, so the feed can
  // never be starved by a narrow preference.
  //
  // The `hasPreferences` check is SYNCHRONOUS and deliberately outside the
  // await: a reader who skipped onboarding must reach fetchRandomPoem on the
  // same microtask tick as before this code existed. Awaiting unconditionally
  // shifts the fetch by a tick, which is enough to reorder it against the other
  // requests the app fires on a poet switch.
  const prefs = readPrefs();
  const weighted = hasPreferences(prefs)
    ? await fetchWeightedPoem({ prefs, poet, excludeIds: seenIds, addLog }).catch(() => null)
    : null;
  const newPoem = weighted || (await fetchRandomPoem({ poet, excludeIds: seenIds }));
  const apiTime = performance.now() - apiStart;

  markPoemSeen(newPoem.id);

  const arabicPoemChars = newPoem?.arabic?.length || 0;
  addLog(
    'Discovery DB',
    `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | DB ID: ${newPoem.id} | Arabic: ${arabicPoemChars} chars`,
    'success'
  );
  addLog('Discovery DB', `Poet: ${newPoem.poet} | Title: ${newPoem.title}`, 'success');
  track('poem_discovered', { source: 'database', poet: newPoem.poet });
  emitEvent(newPoem.id, 'serve', { source: 'database' });
  addLog('Event', `→ serve event emitted | poem_id: ${newPoem.id} | source: database`, 'info');

  setPoems((prev) => {
    const updated = [...prev, newPoem];
    const freshFiltered = filterPoemsByCategory(updated, usePoemStore.getState().selectedCategory);
    const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
    if (newIdx !== -1) setCurrentIndex(newIdx);
    return updated;
  });
  navigate('/poem/' + newPoem.id + (typeof window !== 'undefined' ? window.location.search : ''));
  if (!newPoem.cachedTranslation) {
    setAutoExplain(true);
  }
}

async function fetchFromAI({
  selectedCategory,
  apiStart,
  addLog,
  track,
  emitEvent,
  navigate,
  setPoems,
  setCurrentIndex,
}) {
  const prompt =
    selectedCategory === 'All'
      ? 'Find a masterpiece Arabic poem. COMPLETE text.'
      : `Find a famous poem by ${selectedCategory}. COMPLETE text.`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: `${prompt} JSON only.` }] }],
    systemInstruction: { parts: [{ text: DISCOVERY_SYSTEM_PROMPT }] },
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
  });

  const requestSize = new Blob([requestBody]).size;
  const estimatedInputTokens = Math.ceil((prompt.length + DISCOVERY_SYSTEM_PROMPT.length) / 4);
  const promptChars = prompt.length;
  const systemPromptChars = DISCOVERY_SYSTEM_PROMPT.length;

  addLog(
    'Discovery API',
    `→ Searching ${selectedCategory} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars + systemPromptChars} chars (${promptChars} prompt + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
    'request'
  );

  const res = await geminiTextFetch('generateContent', requestBody, 'Discovery failed', addLog);
  const data = await res.json();
  const apiTime = performance.now() - apiStart;

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsedPoem = repairAndParseJSON(rawText);
  const cleanJson = (rawText || '').replace(/```json|```/g, '').trim();

  // Normalize tags: convert object to array if needed
  if (parsedPoem.tags && typeof parsedPoem.tags === 'object' && !Array.isArray(parsedPoem.tags)) {
    addLog(
      'Discovery Tags',
      `Converting tags from object to array | Original: ${JSON.stringify(parsedPoem.tags)}`,
      'info'
    );
    parsedPoem.tags = [
      parsedPoem.tags.Era || parsedPoem.tags.era || 'Unknown',
      parsedPoem.tags.Mood || parsedPoem.tags.mood || 'Unknown',
      parsedPoem.tags.Type || parsedPoem.tags.type || 'Unknown',
    ];
  }

  const newPoem = { ...parsedPoem, id: Date.now() };

  const responseSize = new Blob([cleanJson]).size;
  const estimatedOutputTokens = Math.ceil(cleanJson.length / 4);
  const tokensPerSecond = (estimatedOutputTokens / (apiTime / 1000)).toFixed(1);
  const jsonChars = cleanJson.length;
  const arabicPoemChars = newPoem?.arabic?.length || 0;
  const englishPoemChars = newPoem?.english?.length || 0;

  const tagsType = Array.isArray(newPoem?.tags) ? 'array' : typeof newPoem?.tags;
  const tagsContent = Array.isArray(newPoem?.tags)
    ? `[${newPoem.tags.join(', ')}]`
    : JSON.stringify(newPoem?.tags);
  addLog(
    'Discovery Tags',
    `Type: ${tagsType} | Count: ${Array.isArray(newPoem?.tags) ? newPoem.tags.length : 'N/A'} | Content: ${tagsContent}`,
    'info'
  );

  addLog(
    'Discovery API',
    `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | Response: ${(responseSize / 1024).toFixed(1)}KB | ${jsonChars} chars`,
    'success'
  );
  addLog(
    'Discovery Metrics',
    `${estimatedOutputTokens} tokens | ${tokensPerSecond} tok/s | Arabic: ${arabicPoemChars} chars | English: ${englishPoemChars} chars | Poet: ${newPoem.poet}`,
    'success'
  );
  track('poem_discovered', { source: 'ai', poet: newPoem.poet });
  emitEvent(newPoem.id, 'serve', { source: 'ai' });
  addLog('Event', `→ serve event emitted | poem_id: ${newPoem.id} | source: ai`, 'info');
  setPoems((prev) => {
    const updated = [...prev, newPoem];
    const freshFiltered = filterPoemsByCategory(updated, usePoemStore.getState().selectedCategory);
    const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
    if (newIdx !== -1) setCurrentIndex(newIdx);
    return updated;
  });
  navigate('/' + (typeof window !== 'undefined' ? window.location.search : ''), { replace: true });
}
