import { create } from 'zustand';

const initialState = {
  isPlaying: false,
  isGenerating: false,
  url: null,
  error: null,
};

export const useAudioStore = create((set) => ({
  ...initialState,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setUrl: (url) => set({ url }),
  setError: (error) => set({ error }),

  resetAudio: () => set({ isPlaying: false, isGenerating: false, url: null, error: null }),

  reset: () => set(initialState),
}));
