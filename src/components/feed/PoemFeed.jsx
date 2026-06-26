import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import PoemReader from './PoemReader.jsx';

/**
 * PoemFeed — vertical swipe feed of poems (swipe up = next, swipe down = prev).
 *
 * Each slide is a <PoemReader> running the sparkler teleprompter reveal. Embla owns vertical
 * pointer drag for poem-to-poem navigation; a `watchDrag` predicate ignores drags that start
 * on the progress scrubber ([data-scrub]) so seeking never navigates poems. Easing is tuned
 * heavier for a weightier, magnetic feel.
 *
 * Ref: scrollTo(index) — programmatic navigation (dot indicators, "Surprise Me", "next poem").
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
    insightsMode = 'inline',
    isInterpreting = false,
    insightParts = null,
    interpretation = null,
    onSeeInsight,
  },
  ref
) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    dragFree: false,
    loop: false,
    startIndex: currentIndex,
    duration: 32, // heavier glide for a magnetic feel (Embla units; higher = slower)
    watchDrag: (_api, evt) => !evt?.target?.closest?.('[data-scrub]'),
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

  useEffect(() => {
    if (poems.length <= 1) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [poems.length]);

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

  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== currentIndex) {
      emblaApi.scrollTo(currentIndex, true);
    }
  }, [emblaApi, currentIndex]);

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

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, poems.length]);

  // Reveal controllers indexed by poem id (programmatic control if needed).
  const controllerMap = useRef({});
  const handleRevealReady = useCallback((poemId, controller) => {
    controllerMap.current[poemId] = controller;
  }, []);

  // "next poem" from the end-state insight — advance the feed.
  const goNextPoem = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(emblaApi.selectedScrollSnap() + 1);
  }, [emblaApi]);

  const goldColor = darkMode ? '#c5a059' : '#8B6430';

  return (
    <div className="w-full relative" data-testid="poem-feed">
      <div
        ref={emblaRef}
        className="overflow-hidden w-full"
        role="region"
        aria-label="Poem feed"
        style={{ touchAction: 'none', height: 'calc(100dvh - 220px)' }}
      >
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
                  currentVerseIndex={isActive ? currentVerseIndex : 0}
                  wordRefs={isActive ? wordRefs : []}
                  wordOffsets={isActive ? wordOffsets : []}
                  insightsMode={insightsMode}
                  isInterpreting={isActive ? isInterpreting : false}
                  insightParts={isActive ? insightParts : null}
                  interpretation={isActive ? interpretation : null}
                  onSeeInsight={onSeeInsight}
                  onNextPoem={goNextPoem}
                  onRevealReady={handleRevealReady}
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
