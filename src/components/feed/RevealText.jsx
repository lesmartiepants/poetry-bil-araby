import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { gsap } from 'gsap';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * RevealText — a paragraph that reveals word-by-word (gold shimmer on the leading word), used for
 * the inline insight sections (The Meaning / About the Author).
 *
 * It does NOT scroll itself: the viewport is overflow-hidden and the content is translated only via
 * scrollToFrac(), which the parent's persistent scrub bar drives (spec: no auto-scroll, no native
 * scroll — the scrubber is the only way to move the text). The component reports:
 *  • onProgress(frac)   — word-reveal/load progress (drives the scrub bar fill)
 *  • onScrollMeta({canScroll, atFrac}) — whether the text overflows + the in-view fraction
 *    (bottom edge / total), so the parent shows the scroll handle only when there's somewhere to
 *    scroll and positions it by what's visible (90% visible → handle at 90%).
 */
const RevealText = forwardRef(function RevealText(
  { text, active = true, color, onProgress, onScrollMeta },
  ref
) {
  const words = useMemo(() => (text || '').trim().split(/\s+/).filter(Boolean), [text]);
  const wordCount = words.length;

  const viewRef = useRef(null); // overflow-hidden viewport
  const innerRef = useRef(null); // translated content
  const wordRefs = useRef([]);
  const tweenRef = useRef(null);
  const scrollPxRef = useRef(0);
  const maxScrollRef = useRef(0);

  const applyScroll = () => {
    if (innerRef.current)
      innerRef.current.style.transform = `translateY(${-scrollPxRef.current}px)`;
  };

  const reportMeta = () => {
    const view = viewRef.current;
    const inner = innerRef.current;
    if (!view || !inner) return;
    const ch = view.clientHeight;
    const sh = inner.scrollHeight;
    maxScrollRef.current = Math.max(0, sh - ch);
    if (scrollPxRef.current > maxScrollRef.current) {
      scrollPxRef.current = maxScrollRef.current;
      applyScroll();
    }
    // Handle position maps the scroll travel directly: 0 = top (fully left), 1 = bottom (fully
    // right), so the handle can be dragged all the way to either edge.
    const atFrac = maxScrollRef.current > 0 ? scrollPxRef.current / maxScrollRef.current : 0;
    onScrollMeta?.({ canScroll: maxScrollRef.current > 4, atFrac });
  };

  // Scroll to a fraction of the total scroll travel (0 = top, 1 = bottom). Linear mapping so the
  // scrub handle covers the whole track and reaches the far left (top of the text).
  const scrollToFrac = (f) => {
    const view = viewRef.current;
    const inner = innerRef.current;
    if (!view || !inner) return;
    const ch = view.clientHeight;
    const sh = inner.scrollHeight;
    const max = Math.max(0, sh - ch);
    maxScrollRef.current = max;
    const px = Math.max(0, Math.min(max, f * max));
    scrollPxRef.current = px;
    applyScroll();
    const atFrac = max > 0 ? px / max : 0;
    onScrollMeta?.({ canScroll: max > 4, atFrac });
  };

  useImperativeHandle(ref, () => ({ scrollToFrac, recompute: reportMeta }), []);

  const applyReveal = (p) => {
    const clamped = Math.max(0, Math.min(1, p));
    const shownF = clamped * wordCount;
    const front = Math.floor(shownF);
    const frac = shownF - front;
    for (let i = 0; i < wordRefs.current.length; i++) {
      const el = wordRefs.current[i];
      if (!el) continue;
      if (i < front) {
        el.style.opacity = '1';
        el.classList.remove('reveal-front');
      } else if (i === front) {
        el.style.opacity = (0.3 + 0.7 * frac).toFixed(3);
        el.classList.add('reveal-front');
      } else {
        el.style.opacity = '0';
        el.classList.remove('reveal-front');
      }
    }
    onProgress?.(clamped);
  };

  useEffect(() => {
    wordRefs.current.length = wordCount;
    scrollPxRef.current = 0;
    applyScroll();
    if (!active || REDUCED_MOTION || wordCount === 0) {
      wordRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = '1';
          el.classList.remove('reveal-front');
        }
      });
      onProgress?.(1);
    } else {
      applyReveal(0);
      tweenRef.current?.kill();
      const obj = { p: 0 };
      // 3× faster than the original reveal pace (0.9 + wordCount·0.085).
      const duration = Math.max(0.2, (0.9 + wordCount * 0.085) / 3);
      tweenRef.current = gsap.to(obj, {
        p: 1,
        duration,
        ease: 'none',
        onUpdate() {
          applyReveal(obj.p);
        },
      });
    }
    const raf = requestAnimationFrame(reportMeta);
    const t = setTimeout(reportMeta, 220);
    const onResize = () => reportMeta();
    window.addEventListener('resize', onResize);
    return () => {
      tweenRef.current?.kill();
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text, wordCount]);

  return (
    <div ref={viewRef} className="w-full overflow-hidden" style={{ height: '100%' }}>
      <div ref={innerRef} className="text-center px-1" style={{ willChange: 'transform' }}>
        <p className="font-fell leading-[1.8] text-[clamp(0.95rem,1.5vw,1.1rem)]" style={{ color }}>
          {words.map((w, i) => (
            <span
              key={i}
              ref={(el) => {
                wordRefs.current[i] = el;
              }}
              className="reveal-word"
              style={{ opacity: 0 }}
            >
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
});

export default RevealText;
