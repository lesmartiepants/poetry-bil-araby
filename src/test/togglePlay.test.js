/**
 * Unit tests for the togglePlay debounce-guard fix (#589).
 *
 * Bug: on the first play of a poem in live-streaming mode, isTogglingPlay.current
 * stays true for the full stream duration (it's only reset in doGenerate's finally
 * block). Once the first audio chunk arrives, setGenerating(false) and setPlaying(true)
 * are called, but isTogglingPlay.current is still true. A subsequent pause press is
 * therefore blocked by the debounce guard, silently dropping the first pause.
 *
 * Fix: guard becomes `!isPlaying && (isTogglingPlay.current || isGenerating)` so
 * that a pause (isPlaying=true) is always allowed through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { useAudioStore } from '../stores/audioStore';

// ─── Static contract tests (file-content checks) ────────────────────────────

const SRC = path.resolve(__dirname, '..');
const TOGGLE_PLAY_SRC = path.join(SRC, 'stores/actions/togglePlay.js');

describe('togglePlay guard — static contract (#589)', () => {
  it('guard allows pause to bypass when isPlaying is true', () => {
    const content = fs.readFileSync(TOGGLE_PLAY_SRC, 'utf-8');
    // The guard must gate on !isPlaying so pause is never blocked
    expect(content).toMatch(
      /!isPlaying\s*&&\s*\(\s*isTogglingPlay\.current\s*\|\|\s*isGenerating\s*\)/
    );
  });

  it('still preserves the isTogglingPlay debounce guard for play path', () => {
    const content = fs.readFileSync(TOGGLE_PLAY_SRC, 'utf-8');
    expect(content).toMatch(/isTogglingPlay\.current/);
  });

  it('comment references the bug number', () => {
    const content = fs.readFileSync(TOGGLE_PLAY_SRC, 'utf-8');
    expect(content).toMatch(/#589/);
  });
});

// ─── Behavioural unit tests ──────────────────────────────────────────────────

// Mock all heavyweight / network-dependent dependencies so togglePlay can be
// imported and exercised without a real browser or TTS back-end.

vi.mock('tone', () => ({
  Player: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn(() => ({ rawContext: {} })),
}));

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));
vi.mock('lucide-react', () => ({ Rabbit: vi.fn(() => null) }));
vi.mock('framer-motion', () => ({
  motion: { div: vi.fn(({ children }) => children) },
}));
vi.mock('../sentry.js', () => ({ default: { captureException: vi.fn() } }));
vi.mock('../hooks/useTTSHighlight.js', () => ({
  startPlayer: vi.fn(),
  recordPause: vi.fn(),
  pauseOffset: { value: 0 },
}));
vi.mock('../services/gemini.js', () => ({
  API_MODELS: { tts: 'test-model' },
  TTS_CONFIG: { responseModalities: ['AUDIO'] },
  fetchTTSWithFallback: vi
    .fn()
    .mockResolvedValue({ res: { ok: false, status: 500, text: async () => 'err' }, model: 'test' }),
}));
vi.mock('../services/cache.js', () => ({
  cacheOperations: { get: vi.fn().mockResolvedValue(null), set: vi.fn() },
  CACHE_CONFIG: { stores: { audio: 'audio' } },
  audioCacheKey: vi.fn(() => 'key'),
}));
vi.mock('../prompts', () => ({
  getTTSContent: vi.fn(() => 'test arabic'),
  getLiveContent: vi.fn(() => 'test arabic'),
  LIVE_SYSTEM_INSTRUCTION: '',
}));
vi.mock('../utils/audio.js', () => ({ pcm16ToWav: vi.fn(() => null) }));
vi.mock('../utils/liveAudioStream.js', () => ({
  createStreamingPlayer: vi.fn(),
  consumeSSE: vi.fn(),
  pcmBase64ToInt16: vi.fn(),
  concatPcmBase64: vi.fn(),
}));

describe('togglePlay guard — behaviour (#589)', () => {
  beforeEach(() => {
    useAudioStore.getState().reset();
  });

  it('allows pause during active live streaming (first pause must not be dropped)', async () => {
    // Simulate the state that exists once the first chunk arrives during live streaming:
    // - isPlaying=true  (setPlaying(true) was called by onChunk)
    // - isGenerating=false (setGenerating(false) was called by onChunk)
    // - isTogglingPlay.current=true (doGenerate's finally hasn't run yet)
    useAudioStore.getState().setPlaying(true);
    useAudioStore.getState().setGenerating(false);

    const mockPlayer = { stop: vi.fn(), onstop: null };
    useAudioStore.getState().setPlayer(mockPlayer);

    const isTogglingPlay = { current: true }; // held by the live stream
    const addLog = vi.fn();
    const track = vi.fn();
    const current = { id: 1, poet: 'Test Poet', title: 'Test Poem', arabic: 'بيت شعر' };

    const { togglePlay } = await import('../stores/actions/togglePlay.js');
    await togglePlay({ audioRef: {}, isTogglingPlay, current, addLog, track });

    // Pause must have gone through: isPlaying should now be false
    expect(useAudioStore.getState().isPlaying).toBe(false);
    // Guard flag must be released
    expect(isTogglingPlay.current).toBe(false);
    // Player.stop() must have been called
    expect(mockPlayer.stop).toHaveBeenCalled();
  });

  it('prevents concurrent play operations when generation is already in progress', async () => {
    // isPlaying=false means the user is trying to start playback, not pause.
    // isTogglingPlay.current=true means a prior play/generate is in progress.
    // The guard must block this to prevent concurrent generation.
    useAudioStore.getState().setPlaying(false);
    useAudioStore.getState().setGenerating(false);

    const isTogglingPlay = { current: true };
    const addLog = vi.fn();
    const track = vi.fn();
    const current = { id: 1, poet: 'Test Poet', title: 'Test Poem', arabic: 'بيت شعر' };

    const { togglePlay } = await import('../stores/actions/togglePlay.js');
    await togglePlay({ audioRef: {}, isTogglingPlay, current, addLog, track });

    // Should have been skipped — isPlaying stays false and no actions taken
    expect(useAudioStore.getState().isPlaying).toBe(false);
    expect(addLog).toHaveBeenCalledWith(
      'Audio',
      expect.stringMatching(/already in progress/i),
      'info'
    );
  });
});
