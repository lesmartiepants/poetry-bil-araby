import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * RevealText — a paragraph that reveals word-by-word (gold shimmer on the leading word), used for
 * the inline insight sections (The Meaning / About the Author). The viewport scrolls natively, so
 * an insight longer than the fold stays reachable while the reveal plays; the progress hairline
 * (ScrollHairline) tracks this scroller when an insight is open.
 *
 * onProgress(frac) — word-reveal progress (0..1); the parent uses done=1 to mark the section seen.
 */
export default function RevealText({ text, active = true, animate = true, color, onProgress }) {
  const words = useMemo(() => (text || '').trim().split(/\s+/).filter(Boolean), [text]);
  const wordCount = words.length;

  const wordRefs = useRef([]);
  const tweenRef = useRef(null);

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
    if (!active || !animate || REDUCED_MOTION || wordCount === 0) {
      // Instant: show the whole paragraph at once (used on a revisit — the reveal flourish only
      // plays the first time a section is opened).
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
      // 2× the previous (3×-fast) pace → 1.5× faster than the original (0.9 + wordCount·0.085).
      const duration = Math.max(0.3, (0.9 + wordCount * 0.085) / 1.5);
      tweenRef.current = gsap.to(obj, {
        p: 1,
        duration,
        ease: 'none',
        onUpdate() {
          applyReveal(obj.p);
        },
      });
    }
    return () => {
      tweenRef.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, animate, text, wordCount]);

  return (
    <div data-insight-scroll className="w-full overflow-y-auto" style={{ height: '100%' }}>
      <div className="text-center px-1">
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
}
