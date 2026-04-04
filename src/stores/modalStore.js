import { create } from 'zustand';
import { FEATURES } from '../constants/features';

function computeOnboarding() {
  return FEATURES.onboarding;
}

function computeSplash() {
  return true;
}

const initialState = {
  authModal: false,
  authMessage: '',
  savedPoems: false,
  splash: computeSplash(),
  insightsDrawer: false,
  discoverDrawer: false,
  prefsDrawer: false,
  shortcutHelp: false,
  poetPicker: false,
  poetPickerClosing: false,
  copyToast: false,
  shareToast: false,
  insightToast: false,
  shareCard: false,
  onboarding: computeOnboarding(),
};

const TOAST_MAP = {
  copy: 'copyToast',
  share: 'shareToast',
  insight: 'insightToast',
};

export const useModalStore = create((set) => ({
  ...initialState,

  openAuth: (message = '') => set({ authModal: true, authMessage: message }),
  closeAuth: () => set({ authModal: false, authMessage: '' }),

  openSavedPoems: () => set({ savedPoems: true }),
  closeSavedPoems: () => set({ savedPoems: false }),

  dismissSplash: () => set({ splash: false }),

  completeOnboarding: (prefs) => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem(
        'onboardingPrefs',
        JSON.stringify({
          ...prefs,
          completedAt: new Date().toISOString(),
        })
      );
    } catch {}
    set({ splash: false, onboarding: false });
  },

  toggleInsightsDrawer: () => set((s) => ({ insightsDrawer: !s.insightsDrawer })),
  setInsightsDrawer: (open) => set({ insightsDrawer: open }),

  openDiscoverDrawer: () => set({ discoverDrawer: true }),
  closeDiscoverDrawer: () => set({ discoverDrawer: false }),
  setDiscoverDrawer: (open) => set({ discoverDrawer: open }),

  openPrefsDrawer: () => set({ prefsDrawer: true }),
  closePrefsDrawer: () => set({ prefsDrawer: false }),

  resetPreferences: () => {
    try {
      localStorage.removeItem('onboardingPrefs');
    } catch {}
    set({ onboarding: false });
  },

  toggleShortcutHelp: () => set((s) => ({ shortcutHelp: !s.shortcutHelp })),
  closeShortcutHelp: () => set({ shortcutHelp: false }),

  openPoetPicker: () => set({ poetPicker: true }),
  closePoetPicker: () => set({ poetPicker: false }),
  setPoetPickerClosing: (closing) => set({ poetPickerClosing: closing }),

  openShareCard: () => set({ shareCard: true }),
  closeShareCard: () => set({ shareCard: false }),

  showToast: (type) => set({ [TOAST_MAP[type]]: true }),
  hideToast: (type) => set({ [TOAST_MAP[type]]: false }),
  showToastTimed: (type, ms = 2000) => {
    set({ [TOAST_MAP[type]]: true });
    setTimeout(() => set({ [TOAST_MAP[type]]: false }), ms);
  },

  // Boolean setters (avoid wrapper functions in components)
  setPoetPicker: (open) => set({ poetPicker: open }),
  setAuthModal: (open, message = '') =>
    open
      ? set({ authModal: true, authMessage: message })
      : set({ authModal: false, authMessage: '' }),
  setSavedPoemsOpen: (open) => set({ savedPoems: open }),

  closeAll: () =>
    set({
      authModal: false,
      authMessage: '',
      savedPoems: false,
      insightsDrawer: false,
      discoverDrawer: false,
      shortcutHelp: false,
      poetPicker: false,
      shareCard: false,
    }),

  reset: () => set({ ...initialState, splash: computeSplash(), onboarding: computeOnboarding() }),
}));
