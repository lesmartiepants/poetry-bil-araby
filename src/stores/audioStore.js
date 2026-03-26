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
