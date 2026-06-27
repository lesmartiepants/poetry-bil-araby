import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import ProgressScrubber from './ProgressScrubber.jsx';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * RevealText — a paragraph that sparkle-reveals word-by-word (gold shimmer on the leading word),
 * matching the poem's sparkler aesthetic. Used for the inline insight sections (The Meaning /
 * About the Author).
 *
 * Behaviour (spec #6/#7):
 *  • Words fade in left→right; the current "front" word carries a gold glow (.reveal-front).
 *  • If the paragraph overflows its box, the scroll container follows the reveal front so the
 *    newest words stay in view, and a scoped progress/scrub bar appears beneath it.
 *  • Dragging the scrubber seeks the reveal (and scroll); releasing resumes from there.
 *  • `active=false` or reduced motion → the whole paragraph shows at once (no animation).
 */
export default function RevealText({
  text,
  active = true,
  goldColor = '#c5a059',
  color,
  label,
  before = null,
}) {
  const words = useMemo(() => (text || '').trim().split(/\s+/).filter(Boolean), [text]);
  const wordCount = words.length;

  const scrollRef = useRef(null);
  const wordRefs = useRef([]);
  const tweenRef = useRef(null);
  const progRef = useRef(0);
  const autoScrollRef = useRef(false); // only force scrollTop while the reveal is running
  const scrubFillRef = useRef(null);
  const scrubHandleRef = useRef(null);
  const [overflow, setOverflow] = useState(false);

  // Paint the paragraph to a reveal fraction p (0..1): words before the front are lit, the front
  // word fades/glows, words after stay hidden. Also writes the progress bar and follows the front.
  const apply = (p) => {
    const clamped = Math.max(0, Math.min(1, p));
    progRef.current = clamped;
    const shownF = clamped * wordCount;
    const front = Math.floor(shownF);
    const frac = shownF - front;
    let frontEl = null;
    for (let i = 0; i < wordRefs.current.length; i++) {
      const el = wordRefs.current[i];
      if (!el) continue;
      if (i < front) {
        el.style.opacity = '1';
        el.classList.remove('reveal-front');
      } else if (i === front) {
        el.style.opacity = (0.3 + 0.7 * frac).toFixed(3);
        el.classList.add('reveal-front');
        frontEl = el;
      } else {
        el.style.opacity = '0';
        el.classList.remove('reveal-front');
      }
    }
    const pct = (clamped * 100).toFixed(2) + '%';
    if (scrubFillRef.current) scrubFillRef.current.style.width = pct;
    if (scrubHandleRef.current) scrubHandleRef.current.style.left = pct;
    // Only scroll once the reveal front reaches the BOTTOM of the viewable area (like the poem
    // teleprompter) — not continuously mid-reveal. Scroll just enough to bring the front back in.
    const sc = scrollRef.current;
    if (sc && frontEl && autoScrollRef.current) {
      const scRect = sc.getBoundingClientRect();
      const elBottomInView = frontEl.getBoundingClientRect().bottom - scRect.top;
      const margin = 8;
      if (elBottomInView > sc.clientHeight - margin) {
        sc.scrollTop += elBottomInView - (sc.clientHeight - margin);
      }
    }
  };

  const showAll = () => {
    autoScrollRef.current = false;
    wordRefs.current.forEach((el) => {
      if (el) {
        el.style.opacity = '1';
        el.classList.remove('reveal-front');
      }
    });
    if (scrubFillRef.current) scrubFillRef.current.style.width = '100%';
    if (scrubHandleRef.current) scrubHandleRef.current.style.left = '100%';
    progRef.current = 1;
  };

  const runReveal = (from = 0) => {
    tweenRef.current?.kill();
    autoScrollRef.current = true;
    const obj = { p: from };
    const remaining = 1 - from;
    const duration = Math.max(0.6, (0.9 + wordCount * 0.085) * remaining);
    tweenRef.current = gsap.to(obj, {
      p: 1,
      duration,
      ease: 'none',
      onUpdate() {
        apply(obj.p);
      },
      onComplete() {
        autoScrollRef.current = false;
      },
    });
  };

  // Start / restart the reveal when the section becomes active or its text changes.
  useEffect(() => {
    wordRefs.current.length = wordCount;
    if (!active || REDUCED_MOTION || wordCount === 0) {
      showAll();
    } else {
      apply(0);
      runReveal(0);
    }
    // Measure overflow once the paragraph has laid out (opacity doesn't affect layout, so p=0 is fine).
    const measure = () => {
      const sc = scrollRef.current;
      if (sc) setOverflow(sc.scrollHeight - sc.clientHeight > 4);
    };
    const raf = requestAnimationFrame(measure);
    const t = setTimeout(measure, 200);
    return () => {
      tweenRef.current?.kill();
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text, wordCount]);

  const onScrub = (f) => {
    tweenRef.current?.kill();
    autoScrollRef.current = true;
    apply(f);
  };
  const onScrubEnd = (f) => {
    apply(f);
    if (f < 1 && active && !REDUCED_MOTION) runReveal(f);
    else autoScrollRef.current = false;
  };

  return (
    <div className="flex flex-col w-full" style={{ height: '100%', minHeight: 0 }}>
      {/* Pinned header — title/byline + section label stay fixed; only the paragraph scrolls. */}
      {(before || label) && (
        <div className="shrink-0">
          {before}
          {label && (
            <div
              className="text-[9px] uppercase tracking-[0.18em] mb-2"
              style={{ color: goldColor, opacity: 0.8 }}
            >
              {label}
            </div>
          )}
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto text-center px-1"
        style={{ minHeight: 0 }}
      >
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

      {overflow && (
        <div className="pt-3 w-full" data-reveal-scrub>
          <ProgressScrubber
            total={wordCount}
            goldColor={goldColor}
            visible
            scrubFillRef={scrubFillRef}
            scrubHandleRef={scrubHandleRef}
            onScrub={onScrub}
            onScrubEnd={onScrubEnd}
          />
        </div>
      )}
    </div>
  );
}
