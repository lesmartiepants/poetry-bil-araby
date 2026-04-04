import { useEffect, useRef, useCallback } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { FEATURES } from '../constants/features';

/**
 * Module-level playback state — mutable objects so tests can import by reference.
 * Using objects with a `.value` property allows tests to read the current value
 * after a call without needing a React state update cycle.
 */
export const playbackStartTime = { value: 0 };
export const pauseOffset = { value: 0 };
/**
 * Seek guard — set true before player.stop() in a seek operation so the
 * onstop handler skips its setPlaying(false) call. Reset after startPlayer().
 */
export const isSeeking = { value: false };

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
  if (FEATURES.logging) console.log(`[Playback:startPlayer] offset=${offset.toFixed(2)}s`);
  player.start(undefined, offset);
}

/**
 * Record the current playback position as the pause offset.
 *
 * INVARIANT: must be called immediately before player.stop() on the pause path.
 * After this call, playbackStartTime is reset. If called without a following stop(),
 * a subsequent startPlayer() will correctly re-anchor the clock — but the rAF tick
 * will accumulate double elapsed time until startPlayer() fires. Only use for pause.
 */
export function recordPause() {
  const elapsed = Date.now() / 1000 - playbackStartTime.value;
  const newOffset = pauseOffset.value + Math.max(0, elapsed);
  if (FEATURES.logging) console.log(`[Playback:recordPause] elapsed=${elapsed.toFixed(2)}s → offset=${newOffset.toFixed(2)}s`);
  pauseOffset.value = newOffset;
  // Reset start time so subsequent recordPause calls are safe
  playbackStartTime.value = Date.now() / 1000;
}

/**
 * One-shot application of TTS highlights at a specific offset.
 * Used when seeking while paused to reposition the active pill.
 *
 * @param {number} offset - playback offset in seconds
 * @param {React.RefObject[]} wordRefs
 * @param {number[]} wordOffsets
 * @param {{start:number, end:number}[]} timings
 * @param {number} totalDuration
 * @param {function} onVerseChange
 */
export function applyHighlightsOnce(offset, wordRefs, wordOffsets, timings, totalDuration, onVerseChange) {
  // Clear all existing highlight classes
  for (let i = 0; i < wordRefs.length; i++) {
    const el = wordRefs[i]?.current;
    if (el) {
      el.classList.remove('tts-active', 'tts-past');
    }
  }

  // Compute elapsed time from global playback state
  const elapsed = Date.now() / 1000 - playbackStartTime.value + pauseOffset.value;

  // Find active word index
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

  // Apply classes to words
  if (newIndex >= 0) {
    for (let i = 0; i < wordRefs.length; i++) {
      const el = wordRefs[i]?.current;
      if (!el) continue;
      if (i === newIndex) {
        el.classList.add('tts-active');
      } else if (i < newIndex) {
        el.classList.add('tts-past');
      }
    }

    // Scroll active element into view
    const activeEl = wordRefs[newIndex]?.current;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Call onVerseChange if verse boundary crossed
  if (wordOffsets.length > 0 && newIndex >= 0) {
    let verseIdx = 0;
    for (let v = 1; v < wordOffsets.length; v++) {
      if (newIndex >= wordOffsets[v]) verseIdx = v;
    }
    if (onVerseChange && typeof onVerseChange === 'function') {
      onVerseChange(verseIdx);
    }
  }
}

/**
 * Drive word-level highlight classes via rAF + DOM classList mutation.
 * Zero React re-renders for word updates — all class changes are direct DOM writes.
 *
 * Verse tracking: when the active verse changes, `onVerseChange(verseIdx)` is called.
 * The caller is responsible for updating any React state from that callback.
 * Only fires when the verse index changes — not every frame.
 *
 * Subscribes to audioStore.isPlaying via vanilla Zustand subscribe (no middleware).
 * Starts/stops the rAF loop accordingly.
 *
 * @param {object} params
 * @param {React.RefObject[]} params.wordRefs       - Array of refs, one per word span
 * @param {{ word:string, start:number, end:number }[]} params.timings
 * @param {number}   params.totalDuration           - Total audio duration in seconds
 * @param {number[]} params.wordOffsets             - First word index for each verse
 * @param {function} params.onVerseChange           - Called with verseIdx when verse changes
 */
export function useTTSHighlight({ wordRefs, timings, totalDuration, wordOffsets = [], onVerseChange }) {
  const rafRef = useRef(null);
  const activeIndexRef = useRef(-1);
  const activeVerseRef = useRef(-1);
  const lastScrollRef = useRef(0);
  // Stable ref to onVerseChange so tick closure doesn't go stale
  const onVerseChangeRef = useRef(onVerseChange);
  useEffect(() => { onVerseChangeRef.current = onVerseChange; });

  // Start the rAF loop — called when isPlaying becomes true
  function startLoop() {
    // One-shot scroll on first frame — ensures the active word is visible
    // even if the user has scrolled away while paused.
    let firstTick = true;
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

        // Auto-scroll: if active word is below viewport, scroll up to 2 lines
        if (newIndex >= 0) {
          const activeEl = wordRefs[newIndex]?.current;
          if (activeEl) {
            if (firstTick) {
              // On first tick (play/resume), center the active word in viewport
              firstTick = false;
              lastScrollRef.current = Date.now();
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              const rect = activeEl.getBoundingClientRect();
              const overflow = rect.bottom - window.innerHeight;
              const now = Date.now();
              if (overflow > 0 && now - lastScrollRef.current > 400) {
                lastScrollRef.current = now;
                const fontSize = parseFloat(getComputedStyle(activeEl).fontSize) || 28;
                const lineHeight = fontSize * 2.2; // matches leading-[2.2]
                window.scrollBy({ top: Math.min(overflow + lineHeight * 0.5, lineHeight * 2), behavior: 'smooth' });
              }
            }
          }
        }

        // Verse tracking — only fires when verse boundary is crossed
        if (wordOffsets.length > 0 && newIndex >= 0) {
          let verseIdx = 0;
          for (let v = 1; v < wordOffsets.length; v++) {
            if (newIndex >= wordOffsets[v]) verseIdx = v;
          }
          if (verseIdx !== activeVerseRef.current) {
            activeVerseRef.current = verseIdx;
            onVerseChangeRef.current?.(verseIdx);
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
    // Safe: wordRefs and onVerseChangeRef.current are accessed by reference inside
    // the closure. wordRefs is recreated only when allWords.length changes, which
    // also causes timings to change (new poem) — so the effect re-runs and the
    // closure is refreshed. onVerseChange is kept current via onVerseChangeRef.
  }, [timings, totalDuration, wordOffsets]);
}
