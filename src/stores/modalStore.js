import { create } from 'zustand';

const initialState = {
  authModal: false,
  authMessage: '',
  savedPoems: false,
  splash: true,
  insightsDrawer: false,
  shortcutHelp: false,
  poetPicker: false,
  copyToast: false,
  shareToast: false,
  insightToast: false,
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

  openPoetPicker: () => set({ poetPicker: true }),
  closePoetPicker: () => set({ poetPicker: false }),

  showToast: (type) => set({ [TOAST_MAP[type]]: true }),
  hideToast: (type) => set({ [TOAST_MAP[type]]: false }),

  closeAll: () =>
    set({
      authModal: false,
      authMessage: '',
      savedPoems: false,
      insightsDrawer: false,
      shortcutHelp: false,
      poetPicker: false,
    }),

  reset: () => set(initialState),
}));
