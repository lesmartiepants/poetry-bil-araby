import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  BookOpen,
  RefreshCw,
  Volume2,
  ChevronDown,
  Quote,
  Globe,
  Moon,
  Sun,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Copy,
  LayoutGrid,
  Check,
  Bug,
  Trash2,
  Sparkles,
  Feather,
  Compass,
  Heart,
  LogIn,
  LogOut,
  User,
  Settings2,
  ArrowRight,
  Languages,
  Share2,
  ThumbsDown,
  Brain,
  ALargeSmall,
  UserRound,
  ScrollText,
  Shuffle,
  Paintbrush,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import Sentry from './sentry.js';
import {
  useAuth,
  useUserSettings,
  useSavedPoems,
  useDownvotes,
  usePoemEvents,
} from './hooks/useAuth';
import { INSIGHTS_SYSTEM_PROMPT, DISCOVERY_SYSTEM_PROMPT, getTTSContent } from './prompts';
import { parseInsight } from './utils/insightParser';
import { repairAndParseJSON } from './utils/jsonRepair';
import seedPoems from './data/seed-poems.json';

/* =============================================================================
  1. FEATURE FLAGS & DESIGN SYSTEM
  =============================================================================
*/

const FEATURES = {
  grounding: false,
  debug: true, // Debug panel visibility
  logging: true, // Emit structured logs to console (captured by Vercel/browser)
  caching: true, // Enable IndexedDB caching for audio/insights
  streaming: true, // Enable streaming insights (progressive rendering)
  prefetching: true, // Enable smart prefetching (rate-limited to avoid API issues)
  database: true, // Enable database poem source (requires backend server running)
  onboarding: true, // Show kinetic walkthrough (phases 1-3) on first visit
  forceOnboarding: false, // Bypass hasSeenOnboarding check (enable to force onboarding every visit)
};

const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-2 pb-1',
  mainTagSize: 'text-[11px]',
  mainTitleSize: 'text-[clamp(1.875rem,3.5vw,2.25rem)]', // 30px-36px (updated from text-3xl md:text-4xl)
  mainSubtitleSize: 'text-[clamp(10px,1.2vw,14px)]', // 10px-14px (updated from text-sm)
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-[clamp(1rem,1.8vw,1.125rem)]', // 16px-18px for insight panel
  glass: 'backdrop-blur-3xl backdrop-saturate-150',
  radius: 'rounded-2xl',
  anim: 'transition-all duration-300 ease-in-out',
  buttonHover: 'hover:scale-105 hover:shadow-lg transition-all duration-300',
  touchTarget: 'min-w-[44px] min-h-[44px]',
};

const THEME = {
  dark: {
    bg: 'bg-[#0c0c0e]',
    text: 'text-stone-200',
    accent: 'text-indigo-400',
    glass: 'bg-stone-950/10',
    border: 'border-white/[0.06]',
    shadow: 'shadow-black/60',
    pill: 'bg-stone-900/40 border-stone-700/50',
    glow: 'from-indigo-600/30 via-purple-600/15 to-transparent',
    brand: 'text-indigo-400',
    brandBg: 'bg-indigo-500/10',
    brandBorder: 'border-indigo-500/20',
    btnPrimary: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40',
    titleColor: 'text-[#C5A059]', // Antique Gold
    poetColor: 'text-[#C5A059]', // Unified Gold
    controlIcon: 'text-stone-300 hover:text-white',
    gold: '#C5A059', // Raw gold hex for inline styles & template literals
    goldText: 'text-[#C5A059]', // Tailwind gold text
    goldHoverBg: 'hover:bg-[#C5A059]/12', // Gold hover background (buttons)
    goldHoverBg15: 'hover:bg-[#C5A059]/15', // Gold hover background (sidebar)
    goldActiveBg: 'bg-[#C5A059]/15', // Gold active/selected background
    goldBorder: 'border-[#C5A059]', // Gold solid border (selected state)
    goldBorderMuted: 'border-[#C5A059]/20', // Gold muted border (dividers)
    goldBorderSubtle: 'border-[#C5A059]/30', // Gold subtle border (hover)
    goldHoverBorderSubtle: 'hover:border-[#C5A059]/30', // Gold hover border
    goldBorderAccent: 'border-[#C5A059]/40', // Gold border accent (sidebar edges)
    goldBorderStrong: 'border-[#C5A059]/70', // Gold border strong (hover state)
    goldHoverBorderStrong: 'hover:border-[#C5A059]/70', // Gold hover border strong
    goldBg10: 'bg-[#C5A059]/10', // Gold background 10% (selected items)
    goldBg20: 'border-[#C5A059]/20', // Gold background 20% (badge border)
    goldTextMuted: 'text-[#C5A059]/60', // Gold muted text
    error: 'text-red-400', // Error text
    errorBg: 'bg-red-600/80', // Error background (bug report button)
    debug: 'bg-black/60 border-stone-800 text-stone-300', // Debug panel
    debugInput: 'bg-stone-900/80 border-stone-700 text-stone-200 placeholder:text-stone-500', // Debug input
    debugDivider: 'border-stone-700', // Debug panel divider
    kbd: 'bg-stone-800 text-stone-300 border-stone-700', // Keyboard shortcut keys
  },
  light: {
    bg: 'bg-[#FDFCF8]',
    text: 'text-stone-800',
    accent: 'text-indigo-600',
    glass: 'bg-white/40',
    border: 'border-white/50',
    shadow: 'shadow-indigo-100/50',
    pill: 'bg-white/40 border-white/60',
    glow: 'from-indigo-500/15 via-purple-500/10 to-transparent',
    brand: 'text-indigo-600',
    brandBg: 'bg-indigo-500/5',
    brandBorder: 'border-indigo-500/10',
    btnPrimary: 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-200',
    titleColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    poetColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    controlIcon: 'text-indigo-950/90 hover:text-black',
    gold: '#8B7355', // Raw gold hex for inline styles & template literals
    goldText: 'text-[#8B7355]', // Tailwind gold text
    goldHoverBg: 'hover:bg-[#8B7355]/12', // Gold hover background (buttons)
    goldHoverBg15: 'hover:bg-[#8B7355]/15', // Gold hover background (sidebar)
    goldActiveBg: 'bg-[#8B7355]/15', // Gold active/selected background
    goldBorder: 'border-[#8B7355]', // Gold solid border (selected state)
    goldBorderMuted: 'border-[#8B7355]/20', // Gold muted border (dividers)
    goldBorderSubtle: 'border-[#8B7355]/30', // Gold subtle border (hover)
    goldHoverBorderSubtle: 'hover:border-[#8B7355]/30', // Gold hover border
    goldBorderAccent: 'border-[#8B7355]/40', // Gold border accent (sidebar edges)
    goldBorderStrong: 'border-[#8B7355]/70', // Gold border strong (hover state)
    goldHoverBorderStrong: 'hover:border-[#8B7355]/70', // Gold hover border strong
    goldBg10: 'bg-[#8B7355]/10', // Gold background 10% (selected items)
    goldBg20: 'border-[#8B7355]/20', // Gold background 20% (badge border)
    goldTextMuted: 'text-[#8B7355]/60', // Gold muted text
    error: 'text-red-400', // Error text (same in light for visibility)
    errorBg: 'bg-red-600/80', // Error background (bug report button)
    debug: 'bg-white/60 border-stone-200 text-stone-700', // Debug panel
    debugInput: 'bg-white/80 border-stone-300 text-stone-800 placeholder:text-stone-400', // Debug input
    debugDivider: 'border-stone-300', // Debug panel divider
    kbd: 'bg-stone-200 text-stone-700 border-stone-300', // Keyboard shortcut keys
  },
};

// Convenience alias: many UI elements (control bar, dropdowns, badges) always use
// the dark-mode gold regardless of current theme.  Destructuring avoids verbose
// `THEME.dark.*` references throughout the JSX.
const GOLD = THEME.dark;

// ── Shared Brand Styles ──────────────────────────────────────────────────
// Single source of truth for بالعربي + poetry + feather rendering.
// Used by: main header, splash desert phase. (Kinetic splash has its own animations.)
const BRAND = {
  arabic: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    lineHeight: 1,
  },
  english: {
    fontFamily: "'Forum', serif",
    fontSize: 'clamp(2.86rem, 5.72vw, 4.4rem)', // 10% larger than previous 2.6/5.2/4
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  feather: {
    width: 'clamp(24px, 4vw, 36px)',
    height: 'clamp(24px, 4vw, 36px)',
    opacity: 0.8,
  },
};

const CATEGORIES = [
  { id: 'All', label: 'All Poets', labelAr: 'كل الشعراء' },
  { id: 'المتنبي', label: 'Al-Mutanabbi', labelAr: 'المتنبي' },
  { id: 'محمود درويش', label: 'Mahmoud Darwish', labelAr: 'محمود درويش' },
  { id: 'نزار قباني', label: 'Nizar Qabbani', labelAr: 'نزار قباني' },
  { id: 'أبو العلاء المعري', label: "Al-Ma'arri", labelAr: 'أبو العلاء المعري' },
  { id: 'عنترة بن شداد', label: 'Antarah', labelAr: 'عنترة بن شداد' },
];

const FONTS = [
  { id: 'Amiri', label: 'Amiri', labelAr: 'أميري', family: 'font-amiri' },
  { id: 'Alexandria', label: 'Alexandria', labelAr: 'الإسكندرية', family: 'font-alexandria' },
  { id: 'El Messiri', label: 'El Messiri', labelAr: 'المسيري', family: 'font-messiri' },
  { id: 'Lalezar', label: 'Lalezar', labelAr: 'لاله‌زار', family: 'font-lalezar' },
  { id: 'Rakkas', label: 'Rakkas', labelAr: 'رقاص', family: 'font-rakkas' },
  { id: 'Fustat', label: 'Fustat', labelAr: 'فسطاط', family: 'font-fustat' },
  { id: 'Kufam', label: 'Kufam', labelAr: 'كوفام', family: 'font-kufam' },
  { id: 'Katibeh', label: 'Katibeh', labelAr: 'كاتبة', family: 'font-katibeh' },
];

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/* =============================================================================
  1b. SEEN POEMS DEDUP (localStorage)
  =============================================================================
  Tracks recently seen poem IDs to avoid repeats during discovery.
  Entries older than 30 days are pruned automatically.
*/

const SEEN_POEMS_KEY = 'seenPoems';
const SEEN_POEMS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SEEN_POEMS_MAX_EXCLUDE = 200;

/** Read seen poems from localStorage. Returns Array<{id: number, seenAt: number}>. */
const getSeenPoems = () => {
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
const markPoemSeen = (poemId) => {
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
const pruneSeenPoems = () => {
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
const getRecentSeenIds = () => {
  const seen = getSeenPoems();
  return seen.slice(-SEEN_POEMS_MAX_EXCLUDE).map((entry) => entry.id);
};

/* =============================================================================
  2. API PROMPTS & CONFIGURATION
  =============================================================================
*/

/**
 * API Model Endpoints
 * Text model list is built dynamically by discoverTextModels(); textDefaults is the fallback
 * used when the ListModels API is unavailable. Starts with the cheapest Gemini 2.5 model.
 */
const API_MODELS = {
  tts: 'gemini-2.5-pro-preview-tts',
  ttsFallback: 'gemini-2.5-flash-preview-tts',
  textDefaults: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
};

/**
 * Module-level cache for the ranked list of available Gemini text models.
 * Populated on first call to discoverTextModels(); shared across all handlers.
 */
let _discoveredTextModels = null;

/**
 * Fetch and rank available Gemini text models via the ListModels API.
 * Prefers newer versions and cheaper (flash) models over pro.
 * Falls back to API_MODELS.textDefaults if the API is unreachable or returns no usable models.
 * Result is cached for the lifetime of the page.
 */
const discoverTextModels = async (addLog) => {
  if (_discoveredTextModels) return _discoveredTextModels;
  try {
    const res = await fetch(`${apiUrl}/api/ai/models`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { models = [] } = await res.json();
    const ranked = models
      .filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          typeof m.name === 'string' &&
          m.name.includes('gemini') &&
          !m.name.includes('embedding') &&
          !m.name.includes('tts')
      )
      .map((m) => {
        const id = m.name.replace('models/', '');
        const vm = id.match(/gemini-(\d+)\.(\d+)/);
        const major = vm ? parseInt(vm[1]) : 0;
        const minor = vm ? parseInt(vm[2]) : 0;
        const isFlash = id.includes('flash');
        // '8b' identifies Google's 8-billion-parameter lite variants (e.g. gemini-1.5-flash-8b)
        const isLite = id.includes('lite') || id.includes('8b');
        // Scoring: major version (×1000) > minor version (×100) > flash bonus (+10) > lite penalty (−5)
        // Higher score = try first; prefers newest model, then flash (cheaper) over pro, avoids lite.
        const score = major * 1000 + minor * 100 + (isFlash ? 10 : 0) - (isLite ? 5 : 0);
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((m) => m.id);
    if (ranked.length > 0) {
      _discoveredTextModels = ranked;
      if (addLog)
        addLog(
          'Model Discovery',
          `${ranked.length} models ranked: ${ranked.slice(0, 3).join(', ')}`,
          'info'
        );
      return _discoveredTextModels;
    }
  } catch (err) {
    if (addLog)
      addLog(
        'Model Discovery',
        `ListModels unavailable: ${err.message} — using defaults`,
        'warning'
      );
  }
  _discoveredTextModels = [...API_MODELS.textDefaults];
  return _discoveredTextModels;
};

/**
 * Fetch from a Gemini text endpoint with automatic model fallback.
 * Uses the dynamically discovered model list (ranked newest/cheapest first).
 * Retries on HTTP 404/410 (model unavailable/deprecated); throws immediately on other errors.
 *
 * @param {string}   endpoint - Gemini method segment, e.g. 'generateContent' or 'streamGenerateContent'
 * @param {string}   body     - Pre-serialised JSON request body
 * @param {string}   label    - Human-readable prefix for the thrown error message
 * @param {Function} addLog   - Component logging helper
 * @returns {Promise<Response>} Resolved Response with ok === true
 */
const geminiTextFetch = async (endpoint, body, label, addLog) => {
  const models = await discoverTextModels(addLog);
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) addLog('Model Fallback', `Trying fallback: ${model}`, 'warning');
    const res = await fetch(`${apiUrl}/api/ai/${model}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) {
      if (i > 0) addLog('Model Fallback', `✓ Using fallback model: ${model}`, 'success');
      return res;
    }
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${res.status}`;
    // Only retry on model-unavailable HTTP codes: 404 Not Found, 410 Gone (deprecated)
    if ((res.status !== 404 && res.status !== 410) || i === models.length - 1) {
      throw new Error(`${label}: ${errMsg}`);
    }
    addLog('Model Fallback', `${model} not available, trying next...`, 'warning');
  }
};

/**
 * TTS Voice Configuration
 */
const TTS_CONFIG = {
  voiceName: 'Fenrir',
  responseModalities: ['AUDIO'],
};

/**
 * Fetch TTS with model fallback on 429 (rate limit) responses.
 * Tries the primary TTS model first; on 429 (daily quota exhausted),
 * switches to the fallback model instead of retrying the same one.
 * Quotas are per-model-per-day, so the fallback has its own quota.
 */
const fetchTTSWithFallback = async (url, options, { addLog, label = 'TTS' } = {}) => {
  const primaryModel = API_MODELS.tts;
  const t0 = performance.now();
  const res = await fetch(url, options);
  const primaryMs = performance.now() - t0;

  if (res.status !== 429) return { res, model: primaryModel };

  // Primary model rate-limited — try fallback model (separate daily quota)
  if (API_MODELS.ttsFallback) {
    const fallbackModel = API_MODELS.ttsFallback;
    const fallbackUrl = url.replace(primaryModel, fallbackModel);
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → falling back to ${fallbackModel}`,
        'warning'
      );
    const t1 = performance.now();
    const fallbackRes = await fetch(fallbackUrl, options);
    const fallbackMs = performance.now() - t1;
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → ${fallbackModel}: ${fallbackRes.status} (${(fallbackMs / 1000).toFixed(1)}s)`,
        fallbackRes.ok ? 'success' : 'warning'
      );
    return { res: fallbackRes, model: fallbackModel };
  }

  return { res, model: primaryModel };
};

/* =============================================================================
  3. CACHE CONFIGURATION & INDEXEDDB WRAPPER
  =============================================================================
*/

const CACHE_CONFIG = {
  dbName: 'poetry-cache-v1',
  version: 1,
  stores: {
    audio: 'audio-cache',
    insights: 'insights-cache',
    poems: 'poems-cache',
  },
  expiry: {
    audio: 7 * 24 * 60 * 60 * 1000, // 7 days
    insights: 30 * 24 * 60 * 60 * 1000, // 30 days
    poems: null, // Never expire
  },
  maxSize: 500 * 1024 * 1024, // 500MB
};

/**
 * Initialize IndexedDB cache database
 * Creates object stores for audio, insights, and poems if they don't exist
 */
const initCache = () => {
  return new Promise((resolve, reject) => {
    if (!FEATURES.caching) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(CACHE_CONFIG.dbName, CACHE_CONFIG.version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.audio)) {
        db.createObjectStore(CACHE_CONFIG.stores.audio, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.insights)) {
        db.createObjectStore(CACHE_CONFIG.stores.insights, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.poems)) {
        db.createObjectStore(CACHE_CONFIG.stores.poems, { keyPath: 'poemId' });
      }
    };
  });
};

/**
 * Cache operations for IndexedDB
 * Provides get, set, delete, and clear operations with expiry checking
 */
const cacheOperations = {
  /**
   * Get an item from cache with expiry check
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<Object|null>} Cached data or null if expired/missing
   */
  async get(storeName, poemId) {
    if (!FEATURES.caching) return null;

    try {
      const db = await initCache();
      if (!db) return null;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(poemId);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check expiry
          const expiryTime =
            storeName === CACHE_CONFIG.stores.audio
              ? CACHE_CONFIG.expiry.audio
              : storeName === CACHE_CONFIG.stores.insights
                ? CACHE_CONFIG.expiry.insights
                : CACHE_CONFIG.expiry.poems;

          if (expiryTime && result.timestamp) {
            const age = Date.now() - result.timestamp;
            if (age > expiryTime) {
              // Expired - delete and return null
              cacheOperations.delete(storeName, poemId);
              resolve(null);
              return;
            }
          }

          resolve(result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set an item in cache with timestamp
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @param {Object} data - Data to cache (will be wrapped with poemId and timestamp)
   * @returns {Promise<boolean>} Success status
   */
  async set(storeName, poemId, data) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const record = {
          poemId,
          timestamp: Date.now(),
          ...data,
        };
        const request = store.put(record);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Delete an item from cache
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<boolean>} Success status
   */
  async delete(storeName, poemId) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(poemId);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  /**
   * Clear all items from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<boolean>} Success status
   */
  async clear(storeName) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  },
};

/* =============================================================================
  4. PREFETCH MANAGER
  =============================================================================
*/

/**
 * Prefetch Manager - Aggressive prefetching for audio and insights
 * Runs in background to pre-generate content before user requests it
 *
 * Strategy:
 * - Priority 1: Current poem audio + insights (immediately on poem change)
 * - Priority 2: Adjacent poems audio (3s delay)
 * - Priority 3: Discover poems (5s delay)
 */
const prefetchManager = {
  /**
   * Prefetch audio for a poem (generate and cache in background)
   */
  prefetchAudio: async (poemId, poem, addLog, activeRequests) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!poemId || !poem?.arabic) return;

    try {
      // Check if already generating - silently skip
      if (activeRequests && activeRequests.current.has(poemId)) {
        if (addLog)
          addLog(
            'Prefetch Audio',
            `Already generating audio for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, poemId);
      if (cached?.blob) {
        if (addLog)
          addLog('Prefetch Audio', `Audio already cached for poem ${poemId} - skipping`, 'info');
        return;
      }

      // Mark as in-flight
      if (activeRequests) activeRequests.current.add(poemId);

      // Generate audio using same logic as togglePlay
      const ttsContent = getTTSContent(poem);

      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: ttsContent }] }],
        generationConfig: {
          responseModalities: TTS_CONFIG.responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName },
            },
          },
        },
      });
      const requestSize = new Blob([requestBody]).size;
      const estimatedTokens = Math.ceil(ttsContent.length / 4);

      if (addLog) {
        addLog(
          'Prefetch Audio',
          `→ Background audio generation (poem ${poemId}) | Model: ${API_MODELS.tts} | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedTokens} tokens`,
          'info'
        );
      }

      const apiStart = performance.now();
      const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };
      const { res, model: ttsModel } = await fetchTTSWithFallback(url, fetchOptions, {
        addLog,
        label: 'Prefetch Audio',
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (addLog)
          addLog(
            'Prefetch Audio',
            `❌ [${ttsModel}] Audio generation HTTP ${res.status}: ${errorText.substring(0, 150)}`,
            'error'
          );
        return;
      }

      const data = await res.json();
      const apiTime = performance.now() - apiStart;
      if (!data.candidates || data.candidates.length === 0) {
        if (addLog)
          addLog(
            'Prefetch Audio',
            `❌ [${ttsModel}] Audio generation failed for poem ${poemId}. Response: ${JSON.stringify(data).substring(0, 200)}`,
            'error'
          );
        return;
      }

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        // Convert PCM to WAV (inline to avoid dependency)
        const pcm16ToWav = (base64, rate = 24000) => {
          try {
            const cleanedBase64 = base64.replace(/\s/g, '');
            const bin = atob(cleanedBase64);
            const buf = new ArrayBuffer(bin.length);
            const view = new DataView(buf);
            for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
            const samples = new Int16Array(buf);
            const wavBuf = new ArrayBuffer(44 + samples.length * 2);
            const wavView = new DataView(wavBuf);
            const s = (o, str) => {
              for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i));
            };
            s(0, 'RIFF');
            wavView.setUint32(4, 36 + samples.length * 2, true);
            s(8, 'WAVE');
            s(12, 'fmt ');
            wavView.setUint32(16, 16, true);
            wavView.setUint16(20, 1, true);
            wavView.setUint16(22, 1, true);
            wavView.setUint32(24, rate, true);
            wavView.setUint32(28, rate * 2, true);
            wavView.setUint16(32, 2, true);
            wavView.setUint16(34, 16, true);
            s(36, 'data');
            wavView.setUint32(40, samples.length * 2, true);
            new Int16Array(wavBuf, 44).set(samples);
            return new Blob([wavBuf], { type: 'audio/wav' });
          } catch (e) {
            return null;
          }
        };

        const blob = pcm16ToWav(b64);
        if (blob) {
          // Calculate metrics
          const pcmBytes = atob(b64.replace(/\s/g, '')).length;
          const samples = pcmBytes / 2;
          const audioDuration = samples / 24000;
          const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);

          // Cache the blob
          await cacheOperations.set(CACHE_CONFIG.stores.audio, poemId, {
            blob,
            metadata: {
              poet: poem.poet,
              title: poem.title,
              size: blob.size,
              duration: audioDuration,
              model: ttsModel,
            },
          });

          if (addLog)
            addLog(
              'Prefetch Audio',
              `✓ [${ttsModel}] Audio cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${(blob.size / 1024).toFixed(1)}KB | ${audioDuration.toFixed(1)}s audio | ${tokensPerSecond} tok/s`,
              'success'
            );
        }
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog)
        addLog(
          'Prefetch Audio',
          `❌ Audio generation error for poem ${poemId}: ${error.message}`,
          'error'
        );
    } finally {
      // Clean up in-flight tracking
      if (activeRequests) activeRequests.current.delete(poemId);
    }
  },

  /**
   * Prefetch insights for a poem (generate and cache in background)
   */
  prefetchInsights: async (poemId, poem, addLog, activeRequests) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!poemId || !poem?.arabic) return;

    try {
      // Check if already generating - silently skip
      if (activeRequests && activeRequests.current.has(poemId)) {
        if (addLog)
          addLog(
            'Prefetch Insights',
            `Already generating insights for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, poemId);
      if (cached?.interpretation) {
        if (addLog)
          addLog(
            'Prefetch Insights',
            `Insights already cached for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Mark as in-flight
      if (activeRequests) activeRequests.current.add(poemId);

      const poetInfo = poem?.poet ? ` by ${poem.poet}` : '';
      const promptText = `Deep Analysis of${poetInfo}:\n\n${poem.arabic}`;
      const requestSize = new Blob([
        JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
      ]).size;
      const estimatedInputTokens = Math.ceil(
        (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
      );

      if (addLog) {
        addLog(
          'Prefetch Insights',
          `→ Background insights generation (poem ${poemId}) | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedInputTokens} tokens`,
          'info'
        );
      }

      const apiStart = performance.now();
      const prefetchBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
      });
      const res = await geminiTextFetch(
        'generateContent',
        prefetchBody,
        'Prefetch Insights',
        addLog
      );

      const data = await res.json();
      const apiTime = performance.now() - apiStart;
      const interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (interpretation) {
        // Calculate metrics
        const charCount = interpretation.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);

        // Cache the insights
        await cacheOperations.set(CACHE_CONFIG.stores.insights, poemId, {
          interpretation,
          metadata: { poet: poem.poet, title: poem.title, charCount, tokens: estimatedTokens },
        });

        if (addLog)
          addLog(
            'Prefetch Insights',
            `✓ Insights cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s`,
            'success'
          );
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog)
        addLog(
          'Prefetch Insights',
          `❌ Insights generation error for poem ${poemId}: ${error.message}`,
          'error'
        );
    } finally {
      // Clean up in-flight tracking
      if (activeRequests) activeRequests.current.delete(poemId);
    }
  },

  /**
   * Prefetch poems from discover (pre-fetch poems from category)
   */
  prefetchDiscover: async (category, count = 2, addLog) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!category || category === 'All') return;

    try {
      if (addLog) addLog('Prefetch', `Pre-fetching ${count} poems from ${category}...`, 'info');
      // Placeholder - would fetch poems from discover API and cache
    } catch (error) {
      if (addLog) addLog('Prefetch', `Discover prefetch error: ${error.message}`, 'error');
    }
  },
};

/* =============================================================================
  5. TRANSLITERATION
  =============================================================================
*/

const ARABIC_TRANSLIT_MAP = {
  // Base letters
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ٱ: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: "'",
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ة: 'h',
  ء: "'",
  ؤ: "'",
  ئ: "'",
  // Diacritics
  '\u064E': 'a', // fatha
  '\u064F': 'u', // damma
  '\u0650': 'i', // kasra
  '\u0651': '', // shadda (handled by doubling previous consonant)
  '\u0652': '', // sukun (no vowel)
  '\u064B': 'an', // tanween fatha
  '\u064C': 'un', // tanween damma
  '\u064D': 'in', // tanween kasra
  '\u0670': 'a', // alef superscript
  // Common punctuation
  '،': ',',
  '؛': ';',
  '؟': '?',
  '»': '"',
  '«': '"',
  '\u200C': '',
  '\u200D': '',
  '\u200F': '',
  '\u200E': '', // zero-width chars
};

function transliterate(text) {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Handle shadda: double the previous consonant
    if (ch === '\u0651') {
      const lastChar = result[result.length - 1];
      if (lastChar && lastChar !== ' ') result += lastChar;
      continue;
    }
    if (ch in ARABIC_TRANSLIT_MAP) {
      result += ARABIC_TRANSLIT_MAP[ch];
    } else if (/[\s\n]/.test(ch)) {
      result += ch;
    } else if (/[a-zA-Z0-9.,!?;:'"()\-–—…]/.test(ch)) {
      result += ch; // pass through Latin chars and common punctuation
    }
    // Skip unrecognized Arabic diacritics/formatting chars
  }
  return result;
}

/* =============================================================================
  6. UTILITY COMPONENTS
  =============================================================================
*/

const MysticalConsultationEffect = ({ active, theme }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-1000">
      <div
        className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-125 opacity-80`}
      />
      <div
        className={`absolute inset-0 bg-radial-gradient from-purple-500/20 to-transparent animate-ping scale-150 opacity-30`}
        style={{ animationDuration: '3s' }}
      />
      <div className="absolute inset-0">
        {[...Array(45)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-indigo-200 rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animationDuration: Math.random() * 1 + 0.5 + 's',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const DebugPanel = ({ logs, onClear, darkMode, poem, appState, visible, controlBarRef }) => {
  const theme = darkMode ? THEME.dark : THEME.light;
  const [panelOpen, setPanelOpen] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugStatus, setBugStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [bugError, setBugError] = useState('');
  const [lastViewedCount, setLastViewedCount] = useState(0);
  const scrollRef = useRef(null);
  // Position bug button centered in the gap between screen edge and control bar
  const [btnPos, setBtnPos] = useState({ left: 16, bottom: 16 });
  useEffect(() => {
    const update = () => {
      const el = controlBarRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // X: center of gap between left screen edge and bar left edge (minus half button width)
      const left = Math.max(8, rect.left / 2 - 10);
      // Y: center of gap between bar bottom edge and screen bottom (minus half button height)
      const gapBelow = vh - rect.bottom;
      const bottom = Math.max(8, gapBelow / 2 - 10);
      setBtnPos({ left, bottom });
    };
    update();
    window.addEventListener('resize', update);
    const ro =
      typeof ResizeObserver !== 'undefined' && controlBarRef?.current
        ? new ResizeObserver(update)
        : null;
    if (ro && controlBarRef?.current) ro.observe(controlBarRef.current);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [controlBarRef]);

  // Auto-scroll to bottom on new logs when panel is open
  useEffect(() => {
    if (panelOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, panelOpen]);

  // Track viewed count when panel opens
  useEffect(() => {
    if (panelOpen) setLastViewedCount(logs.length);
  }, [panelOpen, logs.length]);

  const errorCount = logs.filter((l) => l.type === 'error').length;
  const lastViewedErrors = useRef(0);
  useEffect(() => {
    if (panelOpen) lastViewedErrors.current = errorCount;
  }, [panelOpen, errorCount]);
  const unreadErrors = errorCount - lastViewedErrors.current;

  const handleSubmitBug = async () => {
    setBugStatus('sending');
    try {
      const payload = {
        description: bugDescription,
        logs: logs.slice(-100),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        poem: poem ? { id: poem.id, poet: poem.poet, title: poem.title } : null,
        appState: appState || null,
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        online: navigator.onLine,
        referrer: document.referrer,
        featureFlags: { ...FEATURES },
      };
      const res = await fetch(`${apiUrl}/api/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 100) : ''}`);
      }
      setBugStatus('success');
      setBugDescription('');
      setTimeout(() => setBugStatus(null), 3000);
    } catch (e) {
      Sentry.captureException(e);
      setBugStatus('error');
      setBugError(e.message || 'Network error');
      setTimeout(() => setBugStatus(null), 5000);
    }
  };

  if (!visible) return null;

  const logTypeColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-emerald-400';
      case 'warning':
        return 'text-amber-400';
      default:
        return darkMode ? 'text-stone-400' : 'text-stone-500';
    }
  };

  const gold = darkMode ? '#C5A059' : '#8B7355';
  const labelColor = darkMode ? 'text-[#C5A059]/70' : 'text-[#8B7355]/70';

  return (
    <>
      {/* Floating trigger — small visual dot, 44px touch target, centered in gap */}
      <button
        onClick={() => setPanelOpen((prev) => !prev)}
        className="fixed z-[200] w-[44px] h-[44px] flex items-center justify-center"
        style={{ left: btnPos.left, bottom: btnPos.bottom }}
        title="Toggle dev logs"
        aria-label="Toggle developer log panel"
      >
        <span
          className={`relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
            darkMode
              ? 'bg-stone-900/60 border border-[#C5A059]/20 text-stone-500 hover:text-[#C5A059] hover:border-[#C5A059]/40'
              : 'bg-white/50 border border-[#8B7355]/20 text-stone-400 hover:text-[#8B7355] hover:border-[#8B7355]/40'
          } backdrop-blur-md`}
        >
          <Bug size={9} />
          {unreadErrors > 0 && !panelOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-black/30" />
          )}
        </span>
      </button>

      {/* Floating log panel — matches poet picker styling */}
      <div
        className={`fixed z-[200] w-80 max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl transition-all duration-200 ${
          darkMode
            ? 'bg-black/95 border border-[#C5A059]/25 text-stone-300'
            : 'bg-white/95 border border-[#8B7355]/20 text-stone-700'
        } backdrop-blur-2xl ${panelOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{
          left: btnPos.left,
          bottom: btnPos.bottom + 48,
          height: '50vh',
          maxHeight: '480px',
          minHeight: '240px',
        }}
        aria-hidden={!panelOpen}
      >
        {/* Panel header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b ${darkMode ? 'border-[#C5A059]/15' : 'border-[#8B7355]/15'} flex-none`}
        >
          <span
            className="text-[10px] font-brand-en uppercase tracking-widest font-bold"
            style={{ color: gold, opacity: 0.5 }}
          >
            Dev Logs
            <span className="ml-1.5 opacity-60">({logs.length})</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClear}
              className={`p-1 transition-colors ${darkMode ? 'text-stone-600 hover:text-stone-300' : 'text-stone-400 hover:text-stone-600'}`}
              title="Clear logs"
            >
              <Trash2 size={11} />
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className={`p-1 transition-colors ${darkMode ? 'text-stone-600 hover:text-stone-300' : 'text-stone-400 hover:text-stone-600'}`}
              title="Close panel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Log entries */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-1.5 font-mono text-[10px] space-y-0.5 custom-scrollbar"
        >
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`py-0.5 border-b ${darkMode ? 'border-stone-800/40' : 'border-stone-200/40'} ${logTypeColor(log.type)}`}
            >
              <span className={darkMode ? 'text-stone-400' : 'text-stone-500'}>
                {idx === 0 ? log.time : log.rel}
              </span>{' '}
              <span className={`font-semibold ${labelColor}`}>[{log.label}]</span>{' '}
              <span>{log.msg}</span>
            </div>
          ))}
        </div>

        {/* Bug report input */}
        <div
          className={`flex items-center gap-1.5 px-4 py-2 border-t ${darkMode ? 'border-[#C5A059]/15' : 'border-[#8B7355]/15'} flex-none`}
        >
          <input
            type="text"
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            placeholder="Describe the bug..."
            className={`flex-1 px-2 py-1 rounded text-[10px] border ${darkMode ? 'bg-stone-900/80 border-stone-700 text-stone-200 placeholder:text-stone-500' : 'bg-white/80 border-stone-300 text-stone-800 placeholder:text-stone-400'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitBug();
            }}
          />
          <button
            onClick={handleSubmitBug}
            disabled={bugStatus === 'sending'}
            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
              bugStatus === 'success'
                ? 'bg-green-600/80 text-white'
                : bugStatus === 'error'
                  ? `${theme.errorBg} text-white`
                  : bugStatus === 'sending'
                    ? 'bg-stone-600/80 text-stone-400'
                    : darkMode
                      ? 'bg-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/30'
                      : 'bg-[#8B7355]/15 text-[#8B7355] hover:bg-[#8B7355]/25'
            }`}
          >
            {bugStatus === 'sending'
              ? '...'
              : bugStatus === 'success'
                ? 'Sent!'
                : bugStatus === 'error'
                  ? 'Fail'
                  : 'Report'}
          </button>
        </div>
      </div>
    </>
  );
};

const ErrorBanner = ({ error, onDismiss, onRetry, theme }) => {
  if (!error) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] ${DESIGN.anim}`}
    >
      <div
        className={`${DESIGN.glass} ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 shadow-2xl`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <X size={20} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${theme.text} text-sm font-medium mb-2`}>Error</p>
            <p className={`${theme.text} text-xs opacity-70 mb-3`}>{error}</p>
            <div className="flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`${DESIGN.btnPrimary} ${theme.btnPrimary} px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${DESIGN.buttonHover}`}
                >
                  <RefreshCw size={14} className="inline mr-1" />
                  Retry
                </button>
              )}
              <button
                onClick={onDismiss}
                className={`${theme.pill} border px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${theme.text} ${DESIGN.buttonHover}`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  KEYBOARD SHORTCUT HELP
  =============================================================================
*/

const SHORTCUTS = [
  { keys: ['Space'], desc: 'Play / Pause audio' },
  { keys: ['→'], desc: 'Discover new poem' },
  { keys: ['E'], desc: 'Explain poem' },
  { keys: ['T'], desc: 'Toggle English translation' },
  { keys: ['R'], desc: 'Toggle transliteration' },
  { keys: ['Esc'], desc: 'Close modal / panel' },
  { keys: ['?'], desc: 'Show this help' },
];

const ShortcutHelp = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  const isDark = theme === THEME.dark;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className={`relative w-full max-w-sm ${theme.glass} ${theme.border} border ${DESIGN.radius} p-8 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={20} className={theme.text} />
        </button>

        <h2 className={`font-brand-en text-lg font-bold mb-6 ${theme.text}`}>Keyboard Shortcuts</h2>

        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between gap-4">
              <span className={`font-brand-en text-sm ${theme.text} opacity-70`}>{desc}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold ${theme.kbd} border`}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  SPLASH / ONBOARDING
  =============================================================================
*/

const SPLASH_STEPS = []; // Walkthrough steps are handled internally by SplashScreen

const SplashScreen = ({ isOpen, onDismiss, showOnboarding, theme }) => {
  // Phase: 0 = desert splash, 1 = kinetic step 0 (Arabic), 2 = kinetic step 1 (English), 3 = kinetic step 2 (count)
  const [phase, setPhase] = useState(0);
  const [fadeState, setFadeState] = useState('in');
  const starsRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [starsGenerated, setStarsGenerated] = useState(false);

  const isDark = theme === THEME.dark;

  // Generate stars for the splash desert sky
  useEffect(() => {
    if (!isOpen || phase !== 0 || starsGenerated) return;
    const container = starsRef.current;
    if (!container) return;
    const stars = [];
    for (let i = 0; i < 80; i++) {
      const size = (1 + Math.random() * 2).toFixed(1);
      stars.push({
        left: (Math.random() * 100).toFixed(1) + '%',
        top: (Math.random() * 48).toFixed(1) + '%',
        width: size + 'px',
        height: size + 'px',
        dur: (1.2 + Math.random() * 3.5).toFixed(2) + 's',
        delay: (Math.random() * 5).toFixed(2) + 's',
      });
    }
    // Build star elements imperatively for performance
    stars.forEach((s) => {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.background = '#FFF';
      el.style.borderRadius = '50%';
      el.style.left = s.left;
      el.style.top = s.top;
      el.style.width = s.width;
      el.style.height = s.height;
      el.style.animation = `splashTwinkle ${s.dur} ease-in-out infinite alternate`;
      el.style.animationDelay = s.delay;
      container.appendChild(el);
    });
    setStarsGenerated(true);
    return () => {
      // Use textContent to clear imperatively-added children safely —
      // avoids removeChild errors if React is also tearing down the tree
      if (container) container.textContent = '';
    };
  }, [isOpen, phase, starsGenerated]);

  // Particle system for kinetic walkthrough phases
  useEffect(() => {
    if (!isOpen || phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 150 : 500;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const curve = Math.floor(Math.random() * 3);
      const curves = [
        { x: 0.7, y: 0.5, radius: 0.12 },
        { x: 0.5, y: 0.5, radius: 0.1 },
        { x: 0.3, y: 0.5, radius: 0.14 },
      ];
      const c = curves[curve];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * c.radius;
      const px = (c.x + Math.cos(angle) * dist) * canvas.width;
      const py = (c.y + Math.sin(angle) * dist) * canvas.height;

      particles.push({
        x: px,
        y: py,
        originX: px,
        originY: py,
        vx: 0,
        vy: 0,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    particlesRef.current = particles;

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouchMove = (e) => {
      if (e.touches[0]) mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    let running = true;
    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          const f = (120 - d) / 120;
          p.vx -= (dx / d) * f * 0.8;
          p.vy -= (dy / d) * f * 0.8;
        }
        p.vx += (p.originX - p.x) * 0.001;
        p.vy += (p.originY - p.y) * 0.001;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        p.twinklePhase += p.twinkleSpeed;
        const twinkle = Math.sin(p.twinklePhase) * 0.3 + 0.7;
        const fo = p.opacity * twinkle;

        if (!isMobile) {
          ctx.beginPath();
          const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
          g1.addColorStop(0, `rgba(200, 220, 255, ${fo * 0.6})`);
          g1.addColorStop(0.3, `rgba(180, 200, 255, ${fo * 0.3})`);
          g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = g1;
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        if (isMobile) {
          ctx.fillStyle = `rgba(255, 255, 255, ${fo})`;
        } else {
          const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          g2.addColorStop(0, `rgba(255, 255, 255, ${fo})`);
          g2.addColorStop(0.7, `rgba(240, 245, 255, ${fo * 0.5})`);
          g2.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = g2;
        }
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, phase]);

  useEffect(() => {
    if (isOpen) {
      setFadeState('in');
      setPhase(0);
      setStarsGenerated(false);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    setFadeState('out');
    setTimeout(() => {
      onDismiss();
    }, 600);
  };

  const handleSplashEnter = (e) => {
    e.stopPropagation();
    if (showOnboarding) {
      setPhase(1);
    } else {
      handleDismiss();
    }
  };

  const handleWalkthroughTap = (e) => {
    if (e.target.closest('[data-splash-finish]')) return;
    if (phase < 3) {
      setPhase(phase + 1);
    }
  };

  const handleFinish = (e) => {
    e.stopPropagation();
    handleDismiss();
  };

  if (!isOpen) return null;

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Injected keyframe styles
  const splashStyles = `
    @keyframes splashTwinkle { 0% { opacity: 0.1; } 100% { opacity: 0.95; } }
    @keyframes splashDune1 { to { transform: translateX(18px); } }
    @keyframes splashDune2 { to { transform: translateX(-22px); } }
    @keyframes splashDune3 { to { transform: translateX(12px); } }
    @keyframes splashDune4 { to { transform: translateX(-9px); } }
    @keyframes splashFadeIn { to { opacity: 1; } }
    @keyframes splashArabicReveal {
      from { opacity: 0; transform: scale(0.9); filter: blur(8px); }
      to { opacity: 1; transform: scale(1); filter: blur(0px); }
    }
    @keyframes splashArabicRevealMobile {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes splashLetterReveal {
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes splashCountReveal {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .splash-dune { transform: none !important; animation: none !important; }
    }
  `;

  // Computed values needed by both phases
  const desertNight = '#1A0F0A';
  const gold = GOLD.gold;
  const sandMuted = isDark ? 'rgba(232,213,183,0.5)' : 'rgba(26,15,10,0.4)';
  const dunes = isDark
    ? [
        {
          h: '25%',
          bg: '#6B3720',
          br: '55% 75% 0 0 / 100%',
          z: 4,
          anim: 'splashDune1 10s ease-in-out infinite alternate',
        },
        {
          h: '33%',
          bg: '#5A2E1A',
          br: '75% 45% 0 0 / 100%',
          z: 3,
          anim: 'splashDune2 14s ease-in-out infinite alternate',
        },
        {
          h: '40%',
          bg: '#4A2516',
          br: '45% 65% 0 0 / 100%',
          z: 2,
          anim: 'splashDune3 18s ease-in-out infinite alternate',
        },
        {
          h: '48%',
          bg: '#3A1C12',
          br: '65% 50% 0 0 / 100%',
          z: 1,
          anim: 'splashDune4 23s ease-in-out infinite alternate',
        },
      ]
    : [
        {
          h: '25%',
          bg: '#D4B896',
          br: '55% 75% 0 0 / 100%',
          z: 4,
          anim: 'splashDune1 10s ease-in-out infinite alternate',
        },
        {
          h: '33%',
          bg: '#C8A880',
          br: '75% 45% 0 0 / 100%',
          z: 3,
          anim: 'splashDune2 14s ease-in-out infinite alternate',
        },
        {
          h: '40%',
          bg: '#BC9A6E',
          br: '45% 65% 0 0 / 100%',
          z: 2,
          anim: 'splashDune3 18s ease-in-out infinite alternate',
        },
        {
          h: '48%',
          bg: '#B08C5E',
          br: '65% 50% 0 0 / 100%',
          z: 1,
          anim: 'splashDune4 23s ease-in-out infinite alternate',
        },
      ];
  const bgGradient = isDark
    ? 'linear-gradient(180deg, #0D0A14 0%, #1A0F0A 40%, #3A1C12 100%)'
    : `linear-gradient(180deg, #F5EDE0 0%, #EDE0CC 40%, #B08C5E 100%)`;
  const kineticStep = phase - 1; // 0, 1, or 2
  const progressWidth = ((Math.max(kineticStep, 0) + 1) / 3) * 100 + '%';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Single return — both phases always in the DOM, toggled by display.
  // This prevents React from unmounting/remounting the tree when phase changes,
  // which avoids removeChild errors from imperatively-added star DOM nodes.
  return (
    <>
      <style>{splashStyles}</style>

      {/* DESERT SPLASH (phase 0) — hidden via display:none when phase >= 1 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: bgGradient,
          display: phase === 0 ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          transition: 'opacity 1s ease-out',
          opacity: fadeState === 'out' ? 0 : 1,
        }}
        role="dialog"
        aria-label="Welcome to Poetry Bil-Araby"
      >
        {/* Sand texture SVG overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.04,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Starfield — dangerouslySetInnerHTML tells React these children are externally managed */}
        <div
          ref={starsRef}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: '' }}
        />

        {/* Dunes */}
        {dunes.map((d, i) => (
          <div
            key={i}
            className="splash-dune"
            style={{
              position: 'absolute',
              bottom: 0,
              left: '-5%',
              width: '110%',
              height: d.h,
              background: d.bg,
              borderRadius: d.br,
              zIndex: d.z,
              animation: prefersReducedMotion ? 'none' : d.anim,
            }}
          />
        ))}

        {/* Brand — بالعربي + poetry + feather (uses BRAND constants) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              ...BRAND.arabic,
              color: gold,
              textShadow: '0 0 40px rgba(197,160,89,0.3)',
            }}
            dir="rtl"
            lang="ar"
          >
            بالعربي
          </span>
          <span
            style={{
              ...BRAND.english,
              color: isDark ? '#D4D0C8' : '#1A1614',
            }}
          >
            poetry
          </span>
          <Feather style={{ ...BRAND.feather, color: gold }} strokeWidth={1.5} />
        </div>

        {/* Subtitle */}
        <p
          style={{
            position: 'relative',
            zIndex: 10,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)',
            color: sandMuted,
            marginTop: '0.5rem',
            letterSpacing: '0.1em',
            direction: 'ltr',
          }}
        >
          Desert Mirage
        </p>

        {/* Enter button */}
        <button
          onClick={handleSplashEnter}
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: '2.5rem',
            padding: '14px 40px',
            minHeight: '44px',
            background: 'transparent',
            border: `1px solid ${gold}`,
            color: gold,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '15px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: 0,
            animation: 'splashFadeIn 1s 2s forwards',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = gold;
            e.currentTarget.style.color = desertNight;
            e.currentTarget.style.boxShadow = '0 0 30px rgba(197,160,89,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = gold;
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-label="Enter the app"
        >
          Enter
        </button>
      </div>

      {/* KINETIC WALKTHROUGH (phases 1-3) — hidden via display:none until phase >= 1 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: '#000000',
          display: phase >= 1 ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'opacity 0.6s ease',
          opacity: fadeState === 'out' ? 0 : 1,
        }}
        onClick={handleWalkthroughTap}
        role="dialog"
        aria-label="Onboarding walkthrough"
      >
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Kinetic stage */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            width: '100%',
            maxWidth: '600px',
            padding: '2rem',
          }}
        >
          {/* Step 0: Arabic reveal — بالعربي */}
          {kineticStep === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-0"
            >
              <div
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(3.5rem, 9vw, 6rem)',
                  color: '#ffffff',
                  direction: 'rtl',
                  lineHeight: 1.2,
                  marginBottom: '1.5rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : isMobile
                      ? 'splashArabicRevealMobile 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards'
                      : 'splashArabicReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
                  willChange: 'transform, opacity, filter',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
                lang="ar"
                dir="rtl"
              >
                بالعربي
              </div>
              <div
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: '0.9375rem',
                  color: '#666666',
                  direction: 'rtl',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.6s ease-out 0.7s forwards',
                  willChange: 'opacity',
                }}
                lang="ar"
                dir="rtl"
              >
                الشعر العربي بين يديك
              </div>
            </div>
          )}

          {/* Step 1: English letter-by-letter — poetry */}
          {kineticStep === 1 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-1"
            >
              <div
                style={{
                  fontFamily: "'Forum', cursive",
                  fontSize: 'clamp(4rem, 10vw, 7rem)',
                  textTransform: 'lowercase',
                  letterSpacing: '-0.05em',
                  color: '#ffffff',
                  lineHeight: 1,
                  marginBottom: '1.5rem',
                }}
              >
                {'poetry'.split('').map((letter, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      opacity: 0,
                      transform: 'translateY(30px)',
                      animation: prefersReducedMotion
                        ? 'splashFadeIn 0.01ms forwards'
                        : `splashLetterReveal ${isMobile ? '0.35s' : '0.5s'} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                      animationDelay: `${0.1 + i * 0.08}s`,
                      willChange: 'transform, opacity',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#555555',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.6s ease-out 0.8s forwards',
                  willChange: 'opacity',
                }}
              >
                Where words become worlds
              </div>
            </div>
          )}

          {/* Step 2: Count + Explore */}
          {kineticStep === 2 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-2"
            >
              <div
                style={{
                  fontFamily: "'Forum', cursive",
                  fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashCountReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                }}
              >
                84,000 verses await
              </div>
              <div
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                  color: '#888888',
                  direction: 'rtl',
                  marginBottom: '2rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.5s ease-out 0.6s forwards',
                  willChange: 'opacity',
                }}
                lang="ar"
                dir="rtl"
              >
                أكثر من 84,000 بيت بانتظارك
              </div>
              <button
                data-splash-finish="true"
                onClick={handleFinish}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 40px',
                  border: '1px solid #333333',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: '#ffffff',
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                  minHeight: '48px',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.5s ease-out 1s forwards',
                  willChange: 'opacity',
                  backfaceVisibility: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = '#666666';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#333333';
                }}
                aria-label="Start exploring"
              >
                <span>Explore</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Tap hint */}
        <div
          style={{
            position: 'fixed',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#333333',
            zIndex: 5,
          }}
        >
          Tap anywhere
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            height: '2px',
            background: 'rgba(255, 255, 255, 0.15)',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 5,
            width: progressWidth,
            willChange: 'width',
            transform: 'translateZ(0)',
          }}
        />
      </div>
    </>
  );
};

/* =============================================================================
  AUTH COMPONENTS
  =============================================================================
*/

const AuthModal = ({ isOpen, onClose, onSignInWithGoogle, theme, message }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(197,160,89,0.08) 0%, rgba(0,0,0,0.7) 100%)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, rgba(20,18,15,0.97) 0%, rgba(12,12,14,0.98) 100%)',
          border: '1px solid rgba(197,160,89,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent line */}
        <div
          style={{
            height: '2px',
            background:
              'linear-gradient(90deg, transparent, rgba(197,160,89,0.6), rgba(212,180,120,0.8), rgba(197,160,89,0.6), transparent)',
          }}
        />

        <div className="px-8 pt-8 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} style={{ color: 'rgba(197,160,89,0.6)' }} />
          </button>

          {/* Greeting */}
          <div className="text-center mb-6">
            <h2 className="font-amiri text-3xl mb-2" style={{ color: '#C5A059' }}>
              مرحباً
            </h2>
            <p className="font-brand-en text-sm text-stone-400 leading-relaxed">
              {message || 'Sign in to save poems and preferences'}
            </p>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C5A059]/30" />
            <Feather size={12} style={{ color: 'rgba(197,160,89,0.4)' }} />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C5A059]/30" />
          </div>

          {/* Google sign-in button */}
          <button
            onClick={onSignInWithGoogle}
            className="w-full py-3.5 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.06) 100%)',
              border: '1px solid rgba(197,160,89,0.3)',
              color: '#D4C8B0',
              fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p
            className="mt-5 text-center text-[10px] text-stone-600"
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            By signing in, you agree to our Terms of Service
          </p>
        </div>

        {/* Gold accent bottom */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.3), transparent)',
          }}
        />
      </div>
    </div>
  );
};

const SavePoemButton = ({ poem, isSaved, onSave, onUnsave, disabled, onSignIn }) => {
  const handleClick = () => {
    if (disabled && onSignIn) {
      onSignIn('Sign in to save your favourites');
      return;
    }
    if (disabled) return;

    if (isSaved) {
      onUnsave();
    } else {
      onSave();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isSaved ? 'Unsave poem' : 'Save poem'}
      >
        <Heart
          size={21}
          className={`${isSaved ? 'fill-red-500 text-red-500' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isSaved ? 'Saved' : 'Save'}
      </span>
    </div>
  );
};

const DownvoteButton = ({ poem, isDownvoted, onDownvote, onUndownvote, disabled, onSignIn }) => {
  const handleClick = () => {
    if (disabled && onSignIn) {
      onSignIn('Sign in to flag poems');
      return;
    }
    if (disabled) return;

    if (isDownvoted) {
      onUndownvote();
    } else {
      onDownvote();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isDownvoted ? 'Unflag poem' : 'Flag poem'}
      >
        <ThumbsDown
          size={21}
          className={`${isDownvoted ? 'fill-red-400 text-red-400' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isDownvoted ? 'Flagged' : 'Flag'}
      </span>
    </div>
  );
};

const SavedPoemsView = ({
  isOpen,
  onClose,
  savedPoems,
  onSelectPoem,
  onUnsavePoem,
  theme,
  currentFontClass,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col ${theme.glass} ${theme.border} border ${DESIGN.radius} shadow-2xl`}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-500/10 flex-shrink-0">
          <div>
            <h2 className={`font-amiri text-2xl ${theme.titleColor}`}>قصائدي المحفوظة</h2>
            <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-1`}>
              My Saved Poems ({savedPoems.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} className={theme.text} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {savedPoems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Heart size={48} className={`${theme.text} opacity-20`} />
              <div className="text-center">
                <p className={`font-amiri text-xl ${theme.text} opacity-40`}>
                  لا توجد قصائد محفوظة
                </p>
                <p className={`font-brand-en text-sm ${theme.text} opacity-30 mt-1`}>
                  No saved poems yet
                </p>
                <p className={`font-brand-en text-xs ${theme.text} opacity-20 mt-3`}>
                  Tap the heart icon on any poem to save it
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPoems.map((sp) => (
                <div
                  key={sp.id}
                  className={`group ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 transition-all ${GOLD.goldHoverBorderSubtle}`}
                >
                  <button
                    onClick={() => onSelectPoem(sp)}
                    className="w-full text-left cursor-pointer bg-transparent border-none p-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-amiri text-sm ${theme.titleColor} font-medium`}>
                          {sp.poet || 'Unknown'}
                        </p>
                        <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-0.5`}>
                          {sp.title || ''}
                        </p>
                        <p
                          className={`${currentFontClass} text-sm ${theme.text} opacity-70 mt-2 line-clamp-2`}
                          dir="rtl"
                        >
                          {(sp.poem_text || '').slice(0, 80)}
                          {(sp.poem_text || '').length > 80 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                    {sp.saved_at && (
                      <p className={`font-brand-en text-[10px] ${theme.text} opacity-30 mt-2`}>
                        {formatDate(sp.saved_at)}
                      </p>
                    )}
                  </button>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => onUnsavePoem(sp)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"
                      aria-label="Remove from saved"
                    >
                      <Heart size={16} className="fill-red-500 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  VERTICAL SIDEBAR (Mobile overflow)
  =============================================================================
*/

const VerticalSidebar = ({
  onExplain,
  onCopy,
  showCopySuccess,
  onShare,
  showShareSuccess,
  showInsightSuccess,
  onSignIn,
  onSignOut,
  user,
  theme,
  isInterpreting,
  interpretation,
  showTranslation,
  onToggleTranslation,
  showTransliteration,
  onToggleTransliteration,
  textSizeLabel,
  onCycleTextSize,
  darkMode,
  onToggleDarkMode,
  currentFont,
  onCycleFont,
  selectedCategory,
  onSelectCategory,
  showDebugLogs,
  onToggleDebugLogs,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [poetPickerOpen, setPoetPickerOpen] = useState(false);
  const sidebarRef = useRef(null);
  const scrollRef = useRef(null);

  // Collapse settings when tapping outside the sidebar
  useEffect(() => {
    if (!settingsOpen && !expanded) return;
    const handleOutsideClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        if (settingsOpen) setSettingsOpen(false);
        if (expanded) setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [settingsOpen, expanded]);

  const gold = theme.gold;
  const btnBase =
    'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200';
  const btnHover = theme.goldHoverBg15;
  const subBtnBase =
    'w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200';
  const subBtnHover = theme.goldHoverBg15;
  const labelCls =
    'text-[7px] leading-none -mt-0.5 font-brand-en tracking-[0.12em] uppercase opacity-60';

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateY(-50%) translateX(100%); opacity: 0; }
          to { transform: translateY(-50%) translateX(0); opacity: 1; }
        }
        @keyframes goldCheckSparkle {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
          30% { transform: scale(1.2) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 8px rgba(197,160,89,0.8)); }
          60% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 4px rgba(197,160,89,0.5)); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 2px rgba(197,160,89,0.3)); }
        }
        .sidebar-drawer {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-drawer.open {
          grid-template-rows: 1fr;
        }
        .sidebar-drawer-inner {
          overflow: hidden;
        }
      `}</style>
      <div
        ref={sidebarRef}
        className="fixed right-0 md:right-[24.5rem] top-1/2 -translate-y-1/2 z-[45] rounded-l-2xl md:rounded-2xl bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-xl border-l-2 md:border-2 border-[#C5A059]/40 py-2 transition-all duration-300"
        style={{
          animation: 'slideInRight 0.4s ease-out',
          maxHeight: 'calc(100dvh - 14rem)',
          width: expanded ? '3.75rem' : '2.5rem',
          paddingLeft: expanded ? '0.375rem' : '0.25rem',
          paddingRight: expanded ? '0.375rem' : '0.25rem',
        }}
      >
        {/* Toggle handle — always visible, icon hints when collapsed */}
        <button
          onClick={() => {
            if (expanded) {
              setSettingsOpen(false);
              setExpanded(false);
            } else {
              setExpanded(true);
            }
          }}
          className="flex flex-col items-center gap-1.5 py-1 px-0.5 group w-full"
          title={expanded ? 'Collapse controls' : 'Open controls'}
          aria-label={expanded ? 'Collapse sidebar controls' : 'Open sidebar controls'}
        >
          {expanded ? (
            <ChevronRight
              style={{ color: gold, opacity: 0.5 }}
              size={14}
              className="group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <>
              <ChevronLeft
                style={{ color: gold, opacity: 0.5 }}
                size={14}
                className="group-hover:opacity-80 transition-opacity"
              />
              <Brain
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <Copy
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <Settings2
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <ChevronLeft
                style={{ color: gold, opacity: 0.5 }}
                size={14}
                className="group-hover:opacity-80 transition-opacity"
              />
            </>
          )}
        </button>

        {/* Expanded controls — animated grid drawer */}
        <div className={`sidebar-drawer ${expanded ? 'open' : ''}`}>
          <div className="sidebar-drawer-inner">
            <div
              ref={scrollRef}
              className="overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1"
              style={{ maxHeight: 'calc(100dvh - 16rem)' }}
            >
              <button
                onClick={onExplain}
                disabled={isInterpreting}
                title={interpretation ? 'Insight available — tap to confirm' : 'Explain poem'}
                aria-label="Explain poem meaning"
                className={`${btnBase} ${btnHover} ${isInterpreting ? 'opacity-50' : ''}`}
              >
                {isInterpreting ? (
                  <Loader2 className="animate-spin" style={{ color: gold }} size={18} />
                ) : showInsightSuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Brain style={{ color: gold }} size={18} />
                )}
              </button>
              <span
                className={labelCls}
                style={{ color: gold, opacity: interpretation ? 0.9 : 0.6 }}
              >
                Explain
              </span>

              <button
                onClick={onCopy}
                title="Copy poem"
                aria-label="Copy poem to clipboard"
                className={`${btnBase} ${btnHover}`}
              >
                {showCopySuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Copy style={{ color: gold }} size={18} />
                )}
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Copy
              </span>

              <button onClick={onShare} title="Share poem" className={`${btnBase} ${btnHover}`}>
                {showShareSuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Share2 style={{ color: gold }} size={18} />
                )}
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Share
              </span>

              <button
                onClick={onToggleTransliteration}
                title={showTransliteration ? 'Hide romanization' : 'Show romanization'}
                className={`${btnBase} ${btnHover} ${showTransliteration ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
              >
                <span
                  className="text-[12px] font-bold leading-none"
                  style={{ color: gold, fontFamily: "'Amiri', serif" }}
                >
                  عA
                </span>
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Romanize
              </span>

              <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

              <button
                onClick={() => {
                  setSettingsOpen((prev) => !prev);
                  // Scroll sidebar all the way down so settings drawer is visible
                  if (!settingsOpen && scrollRef.current) {
                    setTimeout(
                      () =>
                        scrollRef.current.scrollTo({
                          top: scrollRef.current.scrollHeight,
                          behavior: 'smooth',
                        }),
                      350
                    );
                  }
                }}
                title="Settings"
                className={`${btnBase} ${btnHover} ${settingsOpen ? theme.goldActiveBg : ''}`}
              >
                <Settings2
                  style={{
                    color: gold,
                    transition: 'transform 0.3s',
                    transform: settingsOpen ? 'rotate(60deg)' : 'none',
                  }}
                  size={18}
                />
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Settings
              </span>

              {/* Smooth animated settings drawer */}
              <div className={`sidebar-drawer ${settingsOpen ? 'open' : ''}`}>
                <div className="sidebar-drawer-inner">
                  <div
                    className={`flex flex-col items-center gap-1 pl-0.5 border-l-2 ${theme.goldBorderMuted}`}
                  >
                    <button
                      onClick={onToggleTranslation}
                      title={showTranslation ? 'Hide translation' : 'Show translation'}
                      className={`${subBtnBase} ${subBtnHover} ${showTranslation ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
                    >
                      <Languages style={{ color: gold }} size={16} />
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Translate
                    </span>

                    <button
                      onClick={onCycleTextSize}
                      title={`Text size: ${textSizeLabel}`}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      <span
                        className="text-[13px] font-bold leading-none"
                        style={{ color: gold, fontFamily: "'Forum', serif" }}
                      >
                        T±
                      </span>
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Size
                    </span>

                    <button
                      onClick={onToggleDarkMode}
                      title={darkMode ? 'Light mode' : 'Dark mode'}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      {darkMode ? (
                        <Sun style={{ color: gold }} size={16} />
                      ) : (
                        <Moon style={{ color: gold }} size={16} />
                      )}
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      {darkMode ? 'Light' : 'Dark'}
                    </span>

                    <button
                      onClick={onCycleFont}
                      title={`Font: ${currentFont}`}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      <span
                        className="text-[15px] font-bold leading-none"
                        style={{ color: gold, fontFamily: "'Amiri', serif" }}
                      >
                        ي
                      </span>
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Font
                    </span>

                    <button
                      onClick={onToggleDebugLogs}
                      title={showDebugLogs ? 'Hide dev logs' : 'Show dev logs'}
                      className={`${subBtnBase} ${subBtnHover} ${showDebugLogs ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
                    >
                      <Bug style={{ color: gold }} size={16} />
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Logs
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

              <button
                onClick={user ? onSignOut : onSignIn}
                title={user ? 'Sign out' : 'Sign in'}
                className={`${btnBase} ${btnHover}`}
              >
                {user ? (
                  <LogOut style={{ color: gold }} size={18} />
                ) : (
                  <UserRound style={{ color: gold }} size={18} />
                )}
              </button>
              <span className={labelCls} style={{ color: gold }}>
                {user ? 'Sign Out' : 'Sign In'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* =============================================================================
  INSIGHTS DRAWER (Mobile bottom sheet)
  =============================================================================
*/

const InsightsDrawer = ({
  isOpen,
  onClose,
  isInterpreting,
  insightParts,
  interpretation,
  showTranslation,
  current,
  theme,
  darkMode,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const drawerRef = useRef(null);

  // Reset expanded state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
      setDragY(0);
    }
  }, [isOpen]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = currentY - dragStartY.current;
    // Only allow dragging down (positive delta) or limited up
    setDragY(Math.max(-40, delta));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (dragY > 80) {
      // Dragged down enough — close
      onClose();
    } else if (dragY < -20) {
      // Dragged up — expand
      setExpanded(true);
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  const height = expanded ? '75dvh' : '40dvh';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl border-t border-[#C5A059]/20 overflow-hidden"
        style={{
          height,
          transform: `translateY(${Math.max(0, dragY)}px)`,
          transition: isDragging
            ? 'none'
            : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'insightsDrawerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(18,16,14,0.98) 0%, rgba(12,12,14,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(253,252,248,0.98) 0%, rgba(245,243,238,0.99) 100%)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="w-10 h-1 rounded-full bg-[#C5A059]/30" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <h3 className="font-brand-en italic font-semibold text-base text-indigo-600 tracking-tight">
            Poetic Insight
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={16} style={{ color: theme.gold, opacity: 0.6 }} />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-8"
          style={{ maxHeight: 'calc(100% - 3.5rem)' }}
        >
          {isInterpreting ? (
            <div className="flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse py-12">
              <Sparkles className="animate-spin text-indigo-500" size={28} />
              <p className="font-brand-en italic text-sm">Consulting Diwan...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {showTranslation && (
                <p
                  className={`font-brand-en italic whitespace-pre-wrap text-sm leading-relaxed ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}
                >
                  {insightParts?.poeticTranslation || current?.english}
                </p>
              )}
              {insightParts?.depth && (
                <div className="pt-4 border-t border-indigo-500/10">
                  <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                    The Depth
                  </h4>
                  <div className="pl-4 border-l border-indigo-500/10">
                    <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.depth}
                    </p>
                  </div>
                </div>
              )}
              {insightParts?.author && (
                <div className="pt-4 border-t border-indigo-500/10">
                  <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                    The Author
                  </h4>
                  <div className="pl-4 border-l border-indigo-500/10">
                    <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.author}
                    </p>
                  </div>
                </div>
              )}
              {!interpretation && !isInterpreting && (
                <p className="text-center text-sm opacity-40 font-brand-en italic py-8">
                  Tap Explain to discover this poem's story
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* =============================================================================
  6. MAIN APPLICATION
  =============================================================================
*/

export default function DiwanApp() {
  const mainScrollRef = useRef(null);
  const audioRef = useRef(new Audio());
  const isTogglingPlay = useRef(false);
  const controlBarRef = useRef(null);
  const poetPickerRef = useRef(null);

  // Volume-based glow effect refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const volumePulseRef = useRef(null);

  const [headerOpacity, setHeaderOpacity] = useState(0);
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

    // 4. Ultimate fallback (same as original default)
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
  const [poetPickerOpen, setPoetPickerOpen] = useState(false);
  const [poetPickerClosing, setPoetPickerClosing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [currentFont, setCurrentFont] = useState('Amiri');
  const [useDatabase, setUseDatabase] = useState(FEATURES.database);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [autoExplainPending, setAutoExplainPending] = useState(false);
  const hasAutoLoaded = useRef(false);
  const [logs, setLogs] = useState([]);
  const [showDebugLogs, setShowDebugLogs] = useState(FEATURES.debug);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [showInsightSuccess, setShowInsightSuccess] = useState(false);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    audioHits: 0,
    audioMisses: 0,
    insightsHits: 0,
    insightsMisses: 0,
  });
  const [isPrefetching, setIsPrefetching] = useState(false);
  const activeAudioRequests = useRef(new Set()); // Track in-flight audio generation requests
  const activeInsightRequests = useRef(new Set()); // Track in-flight insight generation requests
  const pollingIntervals = useRef([]); // Track all polling intervals for cleanup

  // Auth state
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const { settings, saveSettings } = useUserSettings(user);
  const { savedPoems, savePoem, unsavePoem, isPoemSaved } = useSavedPoems(user);
  const { downvotedPoemIds, downvotePoem, undownvotePoem, isPoemDownvoted } = useDownvotes(user);
  const { emitEvent } = usePoemEvents(user);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [showSavedPoems, setShowSavedPoems] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // Always show splash on every visit
  const [showOnboarding] = useState(() => {
    if (!FEATURES.onboarding) return false;
    if (FEATURES.forceOnboarding) return true;
    try {
      return !localStorage.getItem('hasSeenOnboarding');
    } catch {
      return false;
    }
  });
  const [showTranslation, setShowTranslation] = useState(true);
  const [textSizeLevel, setTextSizeLevel] = useState(1); // 0=S, 1=M, 2=L, 3=XL
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const theme = darkMode ? THEME.dark : THEME.light;

  const currentFontClass = useMemo(() => {
    const font = FONTS.find((f) => f.id === currentFont);
    return font ? font.family : FONTS[0].family;
  }, [currentFont]);

  const cycleFont = () => {
    const currentIdx = FONTS.findIndex((f) => f.id === currentFont);
    const nextIdx = (currentIdx + 1) % FONTS.length;
    setCurrentFont(FONTS[nextIdx].id);
    track('font_changed', { font: FONTS[nextIdx].id });
    addLog('Font', `Switched to ${FONTS[nextIdx].label}`, 'info');
  };

  const TEXT_SIZES = [
    { label: 'S', multiplier: 0.85 },
    { label: 'M', multiplier: 1.0 },
    { label: 'L', multiplier: 1.15 },
    { label: 'XL', multiplier: 1.3 },
  ];

  const cycleTextSize = () => {
    setTextSizeLevel((prev) => (prev + 1) % TEXT_SIZES.length);
  };

  const textScale = TEXT_SIZES[textSizeLevel].multiplier;

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

  // Defensive: poems[0] is always truthy (hardcoded initial poem), but guard against
  // future changes that might empty the array (e.g., setPoems([]) or filter edge cases)
  const current = filtered[currentIndex] || filtered[0] || poems[0] || null;

  const addLog = (label, msg, type = 'info') => {
    const now = performance.now();
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => {
      const t0 = prev.length > 0 ? prev[0].ts : now;
      const relSec = ((now - t0) / 1000).toFixed(1);
      return [...prev, { label, msg: String(msg), type, time, ts: now, rel: `+${relSec}s` }];
    });
    if (FEATURES.logging) {
      const logFn =
        type === 'error' ? console.error : type === 'success' ? console.info : console.log;
      logFn(`[${label}] ${msg}`);
    }
  };

  // Track poem view time (emit 'view' event after 3s on same poem)
  useEffect(() => {
    if (!current?.id || !user) return;
    const timer = setTimeout(() => {
      emitEvent(current.id, 'view', { duration_ms: 3000 });
      addLog('Event', `→ view event emitted | poem_id: ${current.id} | duration: 3000ms`, 'info');
    }, 3000);
    return () => clearTimeout(timer);
  }, [current?.id, user]);

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

  // Eagerly populate the discovered model list so it's ready before any user action.
  // Using the default fetch mock in tests means this never consumes a mockResolvedValueOnce.
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
        fetch(`${apiUrl}/api/poems/${poemId}`)
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

  // After OAuth redirect, once the user is signed in, auto-save the stashed poem and clean up
  useEffect(() => {
    if (!user) return;
    let stashed;
    try {
      stashed = sessionStorage.getItem('pendingSavePoem');
    } catch {}
    if (!stashed) return;
    sessionStorage.removeItem('pendingSavePoem');
    try {
      const poem = JSON.parse(stashed);
      if (poem && poem.arabic) {
        savePoem(poem).then(({ error }) => {
          if (error) {
            addLog('Save Error', error.message, 'error');
          } else {
            addLog('Save', `Auto-saved poem: ${poem.poet} — ${poem.title}`, 'success');
          }
        });
      }
    } catch {}
  }, [user]);

  // Auto-trigger explanation after auto-loaded poem arrives (skip if cached translation exists)
  useEffect(() => {
    if (autoExplainPending && current?.id && !isFetching && !isInterpreting && !interpretation) {
      setAutoExplainPending(false);
      if (!current?.cachedTranslation) {
        handleAnalyze();
      }
    }
  }, [autoExplainPending, current?.id, isFetching, isInterpreting, interpretation]);

  // Load user settings on mount
  useEffect(() => {
    if (user && settings) {
      if (settings.theme) {
        setDarkMode(settings.theme === 'dark');
      }
      if (settings.font_id) {
        setCurrentFont(settings.font_id);
      }
    }
  }, [user, settings]);

  // Save settings when theme or font changes (with debounce)
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      saveSettings({
        theme: darkMode ? 'dark' : 'light',
        font_id: currentFont,
      });
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [darkMode, currentFont, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          handleFetch();
          break;
        case 'e':
        case 'E':
          if (!isInterpreting && !interpretation) handleAnalyze();
          break;
        case 't':
        case 'T':
          setShowTranslation((prev) => !prev);
          break;
        case 'r':
        case 'R':
          setShowTransliteration((prev) => !prev);
          break;
        case 'Escape':
          setShowAuthModal(false);
          setShowSavedPoems(false);
          setShowShortcutHelp(false);
          break;
        case '?':
          setShowShortcutHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterpreting, interpretation]);

  // headerProgress: 0 = full size center, 1 = compact right corner
  // Slower ramp: full transition over 200px of scroll instead of 60
  const handleScroll = (e) => {
    const progress = Math.min(1, e.target.scrollTop / 200);
    setHeaderOpacity(progress);
  };

  // Close poet picker on outside click
  useEffect(() => {
    if (!poetPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (poetPickerRef.current && !poetPickerRef.current.contains(e.target)) {
        closePoetPicker();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [poetPickerOpen]);

  const closePoetPicker = () => {
    setPoetPickerClosing(true);
    setTimeout(() => {
      setPoetPickerOpen(false);
      setPoetPickerClosing(false);
    }, 250);
  };

  // Extract cached translation fields into stable local variables so useMemo
  // only re-runs when the actual string values change, not on every `current` reference change.
  const cachedTranslation = current?.cachedTranslation;
  const cachedExplanation = current?.cachedExplanation;
  const cachedAuthorBio = current?.cachedAuthorBio;

  const insightParts = useMemo(() => {
    if (cachedTranslation) {
      return {
        poeticTranslation: cachedTranslation,
        depth: cachedExplanation || '',
        author: cachedAuthorBio || '',
      };
    }
    return parseInsight(interpretation);
  }, [interpretation, cachedTranslation, cachedExplanation, cachedAuthorBio]);

  const versePairs = useMemo(() => {
    const arLines = (current?.arabic || '').split('\n').filter((l) => l.trim());
    const enSource = insightParts?.poeticTranslation || current?.english || '';
    const enLines = enSource.split('\n').filter((l) => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || '', en: enLines[i] || '' });
    }
    return pairs;
  }, [current, insightParts]);

  const pcm16ToWav = (base64, rate = 24000) => {
    try {
      const cleanedBase64 = base64.replace(/\s/g, '');
      const bin = atob(cleanedBase64);
      const buf = new ArrayBuffer(bin.length);
      const view = new DataView(buf);
      for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
      const samples = new Int16Array(buf);
      const wavBuf = new ArrayBuffer(44 + samples.length * 2);
      const wavView = new DataView(wavBuf);
      const s = (o, str) => {
        for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i));
      };
      s(0, 'RIFF');
      wavView.setUint32(4, 36 + samples.length * 2, true);
      s(8, 'WAVE');
      s(12, 'fmt ');
      wavView.setUint32(16, 16, true);
      wavView.setUint16(20, 1, true);
      wavView.setUint16(22, 1, true);
      wavView.setUint32(24, rate, true);
      wavView.setUint32(28, rate * 2, true);
      wavView.setUint16(32, 2, true);
      wavView.setUint16(34, 16, true);
      s(36, 'data');
      wavView.setUint32(40, samples.length * 2, true);
      new Int16Array(wavBuf, 44).set(samples);
      return new Blob([wavBuf], { type: 'audio/wav' });
    } catch (e) {
      addLog('Audio Error', e.message, 'error');
      return null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // Volume detection for pulse & glow effect
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      try {
        // Initialize AudioContext and source node if not already created.
        // A MediaElement can only be connected to one MediaElementSourceNode ever,
        // so we must reuse the source node across play/pause cycles.
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioCtx();
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 32;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          // Reuse existing source node or create a new one
          const source =
            sourceNodeRef.current || audioContext.createMediaElementSource(audioRef.current);
          sourceNodeRef.current = source;

          source.connect(analyser);
          analyser.connect(audioContext.destination);

          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          dataArrayRef.current = dataArray;

          if (FEATURES.logging) {
            addLog('Audio Context', 'Initialized volume detection for glow effect', 'info');
          }
        }

        // Resume context if it was suspended (e.g., by browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const detectVolume = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          const normalizedVolume = average / 255;

          if (normalizedVolume > 0.7 && volumePulseRef.current) {
            volumePulseRef.current.classList.add('volume-pulse-active');
            setTimeout(() => {
              if (volumePulseRef.current) {
                volumePulseRef.current.classList.remove('volume-pulse-active');
              }
            }, 150);
          }

          animationFrameRef.current = requestAnimationFrame(detectVolume);
        };

        detectVolume();
      } catch (error) {
        // Gracefully degrade to CSS-only animation
        if (FEATURES.logging) {
          console.error('Failed to initialize Web Audio API:', error);
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const PulseGlowBars = () => (
    <div ref={volumePulseRef} className="flex items-center justify-center gap-[3px] h-6">
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{ background: GOLD.gold, animation: 'wave-organic-1 0.9s ease-in-out infinite' }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-2 1.15s ease-in-out infinite 0.1s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-3 0.95s ease-in-out infinite 0.2s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-4 1.1s ease-in-out infinite 0.15s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-5 0.88s ease-in-out infinite 0.05s',
        }}
      />
    </div>
  );

  const togglePlay = async () => {
    if (isTogglingPlay.current) {
      addLog('Audio', 'Play toggle already in progress — skipping', 'info');
      return;
    }
    isTogglingPlay.current = true;
    addLog(
      'UI Event',
      `🎵 Play button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );
    track('audio_play', { poet: current?.poet });

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      track('audio_pause', { poet: current?.poet });
      addLog('UI Event', '⏸️ Pause button clicked', 'info');
      isTogglingPlay.current = false;
      return;
    }

    if (audioUrl) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        addLog('Audio', 'Playback failed, resetting audio URL', 'info');
        setAudioUrl(null);
      }
      isTogglingPlay.current = false;
      return;
    }

    // Set loading state FIRST (before duplicate check) for better UX
    setIsGeneratingAudio(true);

    // Check if request already in flight - poll until it completes
    if (activeAudioRequests.current.has(current?.id)) {
      addLog('Audio', `Audio generation already in progress - waiting for completion`, 'info');

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeAudioRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and play
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
          if (cached?.blob) {
            addLog(
              'Audio',
              `✓ Background audio generation completed${cached.metadata?.model ? ` [${cached.metadata.model}]` : ''} - playing from cache`,
              'success'
            );
            const u = URL.createObjectURL(cached.blob);
            setAudioUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                addLog('Audio', `Playback failed: ${err.message}`, 'error');
              });
          } else {
            addLog('Audio', 'Background generation failed — please try again', 'info');
            isTogglingPlay.current = false;
            setIsGeneratingAudio(false);
            return;
          }
          setIsGeneratingAudio(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some large poems take 40+ seconds)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeAudioRequests.current.has(current?.id)) {
          addLog(
            'Audio',
            `Audio generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
            if (finalCheck?.blob) {
              addLog('Audio', `✓ Audio completed after extended wait - playing now`, 'success');
              const u = URL.createObjectURL(finalCheck.blob);
              setAudioUrl(u);
              audioRef.current.src = u;
              audioRef.current.load();
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                  addLog('Audio', `Playback failed: ${err.message}`, 'error');
                });
            } else {
              addLog('Audio', `Audio generation timeout - please try again`, 'error');
            }
            activeAudioRequests.current.delete(current?.id);
            setIsGeneratingAudio(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      isTogglingPlay.current = false;
      return;
    }

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.blob) {
        const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
        addLog(
          'Audio Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms)${cached.metadata?.model ? ` | Model: ${cached.metadata.model}` : ''} | Size: ${sizeMB}MB | Instant playback`,
          'success'
        );
        setCacheStats((prev) => ({ ...prev, audioHits: prev.audioHits + 1 }));

        const u = URL.createObjectURL(cached.blob);
        setAudioUrl(u);
        audioRef.current.src = u;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
            addLog('Audio', `Cached playback failed: ${err.message}`, 'error');
          });
        setIsGeneratingAudio(false); // Clear loading state
        isTogglingPlay.current = false;
        return;
      } else {
        addLog(
          'Audio Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        setCacheStats((prev) => ({ ...prev, audioMisses: prev.audioMisses + 1 }));
      }
    }

    // Mark request as in-flight
    activeAudioRequests.current.add(current?.id);

    const ttsContent = getTTSContent(current);

    // Calculate request metrics
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: ttsContent }] }],
      generationConfig: {
        responseModalities: TTS_CONFIG.responseModalities,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName },
          },
        },
      },
    });
    const requestSize = new Blob([requestBody]).size;
    const estimatedTokens = Math.ceil(ttsContent.length / 4);
    const arabicTextChars = current?.arabic?.length || 0;

    addLog(
      'Audio API',
      `→ Starting generation | Model: ${API_MODELS.tts} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${arabicTextChars} chars Arabic | Est. ${estimatedTokens} tokens`,
      'info'
    );

    setAudioError(null);

    try {
      const apiStart = performance.now();
      const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };
      const { res, model: ttsModel } = await fetchTTSWithFallback(url, fetchOptions, {
        addLog,
        label: 'Audio API',
      });

      if (!res.ok) {
        const errorText = await res.text();
        addLog(
          'Audio API Error',
          `[${ttsModel}] HTTP ${res.status}: ${errorText.substring(0, 200)}`,
          'error'
        );
        if (res.status === 429) {
          setAudioError(
            'Recitation temporarily unavailable — too many requests. Please wait a moment and try again.'
          );
          throw new Error('Rate limited (429)');
        }
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const apiTime = performance.now() - apiStart;

      if (!data.candidates || data.candidates.length === 0) {
        addLog(
          'Audio API Error',
          `[${ttsModel}] No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`,
          'error'
        );
        throw new Error('Recitation failed - no audio candidates returned');
      }

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const conversionStart = performance.now();
        const blob = pcm16ToWav(b64);
        const conversionTime = performance.now() - conversionStart;

        if (blob) {
          // Calculate audio metrics
          const audioSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          const audioSizeKB = (blob.size / 1024).toFixed(1);
          // Estimate audio duration from PCM samples (24kHz, 16-bit, mono)
          const pcmBytes = atob(b64.replace(/\s/g, '')).length;
          const samples = pcmBytes / 2; // 16-bit = 2 bytes per sample
          const audioDuration = samples / 24000; // 24kHz sample rate
          const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);
          const totalTime = apiTime + conversionTime;

          addLog(
            'Audio API',
            `✓ [${ttsModel}] Complete | API: ${(apiTime / 1000).toFixed(2)}s | Convert: ${conversionTime.toFixed(0)}ms | Total: ${(totalTime / 1000).toFixed(2)}s`,
            'success'
          );
          addLog(
            'Audio Metrics',
            `[${ttsModel}] Audio: ${audioDuration.toFixed(1)}s | Size: ${audioSizeKB}KB (${audioSizeMB}MB) | Speed: ${tokensPerSecond} tok/s`,
            'success'
          );

          const u = URL.createObjectURL(blob);
          setAudioUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              addLog('Audio', `Playback failed: ${err.message}`, 'error');
            });

          // CACHE THE AUDIO BLOB
          if (FEATURES.caching && current?.id) {
            const cacheStart = performance.now();
            await cacheOperations.set(CACHE_CONFIG.stores.audio, current.id, {
              blob,
              metadata: {
                poet: current.poet,
                title: current.title,
                size: blob.size,
                duration: audioDuration,
                model: ttsModel,
              },
            });
            const cacheTime = performance.now() - cacheStart;
            addLog(
              'Audio Cache',
              `Audio cached for future playback (${cacheTime.toFixed(0)}ms) | Saves ${(apiTime / 1000).toFixed(1)}s on replay`,
              'success'
            );
          }
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      addLog('Audio System Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('audio_error', { error: (e.message || '').slice(0, 100) });
      setIsPlaying(false);
    } finally {
      setIsGeneratingAudio(false);
      activeAudioRequests.current.delete(current?.id); // Clean up in-flight tracking
      isTogglingPlay.current = false;
    }
  };

  const handleAnalyze = async () => {
    addLog(
      'UI Event',
      `🔍 Dive In button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );

    if (interpretation || isInterpreting) return;
    track('insight_requested', { poet: current?.poet });

    // Set loading state FIRST (before duplicate check) for better UX
    setIsInterpreting(true);

    // Check if request already in flight - poll until it completes
    if (activeInsightRequests.current.has(current?.id)) {
      addLog(
        'Insights',
        `Insights generation already in progress - waiting for completion`,
        'info'
      );

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeInsightRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and display
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
          if (cached?.interpretation) {
            addLog(
              'Insights',
              `✓ Background insights generation completed - displaying results`,
              'success'
            );
            setInterpretation(cached.interpretation);
          } else {
            addLog('Insights', `Background insights generation failed - retrying`, 'info');
            // Retry the request
            setTimeout(() => handleAnalyze(), 100);
            return;
          }
          setIsInterpreting(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some insights take time)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeInsightRequests.current.has(current?.id)) {
          addLog(
            'Insights',
            `Insights generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
            if (finalCheck?.interpretation) {
              addLog(
                'Insights',
                `✓ Insights completed after extended wait - displaying now`,
                'success'
              );
              setInterpretation(finalCheck.interpretation);
            } else {
              addLog('Insights', `Insights generation timeout - please try again`, 'error');
            }
            activeInsightRequests.current.delete(current?.id);
            setIsInterpreting(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      return;
    }

    // Mark request as in-flight
    activeInsightRequests.current.add(current?.id);

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.interpretation) {
        const charCount = cached.interpretation.length;
        const estTokens = Math.ceil(charCount / 4);
        addLog(
          'Insights Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | ${charCount} chars (≈${estTokens} tokens) | Instant load`,
          'success'
        );
        setCacheStats((prev) => ({ ...prev, insightsHits: prev.insightsHits + 1 }));
        setInterpretation(cached.interpretation);
        setIsInterpreting(false); // Clear loading state
        activeInsightRequests.current.delete(current?.id); // Clean up tracking
        return;
      } else {
        addLog(
          'Insights Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        setCacheStats((prev) => ({ ...prev, insightsMisses: prev.insightsMisses + 1 }));
      }
    }

    let insightText = '';
    let apiStartTime = null;

    try {
      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        const poetInfo = current?.poet ? ` by ${current.poet}` : '';
        const promptText = `Deep Analysis of${poetInfo}:\n\n${current?.arabic}`;
        const requestSize = new Blob([
          JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        ]).size;
        const estimatedInputTokens = Math.ceil(
          (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = promptText.length;
        const arabicTextChars = current?.arabic?.length || 0;
        const systemPromptChars = INSIGHTS_SYSTEM_PROMPT.length;

        addLog(
          'Insights API',
          `→ Starting streaming | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars} chars (${arabicTextChars} Arabic + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          'info'
        );

        setInterpretation(''); // Clear previous interpretation
        apiStartTime = performance.now();
        const apiStart = apiStartTime;
        let firstChunkTime = null;
        let chunkCount = 0;
        let totalTime = 0;

        const insightsStreamBody = JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
        });
        const res = await geminiTextFetch(
          'streamGenerateContent',
          insightsStreamBody,
          'Insights failed',
          addLog
        );

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  if (!firstChunkTime) {
                    firstChunkTime = performance.now() - apiStart;
                    addLog(
                      'Insights API',
                      `← First chunk received (${firstChunkTime.toFixed(0)}ms) | Streaming...`,
                      'info'
                    );
                  }
                  chunkCount++;
                  accumulatedText += text;
                  setInterpretation(accumulatedText); // Real-time UI update
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.debug('Skipping malformed chunk:', jsonStr);
              }
            }
          }
        }

        insightText = accumulatedText;
        totalTime = performance.now() - apiStart;
        const charCount = insightText.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        const tokensPerSecond = (estimatedTokens / (totalTime / 1000)).toFixed(1);
        const avgChunkSize = charCount / chunkCount;

        addLog(
          'Insights API',
          `✓ Streaming complete | Total: ${(totalTime / 1000).toFixed(2)}s | TTFT: ${(firstChunkTime / 1000).toFixed(2)}s | ${chunkCount} chunks`,
          'success'
        );
        addLog(
          'Insights Metrics',
          `${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s | Avg chunk: ${avgChunkSize.toFixed(0)} chars`,
          'success'
        );
      } else {
        // Non-streaming fallback (original implementation)
        addLog('Insights', 'Analyzing poem...', 'info');
        const poetInfoFallback = current?.poet ? ` by ${current.poet}` : '';
        const insightsFallbackBody = JSON.stringify({
          contents: [
            { parts: [{ text: `Deep Analysis of${poetInfoFallback}:\n\n${current?.arabic}` }] },
          ],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
        });
        const res = await geminiTextFetch(
          'generateContent',
          insightsFallbackBody,
          'Insights failed',
          addLog
        );
        const data = await res.json();
        insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        setInterpretation(insightText);
        addLog('Insights', 'Analysis complete', 'success');
      }

      // CACHE THE INSIGHTS
      if (FEATURES.caching && current?.id && insightText) {
        const cacheStart = performance.now();
        await cacheOperations.set(CACHE_CONFIG.stores.insights, current.id, {
          interpretation: insightText,
          metadata: {
            poet: current.poet,
            title: current.title,
            charCount: insightText.length,
            tokens: Math.ceil(insightText.length / 4),
          },
        });
        const cacheTime = performance.now() - cacheStart;
        const elapsedTime = apiStartTime
          ? ((performance.now() - apiStartTime) / 1000).toFixed(1)
          : '2-8';
        addLog(
          'Insights Cache',
          `Insights cached for future use (${cacheTime.toFixed(0)}ms) | Saves ${elapsedTime}s on reload`,
          'success'
        );
      }

      // Save translation back to database for future visitors (fire-and-forget)
      if (current?.isFromDatabase && current?.id && insightText && apiUrl) {
        const parts = parseInsight(insightText);
        if (parts?.poeticTranslation) {
          fetch(`${apiUrl}/api/poems/${current.id}/translation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              translation: parts.poeticTranslation.replace(/\n/g, '*'),
              explanation: parts.depth || null,
              authorBio: parts.author || null,
            }),
          }).catch(() => {});
        }
      }

      track('insight_completed', {
        poet: current?.poet,
        cached: !!(FEATURES.caching && current?.id && insightText),
      });

      // Flash gold check sparkle on the sidebar icon
      if (insightText) {
        setShowInsightSuccess(true);
        setTimeout(() => setShowInsightSuccess(false), 1500);
      }
    } catch (e) {
      Sentry.captureException(e);
      addLog('Analysis Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('insight_error', { error: (e.message || '').slice(0, 100) });
      // Show partial results if streaming was interrupted
      if (FEATURES.streaming && insightText) {
        addLog('Insights', 'Showing partial results', 'warning');
      }
    } finally {
      setIsInterpreting(false);
      activeInsightRequests.current.delete(current?.id); // Clean up in-flight tracking
    }
  };

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

      // DATABASE MODE: Fetch from local PostgreSQL API
      if (useDatabase) {
        addLog('Discovery DB', `→ Querying database | Category: ${selectedCategory}`, 'info');

        // Dedup: prune stale entries and build exclude list
        pruneSeenPoems();
        const seenIds = getRecentSeenIds();

        const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
        const poetName = categoryObj?.labelAr || selectedCategory;
        const queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.set('poet', poetName);
        if (seenIds.length > 0) queryParams.set('exclude', seenIds.join(','));
        const qs = queryParams.toString();
        const url = `${apiUrl}/api/poems/random${qs ? '?' + qs : ''}`;

        if (seenIds.length > 0) {
          addLog('Discovery DB', `Excluding ${seenIds.length} recently seen poems`, 'info');
        }

        try {
          const res = await fetch(url);

          if (!res.ok) {
            throw new Error(`Database API returned ${res.status} ${res.statusText}`);
          }

          // Clear any previous backend errors on success

          const newPoem = await res.json();
          const apiTime = performance.now() - apiStart;

          // Process database poems: replace * with newlines
          if (newPoem.arabic) {
            newPoem.arabic = newPoem.arabic.replace(/\*/g, '\n');
          }
          if (newPoem.cachedTranslation) {
            newPoem.cachedTranslation = newPoem.cachedTranslation.replace(/\*/g, '\n');
          }

          // Mark as database poem
          newPoem.isFromDatabase = true;

          // Track this poem as seen for dedup
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
          addLog(
            'Event',
            `→ serve event emitted | poem_id: ${newPoem.id} | source: database`,
            'info'
          );

          setPoems((prev) => {
            const updated = [...prev, newPoem];
            setCurrentIndex(updated.length - 1); // New poem is always last
            return updated;
          });
          // Update URL to reflect current poem
          window.history.replaceState({}, '', '/poem/' + newPoem.id);
        } catch (dbError) {
          // Handle database-specific errors
          const errorMessage = dbError.message.includes('Failed to fetch')
            ? 'Backend server is not running. Please start it with: npm run dev:server'
            : dbError.message;

          addLog('Discovery DB Error', errorMessage, 'error');
          throw dbError; // Re-throw to be caught by outer catch
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
        // Log if repair was needed (original raw text had fences or truncation)
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

        // Log tags for debugging
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

  // Pre-fetch a poem in the background for the next visit (stored in localStorage with TTL)
  async function prefetchNextVisitPoem() {
    try {
      const res = await fetch(`${apiUrl}/api/poems/random`);
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

  const handleCopy = async () => {
    addLog(
      'UI Event',
      `📋 Copy button clicked | Poem: ${current?.poet} - ${current?.title}`,
      'info'
    );

    const textToCopy = `${current?.titleArabic || ''}\n${current?.poetArabic || ''}\n\n${current?.arabic || ''}\n\n---\n\n${current?.title || ''}\n${current?.poet || ''}\n\n${current?.english || ''}`;
    const copyChars = textToCopy.length;
    const arabicChars = current?.arabic?.length || 0;
    const englishChars = current?.english?.length || 0;

    try {
      await navigator.clipboard.writeText(textToCopy);
      track('poem_copied', { poet: current?.poet });
      if (current?.id) {
        emitEvent(current.id, 'copy');
        addLog('Event', `→ copy event emitted | poem_id: ${current.id}`, 'info');
      }
      setShowCopySuccess(true);
      addLog(
        'Copy',
        `✓ Copied to clipboard | ${copyChars} chars total (${arabicChars} Arabic + ${englishChars} English)`,
        'success'
      );
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (e) {
      addLog('Copy Error', e.message, 'error');
    }
  };

  const handleShare = async () => {
    addLog('UI Event', 'Share button clicked', 'info');
    track('poem_shared', { poet: current?.poet });

    const poemId = current?.id;
    const isDbPoem = current?.isFromDatabase && typeof poemId === 'number';
    const shareUrl = isDbPoem ? `${window.location.origin}/poem/${poemId}` : window.location.origin;
    const shareTitle = `${current?.titleArabic || current?.title || 'Arabic Poetry'} — ${current?.poetArabic || current?.poet || ''}`;
    const shareText = current?.arabic
      ? current.arabic.split('\n').slice(0, 2).join('\n')
      : 'Discover classical and modern Arabic poetry';

    // Try native Web Share API first (mobile + some desktop)
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        track('share_method', { method: 'native' });
        if (current?.id) {
          emitEvent(current.id, 'share', { method: 'native' });
          addLog(
            'Event',
            `→ share event emitted | poem_id: ${current.id} | method: native`,
            'info'
          );
        }
        addLog('Share', 'Shared via Web Share API', 'success');
        return;
      } catch (e) {
        // User cancelled or API failed — fall through to copy
        if (e.name === 'AbortError') {
          addLog('Share', 'Share cancelled by user', 'info');
          return;
        }
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      track('share_method', { method: 'clipboard' });
      if (current?.id) {
        emitEvent(current.id, 'share', { method: 'clipboard' });
        addLog(
          'Event',
          `→ share event emitted | poem_id: ${current.id} | method: clipboard`,
          'info'
        );
      }
      setShowShareSuccess(true);
      addLog('Share', `Link copied: ${shareUrl}`, 'success');
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (e) {
      addLog('Share Error', e.message, 'error');
    }
  };

  // Auth handlers
  const handleSignIn = () => {
    track('sign_in_started');
    setShowAuthModal(true);
  };

  const handleSignInWithGoogle = async () => {
    // Stash current poem so it survives the OAuth page redirect
    if (current) {
      try {
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(current));
      } catch {}
    }
    const { error } = await signInWithGoogle();
    if (error) {
      addLog('Auth Error', error.message, 'error');
      track('sign_in_error', { provider: 'google', error: (error.message || '').slice(0, 100) });
    } else {
      setShowAuthModal(false);
      track('sign_in_completed', { provider: 'google' });
      addLog('Auth', 'Signed in with Google', 'success');
    }
  };

  const handleSignInWithApple = async () => {
    // Stash current poem so it survives the OAuth page redirect
    if (current) {
      try {
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(current));
      } catch {}
    }
    const { error } = await signInWithApple();
    if (error) {
      addLog('Auth Error', error.message, 'error');
      track('sign_in_error', { provider: 'apple', error: (error.message || '').slice(0, 100) });
    } else {
      setShowAuthModal(false);
      track('sign_in_completed', { provider: 'apple' });
      addLog('Auth', 'Signed in with Apple', 'success');
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      addLog('Auth Error', error.message, 'error');
    } else {
      setShowSavedPoems(false);
      setShowAuthModal(false);
      track('sign_out');
      addLog('Auth', 'Signed out successfully', 'success');
    }
  };

  // Save/unsave poem handlers
  const handleSavePoem = async () => {
    if (!user) {
      handleSignIn();
      return;
    }

    const { error } = await savePoem(current);
    if (error) {
      addLog('Save Error', error.message, 'error');
    } else {
      addLog('Save', `Saved poem: ${current?.poet} - ${current?.title}`, 'success');
      track('poem_saved', { poet: current?.poet });
      if (current?.id) {
        emitEvent(current.id, 'save');
        addLog('Event', `→ save event emitted (dual-write) | poem_id: ${current.id}`, 'info');
      }
    }
  };

  const handleUnsavePoem = async () => {
    const { error } = await unsavePoem(current?.id, current?.arabic);
    if (error) {
      addLog('Unsave Error', error.message, 'error');
    } else {
      track('poem_unsaved', { poet: current?.poet });
      addLog('Unsave', `Removed poem: ${current?.poet} - ${current?.title}`, 'success');
    }
  };

  const handleDownvote = async () => {
    addLog(
      'UI Event',
      `👎 Flag button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );

    if (!user) {
      addLog('Downvote', 'Not authenticated — opening sign-in', 'info');
      handleSignIn();
      return;
    }

    addLog('Downvote', `→ Sending downvote to Supabase | poem_id: ${current?.id}`, 'info');
    const { error } = await downvotePoem(current);
    if (error) {
      addLog('Downvote Error', `✗ Failed: ${error.message}`, 'error');
    } else {
      addLog(
        'Downvote',
        `✓ Flagged poem: ${current?.poet} - ${current?.title} | Auto-advancing in 600ms`,
        'success'
      );
      track('poem_downvoted', { poet: current?.poet });
      // Auto-advance after 600ms
      setTimeout(() => handleFetch(), 600);
    }
  };

  const handleUndownvote = async () => {
    addLog(
      'UI Event',
      `👍 Unflag button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );
    addLog('Undownvote', `→ Removing downvote from Supabase | poem_id: ${current?.id}`, 'info');

    const { error } = await undownvotePoem(current?.id);
    if (error) {
      addLog('Undownvote Error', `✗ Failed: ${error.message}`, 'error');
    } else {
      track('poem_undownvoted', { poet: current?.poet });
      addLog('Undownvote', `✓ Unflagged poem: ${current?.poet} - ${current?.title}`, 'success');
    }
  };

  const handleOpenSavedPoems = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    track('saved_poems_opened');
    setShowSavedPoems(true);
  };

  const handleSelectSavedPoem = (savedPoem) => {
    track('saved_poem_selected', { poet: savedPoem.poet });
    const mappedPoem = {
      id: savedPoem.poem_id || savedPoem.id,
      poet: savedPoem.poet || '',
      poetArabic: savedPoem.poet || '',
      title: savedPoem.title || '',
      titleArabic: savedPoem.title || '',
      arabic: savedPoem.poem_text || '',
      english: savedPoem.english || '',
      tags: savedPoem.category ? [savedPoem.category] : [],
    };
    setPoems((prev) => {
      const exists = prev.find((p) => p.arabic === mappedPoem.arabic);
      if (exists) {
        setCurrentIndex(prev.indexOf(exists));
        return prev;
      }
      setCurrentIndex(prev.length);
      return [...prev, mappedPoem];
    });
    setShowSavedPoems(false);
    // Update URL for DB poems
    if (typeof mappedPoem.id === 'number') {
      window.history.replaceState({}, '', '/poem/' + mappedPoem.id);
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleToggleDarkMode = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    track('theme_changed', { theme: newTheme });
    setDarkMode(!darkMode);
    addLog('Theme', `Switched to ${newTheme} mode`, 'info');
  };
  const handleToggleTheme = handleToggleDarkMode;

  const handleUnsavePoemFromList = async (sp) => {
    const { error } = await unsavePoem(sp.poem_id || sp.id, sp.poem_text);
    if (error) {
      addLog('Unsave Error', error.message, 'error');
    } else {
      addLog('Unsave', `Removed poem from saved list`, 'success');
    }
  };

  const handleToggleTranslation = (showTranslation) => {
    addLog('Translation', `Translation ${showTranslation ? 'shown' : 'hidden'}`, 'info');
  };

  const handleToggleTransliteration = (showTransliteration) => {
    addLog(
      'Transliteration',
      `Transliteration ${showTransliteration ? 'shown' : 'hidden'}`,
      'info'
    );
  };

  const handleTextSizeChange = (level) => {
    addLog('TextSize', `Text size changed to level ${level}`, 'info');
  };

  const handleKeyboardShortcut = (key, action) => {
    addLog('Keyboard', `Shortcut: ${key} → ${action}`, 'info');
  };

  const handleSplashDismissed = () => {
    addLog('Splash', 'Splash screen dismissed', 'info');
  };

  const handleSplashShown = () => {
    addLog('Splash', 'Splash screen shown', 'info');
  };
  // ── End logging hooks ─────────────────────────────────────────────

  useEffect(() => {
    setInterpretation(null);
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    // Clear any stuck loading states when poem changes
    setIsGeneratingAudio(false);
    setIsInterpreting(false);
    setAudioError(null);

    // Reset translation visibility so every new poem shows the translation by default
    setShowTranslation(true);

    // Clear all polling intervals to prevent stale requests
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current = [];

    // Log current poem tags for debugging
    const tagsType = Array.isArray(current?.tags) ? 'array' : typeof current?.tags;
    const tagsContent = Array.isArray(current?.tags)
      ? `[${current.tags.join(', ')}]`
      : JSON.stringify(current?.tags);
    addLog(
      'Navigation',
      `Switched to poem: ${current?.poet} - ${current?.title} | ID: ${current?.id} | Tags: ${tagsType} - ${tagsContent}`,
      'info'
    );
  }, [current?.id]);

  // Prefetch triggers - run background prefetching when poem changes
  // Only prefetch current poem; next-poem audio prefetch removed to conserve TTS quota (100 RPD per model, free tier)
  useEffect(() => {
    if (!FEATURES.prefetching || !current?.id) return;

    // Prefetch current poem audio after 2s (only if user lingers on this poem)
    const prefetchCurrentAudio = setTimeout(() => {
      prefetchManager.prefetchAudio(current.id, current, addLog, activeAudioRequests);
    }, 2000);

    // Prefetch current poem insights after 5s (only if user stays)
    const prefetchCurrentInsights = setTimeout(() => {
      prefetchManager.prefetchInsights(current.id, current, addLog, activeInsightRequests);
    }, 5000);

    // Cleanup timeouts on unmount or when dependencies change
    return () => {
      clearTimeout(prefetchCurrentAudio);
      clearTimeout(prefetchCurrentInsights);
    };
  }, [current?.id, currentIndex, filtered]);

  // Keep-alive ping to prevent Render free tier from sleeping (15 min idle timeout)
  // Pings every 10 minutes to keep backend awake
  useEffect(() => {
    if (!useDatabase || !apiUrl) return; // Only ping if database mode is enabled

    const keepAlivePing = setInterval(
      () => {
        fetch(`${apiUrl}/api/health`)
          .then(() => {
            if (FEATURES.debug) {
              addLog('Keep-Alive', 'Backend pinged successfully', 'info');
            }
          })
          .catch((err) => {
            // Silently fail - don't disrupt user experience
            if (FEATURES.debug) {
              addLog('Keep-Alive', `Ping failed: ${err.message}`, 'error');
            }
          });
      },
      10 * 60 * 1000
    ); // 10 minutes

    // Initial ping on mount
    fetch(`${apiUrl}/api/health`).catch(() => {});

    return () => clearInterval(keepAlivePing);
  }, [useDatabase, apiUrl]);

  if (!current) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text}`}>
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-60" />
          <p className="text-sm opacity-60">Loading poems...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col overflow-hidden ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}
    >
      <style>{`
        .arabic-shadow { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2); border-radius: 10px; }
        .bg-radial-gradient { background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%); }

        .safe-bottom { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }

        .font-amiri { font-family: 'Amiri', serif; }
        .font-alexandria { font-family: 'Alexandria', sans-serif; }
        .font-messiri { font-family: 'El Messiri', sans-serif; }
        .font-lalezar { font-family: 'Lalezar', cursive; }
        .font-rakkas { font-family: 'Rakkas', cursive; }
        .font-fustat { font-family: 'Fustat', serif; }
        .font-kufam { font-family: 'Kufam', sans-serif; }
        .font-katibeh { font-family: 'Katibeh', cursive; }

        .header-luminescence {
          text-shadow: 0 0 30px rgba(197, 160, 89, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .minimal-frame {
          position: relative;
          width: 100%;
          max-width: 550px;
          margin: 0 auto 16px;
          padding: 16px 24px;
        }

        .minimal-frame svg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        @media (min-width: 768px) {
          .minimal-frame {
            padding: 28px 40px;
          }
        }

        .frame-line {
          fill: none;
          stroke: ${GOLD.gold};
          stroke-width: 2;
          opacity: 0.28;
          stroke-linecap: square;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes discoverShuffle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
          100% { transform: rotate(0deg); }
        }
        .discover-btn:hover .discover-icon {
          animation: discoverShuffle 0.5s ease-in-out;
        }

        @keyframes insightsDrawerIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes poetPickerIn {
          0%   { opacity: 0; transform: translate(-50%, 16px) scale(0.9); }
          60%  { opacity: 1; transform: translate(-50%, -4px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes poetPickerOut {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          40%  { opacity: 0.8; transform: translate(-50%, -3px) scale(1.01); }
          100% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
        }

        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes wave-organic-1 {
          0% { height: 10px; }
          25% { height: 18px; }
          50% { height: 24px; }
          75% { height: 14px; }
          100% { height: 10px; }
        }

        @keyframes wave-organic-2 {
          0% { height: 12px; }
          30% { height: 20px; }
          60% { height: 22px; }
          80% { height: 16px; }
          100% { height: 12px; }
        }

        @keyframes wave-organic-3 {
          0% { height: 14px; }
          20% { height: 24px; }
          55% { height: 18px; }
          85% { height: 20px; }
          100% { height: 14px; }
        }

        @keyframes wave-organic-4 {
          0% { height: 11px; }
          35% { height: 19px; }
          65% { height: 23px; }
          90% { height: 15px; }
          100% { height: 11px; }
        }

        @keyframes wave-organic-5 {
          0% { height: 10px; }
          28% { height: 17px; }
          58% { height: 21px; }
          88% { height: 13px; }
          100% { height: 10px; }
        }

        .volume-pulse-active .bar-with-glow {
          box-shadow: 0 0 8px rgba(197, 160, 89, 0.6),
                      0 0 4px rgba(197, 160, 89, 0.4);
        }

        .bar-with-glow {
          transition: box-shadow 0.15s ease;
        }

      `}</style>

      <DebugPanel
        logs={logs}
        onClear={() => setLogs([])}
        darkMode={darkMode}
        poem={current}
        visible={showDebugLogs}
        controlBarRef={controlBarRef}
        appState={{
          mode: useDatabase ? 'database' : 'ai',
          theme: darkMode ? 'dark' : 'light',
          font: currentFont,
        }}
      />

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          pointerEvents: 'none',
          padding: '0.5rem 1rem',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: darkMode ? 'rgba(12,12,14,0.85)' : 'rgba(253,252,248,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${darkMode ? 'rgba(197,160,89,0.1)' : 'rgba(107,87,68,0.1)'}`,
        }}
      >
        <div
          className="flex flex-row items-center gap-1.5 header-luminescence"
          style={{
            transform: `scale(${1 - headerOpacity * 0.25})`,
            opacity: 1 - headerOpacity * 0.1,
            transformOrigin: 'center',
            transition: 'transform 0.4s ease-out, opacity 0.3s',
          }}
        >
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span
              style={{
                ...BRAND.arabic,
                color: '#C5A059',
                textShadow: '0 0 40px rgba(197,160,89,0.3)',
              }}
            >
              بالعربي
            </span>
            <span
              style={{
                ...BRAND.english,
                color: darkMode ? '#D4D0C8' : '#1A1614',
              }}
            >
              poetry
            </span>
          </h1>
          <Feather style={{ ...BRAND.feather, color: '#C5A059' }} strokeWidth={1.5} />
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%23C5A059' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%23C5A059' stroke-width='1'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main
            ref={mainScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 md:px-0 pb-28 pt-10 md:pt-12 pr-14 md:pr-0"
          >
            <div className="flex flex-col items-center pt-1">
              <div className="w-full max-w-4xl flex flex-col items-center">
                <div
                  className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}
                >
                  <div className="minimal-frame mb-1">
                    <svg viewBox="0 0 550 120" preserveAspectRatio="xMidYMid meet">
                      <line className="frame-line" x1="20" y1="20" x2="70" y2="20" />
                      <line className="frame-line" x1="20" y1="20" x2="20" y2="70" />
                      <line className="frame-line" x1="530" y1="20" x2="480" y2="20" />
                      <line className="frame-line" x1="530" y1="20" x2="530" y2="70" />
                      <line className="frame-line" x1="20" y1="100" x2="70" y2="100" />
                      <line className="frame-line" x1="20" y1="100" x2="20" y2="50" />
                      <line className="frame-line" x1="530" y1="100" x2="480" y2="100" />
                      <line className="frame-line" x1="530" y1="100" x2="530" y2="50" />
                      <circle
                        className="frame-line"
                        cx="32"
                        cy="32"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="518"
                        cy="32"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="32"
                        cy="88"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="518"
                        cy="88"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center justify-center w-full gap-0.5">
                      <div
                        className={`${currentFontClass} font-bold text-center`}
                        style={{
                          fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                          color: darkMode ? '#B8A088' : '#6B5744',
                        }}
                      >
                        {current?.titleArabic || current?.title}
                      </div>
                      <div
                        className={`${currentFontClass} text-center`}
                        style={{
                          fontSize: 'clamp(0.85rem, 1.8vw, 1.05rem)',
                          color: darkMode ? '#8A7D6F' : '#9B8B78',
                        }}
                      >
                        {current?.poetArabic || current?.poet}
                      </div>
                      {(() => {
                        const hasArabicFields = current?.poetArabic && current?.titleArabic;
                        const englishPoet = hasArabicFields
                          ? current?.poet !== current?.poetArabic
                            ? current?.poet
                            : CATEGORIES.find((c) => c.id === current?.poet)?.label
                          : null;
                        const englishTitle = hasArabicFields
                          ? current?.title !== current?.titleArabic
                            ? current?.title
                            : null
                          : null;
                        return englishPoet || englishTitle ? (
                          <div
                            className="font-brand-en text-center tracking-wide"
                            style={{
                              fontSize: 'clamp(0.65rem, 1.2vw, 0.8rem)',
                              color: darkMode ? '#6B6360' : '#A89B8E',
                              marginTop: '2px',
                            }}
                          >
                            {englishTitle && <span>{englishTitle}</span>}
                            {englishTitle && englishPoet && <span className="opacity-40"> · </span>}
                            {englishPoet && <span>{englishPoet}</span>}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                <div className={`relative w-full group pt-1 pb-2 ${DESIGN.mainMarginBottom}`}>
                  <div className="px-4 md:px-20 py-2 text-center">
                    <div className="flex flex-col gap-5 md:gap-7">
                      {versePairs.map((pair, idx) => (
                        <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                          <p
                            dir="rtl"
                            className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                            style={{ fontSize: `calc(clamp(1.25rem, 2vw, 1.5rem) * ${textScale})` }}
                          >
                            {pair.ar}
                          </p>
                          {showTransliteration && pair.ar && (
                            <p
                              dir="ltr"
                              className={`font-brand-en italic opacity-30 ${DESIGN.anim}`}
                              style={{
                                fontSize: `calc(clamp(0.75rem, 1.2vw, 0.875rem) * ${textScale})`,
                              }}
                            >
                              {transliterate(pair.ar)}
                            </p>
                          )}
                          {showTranslation && pair.en && (
                            <p
                              dir="ltr"
                              className={`font-brand-en italic opacity-40 ${DESIGN.anim}`}
                              style={{
                                fontSize: `calc(clamp(1rem, 1.5vw, 1.125rem) * ${textScale})`,
                              }}
                            >
                              {pair.en}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-3 mt-2 mb-4">
                  {Array.isArray(current?.tags) &&
                    current.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                <div className="w-full max-w-2xl px-6 md:px-0 mb-4 md:hidden">
                  {isInterpreting ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                      <div className="relative">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                        <Sparkles
                          className="absolute inset-0 m-auto animate-pulse text-indigo-400"
                          size={16}
                        />
                      </div>
                      <p className="text-xs italic font-brand-en opacity-60 tracking-widest uppercase">
                        Consulting the Diwan...
                      </p>
                    </div>
                  ) : interpretation ? (
                    <div
                      className={`flex flex-col gap-10 animate-in slide-in-from-bottom-10 duration-1000`}
                    >
                      <div className="pt-6 border-t border-indigo-500/10">
                        <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                          The Depth
                        </h4>
                        <div className="pl-4 border-l border-indigo-500/10">
                          <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                            {insightParts?.depth}
                          </p>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-indigo-500/10">
                        <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                          The Author
                        </h4>
                        <div className="pl-4 border-l border-indigo-500/10">
                          <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                            {insightParts?.author}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 bg-gradient-to-t from-black/5 to-transparent safe-bottom">
            {audioError && (
              <div
                className={`mb-2 px-4 py-2 rounded-full text-xs font-medium ${DESIGN.glass} ${theme.glass} border ${theme.border} shadow-lg ${DESIGN.anim} max-w-[calc(100vw-2rem)] text-center`}
              >
                <span className={theme.error}>{audioError}</span>
                <button
                  onClick={() => setAudioError(null)}
                  className="ml-2 opacity-60 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X size={12} className="inline" />
                </button>
              </div>
            )}
            <div
              ref={controlBarRef}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border ${DESIGN.glass} ${theme.border} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                {isGeneratingAudio ? (
                  <>
                    <button
                      disabled
                      aria-label="Preparing audio"
                      className="min-w-[46px] min-h-[46px] p-[11px] bg-[#C5A059]/8 border border-[#C5A059]/30 cursor-wait transition-all duration-300 flex items-center justify-center rounded-full"
                    >
                      <div className="flex items-center justify-center gap-0.5 h-[21px]">
                        <div
                          className="w-[2px] h-[6px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.15s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[14px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.3s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.45s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[6px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.6s',
                          }}
                        />
                      </div>
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                      style={{ opacity: 0.6, animation: 'shimmer 2s ease-in-out infinite' }}
                    >
                      Crafting
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                      style={{ willChange: 'transform' }}
                      className={`min-w-[46px] min-h-[46px] w-[46px] h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-transform duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 relative group`}
                    >
                      {audioError ? (
                        <Volume2 className={theme.error} size={21} />
                      ) : isPlaying ? (
                        <>
                          <PulseGlowBars />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                            <Pause fill={GOLD.gold} size={14} />
                          </div>
                        </>
                      ) : (
                        <Volume2 className={GOLD.goldText} size={21} />
                      )}
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                      style={{ opacity: isPlaying ? 0.9 : 0.6 }}
                    >
                      {isPlaying ? 'Playing' : 'Listen'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={handleFetch}
                  disabled={isFetching}
                  aria-label="Discover new poem"
                  className={`discover-btn min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                >
                  {isFetching ? (
                    <Shuffle
                      className={`${GOLD.goldText}`}
                      size={21}
                      style={{ animation: 'discoverShuffle 0.4s ease-in-out infinite' }}
                    />
                  ) : (
                    <Shuffle className={`discover-icon ${GOLD.goldText}`} size={21} />
                  )}
                </button>
                <span
                  className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                  style={{ opacity: 0.6 }}
                >
                  Discover
                </span>
              </div>

              <div
                ref={poetPickerRef}
                className="relative flex flex-col items-center gap-0.5 min-w-[52px]"
              >
                <button
                  onClick={() => {
                    if (poetPickerOpen) {
                      closePoetPicker();
                    } else {
                      setPoetPickerOpen(true);
                    }
                  }}
                  aria-label="Filter by poet"
                  className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${poetPickerOpen ? 'bg-[#C5A059]/10' : ''}`}
                >
                  <ScrollText className={GOLD.goldText} size={21} />
                </button>
                <span
                  className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                  style={{ opacity: 0.6 }}
                >
                  Poets
                </span>
                {(poetPickerOpen || poetPickerClosing) && (
                  <div
                    className="absolute bottom-full mb-2 left-1/2 w-auto min-w-[10rem] rounded-2xl border border-[#C5A059]/25 bg-black/95 backdrop-blur-2xl shadow-2xl py-2.5 z-[200]"
                    style={{
                      animation: poetPickerClosing
                        ? 'poetPickerOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                        : 'poetPickerIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}
                  >
                    <div className="px-4 pb-2 mb-1 border-b border-[#C5A059]/15">
                      <span className="text-[10px] font-brand-en uppercase tracking-widest text-[#C5A059]/50 font-bold">
                        Filter by Poet
                      </span>
                    </div>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          closePoetPicker();
                        }}
                        className={`w-full text-right px-5 py-2.5 transition-all duration-150 ${selectedCategory === cat.id ? 'bg-[#C5A059]/15 border-r-2 border-[#C5A059]' : 'hover:bg-[#C5A059]/8 border-r-2 border-transparent'}`}
                      >
                        <span
                          className={`block text-[17px] ${selectedCategory === cat.id ? 'text-[#C5A059]' : 'text-stone-300'}`}
                          dir="rtl"
                          style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 500 }}
                        >
                          {cat.labelAr}
                        </span>
                        <span
                          className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === cat.id ? 'text-[#C5A059]/70' : 'opacity-40'}`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    ))}
                    <div className="mt-1 pt-1 border-t border-[#C5A059]/10 px-5 py-2">
                      <span className="block text-[10px] font-brand-en text-stone-600 italic">
                        Poet Explorer — coming soon
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <SavePoemButton
                poem={current}
                isSaved={isPoemSaved(current)}
                onSave={handleSavePoem}
                onUnsave={handleUnsavePoem}
                disabled={!user}
                onSignIn={(msg) => {
                  setAuthModalMessage(msg);
                  setShowAuthModal(true);
                }}
              />

              <DownvoteButton
                poem={current}
                isDownvoted={isPoemDownvoted(current)}
                onDownvote={handleDownvote}
                onUndownvote={handleUndownvote}
                disabled={!user}
                onSignIn={(msg) => {
                  setAuthModalMessage(msg);
                  setShowAuthModal(true);
                }}
              />
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div
            className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}
          >
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <div className="flex items-center justify-between">
                <h3 className="font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] text-indigo-600 tracking-tight">
                  Poetic Insight
                </h3>
                {selectedCategory !== 'All' && (
                  <span
                    key={selectedCategory}
                    className="font-amiri text-[11px] px-2.5 py-0.5 rounded-full border border-[#C5A059]/25 text-[#C5A059]/80 bg-[#C5A059]/5"
                    style={{ animation: 'fadeIn 0.3s ease-out' }}
                  >
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.labelAr}
                  </span>
                )}
              </div>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate mt-1">
                {current?.poet} • {current?.title}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isInterpreting ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse">
                  <Sparkles className="animate-spin text-indigo-500" size={32} />
                  <p className="font-brand-en italic text-[clamp(0.875rem,1.5vw,1rem)]">
                    Consulting Diwan...
                  </p>
                </div>
              ) : (
                <div className={DESIGN.paneSpacing}>
                  {!interpretation && (
                    <button
                      onClick={handleAnalyze}
                      className={`group relative w-full py-4 border ${theme.brandBorder} ${theme.brand} rounded-full font-brand-en tracking-widest text-[10px] uppercase hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-3 overflow-hidden bg-indigo-500/5`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-[spin_8s_linear_infinite]" />
                      <Sparkles size={12} /> Seek Insight
                    </button>
                  )}
                  {showTranslation && (
                    <p
                      className={`font-brand-en italic whitespace-pre-wrap ${DESIGN.paneVerseSize} ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}
                    >
                      {insightParts?.poeticTranslation || current?.english}
                    </p>
                  )}
                  {insightParts?.depth && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                        The Depth
                      </h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                          {insightParts.depth}
                        </p>
                      </div>
                    </div>
                  )}
                  {insightParts?.author && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                        The Author
                      </h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                          {insightParts.author}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights Drawer (Mobile bottom sheet) */}
      <InsightsDrawer
        isOpen={insightsDrawerOpen}
        onClose={() => setInsightsDrawerOpen(false)}
        isInterpreting={isInterpreting}
        insightParts={insightParts}
        interpretation={interpretation}
        showTranslation={showTranslation}
        current={current}
        theme={theme}
        darkMode={darkMode}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthModalMessage('');
        }}
        onSignInWithGoogle={handleSignInWithGoogle}
        theme={theme}
        message={authModalMessage}
      />

      {/* Saved Poems View */}
      <SavedPoemsView
        isOpen={showSavedPoems}
        onClose={() => setShowSavedPoems(false)}
        savedPoems={savedPoems}
        onSelectPoem={handleSelectSavedPoem}
        onUnsavePoem={handleUnsavePoemFromList}
        theme={theme}
        currentFontClass={currentFontClass}
      />

      {/* Design Review - small button above bug button */}
      <a
        href="/design-review"
        className="fixed z-[200] w-[44px] h-[44px] flex items-center justify-center no-underline"
        style={{ left: 16, bottom: 60 }}
        title="Design Review"
        aria-label="Open design review"
      >
        <span
          className={`relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
            darkMode
              ? 'bg-stone-900/60 border border-[#C5A059]/20 text-stone-500 hover:text-[#C5A059] hover:border-[#C5A059]/40'
              : 'bg-white/50 border border-[#8B7355]/20 text-stone-400 hover:text-[#8B7355] hover:border-[#8B7355]/40'
          } backdrop-blur-md`}
        >
          <Paintbrush size={9} />
        </span>
      </a>

      {/* Vertical Sidebar - always visible */}
      <VerticalSidebar
        onExplain={() => {
          if (interpretation) {
            // Already have insight — toggle drawer open/closed
            setInsightsDrawerOpen((prev) => !prev);
            setShowInsightSuccess(true);
            setTimeout(() => setShowInsightSuccess(false), 1500);
          } else {
            // No insight yet — fetch and open drawer
            handleAnalyze();
            setInsightsDrawerOpen(true);
          }
        }}
        onCopy={handleCopy}
        showCopySuccess={showCopySuccess}
        onShare={handleShare}
        showShareSuccess={showShareSuccess}
        showInsightSuccess={showInsightSuccess}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        user={user}
        theme={theme}
        isInterpreting={isInterpreting}
        interpretation={interpretation}
        showTranslation={showTranslation}
        onToggleTranslation={() => {
          setShowTranslation((prev) => !prev);
          if (!interpretation && !isInterpreting) handleAnalyze();
        }}
        showTransliteration={showTransliteration}
        onToggleTransliteration={() => setShowTransliteration((prev) => !prev)}
        textSizeLabel={TEXT_SIZES[textSizeLevel].label}
        onCycleTextSize={cycleTextSize}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleTheme}
        currentFont={currentFont}
        onCycleFont={cycleFont}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        showDebugLogs={showDebugLogs}
        onToggleDebugLogs={() => setShowDebugLogs((prev) => !prev)}
      />

      {/* Splash / Onboarding Screen */}
      <SplashScreen
        isOpen={showSplash}
        onDismiss={() => {
          setShowSplash(false);
          try {
            localStorage.setItem('hasSeenOnboarding', 'true');
          } catch {}
        }}
        showOnboarding={showOnboarding}
        theme={theme}
      />

      {/* Keyboard Shortcut Help */}
      <ShortcutHelp
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        theme={theme}
      />
    </div>
  );
}
