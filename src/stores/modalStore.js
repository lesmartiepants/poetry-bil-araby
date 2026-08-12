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
  if (!FEATURES.landing) return false;
  try {
    return !localStorage.getItem('hasSeenOnboarding');
  } catch {
    return true;
  }
}

// The walkthrough never opens itself on landing — the reader asks for it from the
// account menu. The only boot-time openers are an explicit `?tour=…` deep link and
// the dev-only forceTour flag.
function computeTour() {
  if (!FEATURES.tour) return false;
  if (FEATURES.forceTour) return true;
  try {
    return !!new URLSearchParams(window.location.search).get('tour');
  } catch {
    return false;
  }
}

const initialState = {
  authModal: false,
  authMessage: '',
  savedPoems: false,
  splash: computeSplash(),
  insightsDrawer: false,
  discoverDrawer: false,
  categoryExplorer: false,
  shortcutHelp: false,
  poetPicker: false,
  poetPickerClosing: false,
  copyToast: false,
  shareToast: false,
  insightToast: false,
  shareCard: false,
  displaySettings: false,
  onboarding: computeOnboarding(),
  tour: computeTour(),
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

  openDiscoverDrawer: () => set({ discoverDrawer: true }),
  closeDiscoverDrawer: () => set({ discoverDrawer: false }),
  setDiscoverDrawer: (open) => set({ discoverDrawer: open }),

  openCategoryExplorer: () => set({ categoryExplorer: true }),
  closeCategoryExplorer: () => set({ categoryExplorer: false }),
  setCategoryExplorer: (open) => set({ categoryExplorer: open }),

  toggleShortcutHelp: () => set((s) => ({ shortcutHelp: !s.shortcutHelp })),
  closeShortcutHelp: () => set({ shortcutHelp: false }),

  openPoetPicker: () => set({ poetPicker: true }),
  closePoetPicker: () => set({ poetPicker: false }),
  setPoetPickerClosing: (closing) => set({ poetPickerClosing: closing }),

  openShareCard: () => set({ shareCard: true }),
  closeShareCard: () => set({ shareCard: false }),

  // Display (text/background) settings panel — opened from the account menu.
  openDisplaySettings: () => set({ displaySettings: true }),
  closeDisplaySettings: () => set({ displaySettings: false }),
  setDisplaySettings: (open) => set({ displaySettings: open }),

  // Guided walkthrough — opened from the account menu ("Take the tour" / "Resume tour"),
  // restarted from the corner compass, never on its own.
  openTour: () => set({ tour: true }),
  closeTour: () => set({ tour: false }),
  setTour: (open) => set({ tour: open }),

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
      categoryExplorer: false,
      shortcutHelp: false,
      poetPicker: false,
      shareCard: false,
      displaySettings: false,
    }),

  reset: () =>
    set({
      ...initialState,
      splash: computeSplash(),
      onboarding: computeOnboarding(),
      tour: computeTour(),
    }),
}));
