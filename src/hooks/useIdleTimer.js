import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detects user inactivity and returns `isIdle: true` after `delay` ms.
 *
 * Any pointer/keyboard/scroll activity resets the timer — unless the event
 * originated inside `excludeRef.current` (e.g. a "listen" button that should
 * remain interactive without waking the chrome UI).
 *
 * @param {number} delay - Milliseconds of inactivity before `isIdle` becomes true (default: 10000)
 * @param {React.RefObject|null} [excludeRef] - Events inside this element won't reset the timer
 * @returns {{ isIdle: boolean }}
 */
export function useIdleTimer(delay = 10_000, excludeRef = null) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), delay);
  }, [delay]);

  const resetTimer = useCallback(
    (e) => {
      // Skip reset if the event came from the excluded element (e.g. listen button)
      if (
        excludeRef?.current &&
        e != null &&
        e.target instanceof Node &&
        excludeRef.current.contains(e.target)
      ) {
        return;
      }
      setIsIdle(false);
      startTimer();
    },
    [excludeRef, startTimer]
  );

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
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
