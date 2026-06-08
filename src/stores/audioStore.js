import { create } from 'zustand';

const initialState = {
  silenceGaps: [],
  isPlaying: false,
  isGenerating: false,
  url: null,
  error: null,
  // Tone.Player instance — shared across togglePlay and useVolumeDetection
  player: null,
  // Real per-word timings from the Live TTS transcript (null = use VAD/char estimate).
  // Shape: [{ word, start, end }] in spoken order; set after a successful Live gen.
  wordTimings: null,
};

export const useAudioStore = create((set) => ({
  ...initialState,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setUrl: (url) => set({ url }),
  setError: (error) => set({ error }),
  setPlayer: (player) => set({ player }),
  setWordTimings: (wordTimings) => set({ wordTimings }),
  setSilenceGaps: (silenceGaps) => set({ silenceGaps }),

  resetAudio: () =>
    set({ isPlaying: false, isGenerating: false, url: null, error: null, player: null, wordTimings: null }),

  reset: () => set(initialState),
}));
