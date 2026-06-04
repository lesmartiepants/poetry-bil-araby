import { createElement } from 'react';
import { Rabbit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Player, start as toneStart, getContext } from 'tone';
import { toast } from 'sonner';
import Sentry from '../../sentry.js';
import { FEATURES } from '../../constants/features';
import { useAudioStore } from '../audioStore';
import { startPlayer, recordPause, pauseOffset } from '../../hooks/useTTSHighlight.js';
import { usePoemStore } from '../poemStore';
import { useUIStore } from '../uiStore';
import { getTTSContent, LIVE_SYSTEM_INSTRUCTION, getLiveContent } from '../../prompts';
import { API_MODELS, TTS_CONFIG, fetchTTSWithFallback } from '../../services/gemini.js';
import { cacheOperations, CACHE_CONFIG, audioCacheKey } from '../../services/cache.js';
import { pcm16ToWav } from '../../utils/audio.js';
import {
  createStreamingPlayer,
  consumeSSE,
  pcmBase64ToInt16,
  concatPcmBase64,
} from '../../utils/liveAudioStream.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// FUTURE: Use Tone.Transport for verse-synced highlighting
// FUTURE: Use Tone.Panner3D for spatial audio (stone hall reverb effect)

/**
 * Estimate TTS generation time based on Arabic character count.
 * Conservative overestimate — better to finish early than go negative.
 * Based on profiling: ~0.05-0.20 s/char depending on length and server load.
 */
const estimateTTSSeconds = (arabicCharCount) => Math.max(8, Math.ceil(arabicCharCount * 0.06));

const TTS_LOADING_MESSAGES = [
  'Preparing recitation',
  'Clearing my throat',
  'The poet is getting ready',
  'Wise voice awakening',
  'Summoning the muse',
  'The poet steadies their breath',
  'The majlis is gathering',
  'Ink drying on the qasida',
];

/**
 * Create a Sonner toast for TTS generation.
 *
 * Two shapes:
 *  - countdown (default): "Recitation ready in Xs" ticking down to "Almost ready...".
 *    Right for REST and buffered paths, which must generate the whole clip before
 *    playback, so the wait is real and roughly predictable (~0.06 s/char).
 *  - indeterminate: "Starting recitation…" with no number. Right for the Live stream,
 *    which plays its first words in ~1s — there's no meaningful countdown, and the
 *    first-sound handler dismisses it. Showing a full-generation countdown there
 *    (e.g. "ready in 59s") was just wrong.
 *
 * Returns { dismiss } for cleanup. Auto-dismisses if isGenerating goes false
 * externally (e.g. poem navigation).
 */
function createProgressToast(estimatedSeconds, arabicText, { indeterminate = false } = {}) {
  const toastId = `tts-progress-${Date.now()}`;
  const startTime = Date.now();
  const lineCount = arabicText ? arabicText.split('\n').filter((l) => l.trim()).length : 0;
  const lineInfo =
    lineCount > 0
      ? `Preparing ${lineCount} line${lineCount !== 1 ? 's' : ''}`
      : 'Preparing recitation';

  const bounceIcon = () =>
    createElement(
      motion.div,
      {
        animate: { y: [0, -5, 0] },
        transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut' },
      },
      createElement(Rabbit, { size: 16 })
    );

  const STARTING = 'Starting recitation…';

  toast.loading(indeterminate ? STARTING : `Recitation ready in ${estimatedSeconds}s`, {
    id: toastId,
    description: lineInfo,
    duration: Infinity,
    icon: bounceIcon(),
  });

  const interval = setInterval(() => {
    // Auto-dismiss if generation was cancelled externally (poem change, etc.)
    if (!useAudioStore.getState().isGenerating) {
      clearInterval(interval);
      toast.dismiss(toastId);
      return;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const subtitle = TTS_LOADING_MESSAGES[Math.floor(elapsed / 5) % TTS_LOADING_MESSAGES.length];

    let label;
    if (indeterminate) {
      label = STARTING;
    } else {
      const remaining = estimatedSeconds - elapsed;
      label = remaining > 0 ? `Recitation ready in ${remaining}s` : 'Almost ready...';
    }

    toast.loading(label, {
      id: toastId,
      description: subtitle,
      duration: Infinity,
      icon: bounceIcon(),
    });
  }, 1000);

  let dismissed = false;
  const dismiss = (successMsg) => {
    if (dismissed) return;
    dismissed = true;
    clearInterval(interval);
    if (successMsg) {
      toast.success('The recitation begins', { id: toastId, duration: 2000 });
    } else {
      toast.dismiss(toastId);
    }
  };

  // Store globally so it can be dismissed from outside (e.g. drawer open, poem change)
  _activeProgressDismiss = dismiss;

  return { dismiss };
}

/** Monotonically increasing token — incremented by abortPlay() on each swipe. */
let _currentPlayId = 0;

/**
 * AbortController for the in-flight Live SSE stream. Lets stop/pause/swipe/replay
 * cancel the upstream Gemini Live session instead of leaving it generating in the
 * background (orphaned audio + wasted quota).
 */
let _currentStreamAbort = null;
// Buffered (non-streaming) generation fetch in flight — the REST generateContent
// call and the buffered Live fallback. Held at module scope so abortPlay() can
// cancel it. Without this, a long REST generation (~30s) kept the play guard held,
// so switching engine/voice mid-buffer rejected the next play as "already in
// progress" until the fetch finished (#560, #562, #563).
let _currentGenAbort = null;
function abortCurrentStream() {
  if (_currentStreamAbort) {
    try {
      _currentStreamAbort.abort();
    } catch {
      /* already aborted */
    }
    _currentStreamAbort = null;
  }
  if (_currentGenAbort) {
    try {
      _currentGenAbort.abort();
    } catch {
      /* already aborted */
    }
    _currentGenAbort = null;
  }
}

/**
 * Invalidate any in-flight togglePlay so it won't start playback after a swipe,
 * and cancel any streaming OR buffered generation in flight.
 * Call this alongside resetAudio() in the carousel swipe handlers, and when
 * switching engine/voice mid-recitation.
 */
export function abortPlay() {
  _currentPlayId++;
  abortCurrentStream();
}

/** Module-level ref to the active progress toast's dismiss function. */
let _activeProgressDismiss = null;

/**
 * Dismiss any active TTS progress toast. Safe to call anytime.
 * Called by app.jsx when discover drawer opens, carousel navigates, etc.
 */
export function dismissTTSProgress() {
  if (_activeProgressDismiss) {
    _activeProgressDismiss();
    _activeProgressDismiss = null;
  }
}

/** True when running on iOS Safari / WKWebView. */
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !('MSStream' in window);

/**
 * HTMLAudioElement-backed player that matches the Tone.Player interface used by
 * togglePlay (start / stop / onstop).
 *
 * On iOS, AudioContext routes through the "ambient" AVAudioSession category which
 * the hardware silent switch mutes. HTMLAudioElement routes through the native media
 * playback path (same as playing a song in Safari) which ignores the silent switch.
 * The word-highlight system uses wall-clock time, not AudioContext.currentTime, so
 * it works identically with this player.
 */
// iOS only lets an <audio> element be played programmatically once it has had
// play() called on it inside a user gesture. The REST path builds its player AFTER
// the multi-second TTS generation await — long past the gesture — so the first
// play()'s NotAllowedError was swallowed and nothing sounded, while the wall-clock
// read-along still advanced (so it LOOKED like it was playing). A pause+play then
// worked because that ran in a fresh gesture.
//
// Fix: keep ONE <audio> element, bless it with a silent clip inside the play
// gesture (unlockIOSAudioElement, called before generation), and reuse that same
// blessed element for playback. iOS keeps the element user-activated for its
// lifetime, so the later programmatic play() after generation is allowed.
let _iosAudioEl = null;
let _iosSilentUrl = null;

function getIOSAudioEl() {
  if (!_iosAudioEl) {
    const a = document.createElement('audio');
    a.setAttribute('playsinline', '');
    a.preload = 'auto';
    _iosAudioEl = a;
  }
  return _iosAudioEl;
}

function iosSilentUrl() {
  if (_iosSilentUrl) return _iosSilentUrl;
  try {
    // ~50ms of silence (zeroed PCM16 @ 24kHz) wrapped as a WAV blob.
    const b64 = btoa(String.fromCharCode.apply(null, new Uint8Array(2400)));
    const blob = pcm16ToWav(b64);
    if (blob) _iosSilentUrl = URL.createObjectURL(blob);
  } catch {
    /* leave null — unlock becomes a best-effort no-op */
  }
  return _iosSilentUrl;
}

/** Bless the reusable iOS <audio> element inside a user gesture. No-op off iOS. */
function unlockIOSAudioElement() {
  if (!isIOS()) return;
  const a = getIOSAudioEl();
  const silent = iosSilentUrl();
  if (!silent) return;
  try {
    a.muted = true;
    a.src = silent;
    const settle = () => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {
        /* ignore */
      }
      a.muted = false;
    };
    const p = a.play();
    if (p && typeof p.then === 'function') p.then(settle).catch(settle);
    else settle();
  } catch {
    a.muted = false;
  }
}

function createHTMLAudioPlayer(url) {
  return new Promise((resolve) => {
    // Reuse the gesture-blessed element so play() after the generation await works.
    const audio = getIOSAudioEl();
    audio.muted = false;
    audio.src = url;

    const player = {
      onstop: null,
      start(_time, offset = 0) {
        try {
          audio.currentTime = offset;
        } catch {
          /* currentTime may throw before metadata loads */
        }
        audio.play().catch(() => {});
      },
      stop() {
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {
          /* ignore */
        }
        this.onstop?.();
      },
    };

    // Property assignment (not addEventListener) so reuse doesn't stack handlers.
    audio.onended = () => player.onstop?.();

    // Blob URLs are local — loadeddata fires near-instantly. 500 ms timeout as a
    // safety net on older iOS where canplaythrough/loadeddata can be delayed.
    let done = false;
    const resolveOnce = () => {
      if (!done) {
        done = true;
        resolve(player);
      }
    };
    audio.addEventListener('loadeddata', resolveOnce, { once: true });
    audio.addEventListener('error', resolveOnce, { once: true });
    setTimeout(resolveOnce, 500);
  });
}

/**
 * Create a Tone.Player from a URL and wait until its buffer is fully decoded before returning.
 * Uses the constructor onload callback (not player.loaded or Tone.loaded()) because those
 * can resolve before the AudioBuffer decode completes for blob URLs in Tone.js v15.
 *
 * On iOS, returns an HTMLAudioElement-backed player instead so audio plays through the
 * native media path and is not muted by the hardware silent switch.
 */
function createPlayerReady(url) {
  if (isIOS()) return createHTMLAudioPlayer(url);
  return new Promise((resolve, reject) => {
    const player = new Player(url, () => resolve(player)).toDestination();
    player.buffer.onerror = () => reject(new Error('buffer is either not set or not loaded'));
  });
}

/**
 * Toggle audio playback — handles pause, resume, cache check, TTS generation, and polling.
 *
 * @param {Object} options
 * @param {Object} options.audioRef - React ref (kept for signature compatibility; integrator agent
 *                                    will update app.jsx to pass a Tone.Player ref in Phase 2)
 * @param {Object} options.isTogglingPlay - React ref guard for debouncing
 * @param {Object} options.current - Current poem object
 * @param {Function} options.addLog - Logging function
 * @param {Function} options.track - Analytics tracking
 */
export async function togglePlay({ audioRef, isTogglingPlay, current, addLog, track }) {
  const {
    isPlaying,
    isGenerating,
    url: audioUrl,
    player: existingPlayer,
    setPlaying,
    setGenerating,
    setUrl,
    setError,
    setPlayer,
  } = useAudioStore.getState();

  if (isTogglingPlay.current || isGenerating) {
    addLog('Audio', 'Play toggle already in progress — skipping', 'info');
    return;
  }
  isTogglingPlay.current = true;
  addLog(
    'UI Event',
    `🎵 Play button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
    'user'
  );
  track('audio_play', { poet: current?.poet });

  // PAUSE — Tone.Player uses stop() rather than pause()
  if (isPlaying) {
    recordPause();
    abortCurrentStream(); // cancel an in-flight Live stream so it can't keep generating
    if (existingPlayer) {
      existingPlayer.stop();
    }
    setPlaying(false);
    track('audio_pause', { poet: current?.poet });
    addLog('UI Event', '⏸️ Pause button clicked', 'user');
    isTogglingPlay.current = false;
    return;
  }

  // RESUME — Tone.Player.stop() discards position, so we restart from the stored blob URL.
  // Re-creating the player from the cached URL is cheaper than storing raw PCM buffers.
  if (audioUrl) {
    try {
      // Unlock AudioContext after user gesture (handles iOS autoplay policy).
      // Skip on iOS — AudioContext is not used there; HTMLAudioElement handles playback.
      if (!isIOS()) await toneStart();
      const player = await createPlayerReady(audioUrl);
      startPlayer(player, pauseOffset.value);
      setPlayer(player);
      setPlaying(true);
    } catch (e) {
      addLog('Audio', 'Resume failed, resetting audio URL', 'info');
      setUrl(null);
      setPlayer(null);
    }
    isTogglingPlay.current = false;
    return;
  }

  // iOS: set the audio session to 'playback' inside the user gesture so Web Audio
  // plays THROUGH the hardware silent switch (verified on a real iPhone). This lets
  // iOS use the exact same smooth streaming player as desktop — no HLS, no stutter,
  // ~1s first sound — instead of the silent-switch-muted Web Audio that forced the
  // old HTMLAudio/HLS detours.
  if (isIOS()) {
    try {
      if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
    } catch { /* older iOS without the Audio Session API → buffered fallback still works */ }
    // Bless the reusable <audio> element NOW, inside the gesture, so the REST
    // path's play() after the generation await is allowed (otherwise silent first
    // play; #...). Web Audio (Live) doesn't need this, but it's a cheap no-op there.
    unlockIOSAudioElement();
  }
  // Unlock the AudioContext after the user gesture (now on iOS too).
  await toneStart();

  setGenerating(true);

  const playId = ++_currentPlayId;

  const doGenerate = async () => {
    // Resolve the selected engine + voice up front so the cache key reflects them.
    // Same poem in a different voice/engine must regenerate, not replay stale audio.
    let ttsMode = useUIStore.getState().ttsMode;
    const { liveVoice, liveTemperature } = useUIStore.getState();
    // Both engines use the listener's selected voice, so the cache key keys on it
    // regardless of mode — switching voice (or engine) regenerates rather than
    // replaying stale audio in the wrong voice.
    const keyFor = (mode) => audioCacheKey(current?.id, mode, liveVoice);

    // Real per-word timings from the Live transcript for this generation.
    // Cleared up front so a previous poem's timings never bleed into this one;
    // set from the server response on success (Live only — REST stays null → VAD).
    let serverWordTimings = null;
    useAudioStore.getState().setWordTimings(null);

    // CHECK CACHE
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, keyFor(ttsMode), addLog);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.blob) {
        const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
        addLog(
          'Audio Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms)${cached.metadata?.model ? ` | Model: ${cached.metadata.model}` : ''} | Size: ${sizeMB}MB | Instant playback`,
          'success'
        );
        useUIStore.getState().incrementCacheStat('audioHits');

        // Guard: swipe may have called abortPlay() + resetAudio() while we awaited the cache
        if (_currentPlayId !== playId) {
          setGenerating(false);
          isTogglingPlay.current = false;
          return;
        }

        const u = URL.createObjectURL(cached.blob);
        setUrl(u);
        useAudioStore.getState().setWordTimings(cached.wordTimings || null);

        try {
          const player = await createPlayerReady(u);
          startPlayer(player, 0);
          setPlayer(player);
          setPlaying(true);
        } catch (err) {
          if (FEATURES.logging) console.warn('[Audio] Cached playback failed:', err.message);
          const msg = `Cached playback failed: ${err.message}`;
          addLog('Audio', msg, 'error');
          setError(msg);
          toast.error(msg);
        }

        setGenerating(false);
        isTogglingPlay.current = false;
        return;
      } else {
        addLog(
          'Audio Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        useUIStore.getState().incrementCacheStat('audioMisses');
      }
    }

    // Mark in-flight
    usePoemStore.getState().addActiveAudio(current?.id);

    const arabicTextChars = current?.arabic?.length || 0;

    const modelLabel = ttsMode === 'live' ? 'Live 3.1' : API_MODELS.tts;
    addLog(
      'Audio API',
      `→ Starting generation | Model: ${modelLabel} | ${arabicTextChars} chars Arabic`,
      'request'
    );
    setError(null);

    // Progress toast. Live streams first sound in ~1s, so it gets an indeterminate
    // "Starting recitation…" (dismissed on first sound) instead of a misleading
    // full-generation countdown. REST / buffered must generate the whole clip first,
    // so they get the real countdown. If Live falls back to REST below, the toast is
    // swapped for a countdown at that point.
    const willStream =
      ttsMode === 'live' &&
      (!isIOS() || (typeof navigator !== 'undefined' && 'audioSession' in navigator));
    const estSeconds = estimateTTSSeconds(arabicTextChars);
    let progress = willStream
      ? createProgressToast(0, current?.arabic, { indeterminate: true })
      : createProgressToast(estSeconds, current?.arabic);
    addLog(
      'Audio',
      willStream
        ? 'Live streaming — first sound expected in ~1s'
        : `Estimated generation time: ~${estSeconds}s for ${arabicTextChars} Arabic chars`,
      'info'
    );

    try {
      const apiStart = performance.now();
      let b64;
      let ttsModel;

      // ── Live streaming fast-path (all platforms) ────────────────────────────
      // Play PCM chunks as they arrive from /api/ai/live-tts?stream=1 — first sound
      // in ~1s instead of waiting for the whole recitation. iOS is included: the
      // gesture set navigator.audioSession.type='playback' above, so Web Audio
      // plays through the hardware silent switch (verified on device). Old iOS
      // without the Audio Session API falls through to the HLS/buffered path below.
      if (willStream) {
        try {
          const liveText = getLiveContent(current);
          addLog(
            'Audio API',
            `[Live 3.1] Streaming → voice: ${liveVoice} | temp: ${liveTemperature} | ${liveText.length} chars`,
            'request'
          );
          const streamPlayer = createStreamingPlayer(getContext().rawContext);
          const pcmB64 = [];
          let sampleRate = 24000;
          let firstSound = false;
          let streamErr = null;

          // Cancel any prior stream, then arm an AbortController so stop/pause/swipe/
          // replay can tear this Live session down instead of orphaning it.
          abortCurrentStream();
          const streamAbort = new AbortController();
          _currentStreamAbort = streamAbort;

          const liveRes = await fetch(`${apiUrl}/api/ai/live-tts?stream=1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: streamAbort.signal,
            body: JSON.stringify({
              text: liveText,
              voiceName: liveVoice,
              temperature: liveTemperature,
              systemInstruction: LIVE_SYSTEM_INSTRUCTION,
            }),
          });
          if (!liveRes.ok || !liveRes.body) {
            throw new Error(`Live stream HTTP ${liveRes.status}`);
          }

          await consumeSSE(liveRes.body.getReader(), {
            onMeta: (m) => {
              if (m.sampleRate) sampleRate = m.sampleRate;
            },
            onChunk: (chunkB64) => {
              // Swipe/navigation guard — stop feeding if the user moved on.
              if (_currentPlayId !== playId) {
                streamPlayer.stop();
                return;
              }
              pcmB64.push(chunkB64);
              streamPlayer.pushChunk(pcmBase64ToInt16(chunkB64));
              if (!firstSound) {
                firstSound = true;
                const t = ((performance.now() - apiStart) / 1000).toFixed(2);
                addLog('Audio API', `[Live 3.1] ▶ First sound (${t}s) | voice: ${liveVoice}`, 'success');
                progress.dismiss('Recitation ready');
                setPlayer(streamPlayer);
                startPlayer(streamPlayer, 0);
                setPlaying(true);
                setGenerating(false);
              }
            },
            onDone: (done) => {
              streamPlayer.markInputDone();
              if (done?.wordTimings) serverWordTimings = done.wordTimings;
            },
            onError: (msg) => {
              streamErr = msg;
            },
          });

          // Stream finished on its own — release the abort handle so a later
          // stop()/pause() doesn't try to abort an already-complete controller.
          if (_currentStreamAbort === streamAbort) _currentStreamAbort = null;

          // User navigated away mid-stream — bail without caching/playing.
          if (_currentPlayId !== playId) {
            streamPlayer.stop();
            return;
          }

          if (firstSound) {
            // Build one WAV from the collected PCM for caching + resume-from-blob.
            const blob = pcm16ToWav(concatPcmBase64(pcmB64), sampleRate);
            if (blob) {
              setUrl(URL.createObjectURL(blob));
              useAudioStore.getState().setWordTimings(serverWordTimings || null);
              if (FEATURES.caching && current?.id) {
                await cacheOperations.set(
                  CACHE_CONFIG.stores.audio,
                  keyFor('live'),
                  {
                    blob,
                    wordTimings: serverWordTimings || null,
                    metadata: {
                      poet: current.poet,
                      title: current.title,
                      size: blob.size,
                      model: 'Live 3.1',
                      voice: liveVoice,
                    },
                  },
                  addLog
                );
                addLog('Audio Cache', `Live audio cached (voice: ${liveVoice})`, 'success');
              }
            }
            return; // success — finally{} resets generating/toggling flags
          }

          // Stream ended before any audio — fall through to REST.
          addLog(
            'Audio API',
            `[Live 3.1] No audio${streamErr ? `: ${streamErr}` : ''} — falling back to REST`,
            'warning'
          );
          ttsMode = 'rest';
        } catch (streamError) {
          // Intentional cancel (stop / pause / swipe / replay) — not a failure.
          // Don't fall back to REST; the user moved on.
          if (streamError.name === 'AbortError' || _currentPlayId !== playId) {
            return;
          }
          addLog(
            'Audio API',
            `[Live 3.1] Stream failed: ${streamError.message} — falling back to REST`,
            'warning'
          );
          ttsMode = 'rest';
        }
      }

      // Live streaming was attempted but yielded no audio (we're now in the buffered
      // path, which generates the whole clip before playback). Swap the indeterminate
      // "Starting…" toast for an accurate countdown on that real wait.
      if (willStream && !b64) {
        progress.dismiss();
        progress = createProgressToast(estSeconds, current?.arabic);
      }

      // ── Try selected mode first; on any failure (429, 404, network, etc.)
      //    fall back to the other mode once. This makes the app resilient when
      //    one path is rate-limited or unavailable (e.g. Live route not deployed
      //    on a given backend, or REST quota exhausted).
      // Order modes so the selected one is always tried first (index 0).
      const MODES = ttsMode === 'live' ? ['live', 'rest'] : ['rest', 'live'];
      let modeIdx = 0;

      // One abort controller for whichever buffered fetch runs, held at module scope
      // so abortPlay() (engine/voice switch, swipe) can cancel it and release the
      // play guard promptly — instead of waiting out a ~30s generation (#562, #563).
      const genAbort = new AbortController();
      _currentGenAbort = genAbort;
      const genTimeoutId = setTimeout(() => genAbort.abort(), 120_000);

      while (modeIdx < MODES.length && !b64) {
        const mode = MODES[modeIdx];
        ttsModel = mode === 'live' ? 'Live 3.1' : API_MODELS.tts;

        try {
          if (mode === 'live') {
            // ── Live API path — WebSocket TTS via server endpoint (buffered fallback) ──
            const liveText = getLiveContent(current);
            addLog(
              'Audio API',
              `[${ttsModel}] Live request → voice: ${liveVoice} | temp: ${liveTemperature} | ${liveText.length} chars`,
              'request'
            );
            const liveStart = performance.now();
            const liveRes = await fetch(`${apiUrl}/api/ai/live-tts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: genAbort.signal,
              body: JSON.stringify({
                text: liveText,
                voiceName: liveVoice,
                temperature: liveTemperature,
                systemInstruction: LIVE_SYSTEM_INSTRUCTION,
              }),
            });

            if (!liveRes.ok) {
              const errorText = await liveRes.text();
              addLog(
                'Audio API Error',
                `[${ttsModel}] HTTP ${liveRes.status}: ${errorText.substring(0, 200)}`,
                'error'
              );
              if (liveRes.status === 429) {
                addLog('Audio API', `[${ttsModel}] Rate-limited — falling back to REST`, 'warning');
              } else if (liveRes.status === 404) {
                addLog(
                  'Audio API',
                  `[${ttsModel}] Live endpoint unavailable (404) — falling back to REST`,
                  'warning'
                );
              } else {
                addLog(
                  'Audio API',
                  `[${ttsModel}] Failed (${liveRes.status}) — falling back to REST`,
                  'warning'
                );
              }
              throw new Error('Live mode failed');
            }

            const liveData = await liveRes.json();
            if (!liveData.audioData) {
              throw new Error('Live API returned no audio data');
            }
            b64 = liveData.audioData;
            if (liveData.wordTimings) serverWordTimings = liveData.wordTimings;
            const liveDuration = ((performance.now() - liveStart) / 1000).toFixed(2);
            const liveSizeKB = Math.round((b64.length * 0.75) / 1024);
            addLog(
              'Audio API',
              `[${ttsModel}] ✓ Complete | ${liveDuration}s | ~${liveSizeKB}KB PCM | voice: ${liveVoice}`,
              'success'
            );
          } else {
            // ── REST API path — generateContent flow ──
            const ttsContent = getTTSContent(current);
            const requestBody = JSON.stringify({
              contents: [{ parts: [{ text: ttsContent }] }],
              generationConfig: {
                responseModalities: TTS_CONFIG.responseModalities,
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: liveVoice } },
                },
              },
            });
            const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
            const fallbackResult = await fetchTTSWithFallback(
              url,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: requestBody,
                signal: genAbort.signal,
              },
              { addLog, label: 'Audio API' }
            );
            const res = fallbackResult.res;
            ttsModel = fallbackResult.model;

            if (!res.ok) {
              const errorText = await res.text();
              addLog(
                'Audio API Error',
                `[${ttsModel}] HTTP ${res.status}: ${errorText.substring(0, 200)}`,
                'error'
              );
              if (res.status === 429) {
                addLog('Audio API', `[${ttsModel}] Rate-limited — falling back to Live`, 'warning');
              } else {
                addLog(
                  'Audio API',
                  `[${ttsModel}] Failed (${res.status}) — falling back to Live`,
                  'warning'
                );
              }
              throw new Error('REST mode failed');
            }

            const data = await res.json();
            if (!data.candidates || data.candidates.length === 0) {
              throw new Error('Recitation failed — no audio candidates returned');
            }
            b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            addLog('Audio API', `[${ttsModel}] Success via REST API`, 'success');
          }
        } catch (modeError) {
          // Superseded by a newer play / engine or voice switch — abortPlay() bumped
          // the play id and aborted the fetch. Stop entirely; don't try the next mode.
          if (_currentPlayId !== playId) break;
          addLog('Audio API', `[${ttsModel}] ${modeError.message} — trying next mode`, 'warning');
          modeIdx++; // try the other mode
        }
      }

      clearTimeout(genTimeoutId);
      if (_currentGenAbort === genAbort) _currentGenAbort = null;

      // Superseded mid-generation (engine/voice switch or swipe aborted the fetch) —
      // bail quietly. The finally releases the play guard, so the next play works
      // immediately instead of being rejected as "already in progress" (#562, #563).
      if (_currentPlayId !== playId) {
        progress.dismiss();
        return;
      }

      const apiTime = performance.now() - apiStart;
      if (!b64) {
        throw new Error('Recitation failed — no audio data returned from any available source');
      }

      const conversionStart = performance.now();
      const blob = pcm16ToWav(b64);
      const conversionTime = performance.now() - conversionStart;

      if (!blob) {
        throw new Error('Recitation failed — audio data could not be decoded');
      }

      const audioSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      const audioSizeKB = (blob.size / 1024).toFixed(1);
      const pcmBytes = atob(b64.replace(/\s/g, '')).length;
      const samples = pcmBytes / 2;
      const audioDuration = samples / 24000;
      const estimatedTokens = Math.ceil(arabicTextChars / 4);
      const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);
      const totalTime = apiTime + conversionTime;

      addLog(
        'Audio API',
        `✓ [${ttsModel}] Complete | API: ${(apiTime / 1000).toFixed(2)}s | Convert: ${conversionTime.toFixed(0)}ms | Total: ${(totalTime / 1000).toFixed(2)}s`,
        'success'
      );
      addLog(
        'Audio Metrics',
        `[${ttsModel}] Audio: ${audioDuration.toFixed(1)}s | Size: ${audioSizeKB}KB (${audioSizeMB}MB) | Speed: ${tokensPerSecond} tok/s`,
        'success'
      );

      // Guard: user may have swiped to a new poem while audio was generating
      if (_currentPlayId !== playId) {
        progress.dismiss();
        return;
      }

      const u = URL.createObjectURL(blob);
      setUrl(u);
      useAudioStore.getState().setWordTimings(serverWordTimings || null);

      try {
        const player = await createPlayerReady(u);
        startPlayer(player, 0);
        setPlayer(player);
        setPlaying(true);
        progress.dismiss('Recitation ready');
      } catch (err) {
        if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
        const msg = `Playback failed: ${err.message}`;
        addLog('Audio', msg, 'error');
        progress.dismiss();
        setError(msg);
        toast.error(msg);
      }

      // Cache
      if (FEATURES.caching && current?.id) {
        const cacheStart = performance.now();
        await cacheOperations.set(
          CACHE_CONFIG.stores.audio,
          keyFor(ttsMode),
          {
            blob,
            wordTimings: serverWordTimings || null,
            metadata: {
              poet: current.poet,
              title: current.title,
              size: blob.size,
              duration: audioDuration,
              model: ttsModel,
            },
          },
          addLog
        );
        const cacheTime = performance.now() - cacheStart;
        addLog(
          'Audio Cache',
          `Audio cached for future playback (${cacheTime.toFixed(0)}ms) | Saves ${(apiTime / 1000).toFixed(1)}s on replay`,
          'success'
        );
      }
    } catch (e) {
      progress.dismiss();
      Sentry.captureException(e);
      addLog('Audio System Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('audio_error', { error: (e.message || '').slice(0, 100) });
      setPlaying(false);
      // Only show toast for errors not already toasted (e.g. 429 is handled above)
      if (!e.message.includes('Rate limited')) {
        toast.error(`Recitation error: ${e.message}`);
      }
    } finally {
      progress.dismiss(); // safety net — no-ops if already dismissed
      setGenerating(false);
      usePoemStore.getState().removeActiveAudio(current?.id);
      isTogglingPlay.current = false;
    }
  };

  // Check if request already in flight — poll until it completes
  if (usePoemStore.getState().hasActiveAudio(current?.id)) {
    addLog('Audio', 'Audio generation already in progress - waiting for completion', 'info');

    // Show progress toast while waiting for in-flight prefetch
    const pollEstSeconds = estimateTTSSeconds(current?.arabic?.length || 0);
    const pollProgress = createProgressToast(pollEstSeconds, current?.arabic);

    const pollInterval = setInterval(async () => {
      if (!usePoemStore.getState().hasActiveAudio(current?.id)) {
        clearInterval(pollInterval);
        usePoemStore.getState().removePollingInterval(pollInterval);

        const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id, addLog);
        if (cached?.blob) {
          addLog(
            'Audio',
            `✓ Background audio generation completed${cached.metadata?.model ? ` [${cached.metadata.model}]` : ''} - playing from cache`,
            'success'
          );
          // Guard: user may have swiped away while we were waiting for the prefetch
          if (_currentPlayId !== playId) {
            pollProgress.dismiss();
            setGenerating(false);
            return;
          }
          const u = URL.createObjectURL(cached.blob);
          setUrl(u);
          useAudioStore.getState().setWordTimings(cached.wordTimings || null);

          try {
            const player = await createPlayerReady(u);
            startPlayer(player, 0);
            setPlayer(player);
            setPlaying(true);
            pollProgress.dismiss('Recitation ready');
          } catch (err) {
            if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
            const msg = `Playback failed: ${err.message}`;
            addLog('Audio', msg, 'error');
            pollProgress.dismiss();
            setError(msg);
            toast.error(msg);
          }
        } else {
          addLog('Audio', 'Prefetch failed — retrying audio generation automatically...', 'error');
          pollProgress.dismiss();
          if (!isTogglingPlay.current) {
            isTogglingPlay.current = true;
            await doGenerate();
          }
          return;
        }
        setGenerating(false);
      }
    }, 500);

    usePoemStore.getState().addPollingInterval(pollInterval);

    setTimeout(() => {
      clearInterval(pollInterval);
      usePoemStore.getState().removePollingInterval(pollInterval);
      if (usePoemStore.getState().hasActiveAudio(current?.id)) {
        addLog(
          'Audio',
          'Audio generation taking longer than expected - checking one more time...',
          'info'
        );
        setTimeout(async () => {
          const finalCheck = await cacheOperations.get(
            CACHE_CONFIG.stores.audio,
            current.id,
            addLog
          );
          if (finalCheck?.blob) {
            addLog('Audio', '✓ Audio completed after extended wait - playing now', 'success');
            if (_currentPlayId !== playId) {
              pollProgress.dismiss();
              setGenerating(false);
              return;
            }
            const u = URL.createObjectURL(finalCheck.blob);
            setUrl(u);
            useAudioStore.getState().setWordTimings(finalCheck.wordTimings || null);

            try {
              const player = await createPlayerReady(u);
              startPlayer(player, 0);
              setPlayer(player);
              setPlaying(true);
              pollProgress.dismiss('Recitation ready');
            } catch (err) {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              const msg = `Playback failed: ${err.message}`;
              addLog('Audio', msg, 'error');
              pollProgress.dismiss();
              setError(msg);
              toast.error(msg);
            }
          } else {
            const msg = 'Audio generation timeout - please try again';
            addLog('Audio', msg, 'error');
            pollProgress.dismiss();
            toast.error(msg);
          }
          usePoemStore.getState().removeActiveAudio(current?.id);
          setGenerating(false);
        }, 10000);
      }
    }, 60000);

    isTogglingPlay.current = false;
    return;
  }

  await doGenerate();
}
