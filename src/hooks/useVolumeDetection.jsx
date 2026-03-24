import { useEffect, useRef } from 'react';
import { FEATURES } from '../constants/index.js';
import { GOLD } from '../constants/index.js';

/**
 * Drives volume-based glow animation on the audio bars.
 *
 * Attaches a Web Audio API analyser to the given audio element and
 * toggles the `volume-pulse-active` class on `volumePulseRef` whenever
 * the detected volume exceeds a threshold.  Gracefully degrades to
 * CSS-only animation when the Web Audio API is unavailable.
 *
 * @param {object} params
 * @param {boolean}        params.isPlaying        - Whether audio is currently playing
 * @param {React.RefObject} params.audioRef         - Ref to the HTMLAudioElement
 * @param {React.RefObject} params.audioContextRef  - Persisted AudioContext ref
 * @param {React.RefObject} params.analyserRef      - Persisted AnalyserNode ref
 * @param {React.RefObject} params.dataArrayRef     - Persisted Uint8Array ref
 * @param {React.RefObject} params.animationFrameRef- rAF handle ref
 * @param {React.RefObject} params.sourceNodeRef    - Persisted MediaElementSourceNode ref
 * @param {React.RefObject} params.volumePulseRef   - Ref to the DOM element to toggle
 * @param {Function}        params.addLog           - Logging helper
 */
export function useVolumeDetection({
  isPlaying,
  audioRef,
  audioContextRef,
  analyserRef,
  dataArrayRef,
  animationFrameRef,
  sourceNodeRef,
  volumePulseRef,
  addLog,
}) {
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      try {
        // Initialize AudioContext and source node if not already created.
        // A MediaElement can only be connected to one MediaElementSourceNode ever,
        // so we must reuse the source node across play/pause cycles.
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioCtx();
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 32;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          // Reuse existing source node or create a new one
          const source =
            sourceNodeRef.current || audioContext.createMediaElementSource(audioRef.current);
          sourceNodeRef.current = source;

          source.connect(analyser);
          analyser.connect(audioContext.destination);

          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          dataArrayRef.current = dataArray;

          if (FEATURES.logging) {
            addLog('Audio Context', 'Initialized volume detection for glow effect', 'info');
          }
        }

        // Resume context if it was suspended (e.g., by browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

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
    };
  }, [isPlaying]);
}

/**
 * Five animated bars that pulse with volume via the `volume-pulse-active` class.
 * Attach `volumePulseRef` to the container to enable glow on loud audio.
 *
 * @param {object} props
 * @param {React.RefObject} props.volumePulseRef - Ref forwarded to the wrapper div
 */
export function PulseGlowBars({ volumePulseRef }) {
  return (
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
}
