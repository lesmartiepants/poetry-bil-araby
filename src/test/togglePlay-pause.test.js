import { describe, it, expect, vi, beforeEach } from 'vitest';

// Heavy/native imports that togglePlay pulls in at module load — stub them so
// the module imports cleanly under happy-dom. The pause branch under test
// returns early and never touches these.
vi.mock('tone', () => ({
  Player: class {
    constructor(_url, cb) {
      if (cb) cb();
      this.buffer = { onerror: null };
    }
    toDestination() {
      return this;
    }
  },
  start: vi.fn().mockResolvedValue(undefined),
  getContext: () => ({ rawContext: {} }),
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
  }),
}));
vi.mock('../sentry.js', () => ({ default: { captureException: vi.fn() } }));

import { togglePlay } from '../stores/actions/togglePlay.js';
import { useAudioStore } from '../stores/audioStore';

describe('togglePlay — pause', () => {
  beforeEach(() => {
    useAudioStore.setState({ isPlaying: false, isGenerating: false, url: null, player: null });
  });

  it('pauses even while a live stream is still in flight (isTogglingPlay stuck true)', async () => {
    const stop = vi.fn();
    useAudioStore.setState({ isPlaying: true, player: { stop } });

    // A live stream holds isTogglingPlay.current = true the whole time it plays.
    // The pause press must NOT be swallowed by the debounce guard.
    const isTogglingPlay = { current: true };
    await togglePlay({ isTogglingPlay, current: { id: 1 }, addLog: vi.fn(), track: vi.fn() });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });

  it('treats the press as a pause (not a play) and stops the player', async () => {
    const stop = vi.fn();
    useAudioStore.setState({ isPlaying: true, player: { stop } });
    const track = vi.fn();

    await togglePlay({ isTogglingPlay: { current: false }, current: { id: 1 }, addLog: vi.fn(), track });

    expect(track).toHaveBeenCalledWith('audio_pause', expect.anything());
    expect(track).not.toHaveBeenCalledWith('audio_play', expect.anything());
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });
});
