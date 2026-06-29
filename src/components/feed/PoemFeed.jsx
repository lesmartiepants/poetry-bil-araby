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
import { useModalStore } from '../../stores/modalStore';

// Reserve just enough at the bottom for the nav pill (+ the device safe area, so the chrome sits
// right above the nav on notched devices instead of floating with a big gap).
const VIEWPORT_H = 'calc(100dvh - 110px - env(safe-area-inset-bottom, 0px))';

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
    // Playback / transport / share (forwarded to the active reader's action buttons)
    isGeneratingAudio = false,
    onTogglePlay,
    onPrevVerse,
    onNextVerse,
    onStopAudio,
    onShare,
  },
  ref
) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const feedYRef = useRef(0);
  const curRef = useRef(currentIndex);
  const tweenRef = useRef(null);
  const drag = useRef({ down: false, sx: 0, sy: 0, base: 0, moved: 0, startT: 0, axis: null });
  // The incoming poem's title we're currently enlarging as a drag preview ({ el, idx }).
  const previewRef = useRef(null);

  // Swipe-to-navigate is handled at the window level (see the effect below) so a vertical swipe
  // anywhere — over the nav buttons, the rails, the empty bottom band — changes poems, not just on
  // the poem text. It's disabled while any blocking modal/drawer is open.
  const blockingModalOpen = useModalStore(
    (s) =>
      s.authModal ||
      s.savedPoems ||
      s.splash ||
      s.insightsDrawer ||
      s.discoverDrawer ||
      s.shortcutHelp ||
      s.poetPicker ||
      s.shareCard ||
      s.onboarding
  );
  const blockingRef = useRef(false);
  const handlersRef = useRef({});

  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasSwiped, setHasSwiped] = useState(false);

  const H = () =>
    viewportRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const setFeed = (y) => {
    feedYRef.current = y;
    if (trackRef.current) trackRef.current.style.transform = `translate3d(0, ${-y}px, 0)`;
  };

  // ── drag preview: enlarge the incoming poem's title as you pull toward it ──
  const metaElAt = (idx) =>
    trackRef.current?.children?.[idx]?.querySelector?.('[data-testid="poem-meta"]') || null;

  // Clear the current preview, restoring the title to its resting size. `animate` springs it back
  // smoothly (used when the drag is abandoned); otherwise it snaps (used on commit / direction flip).
  const clearPreview = (animate) => {
    const p = previewRef.current;
    previewRef.current = null;
    if (!p?.el) return;
    gsap.killTweensOf(p.el);
    if (animate) {
      gsap.to(p.el, {
        scale: 1,
        duration: 0.35,
        ease: 'power3.out',
        onComplete: () => gsap.set(p.el, { clearProps: 'transform' }),
      });
    } else {
      gsap.set(p.el, { clearProps: 'transform' });
    }
  };

  // Enlarge poem `idx`'s title to reflect drag progress (0→1). idx === null clears any preview.
  const updatePreview = (idx, prog) => {
    if (idx == null || idx < 0 || idx >= poems.length) {
      clearPreview(false);
      return;
    }
    let p = previewRef.current;
    if (p && p.idx !== idx) {
      clearPreview(false); // direction changed across zero — drop the old title first
      p = null;
    }
    let el = p?.el;
    if (!el) {
      el = metaElAt(idx);
      if (!el) return;
      previewRef.current = { el, idx };
    }
    gsap.set(el, { scale: 1 + 0.22 * prog, transformOrigin: 'center top' });
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
      animateFeed(clamped * H(), 0.6, 'power4.out'); // snappy flip to the committed poem
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

  // After a real drag, swallow the click that would otherwise fire on whatever was under the
  // finger (e.g. a nav button) so a swipe-over-a-button navigates instead of activating it. Taps
  // (tiny movement) never call this, so buttons stay tappable.
  const suppressNextClick = () => {
    const sc = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      window.removeEventListener('click', sc, true);
    };
    window.addEventListener('click', sc, true);
    setTimeout(() => window.removeEventListener('click', sc, true), 400);
  };

  // ── magnetic pointer feed (ported from the prototype) ──
  const onPointerDown = (e) => {
    if (blockingRef.current) return; // a modal/drawer owns the screen
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
    // Lock the gesture axis once it's clearly moving: navigate the feed when the swipe is within
    // 60° of the vertical axis (|dy| >= |dx| * tan(30°)), so fairly diagonal up/down swipes still
    // count as "next poem". Only near-horizontal drags (>60° off vertical) are ignored by the feed.
    if (d.axis == null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      d.axis = Math.abs(dy) >= Math.abs(dx) * 0.5774 ? 'v' : 'h';
    }
    if (d.axis === 'h') return;
    if (e.cancelable) e.preventDefault(); // stop native scroll / pull-to-refresh during a vertical swipe
    d.moved = Math.max(d.moved, Math.abs(dy));
    const h = H();
    const pull = -dy; // positive = pulling up (toward next)
    const ax = Math.abs(pull);
    const dir = pull > 0 ? 1 : -1;
    const atEnd =
      (dir > 0 && curRef.current >= poems.length - 1) || (dir < 0 && curRef.current <= 0);
    // Track the finger nearly 1:1 so the feed feels light and moves a lot per drag; only past ~55%
    // of the viewport does a gentle resistance kick in, so you can pull far to preview the next poem
    // without it feeling unbounded — and reversing returns you to exactly where you were.
    const soft = h * 0.55;
    let travel = ax <= soft ? ax : soft + (ax - soft) * 0.5;
    travel = Math.min(travel, h * 0.9);
    if (atEnd) travel = Math.min(ax, soft) * 0.3; // stiff overscroll at the first / last poem
    setFeed(d.base + Math.sign(pull) * travel);
    // Pop the incoming poem's title large as the drag grows (ramps over the first ~35% of the
    // viewport, then holds). Abandoning the drag springs it back; reversing clears it for an exact
    // return to the current poem.
    if (atEnd) updatePreview(null, 0);
    else updatePreview(curRef.current + dir, Math.min(1, ax / (h * 0.35)));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (d.axis === 'h') return; // horizontal gesture → not a feed navigation
    if (d.moved < 10) {
      clearPreview(false);
      return; // tap → click falls through to PoemReader (advance reveal / insight)
    }
    suppressNextClick(); // a real swipe — don't also trigger a button underneath the finger
    const dy = e.clientY - d.sy;
    const h = H();
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const dt = now - d.startT;
    const vel = dt > 0 ? -dy / dt : 0; // px/ms, positive = flicking up (toward next)
    // Commit on either real travel (~32% of the viewport) OR a quick decisive flick, so a confident
    // short swipe still flips while a slow tentative drag rubber-bands back — letting you preview
    // and return to exactly where you were.
    const thresh = h * 0.32;
    const flick = Math.abs(vel) > 0.55 && d.moved > 24;
    const goNext = (-dy > thresh || (flick && vel > 0)) && curRef.current < poems.length - 1;
    const goPrev = (dy > thresh || (flick && vel < 0)) && curRef.current > 0;
    if (goNext) {
      clearPreview(false);
      goCard(curRef.current + 1);
    } else if (goPrev) {
      clearPreview(false);
      goCard(curRef.current - 1);
    } else {
      clearPreview(true); // shrink the previewed title back as the feed springs home
      animateFeed(curRef.current * h, 0.55, 'back.out(1.3)');
    }
  };

  // Keep the gesture refs current (written in an effect, never during render). The window
  // listeners below call through handlersRef, and onPointerDown reads blockingRef.
  useEffect(() => {
    blockingRef.current = blockingModalOpen;
    handlersRef.current = { onPointerDown, onPointerMove, onPointerUp };
  });

  // Drive the gesture from the WHOLE window (not just the feed viewport) so a vertical swipe over
  // the bottom nav, the side rail, or anywhere else still changes poems. The handlers run through a
  // ref so the listeners (attached once) always call the latest closures.
  useEffect(() => {
    const down = (e) => handlersRef.current.onPointerDown(e);
    const move = (e) => handlersRef.current.onPointerMove(e);
    const up = (e) => handlersRef.current.onPointerUp(e);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const goldColor = darkMode ? '#c5a059' : '#8B6430';

  return (
    <div className="w-full relative" data-testid="poem-feed">
      <div
        ref={viewportRef}
        className="overflow-hidden w-full"
        role="region"
        aria-label="Poem feed"
        style={{ touchAction: 'none', height: VIEWPORT_H }}
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
                  isGeneratingAudio={isActive ? isGeneratingAudio : false}
                  onTogglePlay={onTogglePlay}
                  onStopAudio={onStopAudio}
                  onShare={onShare}
                  onPrev={onPrevVerse}
                  onNext={onNextVerse}
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
