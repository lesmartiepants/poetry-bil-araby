import { useState, useRef, useEffect } from 'react';
import { track } from '@vercel/analytics';
import Sentry from '../sentry.js';
import { useLogger } from '../LogContext.jsx';
import { FEATURES } from '../constants/features';
import { GOLD } from '../constants/theme';
import { getApiUrl, API_MODELS, TTS_CONFIG, fetchWithRetry } from '../services/api';
import { CACHE_CONFIG, cacheOperations } from '../services/cache';
import { getTTSContent } from '../prompts';
import { pcm16ToWav } from '../utils/audio';

/**
 * useAudio
 *
 * Manages audio playback, TTS generation, caching, volume detection, and PulseGlowBars.
 *
 * @param {Object} params
 * @param {Object|null} params.current - The current poem object
 * @returns {Object} Audio state, handlers, and PulseGlowBars component
 */
export function useAudio({ current }) {
  const { addLog } = useLogger();

  const audioRef = useRef(new Audio());
  const isTogglingPlay = useRef(false);

  // Volume-based glow effect refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const volumePulseRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [audioCacheStats, setAudioCacheStats] = useState({ hits: 0, misses: 0 });

  const activeAudioRequests = useRef(new Set());
  const pollingIntervals = useRef([]);

  // Audio ended handler
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // Volume detection for pulse & glow effect
  useEffect(() => {
    if (isPlaying && audioRef.current && !audioContextRef.current) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audioRef.current);

        analyser.fftSize = 32;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        const detectVolume = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          const normalizedVolume = average / 255;

          if (normalizedVolume > 0.7 && volumePulseRef.current) {
            volumePulseRef.current.classList.add('volume-pulse-active');
            setTimeout(() => {
              if (volumePulseRef.current) {
                volumePulseRef.current.classList.remove('volume-pulse-active');
              }
            }, 150);
          }

          animationFrameRef.current = requestAnimationFrame(detectVolume);
        };

        detectVolume();

        if (FEATURES.logging) {
          addLog('Audio Context', 'Initialized volume detection for glow effect', 'info');
        }
      } catch (error) {
        // Gracefully degrade to CSS-only animation
        if (FEATURES.logging) {
          console.error('Failed to initialize Web Audio API:', error);
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        dataArrayRef.current = null;
      }
    };
  }, [isPlaying]);

  const PulseGlowBars = () => (
    <div ref={volumePulseRef} className="flex items-center justify-center gap-[3px] h-6">
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{ background: GOLD.gold, animation: 'wave-organic-1 0.9s ease-in-out infinite' }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-2 1.15s ease-in-out infinite 0.1s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-3 0.95s ease-in-out infinite 0.2s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-4 1.1s ease-in-out infinite 0.15s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-5 0.88s ease-in-out infinite 0.05s',
        }}
      />
    </div>
  );

  const togglePlay = async () => {
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

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      track('audio_pause', { poet: current?.poet });
      addLog('UI Event', '⏸️ Pause button clicked', 'info');
      isTogglingPlay.current = false;
      return;
    }

    if (audioUrl) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        addLog('Audio', 'Playback failed, resetting audio URL', 'info');
        setAudioUrl(null);
      }
      isTogglingPlay.current = false;
      return;
    }

    // Set loading state FIRST (before duplicate check) for better UX
    setIsGeneratingAudio(true);

    // Check if request already in flight - poll until it completes
    if (activeAudioRequests.current.has(current?.id)) {
      addLog('Audio', `Audio generation already in progress - waiting for completion`, 'info');

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeAudioRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and play
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
          if (cached?.blob) {
            addLog(
              'Audio',
              `✓ Background audio generation completed - playing from cache`,
              'success'
            );
            const u = URL.createObjectURL(cached.blob);
            setAudioUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                addLog('Audio', `Playback failed: ${err.message}`, 'error');
              });
          } else {
            addLog('Audio', 'Background generation failed — please try again', 'info');
            isTogglingPlay.current = false;
            setIsGeneratingAudio(false);
            return;
          }
          setIsGeneratingAudio(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some large poems take 40+ seconds)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeAudioRequests.current.has(current?.id)) {
          addLog(
            'Audio',
            `Audio generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
            if (finalCheck?.blob) {
              addLog('Audio', `✓ Audio completed after extended wait - playing now`, 'success');
              const u = URL.createObjectURL(finalCheck.blob);
              setAudioUrl(u);
              audioRef.current.src = u;
              audioRef.current.load();
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                  addLog('Audio', `Playback failed: ${err.message}`, 'error');
                });
            } else {
              addLog('Audio', `Audio generation timeout - please try again`, 'error');
            }
            activeAudioRequests.current.delete(current?.id);
            setIsGeneratingAudio(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      isTogglingPlay.current = false;
      return;
    }

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.blob) {
        const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
        addLog(
          'Audio Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | Size: ${sizeMB}MB | Instant playback`,
          'success'
        );
        setAudioCacheStats((prev) => ({ ...prev, hits: prev.hits + 1 }));

        const u = URL.createObjectURL(cached.blob);
        setAudioUrl(u);
        audioRef.current.src = u;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
            addLog('Audio', `Cached playback failed: ${err.message}`, 'error');
          });
        setIsGeneratingAudio(false); // Clear loading state
        isTogglingPlay.current = false;
        return;
      } else {
        addLog(
          'Audio Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        setAudioCacheStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      }
    }

    // Mark request as in-flight
    activeAudioRequests.current.add(current?.id);

    const ttsContent = getTTSContent(current);

    // Calculate request metrics
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: ttsContent }] }],
      generationConfig: {
        responseModalities: TTS_CONFIG.responseModalities,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName },
          },
        },
      },
    });
    const requestSize = new Blob([requestBody]).size;
    const estimatedTokens = Math.ceil(ttsContent.length / 4);
    const arabicTextChars = current?.arabic?.length || 0;

    addLog(
      'Audio API',
      `→ Starting generation | Request: ${(requestSize / 1024).toFixed(1)}KB | ${arabicTextChars} chars Arabic | Est. ${estimatedTokens} tokens`,
      'info'
    );

    setAudioError(null);

    try {
      const apiStart = performance.now();
      const url = `${getApiUrl()}/api/ai/${API_MODELS.tts}/generateContent`;
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };
      const res = await fetchWithRetry(url, fetchOptions, { addLog, label: 'Audio API' });

      if (!res.ok) {
        const errorText = await res.text();
        addLog('Audio API Error', `HTTP ${res.status}: ${errorText.substring(0, 200)}`, 'error');
        if (res.status === 429) {
          setAudioError(
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
          `No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`,
          'error'
        );
        throw new Error('Recitation failed - no audio candidates returned');
      }

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const conversionStart = performance.now();
        const blob = pcm16ToWav(b64, 24000, (err) => addLog('Audio Error', err, 'error'));
        const conversionTime = performance.now() - conversionStart;

        if (blob) {
          // Calculate audio metrics
          const audioSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          const audioSizeKB = (blob.size / 1024).toFixed(1);
          // Estimate audio duration from PCM samples (24kHz, 16-bit, mono)
          const pcmBytes = atob(b64.replace(/\s/g, '')).length;
          const samples = pcmBytes / 2; // 16-bit = 2 bytes per sample
          const audioDuration = samples / 24000; // 24kHz sample rate
          const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);
          const totalTime = apiTime + conversionTime;

          addLog(
            'Audio API',
            `✓ Complete | API: ${(apiTime / 1000).toFixed(2)}s | Convert: ${conversionTime.toFixed(0)}ms | Total: ${(totalTime / 1000).toFixed(2)}s`,
            'success'
          );
          addLog(
            'Audio Metrics',
            `Audio: ${audioDuration.toFixed(1)}s | Size: ${audioSizeKB}KB (${audioSizeMB}MB) | Speed: ${tokensPerSecond} tok/s`,
            'success'
          );

          const u = URL.createObjectURL(blob);
          setAudioUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              addLog('Audio', `Playback failed: ${err.message}`, 'error');
            });

          // CACHE THE AUDIO BLOB
          if (FEATURES.caching && current?.id) {
            const cacheStart = performance.now();
            await cacheOperations.set(CACHE_CONFIG.stores.audio, current.id, {
              blob,
              metadata: {
                poet: current.poet,
                title: current.title,
                size: blob.size,
                duration: audioDuration,
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
      setIsPlaying(false);
    } finally {
      setIsGeneratingAudio(false);
      activeAudioRequests.current.delete(current?.id); // Clean up in-flight tracking
      isTogglingPlay.current = false;
    }
  };

  /**
   * Reset audio state (called by parent on poem change)
   */
  const resetAudio = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsGeneratingAudio(false);
    setAudioError(null);
    // Clear polling intervals
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current = [];
  };

  const dismissAudioError = () => setAudioError(null);

  return {
    audioRef,
    isPlaying,
    isGeneratingAudio,
    audioUrl,
    audioError,
    audioCacheStats,
    activeAudioRequests,
    togglePlay,
    resetAudio,
    dismissAudioError,
    PulseGlowBars,
  };
}
