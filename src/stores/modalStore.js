import { create } from 'zustand';
import { FEATURES } from '../constants/features';

function computeOnboarding() {
  if (!FEATURES.onboarding) return false;
  if (FEATURES.forceOnboarding) return true;
  try {
    return !localStorage.getItem('hasSeenOnboarding');
  } catch {
    return false;
  }
}

function computeSplash() {
  try {
    return !localStorage.getItem('hasSeenOnboarding');
  } catch {
    return true;
  }
}

const initialState = {
  authModal: false,
  authMessage: '',
  savedPoems: false,
  splash: computeSplash(),
  insightsDrawer: false,
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

  toggleInsightsDrawer: () => set((s) => ({ insightsDrawer: !s.insightsDrawer })),
  setInsightsDrawer: (open) => set({ insightsDrawer: open }),

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
      shortcutHelp: false,
      poetPicker: false,
      shareCard: false,
    }),

  reset: () => set({ ...initialState, splash: computeSplash(), onboarding: computeOnboarding() }),
}));
