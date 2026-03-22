import { create } from 'zustand';
import { FEATURES } from '../constants/features';
import { THEME } from '../constants/theme';
import { FONTS } from '../constants/fonts';

const MAX_LOGS = 200;

const initialState = {
  darkMode: true,
  font: 'Amiri',
  textSize: 1, // 0=S, 1=M, 2=L, 3=XL
  showTranslation: true,
  showTransliteration: false,
  showDebugLogs: FEATURES.debug,
  ratchetMode: false,
  logs: [],
  headerOpacity: 0,
  cacheStats: {
    audioHits: 0,
    audioMisses: 0,
    insightsHits: 0,
    insightsMisses: 0,
  },
};

export const useUIStore = create((set, get) => ({
  ...initialState,

  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setFont: (font) => set({ font }),
  setTextSize: (textSize) => set({ textSize }),
  setShowTranslation: (showTranslation) => set({ showTranslation }),
  setShowTransliteration: (showTransliteration) => set({ showTransliteration }),
  setHeaderOpacity: (headerOpacity) => set({ headerOpacity }),

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
  setRatchetMode: (ratchetMode) => set({ ratchetMode }),
  toggleRatchetMode: () => set((s) => ({ ratchetMode: !s.ratchetMode })),

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
      const entry = { label, msg: String(msg), type, time, ts: now, rel: `+${relSec}s` };
      const next = [...s.logs, entry];
      return { logs: next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next };
    });
    if (FEATURES.logging) {
      const logFn =
        type === 'error' ? console.error : type === 'success' ? console.info : console.log;
      logFn(`[${label}] ${msg}`);
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
