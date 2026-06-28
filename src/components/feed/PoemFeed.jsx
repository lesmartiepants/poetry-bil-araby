import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import PoemReader from './PoemReader.jsx';

const VIEWPORT_H = 'calc(100dvh - 168px)';

/**
 * PoemFeed — vertical magnetic feed of poems, ported from the prototype.
 *
 * A stacked track is translated by `-cur * H`; a pointer drag follows the finger with magnetic
 * resistance (light until a threshold, then looser) and, past a commit threshold, accelerates to
 * the next/previous poem. Taps (tiny movement) fall through to the PoemReader's onClick so the
 * reveal still advances. The scrubber ([data-scrub]) is excluded from drag.
 *
 * Ref: scrollTo(index) — programmatic navigation (Surprise Me / deep link).
 */
const PoemFeed = forwardRef(function PoemFeed(
  {
    poems,
    currentIndex,
    onSlideChange,
    darkMode = true,
    showTranslation = true,
    showTransliteration = false,
    textScale = 1,
    currentFontClass = 'font-amiri',
    onLoadMore,
    // TTS
    highlightStyle = 'none',
    currentVerseIndex = 0,
    wordRefs = [],
    wordOffsets = [],
    // Insights
    isInterpreting = false,
    insightParts = null,
    interpretation = null,
    onSeeInsight,
  },
  ref
) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const feedYRef = useRef(0);
  const curRef = useRef(currentIndex);
  const tweenRef = useRef(null);
  const drag = useRef({ down: false, sx: 0, sy: 0, base: 0, moved: 0, startT: 0, axis: null });

  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasSwiped, setHasSwiped] = useState(false);

  const H = () =>
    viewportRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const setFeed = (y) => {
    feedYRef.current = y;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(0, ${-y}px, 0)`;
  };

  const animateFeed = useCallback((toY, duration = 0.85, ease = 'power4.out') => {
    tweenRef.current?.kill();
    const o = { y: feedYRef.current };
    tweenRef.current = gsap.to(o, {
      y: toY,
      duration,
      ease,
      onUpdate() {
        setFeed(o.y);
      },
    });
  }, []);

  const goCard = useCallback(
    (idx) => {
      const clamped = Math.max(0, Math.min(poems.length - 1, idx));
      const prev = curRef.current;
      const changed = clamped !== prev;
      curRef.current = clamped;
      animateFeed(clamped * H());
      if (changed) {
        const dir = clamped > prev ? 'next' : 'prev';
        onSlideChange?.(clamped, dir);
        setHasSwiped(true);
        setShowSwipeHint(false);
        if (onLoadMore && clamped >= poems.length - 2) onLoadMore();
      }
    },
    [poems.length, onSlideChange, onLoadMore, animateFeed]
  );

  useImperativeHandle(ref, () => ({ scrollTo: (idx) => goCard(idx) }), [goCard]);

  // Snap to the initial slide on mount and whenever the list length changes.
  useLayoutEffect(() => {
    setFeed(curRef.current * H());
  }, [poems.length]);

  // External index changes (deep link, etc.) — animate without re-notifying the parent.
  useEffect(() => {
    if (currentIndex !== curRef.current) {
      curRef.current = currentIndex;
      animateFeed(currentIndex * H());
    }
  }, [currentIndex, animateFeed]);

  // Keep alignment correct across resize / orientation changes.
  useEffect(() => {
    const onResize = () => setFeed(curRef.current * H());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (poems.length <= 1) return;
    const t = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(t);
  }, [poems.length]);

  // ── magnetic pointer feed (ported from the prototype) ──
  const onPointerDown = (e) => {
    if (e.target.closest?.('[data-scrub]')) return; // let the scrubber own its drag
    const d = drag.current;
    d.down = true;
    d.sx = e.clientX;
    d.sy = e.clientY;
    d.base = feedYRef.current;
    d.moved = 0;
    d.axis = null; // decided on first significant move
    d.startT = typeof performance !== 'undefined' ? performance.now() : 0;
    tweenRef.current?.kill();
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const dy = e.clientY - d.sy;
    const dx = e.clientX - d.sx;
    // Lock the gesture axis once it's clearly moving: only navigate the feed when the swipe is
    // within 45° of vertical (|dy| >= |dx|). Horizontal-dominant drags are ignored by the feed.
    if (d.axis == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      d.axis = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
    }
    if (d.axis === 'h') return;
    d.moved = Math.max(d.moved, Math.abs(dy));
    const h = H();
    const pull = -dy; // positive = pulling up (toward next)
    const ax = Math.abs(pull);
    // Rubber-band: the card follows ~1:1 at first, then resistance grows so movement asymptotes
    // toward MAX — the further you pull the harder it gets, building anticipation before commit.
    const MAX = h * 0.5;
    const damped = (1 - 1 / (ax / MAX + 1)) * MAX;
    setFeed(d.base + Math.sign(pull) * damped);
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (d.axis === 'h') return; // horizontal gesture → not a feed navigation
    if (d.moved < 10) return; // tap → click falls through to PoemReader (advance reveal / insight)
    const dy = e.clientY - d.sy;
    const h = H();
    // Require real commitment to change poems (~28% of the viewport of finger travel) so the feed
    // isn't too eager; otherwise rubber-band back with a soft spring.
    const thresh = h * 0.28;
    if (-dy > thresh) goCard(curRef.current + 1);
    else if (dy > thresh) goCard(curRef.current - 1);
    else animateFeed(curRef.current * h, 0.6, 'back.out(1.2)'); // not enough → springy magnet back
  };

  const goldColor = darkMode ? '#c5a059' : '#8B6430';

  return (
    <div className="w-full relative" data-testid="poem-feed">
      <div
        ref={viewportRef}
        className="overflow-hidden w-full"
        role="region"
        aria-label="Poem feed"
        style={{ touchAction: 'none', height: VIEWPORT_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className="flex flex-col"
          style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
        >
          {poems.map((poem, slideIdx) => {
            const isActive = slideIdx === currentIndex;
            return (
              <div
                key={poem.id ?? slideIdx}
                className="flex-shrink-0 w-full overflow-hidden"
                style={{ height: VIEWPORT_H }}
              >
                <PoemReader
                  poem={poem}
                  isActive={isActive}
                  darkMode={darkMode}
                  showTranslation={showTranslation}
                  showTransliteration={showTransliteration}
                  textScale={textScale}
                  currentFontClass={currentFontClass}
                  highlightStyle={isActive ? highlightStyle : 'none'}
                  currentVerseIndex={isActive ? currentVerseIndex : 0}
                  wordRefs={isActive ? wordRefs : []}
                  wordOffsets={isActive ? wordOffsets : []}
                  isInterpreting={isActive ? isInterpreting : false}
                  insightParts={isActive ? insightParts : null}
                  interpretation={isActive ? interpretation : null}
                  onSeeInsight={onSeeInsight}
                />
              </div>
            );
          })}
        </div>
      </div>

      {poems.length > 1 && !hasSwiped && (
        <div
          className="flex justify-center mt-3 md:hidden transition-all duration-300 ease-in-out"
          style={{ opacity: showSwipeHint ? 0.45 : 0 }}
          aria-hidden="true"
        >
          <span
            className="font-brand-en text-xs tracking-widest uppercase"
            style={{ color: goldColor }}
          >
            swipe up for next poem ↑
          </span>
        </div>
      )}
    </div>
  );
});

export default PoemFeed;
