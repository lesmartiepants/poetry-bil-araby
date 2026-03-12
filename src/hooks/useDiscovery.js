import { useState, useRef, useEffect, useMemo } from 'react';
import { track } from '@vercel/analytics';
import Sentry from '../sentry.js';
import { useLogger } from '../LogContext.jsx';
import { FEATURES } from '../constants/features';
import { CATEGORIES } from '../constants/categories';
import { getApiUrl, discoverTextModels, geminiTextFetch } from '../services/api';
import { DISCOVERY_SYSTEM_PROMPT } from '../prompts';
import { repairAndParseJSON } from '../utils/jsonRepair';
import seedPoems from '../data/seed-poems.json';

/**
 * useDiscovery
 *
 * Manages poem discovery state and fetching logic for both Database and AI modes.
 * Handles poem collection, filtering, category selection, and fetching new poems.
 *
 * @param {Function} emitEvent - Poem event emitter from usePoemEvents
 * @returns {Object} Discovery state and handlers
 */
export function useDiscovery(emitEvent) {
  const { addLog } = useLogger();

  const [poems, setPoems] = useState(() => {
    // 1. Restore from OAuth redirect (avoids flash of seed poem)
    try {
      const stashed = sessionStorage.getItem('pendingSavePoem');
      if (stashed) {
        const poem = JSON.parse(stashed);
        if (poem?.arabic) return [poem];
      }
    } catch {}

    // 2. Restore pre-fetched poem from last visit (with 7-day TTL)
    try {
      const raw = localStorage.getItem('qafiyah_nextPoem');
      if (raw) {
        const { poem, storedAt } = JSON.parse(raw);
        localStorage.removeItem('qafiyah_nextPoem');
        const age = Date.now() - (storedAt || 0);
        if (poem?.arabic && age < 7 * 24 * 60 * 60 * 1000) return [poem];
      }
    } catch {}

    // 3. First-ever visit: pick from seed pool
    if (seedPoems?.length > 0) {
      const idx = Math.floor(Math.random() * seedPoems.length);
      return [seedPoems[idx]];
    }

    // 4. Ultimate fallback
    return [
      {
        id: 1,
        poet: 'Nizar Qabbani',
        poetArabic: 'نزار قباني',
        title: 'My Beloved',
        titleArabic: 'حبيبتي',
        arabic:
          'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة\nحُبُّكِ مِثْلَ المَوْتِ وَالوِلَادَة\nصَعْبٌ بِأَنْ يُعَادَ مَرَّتَيْنِ',
        english:
          'Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.\nYour love is like Death and like Birth—\nIt is difficult for it to be repeated twice.',
        tags: ['Modern', 'Romantic', 'Ghazal'],
      },
    ];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [useDatabase, setUseDatabase] = useState(FEATURES.database);
  const [isFetching, setIsFetching] = useState(false);
  const [autoExplainPending, setAutoExplainPending] = useState(false);
  const hasAutoLoaded = useRef(false);

  const filtered = useMemo(() => {
    const searchStr = selectedCategory.toLowerCase();
    return selectedCategory === 'All'
      ? poems
      : poems.filter((p) => {
          const poetMatch = (p?.poet || '').toLowerCase().includes(searchStr);
          const tagsMatch =
            Array.isArray(p?.tags) && p.tags.some((t) => String(t).toLowerCase() === searchStr);
          return poetMatch || tagsMatch;
        });
  }, [poems, selectedCategory]);

  const current = filtered[currentIndex] || filtered[0] || poems[0] || null;

  // Pre-fetch a poem in the background for the next visit (stored in localStorage with TTL)
  async function prefetchNextVisitPoem() {
    try {
      const res = await fetch(`${getApiUrl()}/api/poems/random`);
      if (!res.ok) return;
      const poem = await res.json();
      if (poem.arabic) poem.arabic = poem.arabic.replace(/\*/g, '\n');
      if (poem.cachedTranslation)
        poem.cachedTranslation = poem.cachedTranslation.replace(/\*/g, '\n');
      poem.isFromDatabase = true;
      localStorage.setItem(
        'qafiyah_nextPoem',
        JSON.stringify({
          poem,
          storedAt: Date.now(),
        })
      );
    } catch {} // silent fail — prefetch is best-effort
  }

  const handleFetch = async () => {
    addLog(
      'UI Event',
      `🐰 Discover button clicked | Category: ${selectedCategory} | Source: ${useDatabase ? 'Database' : 'LLM'}`,
      'info'
    );

    if (isFetching) {
      addLog('Discovery', `Discovery already in progress - please wait`, 'info');
      return;
    }

    setIsFetching(true);

    try {
      const apiStart = performance.now();

      if (useDatabase) {
        if (selectedCategory !== 'All') {
          setSelectedCategory('All');
        }

        addLog('Discovery DB', `→ Querying database | Category: ${selectedCategory}`, 'info');

        const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
        const poetName = categoryObj?.labelAr || selectedCategory;
        const poetParam = selectedCategory !== 'All' ? `?poet=${encodeURIComponent(poetName)}` : '';
        const url = `${getApiUrl()}/api/poems/random${poetParam}`;

        try {
          const res = await fetch(url);

          if (!res.ok) {
            throw new Error(`Database API returned ${res.status} ${res.statusText}`);
          }

          const newPoem = await res.json();
          const apiTime = performance.now() - apiStart;

          if (newPoem.arabic) {
            newPoem.arabic = newPoem.arabic.replace(/\*/g, '\n');
          }
          if (newPoem.cachedTranslation) {
            newPoem.cachedTranslation = newPoem.cachedTranslation.replace(/\*/g, '\n');
          }

          newPoem.isFromDatabase = true;

          const arabicPoemChars = newPoem?.arabic?.length || 0;

          addLog(
            'Discovery DB',
            `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | DB ID: ${newPoem.id} | Arabic: ${arabicPoemChars} chars`,
            'success'
          );
          addLog('Discovery DB', `Poet: ${newPoem.poet} | Title: ${newPoem.title}`, 'success');
          track('poem_discovered', { source: 'database', poet: newPoem.poet });
          emitEvent(newPoem.id, 'serve', { source: 'database' });
          addLog(
            'Event',
            `→ serve event emitted | poem_id: ${newPoem.id} | source: database`,
            'info'
          );

          setPoems((prev) => {
            const updated = [...prev, newPoem];
            setCurrentIndex(updated.length - 1);
            return updated;
          });
          window.history.replaceState({}, '', '/poem/' + newPoem.id);
        } catch (dbError) {
          const errorMessage = dbError.message.includes('Failed to fetch')
            ? 'Backend server is not running. Please start it with: npm run dev:server'
            : dbError.message;

          addLog('Discovery DB Error', errorMessage, 'error');
          throw dbError;
        }
      } else {
        // LLM MODE: Original implementation
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
        const estimatedInputTokens = Math.ceil(
          (prompt.length + DISCOVERY_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = prompt.length;
        const systemPromptChars = DISCOVERY_SYSTEM_PROMPT.length;

        addLog(
          'Discovery API',
          `→ Searching ${selectedCategory} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars + systemPromptChars} chars (${promptChars} prompt + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          'info'
        );

        const res = await geminiTextFetch(
          'generateContent',
          requestBody,
          'Discovery failed',
          addLog
        );

        const data = await res.json();
        const apiTime = performance.now() - apiStart;

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedPoem = repairAndParseJSON(rawText);
        const cleanJson = (rawText || '').replace(/```json|```/g, '').trim();

        // Normalize tags: convert object to array if needed
        if (
          parsedPoem.tags &&
          typeof parsedPoem.tags === 'object' &&
          !Array.isArray(parsedPoem.tags)
        ) {
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
          const searchStr = selectedCategory.toLowerCase();
          const freshFiltered =
            selectedCategory === 'All'
              ? updated
              : updated.filter(
                  (p) =>
                    (p?.poet || '').toLowerCase().includes(searchStr) ||
                    (Array.isArray(p?.tags) &&
                      p.tags.some((t) => String(t).toLowerCase() === searchStr))
                );
          const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
          if (newIdx !== -1) setCurrentIndex(newIdx);
          return updated;
        });
        window.history.replaceState({}, '', '/');
      }
    } catch (e) {
      Sentry.captureException(e);
      addLog(
        'Discovery Error',
        `${e.message} | Source: ${useDatabase ? 'Database' : 'Gemini'}`,
        'error'
      );
    }
    setIsFetching(false);
  };

  const handleToggleDatabase = () => {
    const newMode = useDatabase ? 'ai' : 'database';
    track('mode_switched', { mode: newMode });
    setUseDatabase(!useDatabase);
  };

  // Category change effect
  useEffect(() => {
    if (selectedCategory !== 'All') {
      track('poet_filter_changed', { poet: selectedCategory });
      if (filtered.length === 0) {
        handleFetch();
      } else {
        setCurrentIndex(0);
      }
    } else {
      setCurrentIndex(0);
    }
  }, [selectedCategory]);

  // Eagerly discover available AI models via the backend proxy.
  useEffect(() => {
    discoverTextModels(addLog);
  }, []);

  // Auto-load a poem and queue explanation on first mount.
  // If the URL contains /poem/:id, load that specific poem (deep link).
  // OAuth restore and prefetch are handled in the useState lazy initializer.
  useEffect(() => {
    if (!hasAutoLoaded.current) {
      hasAutoLoaded.current = true;

      // Deep link detection: /poem/:id
      const deepLinkMatch = window.location.pathname.match(/^\/poem\/(\d+)$/);
      if (deepLinkMatch && useDatabase) {
        const poemId = deepLinkMatch[1];
        track('deep_link_loaded', { poemId });
        addLog('DeepLink', `Loading poem ID ${poemId} from URL`, 'info');
        fetch(`${getApiUrl()}/api/poems/${poemId}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Poem ${poemId} not found`);
            return res.json();
          })
          .then((poem) => {
            if (poem.arabic) poem.arabic = poem.arabic.replace(/\*/g, '\n');
            poem.isFromDatabase = true;
            setPoems([poem]);
            setCurrentIndex(0);
            setAutoExplainPending(true);
            addLog('DeepLink', `Loaded: ${poem.poet} — ${poem.title}`, 'success');
          })
          .catch((err) => {
            addLog('DeepLink', `Failed: ${err.message}`, 'error');
            setAutoExplainPending(true);
            handleFetch();
          });
        prefetchNextVisitPoem();
        return;
      }

      // Clear stashed OAuth poem (already restored by useState lazy initializer)
      try {
        sessionStorage.removeItem('pendingSavePoem');
      } catch {}

      // If the initial poem already has a cached translation, skip auto-explain
      const initial = poems[0];
      if (initial?.cachedTranslation) {
        addLog(
          'Init',
          `Loaded with cached translation: ${initial.poet} — ${initial.title}`,
          'success'
        );
      } else {
        // No cached translation — queue auto-explain and fetch from DB
        setAutoExplainPending(true);
        if (!initial?.isSeedPoem || !initial?.cachedTranslation) {
          handleFetch();
        }
      }

      // Background: pre-fetch next visit's poem
      prefetchNextVisitPoem();
    }
  }, []);

  return {
    poems,
    currentIndex,
    selectedCategory,
    useDatabase,
    isFetching,
    filtered,
    current,
    autoExplainPending,
    setPoems,
    setCurrentIndex,
    setSelectedCategory,
    setUseDatabase,
    setAutoExplainPending,
    handleFetch,
    handleToggleDatabase,
  };
}
