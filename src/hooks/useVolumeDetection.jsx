import { useEffect } from 'react';
import { Analyser } from 'tone';
import { FEATURES } from '../constants/index.js';
import { GOLD } from '../constants/index.js';
import { useAudioStore } from '../stores/audioStore';

/**
 * Drives volume-based glow animation on the audio bars.
 *
 * Uses Tone.js Analyser (backed by the shared Tone AudioContext) instead of
 * a raw Web Audio API AnalyserNode.  The Tone.Player stored in audioStore is
 * connected to the analyser on each play cycle and disconnected on cleanup.
 *
 * Signature keeps legacy ref params (audioRef, audioContextRef, analyserRef,
 * dataArrayRef, sourceNodeRef) for backward compatibility — the integrator
 * agent will remove them from app.jsx in Phase 2 once all callers are updated.
 *
 * @param {object} params
 * @param {boolean}        params.isPlaying        - Whether audio is currently playing
 * @param {React.RefObject} params.audioRef         - LEGACY: no longer used internally
 * @param {React.RefObject} params.audioContextRef  - LEGACY: no longer used internally
 * @param {React.RefObject} params.analyserRef      - LEGACY: no longer used internally
 * @param {React.RefObject} params.dataArrayRef     - LEGACY: no longer used internally
 * @param {React.RefObject} params.animationFrameRef- rAF handle ref
 * @param {React.RefObject} params.sourceNodeRef    - LEGACY: no longer used internally
 * @param {React.RefObject} params.volumePulseRef   - Ref to the DOM element to toggle
 * @param {Function}        params.addLog           - Logging helper
 */
export function useVolumeDetection({
  isPlaying,
  audioRef,         // LEGACY — kept for app.jsx compat; integrator will remove in Phase 2
  audioContextRef,  // LEGACY — kept for app.jsx compat; integrator will remove in Phase 2
  analyserRef,      // LEGACY — kept for app.jsx compat; integrator will remove in Phase 2
  dataArrayRef,     // LEGACY — kept for app.jsx compat; integrator will remove in Phase 2
  animationFrameRef,
  sourceNodeRef,    // LEGACY — kept for app.jsx compat; integrator will remove in Phase 2
  volumePulseRef,
  addLog,
}) {
  useEffect(() => {
    if (!isPlaying) return;

    // Grab the Tone.Player from the store — set by togglePlay after player.start()
    const player = useAudioStore.getState().player;

    let toneAnalyser = null;
    let dataArray = null;

    try {
      // Tone.Analyser wraps the shared Tone AudioContext — no need to create our own.
      toneAnalyser = new Analyser('fft', 32);
      dataArray = new Float32Array(32);

      if (player) {
        // Connect the player output through the analyser to the main destination
        player.connect(toneAnalyser);
      } else {
        // No player yet — degrade gracefully to CSS-only animation
        if (FEATURES.logging) {
          addLog('Audio Context', 'No Tone.Player available — skipping analyser setup', 'info');
        }
        return;
      }

      if (FEATURES.logging) {
        addLog('Audio Context', 'Initialized Tone.js volume detection for glow effect', 'info');
      }

      const detectVolume = () => {
        if (!toneAnalyser) return;

        // Tone.Analyser.getValue() returns Float32Array (dB values) for 'fft' type
        const values = toneAnalyser.getValue();

        let sum = 0;
        for (let i = 0; i < values.length; i++) {
          // Convert dBFS to linear (values are negative dB, e.g. -100 to 0)
          sum += Math.pow(10, values[i] / 20);
        }
        const average = sum / values.length;
        // Normalize: linear amplitude roughly 0–1; signal typically stays below 0.5
        const normalizedVolume = Math.min(average * 2, 1);

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
        console.error('Failed to initialize Tone.js analyser:', error);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (toneAnalyser) {
        toneAnalyser.dispose();
        toneAnalyser = null;
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
