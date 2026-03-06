import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, RefreshCw, Volume2, ChevronDown, Quote, Globe, Moon, Sun, Loader2, ChevronRight, ChevronLeft, Search, X, Copy, LayoutGrid, Check, Bug, Trash2, Sparkles, PenTool, Library, Compass, Rabbit, MoreHorizontal, Heart, LogIn, LogOut, User, Settings2 } from 'lucide-react';
import { useAuth, useUserSettings, useSavedPoems } from './hooks/useAuth';
import { INSIGHTS_SYSTEM_PROMPT, DISCOVERY_SYSTEM_PROMPT, getTTSInstruction } from './prompts';

/* =============================================================================
  1. FEATURE FLAGS & DESIGN SYSTEM
  =============================================================================
*/

const FEATURES = {
  grounding: false,
  debug: import.meta.env.DEV,
  logging: true,      // Emit structured logs to console (captured by Vercel/browser)
  caching: true,      // Enable IndexedDB caching for audio/insights
  streaming: true,    // Enable streaming insights (progressive rendering)
  prefetching: true,  // Enable smart prefetching (rate-limited to avoid API issues)
  database: true      // Enable database poem source (requires backend server running)
};

const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-8 pb-1',
  mainTagSize: 'text-[11px]',
  mainTitleSize: 'text-[clamp(1.875rem,3.5vw,2.25rem)]', // 30px-36px (updated from text-3xl md:text-4xl)
  mainSubtitleSize: 'text-[clamp(10px,1.2vw,14px)]', // 10px-14px (updated from text-sm)
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-[clamp(1rem,1.8vw,1.125rem)]', // 16px-18px for insight panel
  glass: 'backdrop-blur-2xl',
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
    glass: 'bg-stone-900/60',
    border: 'border-stone-800',
    shadow: 'shadow-black/60',
    pill: 'bg-stone-900/40 border-stone-700/50',
    glow: 'from-indigo-600/30 via-purple-600/15 to-transparent',
    brand: 'text-indigo-400',
    brandBg: 'bg-indigo-500/10',
    brandBorder: 'border-indigo-500/20',
    btnPrimary: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40', 
    titleColor: 'text-[#C5A059]', // Antique Gold
    poetColor: 'text-[#C5A059]', // Unified Gold
    controlIcon: 'text-stone-300 hover:text-white'
  },
  light: {
    bg: 'bg-[#FDFCF8]',
    text: 'text-stone-800',
    accent: 'text-indigo-600',
    glass: 'bg-white/70',
    border: 'border-white/80',
    shadow: 'shadow-indigo-100/50',
    pill: 'bg-white/40 border-white/60',
    glow: 'from-indigo-500/15 via-purple-500/10 to-transparent',
    brand: 'text-indigo-600',
    brandBg: 'bg-indigo-500/5',
    brandBorder: 'border-indigo-500/10',
    btnPrimary: 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-200',
    titleColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    poetColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    controlIcon: 'text-indigo-950/90 hover:text-black'
  }
};

const CATEGORIES = [
  { id: "All", label: "All Poets", labelAr: "كل الشعراء" },
  { id: "Nizar Qabbani", label: "Nizar Qabbani", labelAr: "نزار قباني" },
  { id: "Mahmoud Darwish", label: "Mahmoud Darwish", labelAr: "محمود درويش" },
  { id: "Al-Mutanabbi", label: "Al-Mutanabbi", labelAr: "المتنبي" },
  { id: "Antarah", label: "Antarah", labelAr: "عنترة بن شداد" },
  { id: "Ibn Arabi", label: "Ibn Arabi", labelAr: "ابن عربي" }
];

const FONTS = [
  { id: "Amiri", label: "Amiri", labelAr: "أميري", family: "font-amiri" },
  { id: "Alexandria", label: "Alexandria", labelAr: "الإسكندرية", family: "font-alexandria" },
  { id: "El Messiri", label: "El Messiri", labelAr: "المسيري", family: "font-messiri" },
  { id: "Lalezar", label: "Lalezar", labelAr: "لاله‌زار", family: "font-lalezar" },
  { id: "Rakkas", label: "Rakkas", labelAr: "رقاص", family: "font-rakkas" },
  { id: "Fustat", label: "Fustat", labelAr: "فسطاط", family: "font-fustat" },
  { id: "Kufam", label: "Kufam", labelAr: "كوفام", family: "font-kufam" },
  { id: "Katibeh", label: "Katibeh", labelAr: "كاتبة", family: "font-katibeh" }
];

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  tts: 'gemini-2.5-flash-preview-tts',
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
const discoverTextModels = async (apiKey, addLog) => {
  if (_discoveredTextModels) return _discoveredTextModels;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { models = [] } = await res.json();
    const ranked = models
      .filter(m =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        typeof m.name === 'string' &&
        m.name.includes('gemini') &&
        !m.name.includes('embedding') &&
        !m.name.includes('tts')
      )
      .map(m => {
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
      .map(m => m.id);
    if (ranked.length > 0) {
      _discoveredTextModels = ranked;
      if (addLog) addLog('Model Discovery', `${ranked.length} models ranked: ${ranked.slice(0, 3).join(', ')}`, 'info');
      return _discoveredTextModels;
    }
  } catch (err) {
    if (addLog) addLog('Model Discovery', `ListModels unavailable: ${err.message} — using defaults`, 'warning');
  }
  _discoveredTextModels = [...API_MODELS.textDefaults];
  return _discoveredTextModels;
};

/**
 * Fetch from a Gemini text endpoint with automatic model fallback.
 * Uses the dynamically discovered model list (ranked newest/cheapest first).
 * Retries on HTTP 404/410 (model unavailable/deprecated); throws immediately on other errors.
 *
 * @param {string}   endpoint - Gemini method segment, e.g. 'generateContent' or 'streamGenerateContent?alt=sse'
 * @param {string}   body     - Pre-serialised JSON request body
 * @param {string}   apiKey
 * @param {string}   label    - Human-readable prefix for the thrown error message
 * @param {Function} addLog   - Component logging helper
 * @returns {Promise<Response>} Resolved Response with ok === true
 */
const geminiTextFetch = async (endpoint, body, apiKey, label, addLog) => {
  const models = await discoverTextModels(apiKey, addLog);
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) addLog("Model Fallback", `Trying fallback: ${model}`, "warning");
    // If endpoint already has a query string (e.g. ?alt=sse) append &key, otherwise ?key
    const sep = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}${sep}key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );
    if (res.ok) {
      if (i > 0) addLog("Model Fallback", `✓ Using fallback model: ${model}`, "success");
      return res;
    }
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${res.status}`;
    // Only retry on model-unavailable HTTP codes: 404 Not Found, 410 Gone (deprecated)
    if ((res.status !== 404 && res.status !== 410) || i === models.length - 1) {
      throw new Error(`${label}: ${errMsg}`);
    }
    addLog("Model Fallback", `${model} not available, trying next...`, "warning");
  }
};

/**
 * TTS Voice Configuration
 */
const TTS_CONFIG = {
  voiceName: 'Fenrir',
  responseModalities: ['AUDIO']
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
    poems: 'poems-cache'
  },
  expiry: {
    audio: 7 * 24 * 60 * 60 * 1000,      // 7 days
    insights: 30 * 24 * 60 * 60 * 1000,  // 30 days
    poems: null                           // Never expire
  },
  maxSize: 500 * 1024 * 1024 // 500MB
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
          const expiryTime = storeName === CACHE_CONFIG.stores.audio
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
          ...data
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
  }
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
        if (addLog) addLog("Prefetch Audio", `Already generating audio for poem ${poemId} - skipping`, "info");
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, poemId);
      if (cached?.blob) {
        if (addLog) addLog("Prefetch Audio", `Audio already cached for poem ${poemId} - skipping`, "info");
        return;
      }

      // Mark as in-flight
      if (activeRequests) activeRequests.current.add(poemId);

      // Generate audio using same logic as togglePlay
      const mood = poem?.tags?.[1] || "Poetic";
      const era = poem?.tags?.[0] || "Classical";
      const poet = poem?.poet || "the Master Poet";
      const ttsInstruction = getTTSInstruction(poem, poet, mood, era);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      if (!apiKey) return;

      const requestSize = new Blob([
        JSON.stringify({ contents: [{ parts: [{ text: ttsInstruction }] }] })
      ]).size;
      const estimatedTokens = Math.ceil(ttsInstruction.length / 4);

      if (addLog) {
        addLog(
          "Prefetch Audio",
          `→ Background audio generation (poem ${poemId}) | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedTokens} tokens`,
          "info"
        );
      }

      const apiStart = performance.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.tts}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: ttsInstruction }] }],
          generationConfig: {
            responseModalities: TTS_CONFIG.responseModalities,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName }
              }
            }
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (addLog) addLog("Prefetch Audio", `❌ Audio generation HTTP ${res.status}: ${errorText.substring(0, 150)}`, "error");
        return;
      }

      const data = await res.json();
      const apiTime = performance.now() - apiStart;
      if (!data.candidates || data.candidates.length === 0) {
        if (addLog) addLog("Prefetch Audio", `❌ Audio generation failed for poem ${poemId}. Response: ${JSON.stringify(data).substring(0, 200)}`, "error");
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
            const s = (o, str) => { for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i)); };
            s(0, 'RIFF'); wavView.setUint32(4, 36 + samples.length * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
            wavView.setUint32(16, 16, true); wavView.setUint16(20, 1, true); wavView.setUint16(22, 1, true);
            wavView.setUint32(24, rate, true); wavView.setUint32(28, rate * 2, true); wavView.setUint16(32, 2, true);
            wavView.setUint16(34, 16, true); s(36, 'data'); wavView.setUint32(40, samples.length * 2, true);
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
            metadata: { poet: poem.poet, title: poem.title, size: blob.size, duration: audioDuration }
          });

          if (addLog) addLog("Prefetch Audio", `✓ Audio cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${(blob.size / 1024).toFixed(1)}KB | ${audioDuration.toFixed(1)}s audio | ${tokensPerSecond} tok/s`, "success");
        }
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog) addLog("Prefetch Audio", `❌ Audio generation error for poem ${poemId}: ${error.message}`, "error");
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
        if (addLog) addLog("Prefetch Insights", `Already generating insights for poem ${poemId} - skipping`, "info");
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, poemId);
      if (cached?.interpretation) {
        if (addLog) addLog("Prefetch Insights", `Insights already cached for poem ${poemId} - skipping`, "info");
        return;
      }

      // Mark as in-flight
      if (activeRequests) activeRequests.current.add(poemId);

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      if (!apiKey) return;

      const promptText = `Deep Analysis of: ${poem.arabic}`;
      const requestSize = new Blob([
        JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      ]).size;
      const estimatedInputTokens = Math.ceil(
        (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
      );

      if (addLog) {
        addLog(
          "Prefetch Insights",
          `→ Background insights generation (poem ${poemId}) | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedInputTokens} tokens`,
          "info"
        );
      }

      const apiStart = performance.now();
      const prefetchBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
      });
      const res = await geminiTextFetch('generateContent', prefetchBody, apiKey, 'Prefetch Insights', addLog);

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
          metadata: { poet: poem.poet, title: poem.title, charCount, tokens: estimatedTokens }
        });

        if (addLog) addLog("Prefetch Insights", `✓ Insights cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s`, "success");
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog) addLog("Prefetch Insights", `❌ Insights generation error for poem ${poemId}: ${error.message}`, "error");
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
    if (!category || category === "All") return;

    try {
      if (addLog) addLog("Prefetch", `Pre-fetching ${count} poems from ${category}...`, "info");
      // Placeholder - would fetch poems from discover API and cache
    } catch (error) {
      if (addLog) addLog("Prefetch", `Discover prefetch error: ${error.message}`, "error");
    }
  }
};

/* =============================================================================
  5. UTILITY COMPONENTS
  =============================================================================
*/

const MysticalConsultationEffect = ({ active, theme }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-1000">
      <div className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-125 opacity-80`} />
      <div className={`absolute inset-0 bg-radial-gradient from-purple-500/20 to-transparent animate-ping scale-150 opacity-30`} style={{ animationDuration: '3s' }} />
      <div className="absolute inset-0">
        {[...Array(45)].map((_, i) => (
          <div key={i} className="absolute bg-indigo-200 rounded-full animate-pulse" style={{
              width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2, animationDuration: Math.random() * 1 + 0.5 + 's'
          }} />
        ))}
      </div>
    </div>
  );
};

const DebugPanel = ({ logs, onClear, darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (logs.length > 0 && logs[logs.length - 1].type === 'error') {
      setIsExpanded(true);
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!FEATURES.debug) return null;

  return (
    <div className={`w-full max-w-full transition-all duration-300 ${isExpanded ? 'h-48 md:h-64' : 'h-7'} overflow-hidden border-b ${
      darkMode ? 'bg-black/60 border-stone-800 text-stone-300' : 'bg-white/60 border-stone-200 text-stone-700'
    } backdrop-blur-md shadow-lg flex flex-col relative z-[100] flex-none`}>
      <div className="flex items-center justify-between px-6 h-7 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60 text-indigo-500 leading-none h-full">
          <Bug size={10} className="mb-0" /> <span>System Logs</span> <span className="ml-1 opacity-40">({logs.length})</span>
        </div>
        <div className="flex items-center gap-3 h-full">
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1 hover:text-red-500 transition-colors flex items-center"><Trash2 size={10} /></button>
          <ChevronDown size={10} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-3 font-mono text-[10px] space-y-1 custom-scrollbar">
        {logs.map((log, idx) => (
          <div key={idx} className={`pb-1 border-b border-stone-500/5 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-indigo-400' : ''}`}>
            <span className="opacity-40">[{log.time}]</span> <span className="font-bold">{log.label}:</span> {log.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryPill = ({ selected, onSelect, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentCat = CATEGORIES.find(c => c.id === selected) || CATEGORIES[0];
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const theme = darkMode ? THEME.dark : THEME.light;

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="Select poet category"
      >
        <Library size={21} className="text-[#C5A059]" />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Poets</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[220px] bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { onSelect(cat.id); setIsOpen(false); }}
              className={`w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center border-b border-[rgba(197,160,89,0.08)] last:border-b-0 hover:bg-[rgba(197,160,89,0.08)] ${selected === cat.id ? 'bg-[rgba(197,160,89,0.12)]' : ''}`}
            >
              <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">{cat.labelAr}</div>
              <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{cat.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ThemeDropdown = ({ darkMode, onToggleDarkMode, currentFont, onCycleFont, fonts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const handleCycleFont = () => {
    onCycleFont();
    setIsOpen(false);
  };

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="Theme options"
      >
        {darkMode ? <Sun size={21} className="text-[#C5A059]" /> : <Moon size={21} className="text-[#C5A059]" />}
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Theme</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[200px] bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          <button
            onClick={handleCycleFont}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">تبديل الخط</div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Cycle Font: {currentFont}</div>
          </button>
          <button
            onClick={handleToggleDarkMode}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{darkMode ? 'Light Mode' : 'Dark Mode'}</div>
          </button>
        </div>
      )}
    </div>
  );
};

const ErrorBanner = ({ error, onDismiss, onRetry, theme }) => {
  if (!error) return null;

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] ${DESIGN.anim}`}>
      <div className={`${DESIGN.glass} ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 shadow-2xl`}>
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

const DatabaseToggle = ({ useDatabase, onToggle }) => {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px]">
      <button
        onClick={onToggle}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label={useDatabase ? "Switch to AI Mode" : "Switch to Database Mode"}
      >
        {useDatabase ? <Library size={21} className="text-[#C5A059]" /> : <Sparkles size={21} className="text-[#C5A059]" />}
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">
        {useDatabase ? 'Local' : 'Web'}
      </span>
    </div>
  );
};

const OverflowMenu = ({
  darkMode,
  onToggleDarkMode,
  currentFont,
  onSelectFont,
  selectedCategory,
  onSelectCategory,
  onCopy,
  showCopySuccess,
  useDatabase,
  onToggleDatabase,
  user,
  onOpenSavedPoems,
  onOpenSettings,
  onSignIn,
  onSignOut,
  isSupabaseConfigured
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSubmenuOpen, setFontSubmenuOpen] = useState(false);
  const [poetSubmenuOpen, setPoetSubmenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Theme-aware tokens
  const gold = darkMode ? '#C5A059' : '#8B7355';
  const goldHoverClass = darkMode ? 'hover:bg-[rgba(197,160,89,0.08)]' : 'hover:bg-[rgba(139,115,85,0.08)]';
  const goldActiveClass = darkMode ? 'bg-[rgba(197,160,89,0.15)]' : 'bg-[rgba(139,115,85,0.12)]';
  const divider = darkMode ? 'border-[rgba(197,160,89,0.08)]' : 'border-[rgba(139,115,85,0.12)]';
  // Dark: slightly lighter than the near-black menu bg; Light: warm tinted inset
  const submenuBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(139,115,85,0.07)';

  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setFontSubmenuOpen(false);
        setPoetSubmenuOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const handleCopy = () => {
    onCopy();
    setIsOpen(false);
  };

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setIsOpen(false);
  };

  const handleSelectCategory = (catId) => {
    onSelectCategory(catId);
    setPoetSubmenuOpen(false);
    setIsOpen(false);
  };

  const handleSelectFont = (fontId) => {
    onSelectFont(fontId);
    setFontSubmenuOpen(false);
    setIsOpen(false);
  };

  const handleToggleDatabase = () => {
    onToggleDatabase();
    setIsOpen(false);
  };

  const itemClass = `w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b ${divider} ${goldHoverClass}`;

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:scale-105 ${goldHoverClass}`}
        aria-label="More options"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={21} style={{ color: gold }} />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap" style={{ color: gold }}>More</span>

      {isOpen && (
        <div
          className="absolute bottom-full right-[-20px] mb-3 min-w-[220px] max-h-[80vh] overflow-y-auto custom-scrollbar backdrop-blur-[48px] rounded-3xl p-3 z-50"
          style={{
            background: darkMode ? 'rgba(20,18,16,0.98)' : 'rgba(255,252,248,0.98)',
            border: `1px solid ${darkMode ? 'rgba(197,160,89,0.15)' : 'rgba(139,115,85,0.18)'}`,
            boxShadow: darkMode
              ? '0 -10px 40px rgba(0,0,0,0.7)'
              : '0 -2px 12px rgba(139,115,85,0.10), 0 -6px 24px rgba(139,115,85,0.07), 0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <button onClick={handleCopy} className={itemClass}>
            {showCopySuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} style={{ color: gold }} />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base font-medium" style={{ color: gold }}>نسخ</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Copy</div>
            </div>
          </button>

          <button onClick={handleToggleDatabase} className={itemClass}>
            {useDatabase ? <Library size={18} style={{ color: gold }} /> : <Sparkles size={18} style={{ color: gold }} />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base font-medium" style={{ color: gold }}>{useDatabase ? 'قاعدة البيانات' : 'الذكاء الاصطناعي'}</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{useDatabase ? 'Local Database' : 'AI Generated'}</div>
            </div>
          </button>

          <button onClick={handleToggleDarkMode} className={itemClass}>
            {darkMode ? <Sun size={18} style={{ color: gold }} /> : <Moon size={18} style={{ color: gold }} />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base font-medium" style={{ color: gold }}>{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Theme</div>
            </div>
          </button>

          {/* Font accordion */}
          <div className={`border-b ${divider}`}>
            <button
              onClick={() => { setFontSubmenuOpen(!fontSubmenuOpen); setPoetSubmenuOpen(false); }}
              className={`w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 ${fontSubmenuOpen ? '' : goldHoverClass}`}
              aria-expanded={fontSubmenuOpen}
            >
              <PenTool size={18} style={{ color: gold }} />
              <div className="flex flex-col items-start flex-1">
                <div className="font-amiri text-base font-medium" style={{ color: gold }}>اختيار الخط</div>
                <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Font: {currentFont}</div>
              </div>
              <ChevronDown size={14} style={{ color: gold }} className={`transition-transform duration-200 ${fontSubmenuOpen ? 'rotate-180' : 'opacity-50'}`} />
            </button>
            {fontSubmenuOpen && (
              <div
                className="pt-1 pb-2 px-1 mx-2 mb-2 mt-0.5 rounded-xl"
                style={{ background: submenuBg, border: `1px solid ${darkMode ? 'rgba(197,160,89,0.10)' : 'rgba(139,115,85,0.14)'}` }}
              >
                {FONTS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => handleSelectFont(font.id)}
                    className={`w-full p-[8px_12px] cursor-pointer rounded-lg transition-all duration-200 flex items-center gap-3 mb-0.5 ${currentFont === font.id ? goldActiveClass : goldHoverClass}`}
                  >
                    <div className="flex flex-col items-start flex-1">
                      <div className={`${font.family} text-sm font-medium`} style={{ color: gold }} dir="rtl">{font.labelAr}</div>
                      <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-40 text-[#a8a29e]">{font.label}</div>
                    </div>
                    {currentFont === font.id && <Check size={13} style={{ color: gold }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSupabaseConfigured && !user && (
            <button
              onClick={() => { onSignIn(); setIsOpen(false); }}
              className={itemClass}
            >
              <LogIn size={18} style={{ color: gold }} />
              <div className="flex flex-col items-start">
                <div className="font-amiri text-base font-medium" style={{ color: gold }}>تسجيل الدخول</div>
                <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Sign In</div>
              </div>
            </button>
          )}

          {user && (
            <>
              <button
                onClick={() => { onOpenSavedPoems(); setIsOpen(false); }}
                className={itemClass}
              >
                <BookOpen size={18} style={{ color: gold }} />
                <div className="flex flex-col items-start">
                  <div className="font-amiri text-base font-medium" style={{ color: gold }}>قصائدي</div>
                  <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">My Poems</div>
                </div>
              </button>
              <button
                onClick={() => { onOpenSettings(); setIsOpen(false); }}
                className={itemClass}
              >
                <Settings2 size={18} style={{ color: gold }} />
                <div className="flex flex-col items-start">
                  <div className="font-amiri text-base font-medium" style={{ color: gold }}>الإعدادات</div>
                  <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Settings</div>
                </div>
              </button>
              <button
                onClick={() => { onSignOut(); setIsOpen(false); }}
                className={itemClass}
              >
                <LogOut size={18} style={{ color: gold }} />
                <div className="flex flex-col items-start">
                  <div className="font-amiri text-base font-medium" style={{ color: gold }}>تسجيل الخروج</div>
                  <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Sign Out</div>
                </div>
              </button>
            </>
          )}

          {/* Poet accordion */}
          <div>
            <button
              onClick={() => { setPoetSubmenuOpen(!poetSubmenuOpen); setFontSubmenuOpen(false); }}
              className={`w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 ${poetSubmenuOpen ? '' : goldHoverClass}`}
              aria-expanded={poetSubmenuOpen}
            >
              <Library size={18} style={{ color: gold }} />
              <div className="flex flex-col items-start flex-1">
                <div className="font-amiri text-base font-medium" style={{ color: gold }}>اختيار الشاعر</div>
                <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Poet: {CATEGORIES.find(c => c.id === selectedCategory)?.label || 'All'}</div>
              </div>
              <ChevronDown size={14} style={{ color: gold }} className={`transition-transform duration-200 ${poetSubmenuOpen ? 'rotate-180' : 'opacity-50'}`} />
            </button>
            {poetSubmenuOpen && (
              <div
                className="pt-1 pb-2 px-1 mx-2 mb-2 mt-0.5 rounded-xl"
                style={{ background: submenuBg, border: `1px solid ${darkMode ? 'rgba(197,160,89,0.10)' : 'rgba(139,115,85,0.14)'}` }}
              >
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full p-[8px_12px] cursor-pointer rounded-lg transition-all duration-200 flex items-center gap-3 mb-0.5 ${selectedCategory === cat.id ? goldActiveClass : goldHoverClass}`}
                  >
                    <div className="flex flex-col items-start flex-1">
                      <div className="font-amiri text-sm font-medium" style={{ color: gold }}>{cat.labelAr}</div>
                      <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-40 text-[#a8a29e]">{cat.label}</div>
                    </div>
                    {selectedCategory === cat.id && <Check size={13} style={{ color: gold }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =============================================================================
  AUTH COMPONENTS
  =============================================================================
*/

const AuthModal = ({ isOpen, onClose, onSignInWithGoogle, onSignInWithApple, theme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-md ${theme.glass} ${theme.border} border ${DESIGN.radius} p-8 shadow-2xl`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={20} className={theme.text} />
        </button>

        <div className="text-center mb-8">
          <h2 className={`font-amiri text-3xl ${theme.titleColor} mb-2`}>مرحباً</h2>
          <p className={`font-brand-en text-sm ${theme.text} opacity-60`}>Sign in to save poems and preferences</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onSignInWithGoogle}
            className={`w-full py-3 px-4 ${theme.brandBg} ${theme.brandBorder} border ${DESIGN.radius} ${theme.brand} font-brand-en text-sm font-medium hover:bg-opacity-80 transition-all flex items-center justify-center gap-3`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={onSignInWithApple}
            className={`w-full py-3 px-4 ${theme.brandBg} ${theme.brandBorder} border ${DESIGN.radius} ${theme.brand} font-brand-en text-sm font-medium hover:bg-opacity-80 transition-all flex items-center justify-center gap-3`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className={`mt-6 text-center text-xs ${theme.text} opacity-40 font-brand-en`}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

const AuthButton = ({ user, onSignIn, onSignOut, onOpenSavedPoems, onOpenSettings, theme }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[56px]">
        <button
          onClick={onSignIn}
          className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
          aria-label="Sign In"
        >
          <LogIn size={21} className="text-[#C5A059]" />
        </button>
        <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">
          Sign In
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="User Menu"
      >
        {user.user_metadata?.avatar_url ? (
          <img 
            src={user.user_metadata.avatar_url} 
            alt="User avatar" 
            className="w-[21px] h-[21px] rounded-full object-cover"
          />
        ) : (
          <User size={21} className="text-[#C5A059]" />
        )}
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">
        Account
      </span>

      {showMenu && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 min-w-[200px] bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          <div className="px-4 py-3 border-b border-[rgba(197,160,89,0.08)]">
            <p className="font-brand-en text-xs text-[#C5A059] font-medium truncate">
              {user.email || user.user_metadata?.full_name || 'User'}
            </p>
          </div>
          <button
            onClick={() => {
              onOpenSavedPoems();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <BookOpen size={18} className="text-[#C5A059]" />
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">قصائدي</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">My Poems</div>
            </div>
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <Settings2 size={18} className="text-[#C5A059]" />
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">الإعدادات</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Settings</div>
            </div>
          </button>
          <button
            onClick={() => {
              onSignOut();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 hover:bg-[rgba(197,160,89,0.08)]"
          >
            <LogOut size={18} className="text-[#C5A059]" />
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">تسجيل الخروج</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Sign Out</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const SavePoemButton = ({ poem, isSaved, onSave, onUnsave, disabled }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (disabled) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

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
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label={isSaved ? "Unsave poem" : "Save poem"}
      >
        <Heart
          size={21}
          className={`${isSaved ? 'fill-red-500 text-red-500' : 'text-[#C5A059]'} transition-all`}
        />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">
        {isSaved ? 'Saved' : 'Save'}
      </span>

      {showTooltip && disabled && (
        <div className="absolute bottom-full mb-2 px-3 py-2 bg-stone-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          Sign in to save poems
        </div>
      )}
    </div>
  );
};

const SavedPoemsView = ({ isOpen, onClose, savedPoems, onSelectPoem, onUnsavePoem, theme, currentFontClass }) => {
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col ${theme.glass} ${theme.border} border ${DESIGN.radius} shadow-2xl`}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-500/10 flex-shrink-0">
          <div>
            <h2 className={`font-amiri text-2xl ${theme.titleColor}`}>قصائدي المحفوظة</h2>
            <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-1`}>My Saved Poems ({savedPoems.length})</p>
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
                <p className={`font-amiri text-xl ${theme.text} opacity-40`}>لا توجد قصائد محفوظة</p>
                <p className={`font-brand-en text-sm ${theme.text} opacity-30 mt-1`}>No saved poems yet</p>
                <p className={`font-brand-en text-xs ${theme.text} opacity-20 mt-3`}>Tap the heart icon on any poem to save it</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPoems.map((sp) => (
                <div
                  key={sp.id}
                  className={`group ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 transition-all hover:border-[#C5A059]/30`}
                >
                  <button
                    onClick={() => onSelectPoem(sp)}
                    className="w-full text-left cursor-pointer bg-transparent border-none p-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-amiri text-sm ${theme.titleColor} font-medium`}>{sp.poet || 'Unknown'}</p>
                        <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-0.5`}>{sp.title || ''}</p>
                        <p className={`${currentFontClass} text-sm ${theme.text} opacity-70 mt-2 line-clamp-2`} dir="rtl">
                          {(sp.poem_text || '').slice(0, 80)}{(sp.poem_text || '').length > 80 ? '...' : ''}
                        </p>
                      </div>
                    </div>
                    {sp.saved_at && (
                      <p className={`font-brand-en text-[10px] ${theme.text} opacity-30 mt-2`}>{formatDate(sp.saved_at)}</p>
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

const SettingsView = ({ isOpen, onClose, darkMode, onToggleDarkMode, currentFont, onSelectFont, user, theme }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col ${theme.glass} ${theme.border} border ${DESIGN.radius} shadow-2xl`}>
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-500/10 flex-shrink-0">
          <div>
            <h2 className={`font-amiri text-2xl ${theme.titleColor}`}>الإعدادات</h2>
            <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-1`}>Preferences</p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} className={theme.text} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {/* Theme Section */}
          <div>
            <div className="mb-3">
              <h3 className={`font-amiri text-lg ${theme.titleColor}`}>المظهر</h3>
              <p className={`font-brand-en text-[10px] uppercase tracking-[0.12em] ${theme.text} opacity-40`}>Appearance</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (!darkMode) onToggleDarkMode(); }}
                className={`p-4 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  darkMode
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : `${theme.border} bg-transparent hover:border-[#C5A059]/30`
                }`}
              >
                <Moon size={24} className={darkMode ? 'text-[#C5A059]' : `${theme.text} opacity-50`} />
                <div className="text-center">
                  <p className={`font-amiri text-sm ${darkMode ? 'text-[#C5A059]' : theme.text}`}>ليلي</p>
                  <p className={`font-brand-en text-[9px] uppercase tracking-[0.1em] ${theme.text} opacity-40`}>Dark</p>
                </div>
              </button>
              <button
                onClick={() => { if (darkMode) onToggleDarkMode(); }}
                className={`p-4 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  !darkMode
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : `${theme.border} bg-transparent hover:border-[#C5A059]/30`
                }`}
              >
                <Sun size={24} className={!darkMode ? 'text-[#C5A059]' : `${theme.text} opacity-50`} />
                <div className="text-center">
                  <p className={`font-amiri text-sm ${!darkMode ? 'text-[#C5A059]' : theme.text}`}>نهاري</p>
                  <p className={`font-brand-en text-[9px] uppercase tracking-[0.1em] ${theme.text} opacity-40`}>Light</p>
                </div>
              </button>
            </div>
          </div>

          {/* Font Section */}
          <div>
            <div className="mb-3">
              <h3 className={`font-amiri text-lg ${theme.titleColor}`}>الخط</h3>
              <p className={`font-brand-en text-[10px] uppercase tracking-[0.12em] ${theme.text} opacity-40`}>Typography</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onSelectFont(font.id)}
                  className={`p-3 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    currentFont === font.id
                      ? 'border-[#C5A059] bg-[#C5A059]/10'
                      : `${theme.border} bg-transparent hover:border-[#C5A059]/30`
                  }`}
                >
                  <p className={`${font.family} text-lg ${currentFont === font.id ? 'text-[#C5A059]' : theme.text}`} dir="rtl">
                    بسم الله
                  </p>
                  <div className="text-center">
                    <p className={`font-amiri text-xs ${theme.text} opacity-60`}>{font.labelAr}</p>
                    <p className={`font-brand-en text-[8px] uppercase tracking-[0.1em] ${theme.text} opacity-30`}>{font.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className={`pt-4 border-t border-stone-500/10`}>
              <p className={`font-brand-en text-xs ${theme.text} opacity-30 text-center`}>
                Signed in as {user.email || user.user_metadata?.full_name || 'User'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  6. MAIN APPLICATION
  =============================================================================
*/

export default function DiwanApp() {
  const mainScrollRef = useRef(null);
  const audioRef = useRef(new Audio());
  const controlBarRef = useRef(null);

  const [headerOpacity, setHeaderOpacity] = useState(1);
  const [poems, setPoems] = useState([{
    id: 1, poet: "Nizar Qabbani", poetArabic: "نزار قباني", title: "My Beloved", titleArabic: "حبيبتي",
    arabic: "حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة\nحُبُّكِ مِثْلَ المَوْتِ وَالوِلَادَة\nصَعْبٌ بِأَنْ يُعَادَ مَرَّتَيْنِ",
    english: "Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.\nYour love is like Death and like Birth—\nIt is difficult for it to be repeated twice.",
    tags: ["Modern", "Romantic", "Ghazal"]
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [darkMode, setDarkMode] = useState(true);
  const [currentFont, setCurrentFont] = useState("Amiri");
  const [useDatabase, setUseDatabase] = useState(FEATURES.database);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isOverflow, setIsOverflow] = useState(() => {
    // Use 660 as the conservative initial threshold (covers both Supabase and non-Supabase button sets).
    // The detectOverflow effect below will refine this after mount.
    const vw = window.visualViewport?.width ?? window.innerWidth;
    return vw < 660;
  });
  const [cacheStats, setCacheStats] = useState({ audioHits: 0, audioMisses: 0, insightsHits: 0, insightsMisses: 0 });
  const [isPrefetching, setIsPrefetching] = useState(false);
  const activeAudioRequests = useRef(new Set()); // Track in-flight audio generation requests
  const activeInsightRequests = useRef(new Set()); // Track in-flight insight generation requests
  const pollingIntervals = useRef([]); // Track all polling intervals for cleanup
  const pendingRafRef = useRef(null); // Track pending rAF id for overflow detection deduplication

  // Auth state
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut, isConfigured: isSupabaseConfigured } = useAuth();
  const { settings, saveSettings } = useUserSettings(user);
  const { savedPoems, savePoem, unsavePoem, isPoemSaved } = useSavedPoems(user);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedPoems, setShowSavedPoems] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const theme = darkMode ? THEME.dark : THEME.light;

  const currentFontClass = useMemo(() => {
    const font = FONTS.find(f => f.id === currentFont);
    return font ? font.family : FONTS[0].family;
  }, [currentFont]);

  const cycleFont = () => {
    const currentIdx = FONTS.findIndex(f => f.id === currentFont);
    const nextIdx = (currentIdx + 1) % FONTS.length;
    setCurrentFont(FONTS[nextIdx].id);
    addLog("Font", `Switched to ${FONTS[nextIdx].label}`, "info");
  };

  const filtered = useMemo(() => {
    const searchStr = selectedCategory.toLowerCase();
    return selectedCategory === "All" 
      ? poems 
      : poems.filter(p => {
          const poetMatch = (p?.poet || "").toLowerCase().includes(searchStr);
          const tagsMatch = Array.isArray(p?.tags) && p.tags.some(t => String(t).toLowerCase() === searchStr);
          return poetMatch || tagsMatch;
        });
  }, [poems, selectedCategory]);

  // Defensive: poems[0] is always truthy (hardcoded initial poem), but guard against
  // future changes that might empty the array (e.g., setPoems([]) or filter edge cases)
  const current = filtered[currentIndex] || filtered[0] || poems[0] || null;

  const addLog = (label, msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { label, msg: String(msg), type, time }]);
    if (FEATURES.logging) {
      const logFn = type === 'error' ? console.error : type === 'success' ? console.info : console.log;
      logFn(`[${label}] ${msg}`);
    }
  };

  useEffect(() => {
    if (selectedCategory !== "All" && filtered.length === 0) {
      handleFetch();
    } else {
      setCurrentIndex(0);
    }
  }, [selectedCategory]);

  // Eagerly populate the discovered model list so it's ready before any user action.
  // Using the default fetch mock in tests means this never consumes a mockResolvedValueOnce.
  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (key) discoverTextModels(key, addLog);
  }, []);

  useEffect(() => {
    // Threshold below which overflow mode is always active (prevents oscillation on narrow screens).
    // With Supabase buttons the bar is wider, so use a larger threshold.
    const narrowThreshold = isSupabaseConfigured ? 660 : 540;

    const scheduleDetect = () => {
      // Deduplicate: cancel any pending frame before scheduling a new one
      if (pendingRafRef.current !== null) cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        if (!controlBarRef.current) return;
        const bar = controlBarRef.current;
        const vw = window.visualViewport?.width ?? window.innerWidth;

        // Temporarily clip overflow so scrollWidth accurately reflects content width on iOS Safari,
        // where scrollWidth may equal clientWidth for flex containers with overflow:visible.
        const savedOverflow = bar.style.overflow;
        bar.style.overflow = 'hidden';
        const hasContentOverflow = bar.scrollWidth > bar.clientWidth;
        bar.style.overflow = savedOverflow;

        // Stay in overflow mode on narrow screens regardless of current bar width,
        // which prevents oscillation when the bar shrinks after switching to OverflowMenu.
        setIsOverflow(hasContentOverflow || vw < narrowThreshold);
      });
    };

    scheduleDetect();

    // ResizeObserver catches font-load changes and dynamic content updates.
    // Guard for environments where ResizeObserver is unavailable (older browsers, some test envs).
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleDetect);
      if (controlBarRef.current) resizeObserver.observe(controlBarRef.current);
    }

    window.addEventListener('resize', scheduleDetect);
    return () => {
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleDetect);
    };
  }, [isSupabaseConfigured]);

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
    if (!user || !isSupabaseConfigured) return;

    const timeoutId = setTimeout(() => {
      saveSettings({
        theme: darkMode ? 'dark' : 'light',
        font_id: currentFont,
      });
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [darkMode, currentFont, user, isSupabaseConfigured]);

  const handleScroll = (e) => {
    setHeaderOpacity(Math.max(0, 1 - e.target.scrollTop / 30));
  };

  const insightParts = useMemo(() => {
    if (!interpretation) return null;
    const parts = interpretation.split(/POEM:|THE DEPTH:|THE AUTHOR:/i).map(p => p.trim()).filter(Boolean);
    return { poeticTranslation: parts[0] || "", depth: parts[1] || "", author: parts[2] || "" };
  }, [interpretation]);

  const versePairs = useMemo(() => {
    const arLines = (current?.arabic || "").split('\n').filter(l => l.trim());
    const enSource = insightParts?.poeticTranslation || current?.english || "";
    const enLines = enSource.split('\n').filter(l => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || "", en: enLines[i] || "" });
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
      const s = (o, str) => { for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i)); };
      s(0, 'RIFF'); wavView.setUint32(4, 36 + samples.length * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
      wavView.setUint32(16, 16, true); wavView.setUint16(20, 1, true); wavView.setUint16(22, 1, true);
      wavView.setUint32(24, rate, true); wavView.setUint32(28, rate * 2, true); wavView.setUint16(32, 2, true);
      wavView.setUint16(34, 16, true); s(36, 'data'); wavView.setUint32(40, samples.length * 2, true);
      new Int16Array(wavBuf, 44).set(samples);
      return new Blob([wavBuf], { type: 'audio/wav' });
    } catch (e) {
      addLog("Audio Error", e.message, "error");
      return null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const togglePlay = async () => {
    addLog("UI Event", `🎵 Play button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`, "info");

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      addLog("UI Event", "⏸️ Pause button clicked", "info");
      return;
    }

    if (audioUrl) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        addLog("Audio", "Retrying playback...", "info");
        setAudioUrl(null);
        togglePlay();
      });
      return;
    }

    // Set loading state FIRST (before duplicate check) for better UX
    setIsGeneratingAudio(true);

    // Check if request already in flight - poll until it completes
    if (activeAudioRequests.current.has(current?.id)) {
      addLog("Audio", `Audio generation already in progress - waiting for completion`, "info");

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeAudioRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter(id => id !== pollInterval);

          // Request completed - check cache and play
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
          if (cached?.blob) {
            addLog("Audio", `✓ Background audio generation completed - playing from cache`, "success");
            const u = URL.createObjectURL(cached.blob);
            setAudioUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
              addLog("Audio", "Starting playback...", "info");
              setIsPlaying(true);
            });
          } else {
            addLog("Audio", `Background audio generation failed - retrying`, "info");
            // Retry the request
            setTimeout(() => togglePlay(), 100);
            return;
          }
          setIsGeneratingAudio(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some large poems take 40+ seconds)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter(id => id !== pollInterval);
        if (activeAudioRequests.current.has(current?.id)) {
          addLog("Audio", `Audio generation taking longer than expected - checking one more time...`, "info");

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
            if (finalCheck?.blob) {
              addLog("Audio", `✓ Audio completed after extended wait - playing now`, "success");
              const u = URL.createObjectURL(finalCheck.blob);
              setAudioUrl(u);
              audioRef.current.src = u;
              audioRef.current.load();
              audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
                addLog("Audio", "Starting playback...", "info");
                setIsPlaying(true);
              });
            } else {
              addLog("Audio", `Audio generation timeout - please try again`, "error");
            }
            activeAudioRequests.current.delete(current?.id);
            setIsGeneratingAudio(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      return;
    }

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.blob) {
        const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
        addLog("Audio Cache", `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | Size: ${sizeMB}MB | Instant playback`, "success");
        setCacheStats(prev => ({ ...prev, audioHits: prev.audioHits + 1 }));

        const u = URL.createObjectURL(cached.blob);
        setAudioUrl(u);
        audioRef.current.src = u;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
          addLog("Audio", "Starting cached playback...", "info");
          setIsPlaying(true);
        });
        setIsGeneratingAudio(false); // Clear loading state
        return;
      } else {
        addLog("Audio Cache", `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`, "info");
        setCacheStats(prev => ({ ...prev, audioMisses: prev.audioMisses + 1 }));
      }
    }

    // Mark request as in-flight
    activeAudioRequests.current.add(current?.id);

    const mood = current?.tags?.[1] || "Poetic";
    const era = current?.tags?.[0] || "Classical";
    const poet = current?.poet || "the Master Poet";
    const ttsInstruction = getTTSInstruction(current, poet, mood, era);

    // Calculate request metrics
    const requestSize = new Blob([
      JSON.stringify({ contents: [{ parts: [{ text: ttsInstruction }] }] })
    ]).size;
    const estimatedTokens = Math.ceil(ttsInstruction.length / 4);
    const instructionChars = ttsInstruction.length;
    const arabicTextChars = current?.arabic?.length || 0;

    addLog(
      "Audio API",
      `→ Starting generation | Request: ${(requestSize / 1024).toFixed(1)}KB | ${instructionChars} chars (${arabicTextChars} Arabic) | Est. ${estimatedTokens} tokens`,
      "info"
    );

    try {
      const apiStart = performance.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.tts}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: ttsInstruction }] }],
          generationConfig: {
            responseModalities: TTS_CONFIG.responseModalities,
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName }
              }
            }
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        addLog("Audio API Error", `HTTP ${res.status}: ${errorText.substring(0, 200)}`, "error");
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const apiTime = performance.now() - apiStart;

      if (!data.candidates || data.candidates.length === 0) {
        addLog("Audio API Error", `No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`, "error");
        throw new Error("Recitation failed - no audio candidates returned");
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

          addLog("Audio API", `✓ Complete | API: ${(apiTime / 1000).toFixed(2)}s | Convert: ${conversionTime.toFixed(0)}ms | Total: ${(totalTime / 1000).toFixed(2)}s`, "success");
          addLog("Audio Metrics", `Audio: ${audioDuration.toFixed(1)}s | Size: ${audioSizeKB}KB (${audioSizeMB}MB) | Speed: ${tokensPerSecond} tok/s`, "success");

          const u = URL.createObjectURL(blob);
          setAudioUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
             addLog("Audio", "Starting playback...", "info");
             setIsPlaying(true);
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
                duration: audioDuration
              }
            });
            const cacheTime = performance.now() - cacheStart;
            addLog("Audio Cache", `Audio cached for future playback (${cacheTime.toFixed(0)}ms) | Saves ${(apiTime / 1000).toFixed(1)}s on replay`, "success");
          }
        }
      }
    } catch (e) {
      addLog("Audio System Error", `${e.message} | Poem ID: ${current?.id}`, "error");
      setIsPlaying(false);
    } finally {
      setIsGeneratingAudio(false);
      activeAudioRequests.current.delete(current?.id); // Clean up in-flight tracking
    }
  };

  const handleAnalyze = async () => {
    addLog("UI Event", `🔍 Dive In button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`, "info");

    if (interpretation || isInterpreting) return;

    // Set loading state FIRST (before duplicate check) for better UX
    setIsInterpreting(true);

    // Check if request already in flight - poll until it completes
    if (activeInsightRequests.current.has(current?.id)) {
      addLog("Insights", `Insights generation already in progress - waiting for completion`, "info");

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeInsightRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter(id => id !== pollInterval);

          // Request completed - check cache and display
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
          if (cached?.interpretation) {
            addLog("Insights", `✓ Background insights generation completed - displaying results`, "success");
            setInterpretation(cached.interpretation);
          } else {
            addLog("Insights", `Background insights generation failed - retrying`, "info");
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
        pollingIntervals.current = pollingIntervals.current.filter(id => id !== pollInterval);
        if (activeInsightRequests.current.has(current?.id)) {
          addLog("Insights", `Insights generation taking longer than expected - checking one more time...`, "info");

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
            if (finalCheck?.interpretation) {
              addLog("Insights", `✓ Insights completed after extended wait - displaying now`, "success");
              setInterpretation(finalCheck.interpretation);
            } else {
              addLog("Insights", `Insights generation timeout - please try again`, "error");
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
        addLog("Insights Cache", `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | ${charCount} chars (≈${estTokens} tokens) | Instant load`, "success");
        setCacheStats(prev => ({ ...prev, insightsHits: prev.insightsHits + 1 }));
        setInterpretation(cached.interpretation);
        setIsInterpreting(false); // Clear loading state
        activeInsightRequests.current.delete(current?.id); // Clean up tracking
        return;
      } else {
        addLog("Insights Cache", `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`, "info");
        setCacheStats(prev => ({ ...prev, insightsMisses: prev.insightsMisses + 1 }));
      }
    }

    let insightText = "";

    try {
      // Guard: AI Insights require a Gemini API key
      if (!apiKey) {
        throw new Error("AI Insights require a Gemini API key. Add VITE_GEMINI_API_KEY to your environment to enable this feature.");
      }

      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        const poetInfo = current?.poet ? ` by ${current.poet}` : '';
        const promptText = `Deep Analysis of${poetInfo}:\n\n${current?.arabic}`;
        const requestSize = new Blob([
          JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        ]).size;
        const estimatedInputTokens = Math.ceil(
          (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = promptText.length;
        const arabicTextChars = current?.arabic?.length || 0;
        const systemPromptChars = INSIGHTS_SYSTEM_PROMPT.length;

        addLog(
          "Insights API",
          `→ Starting streaming | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars} chars (${arabicTextChars} Arabic + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          "info"
        );

        setInterpretation(""); // Clear previous interpretation
        const apiStart = performance.now();
        let firstChunkTime = null;
        let chunkCount = 0;

        const insightsStreamBody = JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
        });
        const res = await geminiTextFetch('streamGenerateContent?alt=sse', insightsStreamBody, apiKey, 'AI Insights failed', addLog);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  if (!firstChunkTime) {
                    firstChunkTime = performance.now() - apiStart;
                    addLog("Insights API", `← First chunk received (${firstChunkTime.toFixed(0)}ms) | Streaming...`, "info");
                  }
                  chunkCount++;
                  accumulatedText += text;
                  setInterpretation(accumulatedText); // Real-time UI update
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.debug("Skipping malformed chunk:", jsonStr);
              }
            }
          }
        }

        insightText = accumulatedText;
        const totalTime = performance.now() - apiStart;
        const charCount = insightText.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        const tokensPerSecond = (estimatedTokens / (totalTime / 1000)).toFixed(1);
        const avgChunkSize = charCount / chunkCount;

        addLog("Insights API", `✓ Streaming complete | Total: ${(totalTime / 1000).toFixed(2)}s | TTFT: ${(firstChunkTime / 1000).toFixed(2)}s | ${chunkCount} chunks`, "success");
        addLog("Insights Metrics", `${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s | Avg chunk: ${avgChunkSize.toFixed(0)} chars`, "success");
      } else {
        // Non-streaming fallback (original implementation)
        addLog("Insights", "Analyzing poem...", "info");
        const poetInfoFallback = current?.poet ? ` by ${current.poet}` : '';
        const insightsFallbackBody = JSON.stringify({
          contents: [{ parts: [{ text: `Deep Analysis of${poetInfoFallback}:\n\n${current?.arabic}` }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
        });
        const res = await geminiTextFetch('generateContent', insightsFallbackBody, apiKey, 'AI Insights failed', addLog);
        const data = await res.json();
        insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        setInterpretation(insightText);
        addLog("Insights", "Analysis complete", "success");
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
            tokens: Math.ceil(insightText.length / 4)
          }
        });
        const cacheTime = performance.now() - cacheStart;
        const savedTime = FEATURES.streaming ? (totalTime / 1000).toFixed(1) : "2-8";
        addLog("Insights Cache", `Insights cached for future use (${cacheTime.toFixed(0)}ms) | Saves ${savedTime}s on reload`, "success");
      }
    } catch (e) {
      addLog("Analysis Error", `${e.message} | Poem ID: ${current?.id}`, "error");
      // Show partial results if streaming was interrupted
      if (FEATURES.streaming && insightText) {
        addLog("Insights", "Showing partial results", "warning");
      }
    } finally {
      setIsInterpreting(false);
      activeInsightRequests.current.delete(current?.id); // Clean up in-flight tracking
    }
  };

  const handleFetch = async () => {
    addLog("UI Event", `🐰 Discover button clicked | Category: ${selectedCategory} | Source: ${useDatabase ? 'Database' : 'Gemini AI'}`, "info");

    if (isFetching) {
      addLog("Discovery", `Discovery already in progress - please wait`, "info");
      return;
    }

    setIsFetching(true);

    try {
      const apiStart = performance.now();

      // DATABASE MODE: Fetch from local PostgreSQL API
      if (useDatabase) {
        // Reset category to "All" before fetching so the new poem will be visible
        // without racing against the useEffect that resets currentIndex on category change
        if (selectedCategory !== "All") {
          setSelectedCategory("All");
        }

        addLog("Discovery DB", `→ Querying database | Category: ${selectedCategory}`, "info");

        const categoryObj = CATEGORIES.find(c => c.id === selectedCategory);
        const poetName = categoryObj?.labelAr || selectedCategory;
        const poetParam = selectedCategory !== "All" ? `?poet=${encodeURIComponent(poetName)}` : '';
        const url = `${apiUrl}/api/poems/random${poetParam}`;

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

          // Mark as database poem
          newPoem.isFromDatabase = true;

          const arabicPoemChars = newPoem?.arabic?.length || 0;

          addLog("Discovery DB", `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | DB ID: ${newPoem.id} | Arabic: ${arabicPoemChars} chars`, "success");
          addLog("Discovery DB", `Poet: ${newPoem.poet} | Title: ${newPoem.title}`, "success");

          setPoems(prev => {
            const updated = [...prev, newPoem];
            setCurrentIndex(updated.length - 1); // New poem is always last
            return updated;
          });
        } catch (dbError) {
          // Handle database-specific errors
          const errorMessage = dbError.message.includes('Failed to fetch')
            ? 'Backend server is not running. Please start it with: npm run dev:server'
            : dbError.message;

          addLog("Discovery DB Error", errorMessage, "error");
          throw dbError; // Re-throw to be caught by outer catch
        }

      } else {
        // GEMINI AI MODE: Original implementation
        if (!apiKey) {
          throw new Error("AI Discovery requires a Gemini API key. Add VITE_GEMINI_API_KEY to your environment, or switch to Local Database mode.");
        }

        const prompt = selectedCategory === "All"
          ? "Find a masterpiece Arabic poem. COMPLETE text."
          : `Find a famous poem by ${selectedCategory}. COMPLETE text.`;

        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: `${prompt} JSON only.` }] }],
          systemInstruction: { parts: [{ text: DISCOVERY_SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
        });

        const requestSize = new Blob([requestBody]).size;
        const estimatedInputTokens = Math.ceil(
          (prompt.length + DISCOVERY_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = prompt.length;
        const systemPromptChars = DISCOVERY_SYSTEM_PROMPT.length;

        addLog(
          "Discovery API",
          `→ Searching ${selectedCategory} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars + systemPromptChars} chars (${promptChars} prompt + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          "info"
        );

        const res = await geminiTextFetch('generateContent', requestBody, apiKey, 'AI Discovery failed', addLog);

        const data = await res.json();
        const apiTime = performance.now() - apiStart;

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleanJson = (rawText || "").replace(/```json|```/g, "").trim();
        let parsedPoem;
        try {
          parsedPoem = JSON.parse(cleanJson);
        } catch (firstError) {
          // Attempt to repair truncated JSON (e.g. poem exceeded output token limit)
          let repaired = cleanJson;
          const quotes = (repaired.match(/"/g) || []).length;
          if (quotes % 2 !== 0) repaired += '"';
          const opens = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
          for (let i = 0; i < openBrackets; i++) repaired += ']';
          for (let i = 0; i < opens; i++) repaired += '}';
          try {
            parsedPoem = JSON.parse(repaired);
            addLog("Discovery JSON", "Repaired truncated JSON from AI response", "warn");
          } catch {
            throw new Error("AI returned invalid JSON (poem may have been too long). Try again.");
          }
        }

        // Normalize tags: convert object to array if needed
        if (parsedPoem.tags && typeof parsedPoem.tags === 'object' && !Array.isArray(parsedPoem.tags)) {
          addLog("Discovery Tags", `Converting tags from object to array | Original: ${JSON.stringify(parsedPoem.tags)}`, "info");
          parsedPoem.tags = [
            parsedPoem.tags.Era || parsedPoem.tags.era || "Unknown",
            parsedPoem.tags.Mood || parsedPoem.tags.mood || "Unknown",
            parsedPoem.tags.Type || parsedPoem.tags.type || "Unknown"
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
          ? `[${newPoem.tags.join(", ")}]`
          : JSON.stringify(newPoem?.tags);
        addLog("Discovery Tags", `Type: ${tagsType} | Count: ${Array.isArray(newPoem?.tags) ? newPoem.tags.length : 'N/A'} | Content: ${tagsContent}`, "info");

        addLog("Discovery API", `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | Response: ${(responseSize / 1024).toFixed(1)}KB | ${jsonChars} chars`, "success");
        addLog("Discovery Metrics", `${estimatedOutputTokens} tokens | ${tokensPerSecond} tok/s | Arabic: ${arabicPoemChars} chars | English: ${englishPoemChars} chars | Poet: ${newPoem.poet}`, "success");
        setPoems(prev => {
          const updated = [...prev, newPoem];
          const searchStr = selectedCategory.toLowerCase();
          const freshFiltered = selectedCategory === "All" ? updated : updated.filter(p => (p?.poet || "").toLowerCase().includes(searchStr) || (Array.isArray(p?.tags) && p.tags.some(t => String(t).toLowerCase() === searchStr)));
          const newIdx = freshFiltered.findIndex(p => p.id === newPoem.id);
          if (newIdx !== -1) setCurrentIndex(newIdx);
          return updated;
        });
      }
    } catch (e) {
      addLog("Discovery Error", `${e.message} | Source: ${useDatabase ? 'Database' : 'Gemini'}`, "error");
    }
    setIsFetching(false);
  };

  const handleCopy = async () => {
    addLog("UI Event", `📋 Copy button clicked | Poem: ${current?.poet} - ${current?.title}`, "info");

    const textToCopy = `${current?.titleArabic || ""}\n${current?.poetArabic || ""}\n\n${current?.arabic || ""}\n\n---\n\n${current?.title || ""}\n${current?.poet || ""}\n\n${current?.english || ""}`;
    const copyChars = textToCopy.length;
    const arabicChars = current?.arabic?.length || 0;
    const englishChars = current?.english?.length || 0;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopySuccess(true);
      addLog("Copy", `✓ Copied to clipboard | ${copyChars} chars total (${arabicChars} Arabic + ${englishChars} English)`, "success");
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (e) {
      addLog("Copy Error", e.message, "error");
    }
  };

  // Auth handlers
  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  const handleSignInWithGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      addLog("Auth Error", error.message, "error");
    } else {
      setShowAuthModal(false);
      addLog("Auth", "Signed in with Google", "success");
    }
  };

  const handleSignInWithApple = async () => {
    const { error } = await signInWithApple();
    if (error) {
      addLog("Auth Error", error.message, "error");
    } else {
      setShowAuthModal(false);
      addLog("Auth", "Signed in with Apple", "success");
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      addLog("Auth Error", error.message, "error");
    } else {
      addLog("Auth", "Signed out successfully", "success");
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
      addLog("Save Error", error.message, "error");
    } else {
      addLog("Save", `Saved poem: ${current?.poet} - ${current?.title}`, "success");
    }
  };

  const handleUnsavePoem = async () => {
    const { error } = await unsavePoem(current?.id, current?.arabic);
    if (error) {
      addLog("Unsave Error", error.message, "error");
    } else {
      addLog("Unsave", `Removed poem: ${current?.poet} - ${current?.title}`, "success");
    }
  };

  const handleOpenSavedPoems = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    setShowSavedPoems(true);
  };

  const handleSelectSavedPoem = (savedPoem) => {
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
    setPoems(prev => {
      const exists = prev.find(p => p.arabic === mappedPoem.arabic);
      if (exists) {
        setCurrentIndex(prev.indexOf(exists));
        return prev;
      }
      setCurrentIndex(prev.length);
      return [...prev, mappedPoem];
    });
    setShowSavedPoems(false);
  };

  const handleOpenSettings = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    setShowSettings(true);
  };

  const handleSelectFont = (fontId) => {
    setCurrentFont(fontId);
  };

  const handleUnsavePoemFromList = async (sp) => {
    const { error } = await unsavePoem(sp.poem_id || sp.id, sp.poem_text);
    if (error) {
      addLog("Unsave Error", error.message, "error");
    } else {
      addLog("Unsave", `Removed poem from saved list`, "success");
    }
  };

  useEffect(() => {
    setInterpretation(null);
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    // Clear any stuck loading states when poem changes
    setIsGeneratingAudio(false);
    setIsInterpreting(false);

    // Clear all polling intervals to prevent stale requests
    pollingIntervals.current.forEach(interval => clearInterval(interval));
    pollingIntervals.current = [];

    // Log current poem tags for debugging
    const tagsType = Array.isArray(current?.tags) ? 'array' : typeof current?.tags;
    const tagsContent = Array.isArray(current?.tags)
      ? `[${current.tags.join(", ")}]`
      : JSON.stringify(current?.tags);
    addLog("Navigation", `Switched to poem: ${current?.poet} - ${current?.title} | ID: ${current?.id} | Tags: ${tagsType} - ${tagsContent}`, "info");
  }, [current?.id]);

  // Prefetch triggers - run background prefetching when poem changes
  // Rate-limited to avoid hitting API limits
  useEffect(() => {
    if (!FEATURES.prefetching || !current?.id) return;

    // Priority 1: Prefetch current poem audio after 2s (only if user stays)
    const prefetchCurrentAudio = setTimeout(() => {
      prefetchManager.prefetchAudio(current.id, current, addLog, activeAudioRequests);
    }, 2000);

    // Priority 1: Prefetch current poem insights after 5s (only if user stays)
    const prefetchCurrentInsights = setTimeout(() => {
      prefetchManager.prefetchInsights(current.id, current, addLog, activeInsightRequests);
    }, 5000);

    // Priority 2: Prefetch ONLY next poem audio after 10s (if user lingers)
    const prefetchNext = setTimeout(() => {
      if (filtered.length > 1) {
        const nextIndex = (currentIndex + 1) % filtered.length;
        if (filtered[nextIndex]) {
          setTimeout(() => {
            prefetchManager.prefetchAudio(filtered[nextIndex].id, filtered[nextIndex], addLog, activeAudioRequests);
          }, 500); // Stagger by 500ms to avoid burst
        }
      }
    }, 10000);

    // Cleanup timeouts on unmount or when dependencies change
    return () => {
      clearTimeout(prefetchCurrentAudio);
      clearTimeout(prefetchCurrentInsights);
      clearTimeout(prefetchNext);
    };
  }, [current?.id, currentIndex, filtered]);

  // Keep-alive ping to prevent Render free tier from sleeping (15 min idle timeout)
  // Pings every 10 minutes to keep backend awake
  useEffect(() => {
    if (!useDatabase || !apiUrl) return; // Only ping if database mode is enabled

    const keepAlivePing = setInterval(() => {
      fetch(`${apiUrl}/api/health`)
        .then(() => {
          if (FEATURES.debug) {
            addLog("Keep-Alive", "Backend pinged successfully", "info");
          }
        })
        .catch((err) => {
          // Silently fail - don't disrupt user experience
          if (FEATURES.debug) {
            addLog("Keep-Alive", `Ping failed: ${err.message}`, "error");
          }
        });
    }, 10 * 60 * 1000); // 10 minutes

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
    <div className={`h-[100dvh] w-full flex flex-col overflow-hidden ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}>
      <style>{`
        .arabic-shadow { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2); border-radius: 10px; }
        .bg-radial-gradient { background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%); }
        .app-branding-rtl { direction: rtl; }
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
          text-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
        }

        .minimal-frame {
          position: relative;
          width: 100%;
          max-width: 550px;
          margin: 0 auto 16px;
          padding: 28px 40px;
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

        .frame-line {
          fill: none;
          stroke: #C5A059;
          stroke-width: 2;
          opacity: 0.28;
          stroke-linecap: square;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .rabbit-bounce {
          animation: bounce 2s ease-in-out infinite;
        }

        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(to right, #6366f1, #9333ea);
          transform: scaleX(0.36);
          transform-origin: left;
          z-index: 100;
          opacity: 0.85;
        }
      `}</style>

      <div className="scroll-progress" />

      <DebugPanel logs={logs} onClear={() => setLogs([])} darkMode={darkMode} />

      <header style={{ opacity: headerOpacity }} className="fixed top-4 md:top-8 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300 flex flex-row items-center justify-center gap-4 md:gap-8 px-4 md:px-6">
        <div className={`flex flex-row-reverse items-center gap-2 md:gap-4 ${theme.brand} tracking-wide header-luminescence`}>
          <PenTool className="w-8 h-8 md:w-[42px] md:h-[42px] opacity-95" strokeWidth={1.5} />
          <h1 className="app-branding-rtl flex items-end gap-3 md:gap-6">
            <span className="font-brand-ar text-[clamp(1.875rem,4vw,3rem)] font-bold mb-[clamp(0.25rem,0.5vw,0.5rem)] opacity-80">بالعربي</span>
            <span className="font-brand-en text-[clamp(3rem,6vw,4.5rem)] lowercase tracking-tighter">poetry</span>
            <span className="font-brand-en text-[clamp(10px,1.2vw,12px)] px-[clamp(0.375rem,0.8vw,0.5rem)] py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 uppercase tracking-wider mb-[clamp(0.5rem,1vw,1rem)] ml-[clamp(0.5rem,1vw,0.75rem)] opacity-60">beta</span>
          </h1>
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className={`absolute inset-0 pointer-events-none opacity-[0.04] ${darkMode ? 'invert' : ''}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main ref={mainScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 md:px-0 pb-28">
            <div className="min-h-full flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-4xl flex flex-col items-center">
                
                <div className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}>
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
                        <circle className="frame-line" cx="32" cy="32" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="518" cy="32" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="32" cy="88" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="518" cy="88" r="2.5" fill="#C5A059" opacity="0.35" />
                      </svg>

                      <div className="relative z-10 flex flex-col items-center justify-center w-full">
                         <div className={`flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-4 ${currentFontClass} ${DESIGN.mainTitleSize}`}>
                           <span className={`${theme.poetColor} opacity-90`}>{current?.poetArabic}</span>
                           <span className="opacity-10 text-[clamp(0.75rem,1.5vw,1.25rem)]">-</span>
                           <span className={`${theme.titleColor} font-bold`}>{current?.titleArabic}</span>
                         </div>
                         <div className={`flex items-center justify-center gap-1 sm:gap-2 opacity-45 ${DESIGN.mainSubtitleSize} font-brand-en tracking-[0.08em] uppercase mt-[clamp(0.25rem,0.8vw,0.75rem)]`}>
                           <span className="font-semibold">{current?.poet}</span> <span className="opacity-20">•</span> <span>{current?.title}</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-center gap-3 mt-1">
                     {Array.isArray(current?.tags) && current.tags.slice(0, 3).map(tag => (
                       <span key={tag} className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}>
                         {tag}
                       </span>
                     ))}
                   </div>
                </div>

                <div className={`relative w-full group pt-8 pb-2 ${DESIGN.mainMarginBottom}`}>
                  <div className="px-4 md:px-20 py-2 text-center">
                    <div className="flex flex-col gap-5 md:gap-7">
                      {versePairs.map((pair, idx) => (
                        <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                          <p dir="rtl" className={`${currentFontClass} ${DESIGN.mainFontSize} leading-[2.2]  arabic-shadow`}>{pair.ar}</p>
                          {pair.en && <p dir="ltr" className={`font-brand-en italic ${DESIGN.mainEnglishFontSize} opacity-40 ${DESIGN.anim}`}>{pair.en}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-2xl px-6 md:px-0 mb-4 md:hidden">
                   {isInterpreting ? (
                     <div className="flex flex-col items-center py-8 gap-4">
                       <div className="relative">
                         <Loader2 className="animate-spin text-indigo-500" size={32} />
                         <Sparkles className="absolute inset-0 m-auto animate-pulse text-indigo-400" size={16} />
                       </div>
                       <p className="text-xs italic font-brand-en opacity-60 tracking-widest uppercase">Consulting the Diwan...</p>
                     </div>
                   ) : interpretation ? (
                     <div className={`flex flex-col gap-10 animate-in slide-in-from-bottom-10 duration-1000`}>
                        <div className="pt-6 border-t border-indigo-500/10">
                          <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">The Depth</h4>
                          <div className="pl-4 border-l border-indigo-500/10">
                            <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.depth}</p>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-indigo-500/10">
                          <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">The Author</h4>
                          <div className="pl-4 border-l border-indigo-500/10">
                            <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.author}</p>
                          </div>
                        </div>
                     </div>
                   ) : null}
                </div>
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 bg-gradient-to-t from-black/5 to-transparent safe-bottom">
            <div ref={controlBarRef} className={`flex items-center gap-2 px-5 py-2 rounded-full shadow-2xl border ${DESIGN.glass} ${theme.border} ${theme.shadow} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}>

              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                <button onClick={togglePlay} disabled={isGeneratingAudio} aria-label={isPlaying ? "Pause recitation" : "Play recitation"} className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isGeneratingAudio ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : isPlaying ? <Pause fill="#C5A059" size={21} /> : <Volume2 className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Listen</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                <button onClick={handleAnalyze} disabled={isInterpreting || interpretation} aria-label="Explain poem meaning" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105 disabled:opacity-50">
                  {isInterpreting ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Compass className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Explain</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                <button onClick={handleFetch} disabled={isFetching} aria-label="Discover new poem" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isFetching ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Rabbit className="text-[#C5A059] rabbit-bounce" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Discover</span>
              </div>

              {isSupabaseConfigured && (
                <SavePoemButton
                  poem={current}
                  isSaved={isPoemSaved(current)}
                  onSave={handleSavePoem}
                  onUnsave={handleUnsavePoem}
                  disabled={!user}
                />
              )}

              <div className="w-px h-10 bg-stone-500/20 mx-1 flex-shrink-0" />

              {!isOverflow ? (
                <>
                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button onClick={handleCopy} aria-label="Copy poem to clipboard" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                      {showCopySuccess ? <Check size={21} className="text-green-500" /> : <Copy size={21} className="text-[#C5A059]" />}
                    </button>
                    <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Copy</span>
                  </div>

                  <DatabaseToggle
                    useDatabase={useDatabase}
                    onToggle={() => setUseDatabase(!useDatabase)}
                  />

                  <ThemeDropdown
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    currentFont={currentFont}
                    onCycleFont={cycleFont}
                    fonts={FONTS}
                  />

                  <CategoryPill selected={selectedCategory} onSelect={setSelectedCategory} darkMode={darkMode} />

                  {isSupabaseConfigured && (
                    <AuthButton
                      user={user}
                      onSignIn={handleSignIn}
                      onSignOut={handleSignOut}
                      onOpenSavedPoems={handleOpenSavedPoems}
                      onOpenSettings={handleOpenSettings}
                      theme={theme}
                    />
                  )}
                </>
              ) : (
                <OverflowMenu
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode(!darkMode)}
                  currentFont={currentFont}
                  onSelectFont={handleSelectFont}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onCopy={handleCopy}
                  showCopySuccess={showCopySuccess}
                  useDatabase={useDatabase}
                  onToggleDatabase={() => setUseDatabase(!useDatabase)}
                  user={user}
                  onOpenSavedPoems={handleOpenSavedPoems}
                  onOpenSettings={handleOpenSettings}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                  isSupabaseConfigured={isSupabaseConfigured}
                />
              )}
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}>
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <h3 className="font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] text-indigo-600 tracking-tight">Poetic Insight</h3>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate">{current?.poet} • {current?.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isInterpreting ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse"><Sparkles className="animate-spin text-indigo-500" size={32} /><p className="font-brand-en italic text-[clamp(0.875rem,1.5vw,1rem)]">Consulting Diwan...</p></div>
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
                  <p className={`font-brand-en italic whitespace-pre-wrap ${DESIGN.paneVerseSize} ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>{insightParts?.poeticTranslation || current?.english}</p>
                  {insightParts?.depth && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">The Depth</h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.depth}</p>
                      </div>
                    </div>
                  )}
                  {insightParts?.author && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">The Author</h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.author}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignInWithApple={handleSignInWithApple}
        theme={theme}
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

      {/* Settings View */}
      <SettingsView
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        currentFont={currentFont}
        onSelectFont={handleSelectFont}
        user={user}
        theme={theme}
      />
      <a href="/design-review" style={{ position:'fixed', bottom:16, left:16, padding:'6px 12px',
        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:6, fontSize:11, color:'rgba(255,255,255,0.4)', textDecoration:'none',
        zIndex:9999, fontFamily:'system-ui' }}>
        Design Review
      </a>
    </div>
  );
}