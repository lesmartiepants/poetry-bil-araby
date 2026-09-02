import { create } from 'zustand';
import { FEATURES } from '../constants/features';
import { THEME } from '../constants/theme';
import { FONTS } from '../constants/fonts';
import { DEFAULT_VOICE } from '../constants/voices';

const MAX_LOGS = 200;

// TTS engine preference. Defaults to 'live' (streaming, first sound ~1s). The user's
// explicit choice is remembered across reloads, but the debug-panel toggle always
// switches it, so no one gets locked onto one engine. (Returning visitors get the
// new default automatically once their device picks up the new build — see the
// version-based auto-refresh in main.jsx.)
const TTS_MODE_KEY = 'tts-mode';
const loadTtsMode = () => {
  try {
    const v = localStorage.getItem(TTS_MODE_KEY);
    if (v === 'rest' || v === 'live') return v;
  } catch {}
  return 'live';
};
const persistTtsMode = (mode) => {
  try {
    localStorage.setItem(TTS_MODE_KEY, mode);
  } catch {}
};

// Selected speaking voice. Driven by the voice-cycle pill next to Listen (and the
// DebugPanel picker). Remembered across reloads so a listener's choice sticks.
const TTS_VOICE_KEY = 'tts-voice';
const loadLiveVoice = () => {
  try {
    const v = localStorage.getItem(TTS_VOICE_KEY);
    if (v) return v;
  } catch {}
  return DEFAULT_VOICE;
};
const persistLiveVoice = (voice) => {
  try {
    localStorage.setItem(TTS_VOICE_KEY, voice);
  } catch {}
};

// Curated feed: when on, the discovery serve is biased toward the reader's taste
// profile (favor/avoid tiers across mood/topic/motif — see config/curation.json)
// and their downvoted poems are excluded. Off by default so the full corpus is
// always the baseline; remembered across reloads once opted in.
const CURATED_KEY = 'curated-feed';
const loadCurated = () => {
  try {
    return localStorage.getItem(CURATED_KEY) === '1';
  } catch {}
  return false;
};
const persistCurated = (on) => {
  try {
    localStorage.setItem(CURATED_KEY, on ? '1' : '0');
  } catch {}
};

// Dislike button in the nav pill: off by default, opt-in from the account menu for a
// reader who wants it. Remembered across reloads once toggled.
const SHOW_DISLIKE_KEY = 'show-dislike';
const loadShowDislike = () => {
  try {
    const v = localStorage.getItem(SHOW_DISLIKE_KEY);
    if (v !== null) return v === '1';
  } catch {}
  return false;
};
const persistShowDislike = (on) => {
  try {
    localStorage.setItem(SHOW_DISLIKE_KEY, on ? '1' : '0');
  } catch {}
};

/**
 * Reading posture: how much Arabic the reader wants to do unaided.
 *
 * `showTranslation` and `showTransliteration` used to be session state with a
 * fixed default that suited a fluent reader — translation on, transliteration
 * off — which is backwards for a large part of this audience. Onboarding now
 * asks once and sets both from the answer, so the posture has to survive a
 * reload or the question was theatre.
 *
 * 'arabic'   reads comfortably: neither aid, just the poem.
 * 'learning' working through it: both aids. Transliteration is the row that
 *            maps to SOUND, so it is the one that lets a learner follow the TTS.
 * 'english'  reading in English: both aids too, and the transliteration is not a
 *            leftover. Translation exists for only ~13% of the corpus (#713 —
 *            server.js hardcodes `english: ''`), transliteration for 100%, so
 *            translation-only would leave an English-first reader with a blank
 *            screen on 87% of poems. Phonetics they half-use still keep the poem
 *            legible as sound and drive the TTS follow-along; noise beats blank.
 *            Revisit if #713 ever backfills translations.
 */
const POSTURE_KEY = 'reading-posture';
/**
 * What each reading posture puts on screen. One layer added per rung:
 *
 *   arabic    the poem alone
 *   english   + the translation
 *   learning  + the transliteration
 *
 * `learning` and `english` were previously identical — both turned on
 * translation and transliteration — so the middle choice in the flow decided
 * nothing. A reader who wants the English without a romanisation running under
 * every line had no way to ask for it.
 */
export const POSTURES = {
  arabic: { showTranslation: false, showTransliteration: false },
  english: { showTranslation: true, showTransliteration: false },
  learning: { showTranslation: true, showTransliteration: true },
};
const loadPosture = () => {
  try {
    const v = localStorage.getItem(POSTURE_KEY);
    if (v && POSTURES[v]) return v;
  } catch {}
  return null;
};
const persistPosture = (posture) => {
  try {
    if (posture) localStorage.setItem(POSTURE_KEY, posture);
    else localStorage.removeItem(POSTURE_KEY);
  } catch {}
};

export const CATEGORY_MAP = {
  user: { color: '#00bcd4', prefix: 'USER' },
  request: { color: '#ff9800', prefix: '  →' },
  success: { color: '#4caf50', prefix: '  ←' },
  error: { color: '#ef4444', prefix: '← FAIL' },
  // Distinct from error: a warning is something to look at, not something that
  // broke. Sharing the red FAIL prefix made recoverable states read as outages.
  warning: { color: '#f59e0b', prefix: '⚠ WARN' },
  info: { color: '#78909c', prefix: ' SYS' },
};

const initialState = {
  darkMode: true,
  font: 'Amiri',
  textSize: 1, // 0=S, 1=M, 2=L, 3=XL — default Medium so the reader matches the prototype size exactly
  // Seeded from the saved reading posture when there is one; the old fixed
  // defaults (translation on, transliteration off) remain the answer for a
  // reader who never took onboarding.
  readingPosture: loadPosture(),
  showTranslation: POSTURES[loadPosture()]?.showTranslation ?? true,
  showTransliteration: POSTURES[loadPosture()]?.showTransliteration ?? false,
  showDebugLogs: FEATURES.debug,
  ratchetMode: false, // Ratchet Mode: explains poems in Gen Z / gangster slang
  ttsMode: loadTtsMode(), // 'rest' | 'live' — defaults to 'live' (streaming)
  liveVoice: loadLiveVoice(), // selected speaking voice, persisted (default DEFAULT_VOICE)
  curated: loadCurated(), // curated feed on/off, persisted (default off)
  showDislike: loadShowDislike(), // dislike button in the nav pill, persisted (default off)
  liveTemperature: 0.35,
  highlightStyle: 'pill', // 'none' | 'glow' | 'underline' | 'pill' | 'focus-blur'
  actionWeight: 'bold', // reader action buttons: 'quiet' | 'balanced' | 'bold' (molten) — visual intensity
  insightsMode: 'inline', // 'inline' = end-of-poem expand | 'drawer' = Vaul InsightOverlay (A/B test)
  tourActive: false, // walkthrough running — overlays suppress outside-dismiss so the tour drives them
  logs: [],
  headerOpacity: 0,
  // Background settings
  bgOpacity: 1.55, // multiplier for stroke opacity (1.55 = 155% of theme default)
  bgColor: '', // hex override for line colour; '' = use theme default
  bgParallax: 0.08, // parallax drift factor (0.08 = 8% of scroll speed)
  bgPattern: '8.5', // currently-selected pattern from generator favorites
  // Sparkle / particle controls
  sparkleEnabled: true, // show gold sparkle particles
  sparkleMode: 'particles', // 'particles' = gold ambient, 'ray-tracing' = L&S white rays
  sparkleGlow: true, // central radial glow is permanently on
  sparkleBrightness: 1.0, // opacity multiplier for particles
  sparkleSpeed: 1.0, // speed multiplier for particles
  sparkleAmount: 35, // ambient particle count (insight always uses ACTIVE_COUNT=60)
  sparkleColor: '#c5a059', // base color for particles (gold by default)
  cacheStats: {
    audioHits: 0,
    audioMisses: 0,
    insightsHits: 0,
    insightsMisses: 0,
  },
};

export const useUIStore = create((set, get) => ({
  ...initialState,

  setTtsMode: (ttsMode) => {
    persistTtsMode(ttsMode);
    set({ ttsMode });
  },
  setLiveVoice: (liveVoice) => {
    persistLiveVoice(liveVoice);
    set({ liveVoice });
  },
  setCurated: (curated) => {
    persistCurated(curated);
    set({ curated });
  },
  toggleCurated: () =>
    set((s) => {
      persistCurated(!s.curated);
      return { curated: !s.curated };
    }),
  toggleShowDislike: () =>
    set((s) => {
      persistShowDislike(!s.showDislike);
      return { showDislike: !s.showDislike };
    }),
  setLiveTemperature: (liveTemperature) => set({ liveTemperature }),
  setHighlightStyle: (highlightStyle) => set({ highlightStyle }),
  setActionWeight: (actionWeight) => set({ actionWeight }),
  setInsightsMode: (insightsMode) => set({ insightsMode }),
  toggleInsightsMode: () =>
    set((s) => ({ insightsMode: s.insightsMode === 'inline' ? 'drawer' : 'inline' })),
  setTourActive: (tourActive) => set({ tourActive }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setFont: (font) => set({ font }),
  setTextSize: (textSize) => set({ textSize }),
  setShowTranslation: (showTranslation) => set({ showTranslation }),
  setShowTransliteration: (showTransliteration) => set({ showTransliteration }),

  /**
   * Apply a reading posture, persist it, and set the two aids from it.
   *
   * Passing null clears the posture without touching the aids — a reader who
   * skipped the question keeps whatever they already had rather than being
   * reset to the fluent-reader default.
   */
  setReadingPosture: (posture) => {
    const preset = POSTURES[posture];
    persistPosture(preset ? posture : null);
    set(preset ? { readingPosture: posture, ...preset } : { readingPosture: null });
  },
  setHeaderOpacity: (headerOpacity) => set({ headerOpacity }),
  toggleRatchetMode: () => set((s) => ({ ratchetMode: !s.ratchetMode })),
  setBgOpacity: (bgOpacity) => set({ bgOpacity }),
  setBgColor: (bgColor) => set({ bgColor }),
  setBgParallax: (bgParallax) => set({ bgParallax }),
  setBgPattern: (bgPattern) => set({ bgPattern }),
  setSparkleEnabled: (sparkleEnabled) => set({ sparkleEnabled }),
  setSparkleMode: (sparkleMode) => set({ sparkleMode }),
  setSparkleGlow: (sparkleGlow) => set({ sparkleGlow }),
  setSparkleBrightness: (sparkleBrightness) => set({ sparkleBrightness }),
  setSparkleSpeed: (sparkleSpeed) => set({ sparkleSpeed }),
  setSparkleAmount: (sparkleAmount) => set({ sparkleAmount }),
  setSparkleColor: (sparkleColor) => set({ sparkleColor }),

  cycleFont: () =>
    set((s) => {
      const idx = FONTS.findIndex((f) => f.id === s.font);
      const next = (idx + 1) % FONTS.length;
      return { font: FONTS[next].id };
    }),

  cycleTextSize: () => set((s) => ({ textSize: (s.textSize + 1) % 4 })),

  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
  toggleDebugLogs: () => set((s) => ({ showDebugLogs: !s.showDebugLogs })),

  addLog: (label, msg, type = 'info') => {
    const now = performance.now();
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    set((s) => {
      const t0 = s.logs.length > 0 ? s.logs[0].ts : now;
      const relSec = ((now - t0) / 1000).toFixed(1);
      const entry = {
        label,
        msg: String(msg),
        type,
        time,
        ts: now,
        rel: `+${relSec}s`,
        category: type,
      };
      const next = [...s.logs, entry];
      return { logs: next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next };
    });
    if (FEATURES.logging) {
      const cat = CATEGORY_MAP[type] || CATEGORY_MAP.info;
      const style = `color:${cat.color};font-weight:bold`;
      const fn = type === 'error' ? console.error : console.log;
      fn(
        `%c${cat.prefix}%c [${label}] ${msg}`,
        style,
        `color:${cat.color};font-weight:normal;opacity:0.85`
      );
    }
  },

  clearLogs: () => set({ logs: [] }),

  incrementCacheStat: (key) =>
    set((s) => ({
      cacheStats: { ...s.cacheStats, [key]: (s.cacheStats[key] || 0) + 1 },
    })),

  loadSettings: ({ darkMode, font }) => set({ darkMode, font }),

  // Derived value helpers (called as functions, not computed properties)
  theme: () => (get().darkMode ? THEME.dark : THEME.light),
  fontClass: () => {
    const f = FONTS.find((x) => x.id === get().font);
    return f ? f.family : FONTS[0].family;
  },

  reset: () => set(initialState),
}));
