import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, RefreshCw, Volume2, ChevronDown, Quote, Globe, Moon, Sun, Loader2, ChevronRight, ChevronLeft, Search, X, Copy, LayoutGrid, Check, Bug, Trash2, Sparkles, PenTool, Zap, MousePointer, Library, Compass, Rabbit, MoreHorizontal } from 'lucide-react';
import { SplashModern, SplashMinimalist, SplashArabian } from './splash-mockups.jsx';
import { SplashArabian1, SplashArabian2, SplashArabian3a, SplashArabian3b, SplashArabian3c } from './splash-arabian-variations.jsx';
import { SplashArabian4a, SplashArabian4b, SplashArabian4c } from './splash-final-variations.jsx';
import { SplashWildcard5a, SplashWildcard5b, SplashWildcard5c, SplashDirection5d, SplashDirection5e } from './splash-wildcard-variations.jsx';
import { Splash6a, Splash6b, Splash6c, Splash6d, Splash6e, Splash6f } from './splash-round6-variations.jsx';
import { SplashCinematic } from './splash-cinematic.jsx';
import { SplashParticles, ParticleWalkthrough } from './splash-options/splash-particles.jsx';
import { SplashConstellation, ConstellationWalkthrough } from './splash-options/splash-constellation.jsx';
import { SplashMandala, MandalaWalkthroughGuide } from './splash-options/splash-mandala.jsx';
import { SplashGeometric, WalkthroughGeometric } from './splash-options/splash-geometric.jsx';
import { SplashZen, WalkthroughZen } from './splash-options/splash-zen.jsx';
import { SplashAurora, AuroraWalkthrough } from './splash-options/splash-aurora.jsx';
import { SplashInk, WalkthroughGuideInk } from './splash-options/splash-ink.jsx';
import { SplashManuscript, WalkthroughManuscript } from './splash-options/splash-manuscript.jsx';
import { SplashLight, LightShadowWalkthrough } from './splash-options/splash-light.jsx';
import { SplashKinetic } from './splash-kinetic.jsx';

/* =============================================================================
  1. FEATURE FLAGS & DESIGN SYSTEM
  =============================================================================
*/

const FEATURES = {
  grounding: false,
  debug: true,
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
 * Insights/Analysis System Prompt
 * Used by: handleAnalyze, prefetchInsights
 */
const INSIGHTS_SYSTEM_PROMPT = `
You are an expert scholar and master poet of both Arabic and English literature.

TASK: POETIC INSIGHT
Provide exactly three sections labeled:
1. POEM: Provide a faithful, line-by-line English translation matching the Arabic lines exactly. Ensure poetic weight and grammatical elegance.
2. THE DEPTH: Exactly 3 sentences explaining meaning.
3. THE AUTHOR: Exactly 2 sentences on the poet.

Strictly adhere to this format:
POEM:
[Translation]
THE DEPTH: [Text]
THE AUTHOR: [Text]
`;

/**
 * Discovery/Fetch System Prompt
 * Used by: handleFetch
 */
const DISCOVERY_SYSTEM_PROMPT = `
Return JSON with the following fields:
- poet: The poet's name in English
- poetArabic: The poet's name in Arabic
- title: The poem title in English
- titleArabic: The poem title in Arabic
- arabic: The complete poem text in Arabic (with FULL tashkeel/diacritics)
- english: The complete English translation
- tags: An array of exactly 3 strings [Era, Mood, Type]
`;

/**
 * Text-to-Speech (TTS) Instruction Generator
 * Used by: togglePlay, prefetchAudio
 *
 * @param {Object} poem - The poem object containing arabic text and metadata
 * @param {string} poet - The poet's name
 * @param {string} mood - The mood tag (e.g., "Romantic", "Mystical")
 * @param {string} era - The era tag (e.g., "Modern", "Classical")
 * @returns {string} The formatted TTS instruction
 */
const getTTSInstruction = (poem, poet, mood, era) => {
  return `Act as a master orator and recite this masterpiece by ${poet} in the soulful, ${mood} tone of the ${era} era. ` +
    `Use high intensity, passionate oratorical power, and majestic strength. ` +
    `Include natural pauses and audible breaths where appropriate. ` +
    `Poem: ${poem.arabic}`;
};

/**
 * API Model Endpoints
 */
const API_MODELS = {
  insights: 'gemini-2.5-flash-preview-09-2025',
  tts: 'gemini-2.5-flash-preview-tts',
  discovery: 'gemini-2.5-flash-preview-09-2025'
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.insights}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
        })
      });

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
            <p className={`${theme.text} text-sm font-medium mb-2`}>Database Connection Error</p>
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
  onCycleFont,
  selectedCategory,
  onSelectCategory,
  onCopy,
  showCopySuccess,
  useDatabase,
  onToggleDatabase
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
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
    setIsOpen(false);
  };

  const handleCycleFont = () => {
    onCycleFont();
    setIsOpen(false);
  };

  const handleToggleDatabase = () => {
    onToggleDatabase();
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="More options"
      >
        <MoreHorizontal size={21} className="text-[#C5A059]" />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">More</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[220px] max-h-[80vh] overflow-y-auto custom-scrollbar bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          <button
            onClick={handleCopy}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            {showCopySuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-[#C5A059]" />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">نسخ</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Copy</div>
            </div>
          </button>

          <button
            onClick={handleToggleDatabase}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            {useDatabase ? <Library size={18} className="text-[#C5A059]" /> : <Sparkles size={18} className="text-[#C5A059]" />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">{useDatabase ? 'قاعدة البيانات' : 'الذكاء الاصطناعي'}</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{useDatabase ? 'Local Database' : 'AI Generated'}</div>
            </div>
          </button>

          <button
            onClick={handleToggleDarkMode}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            {darkMode ? <Sun size={18} className="text-[#C5A059]" /> : <Moon size={18} className="text-[#C5A059]" />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Theme</div>
            </div>
          </button>

          <button
            onClick={handleCycleFont}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <PenTool size={18} className="text-[#C5A059]" />
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">تبديل الخط</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Font: {currentFont}</div>
            </div>
          </button>

          <div className="border-b border-[rgba(197,160,89,0.08)] last:border-b-0">
            <div className="px-5 py-2">
              <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-30 text-[#a8a29e]">Poets</div>
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`w-full p-[10px_20px] cursor-pointer transition-all duration-200 flex items-center gap-2 hover:bg-[rgba(197,160,89,0.08)] ${selectedCategory === cat.id ? 'bg-[rgba(197,160,89,0.12)]' : ''}`}
              >
                <Library size={14} className="text-[#C5A059] opacity-60" />
                <div className="flex flex-col items-start">
                  <div className="font-amiri text-sm text-[#C5A059] font-medium">{cat.labelAr}</div>
                  <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{cat.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SplashScreen = ({ onGetStarted, darkMode }) => {
  const theme = darkMode ? THEME.dark : THEME.light;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg} ${DESIGN.anim}`}>
      {/* Mystical background - Islamic geometric pattern */}
      <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${darkMode ? 'invert' : ''}`}
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 L60 30 L80 30 L65 43 L70 63 L50 50 L30 63 L35 43 L20 30 L40 30 Z' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='35' fill='none' stroke='%23C5A059' stroke-width='0.5' stroke-dasharray='2,3'/%3E%3Cpath d='M50 15 Q65 50 50 85 Q35 50 50 15' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '100px 100px' }} />

      {/* Luminous glow effect */}
      <div className={`absolute inset-0 pointer-events-none bg-gradient-radial from-indigo-500/5 via-transparent to-transparent`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 md:gap-12 px-6 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Logo with mystical aura */}
        <div className="flex flex-col items-center gap-6 relative">
          {/* Arabesque corner decorations */}
          <div className="absolute -top-8 -left-16 opacity-15">
            <svg width="60" height="60" viewBox="0 0 60 60" className={theme.brand}>
              <path d="M10 10 Q10 5 15 5 L25 5 Q30 5 30 10 L30 20 Q30 25 25 25 L15 25 Q10 25 10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <div className="absolute -top-8 -right-16 opacity-15 scale-x-[-1]">
            <svg width="60" height="60" viewBox="0 0 60 60" className={theme.brand}>
              <path d="M10 10 Q10 5 15 5 L25 5 Q30 5 30 10 L30 20 Q30 25 25 25 L15 25 Q10 25 10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </div>

          {/* PenTool icon */}
          <div className="relative">
            <PenTool size={64} className={`${theme.brand} opacity-90`} strokeWidth={1.5} />
          </div>

          <div className={`flex flex-col items-center gap-3 ${theme.brand} tracking-wide header-luminescence`}>
            <span className="font-brand-en text-6xl md:text-8xl lowercase tracking-tighter font-semibold">poetry</span>
            <span className="font-amiri text-2xl md:text-3xl opacity-70">بالعربي</span>
          </div>
          <span className={`font-brand-en text-xs px-3 py-1 rounded border ${theme.brandBorder} ${theme.brandBg} uppercase tracking-wider opacity-60`}>beta</span>
        </div>

        {/* Description - English primary */}
        <div className={`space-y-3 ${theme.text}`}>
          <p className="font-brand-en text-xl md:text-2xl leading-relaxed italic opacity-90">
            Journey through time into the realm of timeless poetry
          </p>
          <p className="font-amiri text-base md:text-lg leading-[2] opacity-50">
            رحلة عبر الزمن إلى عالم الشعر الخالد
          </p>
        </div>

        {/* Get Started Button - English primary */}
        <button
          onClick={onGetStarted}
          className={`group relative overflow-hidden px-10 py-4 ${theme.btnPrimary} ${DESIGN.radius} ${DESIGN.touchTarget} shadow-2xl font-brand-en text-xl font-semibold tracking-wide`}
        >
          <span className="relative z-10">Begin Journey</span>
          <span className="relative z-10 font-amiri text-sm mr-2 opacity-70">ابدأ الرحلة</span>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>

        {/* Features Preview - English primary */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full ${theme.text}`}>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Scroll icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <rect x="8" y="6" width="16" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 10 L20 10 M12 14 L20 14 M12 18 L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">Discover poetry by the greats</p>
            <span className="font-amiri text-xs opacity-40">اكتشف شعر العظماء</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Sound wave icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <path d="M6 16 L6 16 M10 12 L10 20 M14 8 L14 24 M18 12 L18 20 M22 8 L22 24 M26 12 L26 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">The poem is recited to you</p>
            <span className="font-amiri text-xs opacity-40">القصيدة تُتلى عليك</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Lantern/light icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <path d="M16 4 L19 8 L13 8 Z" fill="currentColor" opacity="0.5" />
              <path d="M13 8 L19 8 L20 24 L12 24 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <ellipse cx="16" cy="16" rx="3" ry="4" fill="currentColor" opacity="0.3" />
              <path d="M12 24 L14 28 L18 28 L20 24" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">Learn about the depth and meanings</p>
            <span className="font-amiri text-xs opacity-40">تعلّم عن العمق والمعاني</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const WalkthroughGuide = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const theme = darkMode ? THEME.dark : THEME.light;

  const steps = [
    {
      title: "Welcome to Poetry Bil-Araby",
      titleAr: "مرحباً بك",
      description: "Experience timeless Arabic poetry that expands the mind and touches the soul",
      descriptionAr: "شعر عربي خالد"
    },
    {
      title: "Navigate Through Poems",
      titleAr: "تصفح القصائد",
      description: "Journey through centuries of poetic mastery with a simple gesture",
      descriptionAr: "رحلة عبر قرون"
    },
    {
      title: "Listen to Poetry",
      titleAr: "استمع للشعر",
      description: "Hear the verses come alive as they were meant to be recited",
      descriptionAr: "استمع للأبيات"
    },
    {
      title: "Discover Hidden Meanings",
      titleAr: "اكتشف المعاني",
      description: "Unlock the depth and wisdom woven into each verse",
      descriptionAr: "عمق وحكمة"
    }
  ];

  const step = steps[currentStep];

  // Islamic geometric pattern - octagon with 8 segments (2 per step)
  const segmentsLit = (currentStep + 1) * 2;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md ${DESIGN.anim}`}>
      {/* Mystical background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-150 opacity-30`} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-indigo-300 rounded-full animate-pulse" style={{
              width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.1, animationDuration: Math.random() * 3 + 2 + 's'
          }} />
        ))}
      </div>

      <div className={`relative max-w-2xl mx-6 ${theme.glass} ${DESIGN.glass} ${theme.border} border-2 ${DESIGN.radius} p-10 md:p-16 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden`}>
        {/* Arabesque corner flourishes - more ornate */}
        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none opacity-20">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none opacity-20 scale-x-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none opacity-20 scale-y-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none opacity-20 scale-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* Mystical glow behind icon */}
        <div className="absolute inset-0 bg-gradient-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 ${theme.controlIcon} ${DESIGN.buttonHover} rounded-full z-10`}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center gap-8 text-center relative z-10">
          {/* PenTool icon with glow */}
          <div className={`relative p-6 ${theme.brandBg} rounded-full border border-indigo-500/20 shadow-lg`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative z-10">
              <PenTool size={48} className={theme.brand} strokeWidth={1.5} />
            </div>
          </div>

          {/* English primary, Arabic complementary */}
          <div className={`space-y-3 ${theme.text}`}>
            <h3 className="font-brand-en text-3xl md:text-4xl font-semibold leading-tight">{step.title}</h3>
            <p className="font-amiri text-base opacity-50">{step.titleAr}</p>
          </div>

          <div className={`space-y-2 ${theme.text} max-w-md`}>
            <p className="font-brand-en text-lg md:text-xl leading-relaxed opacity-90">{step.description}</p>
            <p className="font-amiri text-sm opacity-40 leading-[1.8]">{step.descriptionAr}</p>
          </div>

          {/* Islamic geometric pattern step indicator */}
          <div className="relative mt-6">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform rotate-[22.5deg]">
              {/* Octagon - 8 segments */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                const nextAngle = ((i + 1) * 45) * Math.PI / 180;
                const r = 50;
                const cx = 60;
                const cy = 60;

                const x1 = cx + r * Math.cos(angle);
                const y1 = cy + r * Math.sin(angle);
                const x2 = cx + r * Math.cos(nextAngle);
                const y2 = cy + r * Math.sin(nextAngle);

                const isLit = i < segmentsLit;

                return (
                  <g key={i}>
                    <path
                      d={`M ${cx} ${cy} L ${x1} ${y1} L ${x2} ${y2} Z`}
                      fill={isLit ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`${DESIGN.anim} ${isLit ? theme.brand + ' opacity-60' : 'opacity-10'}`}
                      style={{ transitionDuration: '800ms' }}
                    />
                    {isLit && (
                      <circle
                        cx={(x1 + x2) / 2}
                        cy={(y1 + y2) / 2}
                        r="3"
                        fill="currentColor"
                        className={`${theme.brand} opacity-80 animate-pulse`}
                      />
                    )}
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="60" cy="60" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" className={`${theme.brand} opacity-20`} />
              <circle cx="60" cy="60" r="8" fill="currentColor" className={`${theme.brand} opacity-30`} />
            </svg>

            {/* Step dots below pattern */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onStepChange(idx)}
                  className={`w-2 h-2 rounded-full ${DESIGN.anim} transition-all duration-500 ${
                    idx === currentStep
                      ? `${theme.brand} w-3 h-3`
                      : idx < currentStep
                      ? 'bg-indigo-500/50'
                      : 'bg-stone-500/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation - English primary */}
          <div className="flex items-center gap-4 mt-6 w-full">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                className={`flex-1 px-6 py-3 border-2 ${theme.border} ${DESIGN.radius} ${DESIGN.buttonHover} font-brand-en text-base font-medium hover:bg-indigo-500/5`}
              >
                Previous
                <span className="font-amiri text-xs ml-2 opacity-50">السابق</span>
              </button>
            )}
            <button
              onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
              className={`flex-1 px-6 py-3 ${theme.btnPrimary} ${DESIGN.radius} ${DESIGN.buttonHover} font-brand-en text-base font-semibold shadow-xl`}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Start Exploring'}
              <span className="font-amiri text-xs mr-2 opacity-70">{currentStep < steps.length - 1 ? 'التالي' : 'ابدأ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  WALKTHROUGH ROUTING
  Maps splash mockup types to their themed walkthrough components
  =============================================================================
*/

const getWalkthroughComponent = (mockupType) => {
  const walkthroughMap = {
    'particles': ParticleWalkthrough,
    'constellation': ConstellationWalkthrough,
    'mandala': MandalaWalkthroughGuide,
    'geometric': WalkthroughGeometric,
    'zen': WalkthroughZen,
    'aurora': AuroraWalkthrough,
    'ink': WalkthroughGuideInk,
    'manuscript': WalkthroughManuscript,
    'light': LightShadowWalkthrough,
  };
  return walkthroughMap[mockupType] || WalkthroughGuide; // Generic fallback
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
  const [showSplash, setShowSplash] = useState(() => {
    // Skip splash screen in tests by checking URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !params.has('skipSplash');
    }
    return true;
  });
  const [mockupType, setMockupType] = useState(() => {
    // Check which mockup to show from URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mockup') || 'default';
    }
    return 'default';
  });
  const [showWalkthrough, setShowWalkthrough] = useState(() => {
    // Check if walkthrough should be shown from URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('showWalkthrough') === 'true';
    }
    return false;
  });
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const [cacheStats, setCacheStats] = useState({ audioHits: 0, audioMisses: 0, insightsHits: 0, insightsMisses: 0 });
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const activeAudioRequests = useRef(new Set()); // Track in-flight audio generation requests
  const activeInsightRequests = useRef(new Set()); // Track in-flight insight generation requests
  const pollingIntervals = useRef([]); // Track all polling intervals for cleanup

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

  // Sync theme to HTML element class for E2E tests
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.className = darkMode ? 'dark' : 'light';
    }
  }, [darkMode]);

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

  const current = filtered[currentIndex] || filtered[0] || poems[0];

  const addLog = (label, msg, type = 'info') => {
    setLogs(prev => [...prev, { label, msg: String(msg), type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
  };

  useEffect(() => {
    if (selectedCategory !== "All" && filtered.length === 0) {
      handleFetch();
    } else {
      setCurrentIndex(0);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const detectOverflow = () => {
      if (controlBarRef.current) {
        const controlBar = controlBarRef.current;
        const viewportWidth = window.innerWidth;
        const controlBarWidth = controlBar.scrollWidth;
        setIsOverflow(controlBarWidth > viewportWidth * 0.9);
      }
    };

    detectOverflow();
    window.addEventListener('resize', detectOverflow);
    return () => window.removeEventListener('resize', detectOverflow);
  }, []);

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
      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        const promptText = `Deep Analysis of: ${current?.arabic}`;
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.insights}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.insights}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Deep Analysis of: ${current?.arabic}` }] }],
            systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] }
          })
        });
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
        addLog("Discovery DB", `→ Querying database | Category: ${selectedCategory}`, "info");

        const poetParam = selectedCategory !== "All" ? `?poet=${encodeURIComponent(selectedCategory)}` : '';
        const url = `${apiUrl}/api/poems/random${poetParam}`;

        try {
          const res = await fetch(url);

          if (!res.ok) {
            throw new Error(`Database API returned ${res.status} ${res.statusText}`);
          }

          // Clear any previous backend errors on success
          setBackendError(null);

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
            const searchStr = selectedCategory.toLowerCase();
            const freshFiltered = selectedCategory === "All" ? updated : updated.filter(p => (p?.poet || "").toLowerCase().includes(searchStr) || (Array.isArray(p?.tags) && p.tags.some(t => String(t).toLowerCase() === searchStr)));
            const newIdx = freshFiltered.findIndex(p => p.id === newPoem.id);
            if (newIdx !== -1) setCurrentIndex(newIdx);
            return updated;
          });
        } catch (dbError) {
          // Handle database-specific errors
          const errorMessage = dbError.message.includes('Failed to fetch')
            ? 'Backend server is not running. Please start it with: npm run dev:server'
            : dbError.message;

          setBackendError(errorMessage);
          addLog("Discovery DB Error", errorMessage, "error");
          throw dbError; // Re-throw to be caught by outer catch
        }

      } else {
        // GEMINI AI MODE: Original implementation
        const prompt = selectedCategory === "All"
          ? "Find a masterpiece Arabic poem. COMPLETE text."
          : `Find a famous poem by ${selectedCategory}. COMPLETE text.`;

        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: `${prompt} JSON only.` }] }],
          systemInstruction: { parts: [{ text: DISCOVERY_SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" }
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODELS.discovery}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody
        });
        const data = await res.json();
        const apiTime = performance.now() - apiStart;

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const cleanJson = (rawText || "").replace(/```json|```/g, "").trim();
        const parsedPoem = JSON.parse(cleanJson);

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

  // Splash/Walkthrough handlers
  const handleGetStarted = () => {
    setShowSplash(false);
    setShowWalkthrough(true);
  };

  const handleCloseWalkthrough = () => {
    setShowWalkthrough(false);
    setWalkthroughStep(0);
  };

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

      {showSplash && (() => {
        const splashProps = { onGetStarted: handleGetStarted, darkMode, theme, onToggleTheme: () => setDarkMode(!darkMode) };
        switch (mockupType) {
          case 'modern':
            return <SplashModern {...splashProps} />;
          case 'minimalist':
            return <SplashMinimalist {...splashProps} />;
          case 'arabian':
            return <SplashArabian {...splashProps} />;
          case '1':
            return <SplashArabian1 {...splashProps} />;
          case '2':
            return <SplashArabian2 {...splashProps} />;
          case '3a':
            return <SplashArabian3a {...splashProps} />;
          case '3b':
            return <SplashArabian3b {...splashProps} />;
          case '3c':
            return <SplashArabian3c {...splashProps} />;
          case '4a':
            return <SplashArabian4a {...splashProps} />;
          case '4b':
            return <SplashArabian4b {...splashProps} />;
          case '4c':
            return <SplashArabian4c {...splashProps} />;
          case '5a':
            return <SplashWildcard5a {...splashProps} />;
          case '5b':
            return <SplashWildcard5b {...splashProps} />;
          case '5c':
            return <SplashWildcard5c {...splashProps} />;
          case '5d':
            return <SplashDirection5d {...splashProps} />;
          case '5e':
            return <SplashDirection5e {...splashProps} />;
          case '6a':
            return <Splash6a {...splashProps} />;
          case '6b':
            return <Splash6b {...splashProps} />;
          case '6c':
            return <Splash6c {...splashProps} />;
          case '6d':
            return <Splash6d {...splashProps} />;
          case '6e':
            return <Splash6e {...splashProps} />;
          case '6f':
            return <Splash6f {...splashProps} />;
          case 'particles':
            return <SplashParticles {...splashProps} />;
          case 'constellation':
            return <SplashConstellation {...splashProps} />;
          case 'kinetic':
            return <SplashKinetic {...splashProps} />;
          case 'mandala':
            return <SplashMandala {...splashProps} />;
          case 'geometric':
            return <SplashGeometric {...splashProps} />;
          case 'zen':
            return <SplashZen {...splashProps} />;
          case 'aurora':
            return <SplashAurora {...splashProps} />;
          case 'ink':
            return <SplashInk {...splashProps} />;
          case 'manuscript':
            return <SplashManuscript {...splashProps} />;
          case 'light':
            return <SplashLight {...splashProps} />;
          default:
            return <SplashCinematic {...splashProps} />;
        }
      })()}
      {showWalkthrough && (() => {
        const WalkthroughComponent = getWalkthroughComponent(mockupType);
        return (
          <WalkthroughComponent
            onClose={handleCloseWalkthrough}
            darkMode={darkMode}
            currentStep={walkthroughStep}
            onStepChange={setWalkthroughStep}
          />
        );
      })()}

      <ErrorBanner
        error={backendError}
        onDismiss={() => setBackendError(null)}
        onRetry={handleFetch}
        theme={theme}
      />

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

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={togglePlay} disabled={isGeneratingAudio} aria-label={isPlaying ? "Pause recitation" : "Play recitation"} className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isGeneratingAudio ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : isPlaying ? <Pause fill="#C5A059" size={21} /> : <Volume2 className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Listen</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={handleAnalyze} disabled={isInterpreting || interpretation} aria-label="Dive into poem meaning" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105 disabled:opacity-50">
                  {isInterpreting ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Compass className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Dive In</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={handleFetch} disabled={isFetching} aria-label="Discover new poem" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isFetching ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Rabbit className="text-[#C5A059] rabbit-bounce" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Discover</span>
              </div>

              <div className="w-px h-10 bg-stone-500/20 mx-2 flex-shrink-0" />

              {!isOverflow ? (
                <>
                  <div className="flex flex-col items-center gap-1 min-w-[56px]">
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
                </>
              ) : (
                <OverflowMenu
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode(!darkMode)}
                  currentFont={currentFont}
                  onCycleFont={cycleFont}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onCopy={handleCopy}
                  showCopySuccess={showCopySuccess}
                  useDatabase={useDatabase}
                  onToggleDatabase={() => setUseDatabase(!useDatabase)}
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
    </div>
  );
}