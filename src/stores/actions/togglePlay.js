import Sentry from '../../sentry.js';
import { FEATURES } from '../../constants/features';
import { useAudioStore } from '../audioStore';
import { usePoemStore } from '../poemStore';
import { useUIStore } from '../uiStore';
import { getTTSContent } from '../../prompts';
import { API_MODELS, TTS_CONFIG, fetchTTSWithFallback } from '../../services/gemini.js';
import { cacheOperations, CACHE_CONFIG } from '../../services/cache.js';
import { pcm16ToWav } from '../../utils/audio.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Toggle audio playback — handles pause, resume, cache check, TTS generation, and polling.
 *
 * @param {Object} options
 * @param {Object} options.audioRef - React ref to the <audio> element
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
    setPlaying,
    setGenerating,
    setUrl,
    setError,
  } = useAudioStore.getState();

  if (isTogglingPlay.current) {
    addLog('Audio', 'Play toggle already in progress — skipping', 'info');
    return;
  }
  isTogglingPlay.current = true;
  addLog(
    'UI Event',
    `🎵 Play button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
    'info'
  );
  track('audio_play', { poet: current?.poet });

  // PAUSE
  if (isPlaying) {
    audioRef.current.pause();
    setPlaying(false);
    track('audio_pause', { poet: current?.poet });
    addLog('UI Event', '⏸️ Pause button clicked', 'info');
    isTogglingPlay.current = false;
    return;
  }

  // RESUME (url already loaded)
  if (audioUrl) {
    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch (e) {
      addLog('Audio', 'Playback failed, resetting audio URL', 'info');
      setUrl(null);
    }
    isTogglingPlay.current = false;
    return;
  }

  // iOS Safari autoplay unlock
  if (audioRef.current) {
    const wasMuted = audioRef.current.muted;
    audioRef.current.muted = true;
    const unlockPlay = audioRef.current.play();
    if (unlockPlay !== undefined) unlockPlay.catch(() => {});
    audioRef.current.pause();
    audioRef.current.muted = wasMuted;
  }

  setGenerating(true);

  const doGenerate = async () => {
    // CHECK CACHE
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.blob) {
        const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
        addLog(
          'Audio Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms)${cached.metadata?.model ? ` | Model: ${cached.metadata.model}` : ''} | Size: ${sizeMB}MB | Instant playback`,
          'success'
        );
        useUIStore.getState().incrementCacheStat('audioHits');

        const u = URL.createObjectURL(cached.blob);
        setUrl(u);
        audioRef.current.src = u;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => setPlaying(true))
          .catch((err) => {
            if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
            addLog('Audio', `Cached playback failed: ${err.message}`, 'error');
          });
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

    const ttsContent = getTTSContent(current);
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: ttsContent }] }],
      generationConfig: {
        responseModalities: TTS_CONFIG.responseModalities,
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName } } },
      },
    });
    const requestSize = new Blob([requestBody]).size;
    const estimatedTokens = Math.ceil(ttsContent.length / 4);
    const arabicTextChars = current?.arabic?.length || 0;

    addLog(
      'Audio API',
      `→ Starting generation | Model: ${API_MODELS.tts} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${arabicTextChars} chars Arabic | Est. ${estimatedTokens} tokens`,
      'info'
    );
    setError(null);

    try {
      const apiStart = performance.now();
      const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };
      const { res, model: ttsModel } = await fetchTTSWithFallback(url, fetchOptions, {
        addLog,
        label: 'Audio API',
      });

      if (!res.ok) {
        const errorText = await res.text();
        addLog(
          'Audio API Error',
          `[${ttsModel}] HTTP ${res.status}: ${errorText.substring(0, 200)}`,
          'error'
        );
        if (res.status === 429) {
          setError(
            'Recitation temporarily unavailable — too many requests. Please wait a moment and try again.'
          );
          throw new Error('Rate limited (429)');
        }
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const apiTime = performance.now() - apiStart;

      if (!data.candidates || data.candidates.length === 0) {
        addLog(
          'Audio API Error',
          `[${ttsModel}] No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`,
          'error'
        );
        throw new Error('Recitation failed - no audio candidates returned');
      }

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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

          const u = URL.createObjectURL(blob);
          setUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => setPlaying(true))
            .catch((err) => {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              addLog('Audio', `Playback failed: ${err.message}`, 'error');
            });

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
            });
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
      Sentry.captureException(e);
      addLog('Audio System Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('audio_error', { error: (e.message || '').slice(0, 100) });
      setPlaying(false);
    } finally {
      setGenerating(false);
      usePoemStore.getState().removeActiveAudio(current?.id);
      isTogglingPlay.current = false;
    }
  };

  // Check if request already in flight — poll until it completes
  if (usePoemStore.getState().hasActiveAudio(current?.id)) {
    addLog('Audio', 'Audio generation already in progress - waiting for completion', 'info');

    const pollInterval = setInterval(async () => {
      if (!usePoemStore.getState().hasActiveAudio(current?.id)) {
        clearInterval(pollInterval);
        usePoemStore.getState().removePollingInterval(pollInterval);

        const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
        if (cached?.blob) {
          addLog(
            'Audio',
            `✓ Background audio generation completed${cached.metadata?.model ? ` [${cached.metadata.model}]` : ''} - playing from cache`,
            'success'
          );
          const u = URL.createObjectURL(cached.blob);
          setUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => setPlaying(true))
            .catch((err) => {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              addLog('Audio', `Playback failed: ${err.message}`, 'error');
            });
        } else {
          addLog('Audio', 'Prefetch failed — retrying audio generation automatically...', 'error');
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
          const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
          if (finalCheck?.blob) {
            addLog('Audio', '✓ Audio completed after extended wait - playing now', 'success');
            const u = URL.createObjectURL(finalCheck.blob);
            setUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setPlaying(true))
              .catch((err) => {
                if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                addLog('Audio', `Playback failed: ${err.message}`, 'error');
              });
          } else {
            addLog('Audio', 'Audio generation timeout - please try again', 'error');
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
