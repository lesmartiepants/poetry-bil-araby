import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detects user inactivity and returns `isIdle: true` after `delay` ms.
 *
 * Only taps / clicks / key presses reset the timer — scroll and mouse-move are
 * intentionally ignored so passive reading doesn't prevent zen mode.
 *
 * Events originating inside any element in `excludeRefs` (e.g. settings buttons
 * or the floating listen button) will NOT reset the timer so those controls stay
 * interactive without waking the chrome UI.
 *
 * @param {number} delay - Milliseconds of inactivity before `isIdle` becomes true (default: 4000)
 * @param {React.RefObject|React.RefObject[]|null} [excludeRefs] - Ref(s) whose events are ignored
 * @returns {{ isIdle: boolean }}
 */
export function useIdleTimer(delay = 4_000, excludeRefs = null) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), delay);
  }, [delay]);

  const resetTimer = useCallback(
    (e) => {
      // Skip reset if the event came from any excluded element
      if (e != null && e.target instanceof Node) {
        const refs = Array.isArray(excludeRefs) ? excludeRefs : excludeRefs ? [excludeRefs] : [];
        if (refs.some((r) => r?.current && r.current.contains(e.target))) {
          return;
        }
      }
      setIsIdle(false);
      startTimer();
    },
    [excludeRefs, startTimer]
  );

  useEffect(() => {
    // Only discrete intentional interactions (taps / clicks / keys) reset the
    // timer — scroll and mouse-move are excluded so passive reading/browsing
    // won't prevent zen mode from engaging.
    const events = ['mousedown', 'keydown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    // Start the countdown on mount
    startTimer();
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, startTimer]);

  return { isIdle };
}
