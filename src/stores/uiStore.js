import { create } from 'zustand';
import { FEATURES } from '../constants/features';
import { THEME } from '../constants/theme';
import { FONTS } from '../constants/fonts';

const MAX_LOGS = 200;

export const CATEGORY_MAP = {
  user: { color: '#00bcd4', prefix: 'USER' },
  request: { color: '#ff9800', prefix: '  →' },
  success: { color: '#4caf50', prefix: '  ←' },
  error: { color: '#ef4444', prefix: '← FAIL' },
  warning: { color: '#ef4444', prefix: '← FAIL' },
  info: { color: '#78909c', prefix: ' SYS' },
};

const initialState = {
  darkMode: true,
  font: 'Amiri',
  textSize: 1, // 0=S, 1=M, 2=L, 3=XL
  showTranslation: true,
  showTransliteration: false,
  showDebugLogs: FEATURES.debug,
  ratchetMode: false, // Ratchet Mode: explains poems in Gen Z / gangster slang
  ttsMode: 'rest', // 'rest' | 'live'
  liveVoice: 'Orus',
  liveTemperature: 0,
  highlightStyle: 'pill', // 'none' | 'glow' | 'underline' | 'pill' | 'focus-blur'
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

  setTtsMode: (ttsMode) => set({ ttsMode }),
  setLiveVoice: (liveVoice) => set({ liveVoice }),
  setLiveTemperature: (liveTemperature) => set({ liveTemperature }),
  setHighlightStyle: (highlightStyle) => set({ highlightStyle }),
  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setFont: (font) => set({ font }),
  setTextSize: (textSize) => set({ textSize }),
  setShowTranslation: (showTranslation) => set({ showTranslation }),
  setShowTransliteration: (showTransliteration) => set({ showTransliteration }),
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
