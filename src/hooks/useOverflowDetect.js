import { useState, useEffect, useRef } from 'react';

/**
 * useOverflowDetect
 *
 * Detects whether content overflows its container and provides overflow state.
 * Monitors resize events and DOM changes via ResizeObserver.
 * Prevents oscillation on narrow screens with a fixed threshold (660px).
 *
 * @param {React.RefObject} controlBarRef - Ref to the control bar element to measure
 * @param {Array} deps - Dependencies array (e.g., [user] to re-measure on auth state changes)
 * @returns {boolean} isOverflow - True if content overflows or viewport is narrow
 */
export function useOverflowDetect(controlBarRef, deps = []) {
  const [isOverflow, setIsOverflow] = useState(() => {
    // Use 660 as the conservative initial threshold (covers both Supabase and non-Supabase button sets).
    // The detectOverflow effect below will refine this after mount.
    const vw = window.visualViewport?.width ?? window.innerWidth;
    return vw < 660;
  });

  const pendingRafRef = useRef(null);

  useEffect(() => {
    // Threshold below which overflow mode is always active (prevents oscillation on narrow screens).
    // Re-runs when user signs in/out so the bar is re-measured after auth state changes.
    const narrowThreshold = 660;

    const scheduleDetect = () => {
      // Deduplicate: cancel any pending frame before scheduling a new one
      if (pendingRafRef.current !== null) cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        if (!controlBarRef.current) return;
        const bar = controlBarRef.current;
        const vw = window.visualViewport?.width ?? window.innerWidth;

        // Temporarily clip overflow so scrollWidth accurately reflects content width on iOS Safari,
        // where scrollWidth may equal clientWidth for flex containers with overflow:visible.
        const savedOverflow = bar.style.overflow;
        bar.style.overflow = 'hidden';
        const hasContentOverflow = bar.scrollWidth > bar.clientWidth;
        bar.style.overflow = savedOverflow;

        // Stay in overflow mode on narrow screens regardless of current bar width,
        // which prevents oscillation when the bar shrinks after switching to mobile layout.
        setIsOverflow(hasContentOverflow || vw < narrowThreshold);
      });
    };

    scheduleDetect();
    // Re-measure after a short delay to catch DOM updates from auth state changes
    // (React may not have rendered the new buttons in the first rAF)
    const delayedRecheck = setTimeout(scheduleDetect, 100);

    // ResizeObserver catches font-load changes and dynamic content updates.
    // Guard for environments where ResizeObserver is unavailable (older browsers, some test envs).
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleDetect);
      if (controlBarRef.current) resizeObserver.observe(controlBarRef.current);
    }

    window.addEventListener('resize', scheduleDetect);
    return () => {
      clearTimeout(delayedRecheck);
      if (pendingRafRef.current !== null) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleDetect);
    };

    // and the stable setIsOverflow setter are intentionally omitted; only real state values need deps.
  }, deps);

  return isOverflow;
}
