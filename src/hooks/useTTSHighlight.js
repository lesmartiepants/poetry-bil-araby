import { useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';

/**
 * Module-level playback state — mutable objects so tests can import by reference.
 * Using objects with a `.value` property allows tests to read the current value
 * after a call without needing a React state update cycle.
 */
export const playbackStartTime = { value: 0 };
export const pauseOffset = { value: 0 };

/**
 * Start a Tone.Player from a given offset and record the wall-clock start time.
 * Replaces all direct player.start() calls in togglePlay.js.
 *
 * @param {import('tone').Player} player
 * @param {number} offset - seconds into the audio to start from
 */
export function startPlayer(player, offset) {
  pauseOffset.value = offset;
  playbackStartTime.value = Date.now() / 1000;
  player.start(undefined, offset);
}

/**
 * Record the current playback position as the pause offset.
 * Call this immediately before player.stop() on the pause path.
 */
export function recordPause() {
  const elapsed = Date.now() / 1000 - playbackStartTime.value;
  pauseOffset.value = pauseOffset.value + Math.max(0, elapsed);
  // Reset start time so subsequent recordPause calls are safe
  playbackStartTime.value = Date.now() / 1000;
}

/**
 * Drive word-level highlight classes via rAF + DOM classList mutation.
 * Zero React re-renders — all updates are direct DOM writes.
 *
 * Subscribes to audioStore.isPlaying via vanilla Zustand subscribe (no middleware).
 * Starts/stops the rAF loop accordingly.
 *
 * @param {object} params
 * @param {React.RefObject[]} params.wordRefs      - Array of refs, one per word span
 * @param {{ word:string, start:number, end:number }[]} params.timings
 * @param {number} params.totalDuration            - Total audio duration in seconds
 */
export function useTTSHighlight({ wordRefs, timings, totalDuration }) {
  const rafRef = useRef(null);
  const activeIndexRef = useRef(-1);

  // Start the rAF loop — called when isPlaying becomes true
  function startLoop() {
    function tick() {
      const elapsed = Date.now() / 1000 - playbackStartTime.value + pauseOffset.value;

      // Find the word index whose window contains elapsed
      let newIndex = -1;
      for (let i = 0; i < timings.length; i++) {
        if (elapsed >= timings[i].start && elapsed < timings[i].end) {
          newIndex = i;
          break;
        }
      }
      // If past the last word end, keep the last word active
      if (elapsed >= totalDuration && timings.length > 0) {
        newIndex = timings.length - 1;
      }

      if (newIndex !== activeIndexRef.current) {
        activeIndexRef.current = newIndex;
        for (let i = 0; i < wordRefs.length; i++) {
          const el = wordRefs[i]?.current;
          if (!el) continue;
          el.classList.remove('tts-active', 'tts-past');
          if (i === newIndex) {
            el.classList.add('tts-active');
          } else if (i < newIndex) {
            el.classList.add('tts-past');
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function clearAllClasses() {
    for (let i = 0; i < wordRefs.length; i++) {
      const el = wordRefs[i]?.current;
      if (!el) continue;
      el.classList.remove('tts-active', 'tts-past');
    }
    activeIndexRef.current = -1;
  }

  useEffect(() => {
    // Subscribe to isPlaying changes using vanilla Zustand subscribe (no middleware).
    // Vanilla subscribe signature: (state, prevState) => void — no selector arg.
    const unsubscribe = useAudioStore.subscribe((state, prevState) => {
      const isPlaying = state.isPlaying;
      const wasPlaying = prevState.isPlaying;
      if (isPlaying && !wasPlaying) {
        stopLoop();
        startLoop();
      } else if (!isPlaying && wasPlaying) {
        stopLoop();
        // Do NOT clear classes on pause — highlights freeze in place
      }
    });

    // If already playing when hook mounts (e.g. style switch mid-play), start immediately
    if (useAudioStore.getState().isPlaying) {
      startLoop();
    }

    return () => {
      unsubscribe();
      stopLoop();
      clearAllClasses();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timings, totalDuration]);
}
