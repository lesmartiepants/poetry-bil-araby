/**
 * Behavioral test for the TTS REST<->Live fallback (workflow @wf-tts-fallback).
 *
 * This is the gap the source-grep tests in makeover-tone.test.js could never catch:
 * those assert the file CONTAINS a fallback loop; this asserts the loop actually
 * switches transports when one path fails and still reaches playback.
 *
 * Transport disambiguation: the REST path goes through fetchTTSWithFallback
 * (mocked module), the Live path goes through raw global.fetch to /api/ai/live-tts.
 * So which mock fired tells us which transport ran, and in what order.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock every dependency of togglePlay.js ────────────────────────────────
vi.mock('tone', () => ({
  // createPlayerReady (non-iOS) does `new Player(url, onload).toDestination()`
  // and resolves when onload fires. Fire it on next tick.
  Player: class {
    constructor(_url, onload) {
      this.buffer = {};
      if (onload) setTimeout(onload, 0);
    }
    toDestination() {
      return this;
    }
    start() {}
    stop() {}
  },
  start: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));
vi.mock('lucide-react', () => ({ Rabbit: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: () => null } }));
// NOTE: vi.mock paths resolve relative to THIS test file (src/test/),
// not relative to togglePlay.js. So they differ from the import paths
// written inside togglePlay.js.
vi.mock('../sentry.js', () => ({ default: { captureException: vi.fn() } }));
vi.mock('../constants/features', () => ({
  // caching:false skips the IndexedDB branch so the test goes straight to generation.
  FEATURES: { caching: false, logging: false, debug: false },
}));
vi.mock('../prompts', () => ({
  getTTSContent: () => 'tts content',
  getLiveContent: () => 'live content',
  LIVE_SYSTEM_INSTRUCTION: 'system instruction',
}));
vi.mock('../utils/audio.js', () => ({
  pcm16ToWav: vi.fn(() => ({ size: 1024 })),
  unlockAudioForIOS: vi.fn().mockResolvedValue('ok'),
}));
vi.mock('../hooks/useTTSHighlight.js', () => ({
  startPlayer: vi.fn(),
  recordPause: vi.fn(),
  pauseOffset: { value: 0 },
}));

// Stores — plain getState() returning controllable state objects.
const audioState = {
  isPlaying: false,
  isGenerating: false,
  url: null,
  player: null,
  setPlaying: vi.fn(),
  setGenerating: vi.fn(),
  setUrl: vi.fn(),
  setError: vi.fn(),
  setPlayer: vi.fn(),
};
const poemState = {
  addActiveAudio: vi.fn(),
  removeActiveAudio: vi.fn(),
  hasActiveAudio: vi.fn(() => false),
  addPollingInterval: vi.fn(),
  removePollingInterval: vi.fn(),
};
const uiState = {
  ttsMode: 'rest',
  liveVoice: 'Orus',
  liveTemperature: 0,
  incrementCacheStat: vi.fn(),
};
vi.mock('../stores/audioStore', () => ({ useAudioStore: { getState: () => audioState } }));
vi.mock('../stores/poemStore', () => ({ usePoemStore: { getState: () => poemState } }));
vi.mock('../stores/uiStore', () => ({ useUIStore: { getState: () => uiState } }));

// REST transport is fetchTTSWithFallback; Live transport is raw fetch.
const fetchTTSWithFallback = vi.fn();
vi.mock('../services/gemini.js', () => ({
  API_MODELS: { tts: 'gemini-2.5-flash-preview-tts' },
  TTS_CONFIG: { responseModalities: ['AUDIO'], voiceName: 'Orus' },
  fetchTTSWithFallback: (...args) => fetchTTSWithFallback(...args),
}));
vi.mock('../services/cache.js', () => ({
  cacheOperations: { get: vi.fn(() => null), set: vi.fn() },
  CACHE_CONFIG: { stores: { audio: 'audio' } },
}));

const { togglePlay } = await import('../stores/actions/togglePlay.js');

// Helpers
const REST_OK = () => ({
  res: {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ inlineData: { data: 'UkVTVF9QQ00=' } }] } }],
    }),
  },
  model: 'gemini-2.5-flash-preview-tts',
});
const REST_FAIL = () => ({
  res: { ok: false, status: 500, text: async () => 'server error' },
  model: 'gemini-2.5-flash-preview-tts',
});
const LIVE_OK = () => ({ ok: true, json: async () => ({ audioData: 'TElWRV9QQ00=' }) });
const LIVE_FAIL = () => ({ ok: false, status: 429, text: async () => 'rate limited' });

function runArgs() {
  return {
    audioRef: { current: null },
    isTogglingPlay: { current: false },
    current: { id: 'poem-1', poet: 'Darwish', title: 'On This Earth', arabic: 'على هذه الأرض' },
    addLog: vi.fn(),
    track: vi.fn(),
  };
}

describe('TTS REST<->Live fallback (@wf-tts-fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audioState.isPlaying = false;
    audioState.isGenerating = false;
    audioState.url = null;
    audioState.player = null;
    poemState.hasActiveAudio.mockReturnValue(false);
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.fetch = vi.fn();
  });

  it('REST mode: when REST fails, falls back to Live and still reaches playback', async () => {
    uiState.ttsMode = 'rest';
    fetchTTSWithFallback.mockResolvedValue(REST_FAIL()); // REST path 500s
    global.fetch.mockResolvedValue(LIVE_OK()); // Live path succeeds

    const args = runArgs();
    await togglePlay(args);

    // REST was tried first
    expect(fetchTTSWithFallback).toHaveBeenCalledTimes(1);
    // Then it fell back to the Live endpoint
    const liveCall = global.fetch.mock.calls.find(([url]) =>
      String(url).includes('/api/ai/live-tts')
    );
    expect(liveCall, 'expected a fetch to /api/ai/live-tts after REST failed').toBeTruthy();
    // Playback was reached despite the REST failure
    expect(audioState.setPlaying).toHaveBeenCalledWith(true);
    // The successful model was the Live one
    const loggedLive = args.addLog.mock.calls.some(([, msg]) => String(msg).includes('Live 3.1'));
    expect(loggedLive, 'expected a log naming the Live 3.1 model on success').toBe(true);
  });

  it('Live mode: when Live fails, falls back to REST and still reaches playback', async () => {
    uiState.ttsMode = 'live';
    global.fetch.mockResolvedValue(LIVE_FAIL()); // Live path 429s
    fetchTTSWithFallback.mockResolvedValue(REST_OK()); // REST path succeeds

    const args = runArgs();
    await togglePlay(args);

    // Live was tried first (raw fetch to /api/ai/live-tts)
    const liveCall = global.fetch.mock.calls.find(([url]) =>
      String(url).includes('/api/ai/live-tts')
    );
    expect(liveCall, 'expected the Live endpoint to be tried first in live mode').toBeTruthy();
    // Then it fell back to REST
    expect(fetchTTSWithFallback).toHaveBeenCalledTimes(1);
    // Playback was reached despite the Live failure
    expect(audioState.setPlaying).toHaveBeenCalledWith(true);
  });

  it('REST mode success: does NOT call the Live endpoint when REST works', async () => {
    uiState.ttsMode = 'rest';
    fetchTTSWithFallback.mockResolvedValue(REST_OK());

    const args = runArgs();
    await togglePlay(args);

    expect(fetchTTSWithFallback).toHaveBeenCalledTimes(1);
    const liveCall = global.fetch.mock.calls.find(([url]) =>
      String(url).includes('/api/ai/live-tts')
    );
    expect(liveCall, 'Live endpoint must not be hit when REST succeeds').toBeFalsy();
    expect(audioState.setPlaying).toHaveBeenCalledWith(true);
  });

  it('both transports fail: surfaces an error and never reaches playback', async () => {
    uiState.ttsMode = 'rest';
    fetchTTSWithFallback.mockResolvedValue(REST_FAIL());
    global.fetch.mockResolvedValue(LIVE_FAIL());

    const args = runArgs();
    await togglePlay(args);

    expect(audioState.setPlaying).not.toHaveBeenCalledWith(true);
  });
});
