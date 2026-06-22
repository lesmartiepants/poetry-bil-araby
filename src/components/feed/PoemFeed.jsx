import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import PoemReader from './PoemReader.jsx';

/**
 * PoemFeed — vertical swipe feed of poems (swipe up = next, swipe down = prev).
 *
 * Drop-in replacement for PoemCarousel with an identical external API so the
 * app.jsx integration is a one-line swap.  New behaviours:
 * - axis: 'y' (vertical swipe)
 * - Each slide is a <PoemReader> with tap-to-reveal stanzas.
 * - A swipe hint ("swipe up for next poem") replaces the horizontal one.
 *
 * Props / Ref match PoemCarousel exactly (superset):
 *   poems               {Array}
 *   currentIndex        {number}
 *   onSlideChange       {Function(index, direction)}
 *   darkMode            {boolean}
 *   showTranslation     {boolean}
 *   showTransliteration {boolean}
 *   textScale           {number}
 *   currentFontClass    {string}
 *   POEM_META           {Object}   — kept for API compatibility, not used directly
 *   DESIGN              {Object}   — kept for API compatibility, not used directly
 *   onLoadMore          {Function} — called when nearing the end of the list
 *   highlightStyle      {string}
 *   activeVersePairs    {Array}
 *   wordRefs            {Array}
 *   wordOffsets         {Array}
 *
 * Ref: scrollTo(index) — programmatic navigation (dot indicators, "Surprise Me")
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
    highlightStyle = 'none',
    activeVersePairs = [],
    wordRefs = [],
    wordOffsets = [],
  },
  ref
) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    dragFree: false,
    loop: false,
    startIndex: currentIndex,
    duration: 20,
    watchDrag: true,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollTo: (index) => emblaApi?.scrollTo(index),
    }),
    [emblaApi]
  );

  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasSwiped, setHasSwiped] = useState(false);

  // Hide hint after 3s or on first swipe
  useEffect(() => {
    if (poems.length <= 1) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [poems.length]);

  // Notify parent on slide change
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const prev = emblaApi.previousScrollSnap();
    const idx = emblaApi.selectedScrollSnap();
    const direction = idx > prev ? 'next' : idx < prev ? 'prev' : 'same';
    onSlideChange(idx, direction);
    setHasSwiped(true);
    setShowSwipeHint(false);
  }, [emblaApi, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  // Scroll to slide when parent changes index (e.g. "Surprise Me")
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== currentIndex) {
      emblaApi.scrollTo(currentIndex, true);
    }
  }, [emblaApi, currentIndex]);

  // Infinite scroll: fetch more when near the end
  const onFetchMore = useCallback(() => {
    if (!emblaApi || !onLoadMore) return;
    const idx = emblaApi.selectedScrollSnap();
    const total = emblaApi.scrollSnapList().length;
    if (total > 0 && idx >= total - 2) onLoadMore();
  }, [emblaApi, onLoadMore]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onFetchMore);
    return () => emblaApi.off('select', onFetchMore);
  }, [emblaApi, onFetchMore]);

  // Re-init when poems list changes
  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, poems.length]);

  // revealAll callbacks indexed by poem id — PoemReader pushes its revealAll fn here
  const revealAllMap = useRef({});
  const handleRevealAllReady = useCallback((poemId, fn) => {
    revealAllMap.current[poemId] = fn;
  }, []);

  const goldColor = darkMode ? '#c5a059' : '#8B6430';

  return (
    <div className="w-full relative" data-testid="poem-feed">
      {/* Vertical Embla viewport — full viewport height on mobile for feed feel */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full"
        role="region"
        aria-label="Poem feed"
        style={{ touchAction: 'none', height: 'calc(100dvh - 220px)' }}
      >
        {/* touchAction:none lets Embla own ALL pointer events so short taps fire as
            clicks (triggering stanza reveal) and long drags navigate between poems.
            height:'auto' (no explicit height) lets the flex column grow to N slides. */}
        <div className="flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
          {poems.map((poem, slideIdx) => {
            const isActive = slideIdx === currentIndex;
            return (
              <div
                key={poem.id ?? slideIdx}
                className="flex-shrink-0 w-full overflow-hidden"
                style={{ height: 'calc(100dvh - 220px)' }}
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
                  activeVersePairs={isActive ? activeVersePairs : []}
                  wordRefs={isActive ? wordRefs : []}
                  wordOffsets={isActive ? wordOffsets : []}
                  onRevealAllReady={(fn) => handleRevealAllReady(poem.id, fn)}
                  revealStyle="aurora"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Swipe-up hint */}
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
