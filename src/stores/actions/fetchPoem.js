import Sentry from '../../sentry.js';
import { toast } from 'sonner';
import { usePoemStore } from '../poemStore';
import { filterPoemsByCategory } from '../../utils/filterPoems.js';
import { CATEGORIES } from '../../constants/index.js';
import { DISCOVERY_SYSTEM_PROMPT } from '../../prompts';
import { repairAndParseJSON } from '../../utils/jsonRepair';
import { pruneSeenPoems, getRecentSeenIds } from '../../utils/seenPoems.js';
import { fetchRandomPoem } from '../../services/database.js';
import { geminiTextFetch } from '../../services/gemini.js';

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
    'info'
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
  addLog('Discovery DB', `→ Querying database | Category: ${selectedCategory}`, 'info');

  pruneSeenPoems();
  const seenIds = getRecentSeenIds();

  const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
  const poetName = categoryObj?.labelAr || selectedCategory;
  const poet = selectedCategory !== 'All' ? poetName : undefined;

  if (seenIds.length > 0) {
    addLog('Discovery DB', `Excluding ${seenIds.length} recently seen poems`, 'info');
  }

  const newPoem = await fetchRandomPoem({ poet, excludeIds: seenIds });
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

  toast('New poem discovered', { description: newPoem.poet, duration: 3000, icon: '✦' });
  setPoems((prev) => {
    const updated = [...prev, newPoem];
    const freshFiltered = filterPoemsByCategory(updated, usePoemStore.getState().selectedCategory);
    const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
    if (newIdx !== -1) setCurrentIndex(newIdx);
    return updated;
  });
  navigate('/poem/' + newPoem.id, { replace: true });
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
    'info'
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
  toast('New poem discovered', { description: newPoem.poet, duration: 3000, icon: '✦' });

  setPoems((prev) => {
    const updated = [...prev, newPoem];
    const freshFiltered = filterPoemsByCategory(updated, usePoemStore.getState().selectedCategory);
    const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
    if (newIdx !== -1) setCurrentIndex(newIdx);
    return updated;
  });
  navigate('/', { replace: true });
}
