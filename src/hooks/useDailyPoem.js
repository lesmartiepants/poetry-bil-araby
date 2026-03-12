import { useState, useEffect } from 'react';
import Sentry from '../sentry.js';
import { useLogger } from '../LogContext.jsx';
import { FEATURES } from '../constants/features';
import { getApiUrl } from '../services/api';
import { CACHE_CONFIG, cacheOperations } from '../services/cache';

/**
 * useDailyPoem
 *
 * Fetches and caches the poem of the day from the database API.
 * Uses IndexedDB cache with daily key to avoid redundant API calls.
 *
 * @param {boolean} useDatabase - Whether database mode is enabled
 * @returns {Object|null} dailyPoem - The daily poem object or null
 */
export function useDailyPoem(useDatabase) {
  const [dailyPoem, setDailyPoem] = useState(null);
  const { addLog } = useLogger();

  useEffect(() => {
    if (!useDatabase) return;
    const todayKey = `daily-${new Date().toISOString().slice(0, 10)}`;

    (async () => {
      // Check IndexedDB cache first
      if (FEATURES.caching) {
        try {
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.poems, todayKey);
          if (cached?.data) {
            setDailyPoem(cached.data);
            addLog('Daily', 'Loaded poem of the day from cache', 'info');
            return;
          }
        } catch {}
      }

      // Fetch from API
      try {
        const res = await fetch(`${getApiUrl()}/api/poems/daily`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const poem = await res.json();
        if (poem.arabic) poem.arabic = poem.arabic.replace(/\*/g, '\n');
        poem.isFromDatabase = true;
        setDailyPoem(poem);
        addLog('Daily', `Poem of the day: ${poem.poet} — ${poem.title}`, 'success');

        // Cache for today
        if (FEATURES.caching) {
          try {
            await cacheOperations.set(CACHE_CONFIG.stores.poems, todayKey, { data: poem });
          } catch {}
        }
      } catch (err) {
        Sentry.captureException(err);
        addLog('Daily', `Failed to load: ${err.message}`, 'error');
      }
    })();
  }, [useDatabase, addLog]);

  return dailyPoem;
}
