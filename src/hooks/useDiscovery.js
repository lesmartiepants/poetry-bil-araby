import { useState, useEffect, useMemo } from 'react';
import { track } from '@vercel/analytics';
import Sentry from '../sentry.js';
import { useLogger } from '../LogContext.jsx';
import { FEATURES } from '../constants/features';
import { CATEGORIES } from '../constants/categories';
import { getApiUrl, geminiTextFetch } from '../services/api';
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
        const estimatedTokens = Math.ceil((prompt.length + DISCOVERY_SYSTEM_PROMPT.length) / 4);

        addLog(
          'Discovery AI',
          `→ Generating poem | Request: ${(requestSize / 1024).toFixed(1)}KB | Prompt: ${prompt.length} chars | Est. ${estimatedTokens} tokens`,
          'info'
        );

        const res = await geminiTextFetch('generateContent', requestBody, { addLog });

        if (!res.ok) {
          const errorText = await res.text();
          addLog('Discovery AI Error', `HTTP ${res.status}: ${errorText.substring(0, 200)}`, 'error');
          throw new Error(`Gemini API returned ${res.status}`);
        }

        const responseBody = await res.text();
        const data = repairAndParseJSON(responseBody, addLog, 'Discovery');

        const apiTime = performance.now() - apiStart;
        const responseSize = new Blob([responseBody]).size;
        const estimatedOutputTokens = Math.ceil(responseBody.length / 4);

        if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid response structure from Gemini');
        }

        const rawPoem = data.candidates[0].content.parts[0].text;
        const parsed = repairAndParseJSON(rawPoem, addLog, 'Discovery');
        const arabicPoemChars = parsed?.arabic?.length || 0;
        const englishTransChars = parsed?.english?.length || 0;
        const metadataChars = JSON.stringify({
          poet: parsed.poet,
          title: parsed.title,
          tags: parsed.tags,
        }).length;

        addLog(
          'Discovery AI',
          `✓ Poem generated | API: ${(apiTime / 1000).toFixed(2)}s | Response: ${(responseSize / 1024).toFixed(1)}KB | In: ${estimatedTokens} → Out: ${estimatedOutputTokens} tokens`,
          'success'
        );
        addLog(
          'Discovery AI',
          `Content breakdown: ${arabicPoemChars} chars Arabic + ${englishTransChars} chars English + ${metadataChars} chars metadata`,
          'success'
        );
        track('poem_discovered', { source: 'gemini', poet: parsed.poet });
        if (parsed?.id) {
          emitEvent(parsed.id, 'serve', { source: 'gemini' });
          addLog('Event', `→ serve event emitted | poem_id: ${parsed.id} | source: gemini`, 'info');
        }

        parsed.id = Date.now();
        setPoems((prev) => {
          const updated = [...prev, parsed];
          setCurrentIndex(updated.length - 1);
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

  return {
    poems,
    currentIndex,
    selectedCategory,
    useDatabase,
    isFetching,
    filtered,
    current,
    setPoems,
    setCurrentIndex,
    setSelectedCategory,
    setUseDatabase,
    handleFetch,
  };
}
