import { create } from 'zustand';

const initialState = {
  isPlaying: false,
  isGenerating: false,
  url: null,
  error: null,
  // Tone.Player instance — shared across togglePlay and useVolumeDetection
  player: null,
};

export const useAudioStore = create((set) => ({
  ...initialState,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setUrl: (url) => set({ url }),
  setError: (error) => set({ error }),
  setPlayer: (player) => set({ player }),

  resetAudio: () => set({ isPlaying: false, isGenerating: false, url: null, error: null, player: null }),

  reset: () => set(initialState),
}));

// Test/dev observability hook. Real audio can't play in headless Chromium, so
// the only reliable signal that the playback pipeline ran is the store's
// isPlaying flag. Expose the store on window in dev builds (the target of the
// E2E suite via `npm run dev`) so Playwright can assert playback state. Gated
// to import.meta.env.DEV — never present in production bundles.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__audioStore = useAudioStore;
}
