import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import PoemReader from './PoemReader.jsx';

const VIEWPORT_H = 'calc(100dvh - 110px - env(safe-area-inset-bottom, 0px))';

/**
 * PoemFeed — the mounted set of poems, one visible at a time.
 *
 * This used to be a translate3d track you dragged vertically. The drag is gone: the vertical axis
 * belongs to reading now, and poem-to-poem movement is the quill at the end of each poem. What
 * remains is a mount window, and that is the point rather than a leftover.
 *
 * Every poem stays mounted and absolutely stacked; only the active one is visible. Mounting is
 * what makes the summon feel instant: the incoming poem has already measured its own shrink-to-fit
 * against loaded fonts, so its arrival animation plays over finished text instead of covering a
 * mount, a fonts.ready wait, and two measurement passes.
 *
 * `visibility: hidden`, never `display: none`. Hidden preserves layout, so the inactive columns can
 * still measure. `display: none` collapses layout, measurement returns zero, and the prewarm that
 * justifies keeping them mounted silently stops working.
 *
 * Ref: scrollTo(index) — programmatic navigation, used by the quill and the pagination dots.
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
  // Mirrors currentIndex so goCard can report a direction without closing over a stale prop.
  const curRef = useRef(currentIndex);
  useEffect(() => {
    curRef.current = currentIndex;
  }, [currentIndex]);

  // A summon that asked for a poem the feed doesn't have yet (a single short poem on a tall
  // screen: nothing scrolled, so nothing stocked ahead). goCard's clamp would silently no-op it,
  // leaving the quill dead, so the request is parked and replayed once the batch lands. Stocking
  // at mount was tried and rejected: loadMorePoems fires without a poet, and the extra fetch at
  // boot broke the poet-filtering assertions. goCard re-asks whenever the reader lands within 2
  // of the end, which covers the normal path.
  const pendingIdxRef = useRef(null);

  // The single funnel for a poem change. Everything that must happen when the poem changes lives
  // in onSlideChange (audio stop and abort, TTS clock reset, .tts-active cleanup, insight
  // dismissal, route change, OG tags), so nothing may set the index around it.
  const goCard = useCallback(
    (idx) => {
      const clamped = Math.max(0, Math.min(poems.length - 1, idx));
      const prev = curRef.current;
      if (clamped !== prev) {
        curRef.current = clamped;
        onSlideChange?.(clamped, clamped > prev ? 'next' : 'prev');
      }
      if (onLoadMore && clamped >= poems.length - 2) onLoadMore();
    },
    [poems.length, onSlideChange, onLoadMore]
  );

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (idx) => {
        if (idx < poems.length) {
          goCard(idx);
          return;
        }
        // Out of range: request the batch and park the destination. If the batch never grows
        // past it, the parked index simply waits — nothing clamps it to a fake no-op slide.
        onLoadMore?.();
        pendingIdxRef.current = idx;
      },
    }),
    [goCard, poems.length, onLoadMore]
  );

  useEffect(() => {
    const wanted = pendingIdxRef.current;
    if (wanted != null && poems.length > wanted) {
      pendingIdxRef.current = null;
      goCard(wanted);
    }
  }, [poems.length, goCard]);

  return (
    <div className="w-full relative" data-testid="poem-feed">
      <div
        className="relative w-full overflow-hidden"
        role="region"
        aria-label="Poem feed"
        // touch-action is deliberately NOT 'none'. It used to be, so the browser would not fight
        // the drag. With the drag gone, 'none' would suppress touch scrolling for the whole
        // subtree and the poem column would be unscrollable by finger while still scrolling
        // perfectly with a mouse wheel: broken on phones, invisible in every desktop test.
        style={{ touchAction: 'pan-y', height: VIEWPORT_H }}
      >
        {poems.map((poem, slideIdx) => {
          const isActive = slideIdx === currentIndex;
          return (
            <div
              key={poem.id ?? slideIdx}
              className="absolute inset-0 w-full overflow-hidden"
              style={{ visibility: isActive ? 'visible' : 'hidden' }}
              aria-hidden={isActive ? undefined : 'true'}
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
  );
});

export default PoemFeed;
