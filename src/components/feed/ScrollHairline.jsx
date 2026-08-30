import { useEffect, useRef } from 'react';

/**
 * ScrollHairline — the 2px right-edge progress line (plan D7/D9). One element that tracks
 * whichever scroller is live: the poem column while reading, the inline insight's viewport while
 * a section is open. Non-interactive; invisible until the tracked content overflows.
 *
 * `getScroller` is re-evaluated whenever `source` changes (poem id / reader mode), so the
 * listener follows the element that actually scrolls in the current state.
 */
export default function ScrollHairline({ getScroller, source }) {
  const fillRef = useRef(null);

  useEffect(() => {
    const el = getScroller();
    const fill = fillRef.current;
    if (!el || !fill) return undefined;

    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    paint();
    el.addEventListener('scroll', schedule, { passive: true });
    // Content-height changes (fonts finishing, the reveal settling) move the denominator; resize
    // catches the common cases and every scroll repaints from live measurements, so the line
    // self-corrects. A ResizeObserver would be tighter, but this is a 2px affordance.
    window.addEventListener('resize', schedule);
    return () => {
      el.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [getScroller, source]);

  return (
    <div className="pc-hairline" aria-hidden="true">
      <div ref={fillRef} className="pc-hairline-fill" />
    </div>
  );
}
