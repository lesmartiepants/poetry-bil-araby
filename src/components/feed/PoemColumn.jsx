import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import HighlightedVerse from '../HighlightedVerse.jsx';
import { transliterate } from '../../utils/transliterate.js';
import '../../styles/poem-column.css';

/**
 * PoemColumn — the flow reading surface. Replaces SparklerStage's fixed 4-row teleprompter.
 *
 * The whole poem is present and scrollable. Verses ahead of the read position are dimmed rather
 * than absent, so the shape of the poem is on screen from the first frame. Scrolling past a verse
 * reveals it permanently.
 *
 * Three things here are load-bearing and easy to undo by accident:
 *
 *   1. The observer is scoped to the ACTIVE column. The feed mounts every poem at once, and
 *      IntersectionObserver with a non-null root measures against that root's box, NOT the
 *      viewport. An unscoped observer would reveal every hidden poem's first screen on mount, and
 *      the reveal is monotonic, so it would never recover.
 *
 *   2. The activation reset is a layout effect, not an effect. Effects run after paint, which
 *      shows one frame of the incoming poem at its stale scroll position before it snaps.
 *
 *   3. The Arabic never wraps. Wrapping breaks Amiri's naskh ligatures, so overlong lines shrink
 *      through --fit instead. That is why natural width is measured off the inline content and
 *      not off scrollWidth, which clamps to clientWidth and silently reports "no headroom".
 */
const PoemColumn = forwardRef(function PoemColumn(
  {
    poem,
    lines = [],
    isActive = false,
    darkMode = true,
    showTranslation = true,
    showTransliteration = false,
    textScale = 1,
    currentFontClass = 'font-amiri',
    highlightStyle = 'none',
    wordRefs = [],
    wordOffsets = [],
    currentVerseIndex = 0,
    isPlaying = false,
    onScrollProgress,
    onOverPull,
    children,
  },
  ref
) {
  const scrollerRef = useRef(null);
  const colRef = useRef(null);
  const unitRefs = useRef([]);
  // True while WE are driving the scroll, so the follow-release handler can tell a programmatic
  // scroll from the reader taking over.
  const autoScrollingRef = useRef(false);
  const followRef = useRef(true);

  const arColor = darkMode ? 'rgba(236,232,224,0.94)' : 'rgba(28,25,23,0.92)';
  const enColor = darkMode ? 'rgba(236,232,224,0.62)' : 'rgba(28,25,23,0.6)';
  const translitColor = darkMode ? 'rgba(212,180,99,0.7)' : 'rgba(139,100,48,0.7)';
  const goldColor = darkMode ? '#c5a059' : '#8B6430';
  const mutedColor = darkMode ? 'rgba(236,231,221,0.42)' : 'rgba(28,25,23,0.45)';

  const translits = useMemo(
    () => (showTransliteration ? lines.map((l) => transliterate(l.ar)) : []),
    [lines, showTransliteration]
  );

  // Scroll a verse into view within the scroller. Not scrollIntoView: that walks up and can move
  // ancestors or the page, and this is a nested scroller inside a fixed-height card.
  const scrollVerseIntoView = useCallback((i, force) => {
    const sc = scrollerRef.current;
    const el = unitRefs.current[i];
    if (!sc || !el) return;
    if (!force && !followRef.current) return;
    const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    autoScrollingRef.current = true;
    sc.scrollTo({ top: Math.max(0, top - sc.clientHeight * 0.35), behavior: 'smooth' });
    // Let the smooth scroll settle before manual scrolling counts as the reader taking over.
    setTimeout(() => {
      autoScrollingRef.current = false;
    }, 600);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getScroller: () => scrollerRef.current,
      scrollToVerse: (i) => scrollVerseIntoView(i, true),
    }),
    [scrollVerseIntoView]
  );

  // ── shrink-to-fit ───────────────────────────────────────────────────────────
  // Measure the inline content's true width via a Range. A block element's scrollWidth clamps to
  // clientWidth once the content is narrower, so it cannot tell "fits exactly" from "has room",
  // and using it silently disables the shrink.
  const measure = useCallback(() => {
    const col = colRef.current;
    if (!col) return;
    col.querySelectorAll('.pc-ar, .pc-translit').forEach((el) => {
      el.style.setProperty('--fit', '1');
      const box = el.clientWidth;
      if (!box) return;
      let natural = 0;
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        natural = range.getBoundingClientRect().width;
        range.detach?.();
      } catch {
        natural = el.scrollWidth;
      }
      if (natural > box) el.style.setProperty('--fit', (box / natural).toFixed(4));
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    // Amiri and Reem Kufi change every metric, so a mount-time measurement undersizes the shrink.
    const settle = setTimeout(measure, 350);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      window.removeEventListener('resize', onResize);
    };
  }, [measure, lines, showTransliteration, textScale, currentFontClass]);

  // ── activation reset ────────────────────────────────────────────────────────
  // Layout effect: runs after React commits the DOM but BEFORE paint, so the incoming poem is
  // never shown for a frame at its previous scroll position with stale read classes.
  useLayoutEffect(() => {
    if (!isActive) return;
    const sc = scrollerRef.current;
    unitRefs.current.forEach((el) => el?.setAttribute('data-read', 'false'));
    if (sc) sc.scrollTop = 0;
    followRef.current = true;
    const col = colRef.current;
    if (col) {
      col.classList.remove('pc-arriving');
      // Force a reflow so re-adding the class restarts the animation on a repeat summon.
      void col.offsetWidth;
      col.classList.add('pc-arriving');
    }
  }, [isActive, poem?.id]);

  // ── the reveal ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return undefined;
    const sc = scrollerRef.current;
    if (!sc) return undefined;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          // Monotonic: a verse that has been read never returns to ahead.
          if (e.isIntersecting) e.target.setAttribute('data-read', 'true');
        }),
      // Read = clear of the action buttons. Everything fully on screen above the bottom bar is
      // legible from landing; only verses that overlap the buttons stay dimmed (the scrim fades
      // them the rest of the way). The 132px matches .pc-scrim's height so the two edges agree.
      { root: sc, rootMargin: '0px 0px -132px 0px' }
    );
    unitRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [isActive, lines, poem?.id]);

  // ── scroll reporting ────────────────────────────────────────────────────────
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || !isActive) return undefined;
    const onScroll = () => {
      if (!autoScrollingRef.current) followRef.current = false;
      if (!onScrollProgress) return;
      const max = sc.scrollHeight - sc.clientHeight;
      const frac = max > 0 ? sc.scrollTop / max : 1;
      const remaining = max - sc.scrollTop;
      onScrollProgress(frac, {
        atEnd: remaining <= 1,
        // 0 to 1 across the final 170px, for anything that reveals as the reader arrives.
        lastStretch: max > 0 ? Math.max(0, Math.min(1, (170 - remaining) / 170)) : 1,
      });
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => sc.removeEventListener('scroll', onScroll);
  }, [isActive, onScrollProgress, lines]);

  // ── over-pull at the bottom ─────────────────────────────────────────────────
  // Reported raw. The consumer maps distance to a summon charge and decides what a release means;
  // a fast flick is expected to no-op there, not here. Bound to the scroller, never to window:
  // deleting a window-level pointer handler is half the point of this refactor.
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || !isActive || !onOverPull) return undefined;
    let startY = null;

    const atBottom = () => sc.scrollHeight - sc.clientHeight - sc.scrollTop <= 1;

    const down = (e) => {
      startY = atBottom() ? e.clientY : null;
    };
    const move = (e) => {
      if (startY == null) return;
      if (!atBottom()) {
        startY = null;
        onOverPull({ distance: 0, phase: 'end' });
        return;
      }
      const distance = startY - e.clientY; // pulling up is positive
      if (distance > 0) onOverPull({ distance, phase: 'move' });
    };
    const end = (e) => {
      if (startY == null) return;
      const distance = Math.max(0, startY - (e.clientY ?? startY));
      startY = null;
      onOverPull({ distance, phase: 'end' });
    };

    sc.addEventListener('pointerdown', down);
    sc.addEventListener('pointermove', move);
    sc.addEventListener('pointerup', end);
    sc.addEventListener('pointercancel', end);
    sc.addEventListener('pointerleave', end);
    return () => {
      sc.removeEventListener('pointerdown', down);
      sc.removeEventListener('pointermove', move);
      sc.removeEventListener('pointerup', end);
      sc.removeEventListener('pointercancel', end);
      sc.removeEventListener('pointerleave', end);
    };
  }, [isActive, onOverPull]);

  // ── TTS follow ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !isPlaying) return;
    // A new spoken verse re-engages follow even if the reader had scrolled away.
    followRef.current = true;
    scrollVerseIntoView(currentVerseIndex, false);
  }, [isActive, isPlaying, currentVerseIndex, scrollVerseIntoView]);

  const ttsClass =
    highlightStyle && highlightStyle !== 'none' ? ` tts-style-${highlightStyle}` : '';

  return (
    <div
      className={`pc-root${ttsClass}`}
      data-testid="poem-column"
      data-active={isActive ? 'true' : 'false'}
    >
      <div ref={scrollerRef} className="pc-scroller">
        <div ref={colRef} className="pc-col">
          <div className="pc-head" data-testid="poem-meta">
            <div
              className="pc-ttl-ar"
              lang="ar"
              dir="rtl"
              // The title must out-rank the verse or it stops reading as a title. The prototype used
              // a flat 1.5rem, which lands at 24px against a 24.3px verse: an inversion its own
              // screenshots carried. 1.75rem restores a ~1.15 ratio without returning to the old
              // pinned header's ~30px, which is space this port exists to reclaim.
              style={{ fontSize: `calc(1.75rem * ${textScale})`, color: goldColor }}
            >
              {poem?.titleArabic || poem?.title}
            </div>
            {poem?.title && poem.title !== poem?.titleArabic && (
              <div className="pc-ttl-en" dir="ltr" style={{ color: mutedColor }}>
                {poem.title}
              </div>
            )}
            <div className="pc-byline" dir="ltr" style={{ color: 'rgba(197,160,89,0.66)' }}>
              <span lang="ar" style={{ fontFamily: "'Reem Kufi', sans-serif" }}>
                {poem?.poetArabic || poem?.poet}
              </span>
              {poem?.poet && poem?.poetArabic && poem.poet !== poem.poetArabic && (
                <span> · {poem.poet}</span>
              )}
            </div>
          </div>

          <div className="pc-verses">
            {lines.map((ln, i) => (
              <div
                key={i}
                ref={(el) => {
                  unitRefs.current[i] = el;
                }}
                className="pc-unit"
                data-testid={`verse-unit-${i}`}
                data-read="false"
              >
                <HighlightedVerse
                  text={ln.ar}
                  wordRefs={wordRefs}
                  wordOffset={wordOffsets[i] ?? 0}
                  verseIndex={i}
                  className={`pc-ar ${currentFontClass} arabic-shadow`}
                  style={{
                    fontSize: `calc(clamp(1.52rem, 5.7vw, 2.13rem) * ${textScale} * var(--fit, 1))`,
                    color: arColor,
                  }}
                />
                {showTransliteration && (
                  <div
                    dir="ltr"
                    className="pc-translit font-brand-en"
                    style={{
                      fontSize: `calc(clamp(0.95rem, 3.6vw, 1.18rem) * ${textScale} * var(--fit, 1))`,
                      color: translitColor,
                    }}
                  >
                    {translits[i]}
                  </div>
                )}
                {showTranslation && ln.en && (
                  <div
                    dir="ltr"
                    className="pc-en font-brand-en"
                    style={{
                      // The teleprompter's clamp floored at 19.2px, which is 33% above the 0.9rem
                      // the N4 design used and made every unit ~25% taller than the approved shots.
                      // Kept as a clamp rather than a flat rem so the text-size control still moves
                      // it, but floored at the design's size instead of well above it.
                      fontSize: `calc(clamp(0.9rem, 3.7vw, 1.25rem) * ${textScale})`,
                      color: enColor,
                    }}
                  >
                    {ln.en}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pc-end" />
          {children}
        </div>
      </div>
    </div>
  );
});

export default PoemColumn;
