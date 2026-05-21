import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Zustand stores before importing the hook
vi.mock('../stores/audioStore', () => ({
  useAudioStore: {
    getState: vi.fn(() => ({ isPlaying: false, player: null })),
    subscribe: vi.fn(() => () => {}),
  },
}));

import { useAudioStore } from '../stores/audioStore';
import { useTTSHighlight, playbackStartTime, pauseOffset, startPlayer, recordPause } from '../hooks/useTTSHighlight.js';

// rAF mock
let rafCallbacks = [];
let rafIdCounter = 0;
const mockRaf = vi.fn((cb) => {
  const id = ++rafIdCounter;
  rafCallbacks.push({ id, cb });
  return id;
});
const mockCaf = vi.fn((id) => {
  rafCallbacks = rafCallbacks.filter((r) => r.id !== id);
});

// Captured subscribe listeners per test
let subscribeListeners = [];

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 0;
  subscribeListeners = [];
  global.requestAnimationFrame = mockRaf;
  global.cancelAnimationFrame = mockCaf;
  vi.clearAllMocks();
  useAudioStore.getState.mockReturnValue({ isPlaying: false, player: null });
  // Capture listener so tests can invoke it
  useAudioStore.subscribe.mockImplementation((listener) => {
    subscribeListeners.push(listener);
    return () => {};
  });
});

afterEach(() => {
  rafCallbacks = [];
  subscribeListeners = [];
});

// Trigger a state transition via the captured subscribe listener
function triggerIsPlaying(isPlaying, wasPlaying) {
  subscribeListeners.forEach((l) =>
    l({ isPlaying }, { isPlaying: wasPlaying })
  );
}

// Helper: flush one rAF tick
function flushRaf() {
  const toFlush = [...rafCallbacks];
  rafCallbacks = [];
  toFlush.forEach(({ cb }) => cb(performance.now()));
}

describe('useTTSHighlight', () => {
  it('does not start rAF loop when isPlaying is false', () => {
    useAudioStore.getState.mockReturnValue({ isPlaying: false, player: null });
    const wordRefs = [];
    renderHook(() => useTTSHighlight({ wordRefs, timings: [], totalDuration: 0 }));
    expect(mockRaf).not.toHaveBeenCalled();
  });

  it('starts rAF loop when isPlaying becomes true via subscribe', () => {
    const wordRefs = [];
    renderHook(() => useTTSHighlight({ wordRefs, timings: [], totalDuration: 5 }));

    act(() => triggerIsPlaying(true, false));

    expect(mockRaf).toHaveBeenCalled();
  });

  it('cancels rAF loop when isPlaying becomes false', () => {
    const wordRefs = [];
    renderHook(() => useTTSHighlight({ wordRefs, timings: [], totalDuration: 5 }));

    act(() => triggerIsPlaying(true, false));
    expect(mockRaf).toHaveBeenCalled();

    act(() => triggerIsPlaying(false, true));
    expect(mockCaf).toHaveBeenCalled();
  });

  it('adds tts-active class to the current word span at t=0', () => {
    const span0 = document.createElement('span');
    const span1 = document.createElement('span');
    const wordRefs = [{ current: span0 }, { current: span1 }];
    const timings = [
      { word: 'hello', start: 0, end: 3 },
      { word: 'world', start: 3, end: 6 },
    ];

    // Set playbackStartTime so elapsed ≈ 0
    playbackStartTime.value = Date.now() / 1000;
    pauseOffset.value = 0;

    renderHook(() => useTTSHighlight({ wordRefs, timings, totalDuration: 6 }));
    act(() => triggerIsPlaying(true, false));
    act(() => flushRaf());

    expect(span0.classList.contains('tts-active')).toBe(true);
    expect(span1.classList.contains('tts-active')).toBe(false);
  });

  it('does not add tts-past at t=0 (no prior words)', () => {
    const span0 = document.createElement('span');
    const wordRefs = [{ current: span0 }];
    const timings = [{ word: 'a', start: 0, end: 5 }];

    playbackStartTime.value = Date.now() / 1000;
    pauseOffset.value = 0;

    renderHook(() => useTTSHighlight({ wordRefs, timings, totalDuration: 5 }));
    act(() => triggerIsPlaying(true, false));
    act(() => flushRaf());

    expect(span0.classList.contains('tts-past')).toBe(false);
    expect(span0.classList.contains('tts-active')).toBe(true);
  });

  it('clears tts-active class from all spans on unmount', () => {
    const span0 = document.createElement('span');
    span0.classList.add('tts-active');
    const wordRefs = [{ current: span0 }];

    const { unmount } = renderHook(() =>
      useTTSHighlight({ wordRefs, timings: [{ word: 'hi', start: 0, end: 2 }], totalDuration: 2 })
    );

    unmount();

    expect(span0.classList.contains('tts-active')).toBe(false);
  });

  it('does not crash when wordRefs contains null entries', () => {
    const wordRefs = [{ current: null }, { current: null }];
    const timings = [
      { word: 'a', start: 0, end: 3 },
      { word: 'b', start: 3, end: 6 },
    ];

    playbackStartTime.value = Date.now() / 1000;
    pauseOffset.value = 0;

    renderHook(() => useTTSHighlight({ wordRefs, timings, totalDuration: 6 }));
    act(() => triggerIsPlaying(true, false));
    expect(() => act(() => flushRaf())).not.toThrow();
  });

  it('starts loop immediately if already playing when hook mounts', () => {
    useAudioStore.getState.mockReturnValue({ isPlaying: true, player: null });
    const wordRefs = [];
    renderHook(() => useTTSHighlight({ wordRefs, timings: [], totalDuration: 5 }));
    expect(mockRaf).toHaveBeenCalled();
  });
});

describe('startPlayer and recordPause', () => {
  it('startPlayer calls player.start with the given offset', () => {
    const mockPlayer = { start: vi.fn() };
    startPlayer(mockPlayer, 2.5);
    expect(mockPlayer.start).toHaveBeenCalledWith(undefined, 2.5);
  });

  it('startPlayer sets playbackStartTime.value to a recent timestamp', () => {
    const mockPlayer = { start: vi.fn() };
    const before = Date.now() / 1000;
    startPlayer(mockPlayer, 0);
    const after = Date.now() / 1000;
    expect(playbackStartTime.value).toBeGreaterThanOrEqual(before);
    expect(playbackStartTime.value).toBeLessThanOrEqual(after + 0.01);
  });

  it('startPlayer sets pauseOffset.value to the provided offset', () => {
    const mockPlayer = { start: vi.fn() };
    startPlayer(mockPlayer, 3.7);
    expect(pauseOffset.value).toBeCloseTo(3.7);
  });

  it('recordPause stores a non-negative number in pauseOffset', () => {
    const mockPlayer = { start: vi.fn() };
    startPlayer(mockPlayer, 0);
    recordPause();
    expect(typeof pauseOffset.value).toBe('number');
    expect(pauseOffset.value).toBeGreaterThanOrEqual(0);
  });
});
