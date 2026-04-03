import { createElement } from 'react';
import { Rabbit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Player, start as toneStart } from 'tone';
import { toast } from 'sonner';
import Sentry from '../../sentry.js';
import { FEATURES } from '../../constants/features';
import { useAudioStore } from '../audioStore';
import { startPlayer, recordPause, pauseOffset } from '../../hooks/useTTSHighlight.js';
import { usePoemStore } from '../poemStore';
import { useUIStore } from '../uiStore';
import { getTTSContent, LIVE_SYSTEM_INSTRUCTION, getLiveContent } from '../../prompts';
import { API_MODELS, TTS_CONFIG, fetchTTSWithFallback } from '../../services/gemini.js';
import { cacheOperations, CACHE_CONFIG } from '../../services/cache.js';
import { pcm16ToWav } from '../../utils/audio.js';

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
  'Warming up the oud strings',
  'The majlis is gathering',
  'Ink drying on the qasida',
];

/**
 * Create a Sonner toast with a countdown timer for TTS generation.
 * Format: "Recitation ready in Xs" title, "Preparing N lines" description cycling with fun messages.
 * Returns { dismiss } function for cleanup. Auto-dismisses if isGenerating
 * goes false externally (e.g. poem navigation).
 */
function createProgressToast(estimatedSeconds, arabicText) {
  const toastId = `tts-progress-${Date.now()}`;
  const startTime = Date.now();
  const lineCount = arabicText ? arabicText.split('\n').filter(l => l.trim()).length : 0;
  const lineInfo = lineCount > 0 ? `Preparing ${lineCount} line${lineCount !== 1 ? 's' : ''}` : 'Preparing recitation';

  toast.loading(`Recitation ready in ${estimatedSeconds}s`, {
    id: toastId,
    description: lineInfo,
    duration: Infinity,
    icon: createElement(motion.div, { animate: { y: [0, -5, 0] }, transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut' } }, createElement(Rabbit, { size: 16 })),
  });

  const interval = setInterval(() => {
    // Auto-dismiss if generation was cancelled externally (poem change, etc.)
    if (!useAudioStore.getState().isGenerating) {
      clearInterval(interval);
      toast.dismiss(toastId);
      return;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = estimatedSeconds - elapsed;
    const msgIndex = Math.floor(elapsed / 5) % TTS_LOADING_MESSAGES.length;
    const subtitle = TTS_LOADING_MESSAGES[msgIndex];

    if (remaining > 0) {
      toast.loading(`Recitation ready in ${remaining}s`, {
        id: toastId,
        description: subtitle,
        duration: Infinity,
        icon: createElement(motion.div, { animate: { y: [0, -5, 0] }, transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut' } }, createElement(Rabbit, { size: 16 })),
      });
    } else {
      toast.loading('Almost ready...', {
        id: toastId,
        description: subtitle,
        duration: Infinity,
        icon: createElement(motion.div, { animate: { y: [0, -5, 0] }, transition: { repeat: Infinity, duration: 0.55, ease: 'easeInOut' } }, createElement(Rabbit, { size: 16 })),
      });
    }
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
 * Invalidate any in-flight togglePlay so it won't start playback after a swipe.
 * Call this alongside resetAudio() in the carousel swipe handlers.
 */
export function abortPlay() {
  _currentPlayId++;
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

/**
 * Create a Tone.Player from a URL and wait until its buffer is fully decoded before returning.
 * Uses the constructor onload callback (not player.loaded or Tone.loaded()) because those
 * can resolve before the AudioBuffer decode completes for blob URLs in Tone.js v15.
 */
function createPlayerReady(url) {
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
      // Unlock AudioContext after user gesture (handles iOS autoplay policy)
      await toneStart();
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

  // iOS Safari / browser autoplay unlock — Tone.start() resumes the AudioContext
  // after a user gesture, replacing the old mute/play/pause trick on the raw Audio element.
  await toneStart();

  setGenerating(true);

  const playId = ++_currentPlayId;

  const doGenerate = async () => {
    // CHECK CACHE
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id, addLog);
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

    let ttsMode = useUIStore.getState().ttsMode;
    const arabicTextChars = current?.arabic?.length || 0;

    const modelLabel = ttsMode === 'live' ? 'Live 2.0' : API_MODELS.tts;
    addLog(
      'Audio API',
      `→ Starting generation | Model: ${modelLabel} | ${arabicTextChars} chars Arabic`,
      'request'
    );
    setError(null);

    // Show progress toast with estimated countdown
    const estSeconds = estimateTTSSeconds(arabicTextChars);
    const progress = createProgressToast(estSeconds, current?.arabic);
    addLog('Audio', `Estimated generation time: ~${estSeconds}s for ${arabicTextChars} Arabic chars`, 'info');

    try {
      const apiStart = performance.now();
      let b64;
      let ttsModel;

      if (ttsMode === 'live') {
        // ── Live API path — WebSocket TTS via server endpoint ──
        // Delivery style goes in system instruction (not prepended to text) for Live API
        const { liveVoice, liveTemperature } = useUIStore.getState();
        ttsModel = 'Live 2.0';
        addLog('Audio API', `[${ttsModel}] Using Live API WebSocket | voice: ${liveVoice} | temp: ${liveTemperature}`, 'info');
        const liveRes = await fetch(`${apiUrl}/api/ai/live-tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: getLiveContent(current),
            voiceName: liveVoice,
            temperature: liveTemperature,
            systemInstruction: LIVE_SYSTEM_INSTRUCTION,
          }),
        });

        if (!liveRes.ok) {
          const errorText = await liveRes.text();
          addLog('Audio API Error', `[${ttsModel}] HTTP ${liveRes.status}: ${errorText.substring(0, 200)}`, 'error');
          if (liveRes.status === 429) {
            const msg = 'Recitation temporarily unavailable — too many requests. Please wait a moment and try again.';
            setError(msg);
            toast.error(msg);
            throw new Error('Rate limited (429)');
          }
          if (liveRes.status === 404) {
            // Live endpoint not available on this backend — fall through to REST
            addLog('Audio API', `[${ttsModel}] Live endpoint unavailable — falling back to REST`, 'warning');
            ttsMode = 'rest';
          } else {
            throw new Error(`Live API returned ${liveRes.status}: ${liveRes.statusText}`);
          }
        }

        if (ttsMode === 'live') {
          const liveData = await liveRes.json();
          if (!liveData.audioData) {
            throw new Error('Live API returned no audio data');
          }
          b64 = liveData.audioData;
        }
      }

      if (ttsMode === 'rest') {
        // ── REST API path — existing generateContent flow ──
        // REST TTS does NOT support systemInstruction — delivery directions go in content block
        const ttsContent = getTTSContent(current);
        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: ttsContent }] }],
          generationConfig: {
            responseModalities: TTS_CONFIG.responseModalities,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName } } },
          },
        });
        const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
        // 120s hard timeout — prevents indefinite hang when Render backend stalls
        const ttsAbortController = new AbortController();
        const ttsTimeoutId = setTimeout(() => ttsAbortController.abort(), 120_000);
        const fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: ttsAbortController.signal,
        };
        let fallbackResult;
        try {
          fallbackResult = await fetchTTSWithFallback(url, fetchOptions, {
            addLog,
            label: 'Audio API',
          });
        } finally {
          clearTimeout(ttsTimeoutId);
        }
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
            const msg =
              'Recitation temporarily unavailable — too many requests. Please wait a moment and try again.';
            setError(msg);
            toast.error(msg);
            throw new Error('Rate limited (429)');
          }
          throw new Error(`API returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.candidates || data.candidates.length === 0) {
          addLog(
            'Audio API Error',
            `[${ttsModel}] No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`,
            'error'
          );
          throw new Error('Recitation failed - no audio candidates returned');
        }

        b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      }

      const apiTime = performance.now() - apiStart;
      if (b64) {
        const conversionStart = performance.now();
        const blob = pcm16ToWav(b64);
        const conversionTime = performance.now() - conversionStart;

        if (blob) {
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
            await cacheOperations.set(CACHE_CONFIG.stores.audio, current.id, {
              blob,
              metadata: {
                poet: current.poet,
                title: current.title,
                size: blob.size,
                duration: audioDuration,
                model: ttsModel,
              },
            }, addLog);
            const cacheTime = performance.now() - cacheStart;
            addLog(
              'Audio Cache',
              `Audio cached for future playback (${cacheTime.toFixed(0)}ms) | Saves ${(apiTime / 1000).toFixed(1)}s on replay`,
              'success'
            );
          }
        }
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
          const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id, addLog);
          if (finalCheck?.blob) {
            addLog('Audio', '✓ Audio completed after extended wait - playing now', 'success');
            if (_currentPlayId !== playId) {
              pollProgress.dismiss();
              setGenerating(false);
              return;
            }
            const u = URL.createObjectURL(finalCheck.blob);
            setUrl(u);

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
