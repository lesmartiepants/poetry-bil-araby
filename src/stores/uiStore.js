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
  logs: [],
};

export const useUIStore = create((set, get) => ({
  ...initialState,

  setDarkMode: (darkMode) => set({ darkMode }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setFont: (font) => set({ font }),
  setTextSize: (textSize) => set({ textSize }),
  setShowTranslation: (showTranslation) => set({ showTranslation }),
  setShowTransliteration: (showTransliteration) => set({ showTransliteration }),

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

  addLog: (label, message, level) =>
    set((s) => {
      const entry = { label, message, level, timestamp: Date.now() };
      const next = [...s.logs, entry];
      return { logs: next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next };
    }),

  loadSettings: ({ darkMode, font }) => set({ darkMode, font }),

  // Derived value helpers (called as functions, not computed properties)
  theme: () => (get().darkMode ? THEME.dark : THEME.light),
  fontClass: () => {
    const f = FONTS.find((x) => x.id === get().font);
    return f ? f.family : FONTS[0].family;
  },

  reset: () => set(initialState),
}));
