import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { transliterate } from '../utils/transliterate.js';
import HighlightedVerse from './HighlightedVerse.jsx';

/**
 * PoemCarousel — horizontal swipe through poems by the same poet.
 *
 * Props:
 *   poems         {Array}    — array of poem objects to display
 *   currentIndex  {number}   — which slide to start on
 *   onSlideChange {Function} — called with (index) when the user swipes
 *   darkMode      {boolean}  — theme flag
 *   showTranslation     {boolean}
 *   showTransliteration {boolean}
 *   textScale     {number}   — multiplier from TEXT_SIZES
 *   currentFontClass {string} — CSS class for Arabic font
 *   POEM_META     {Object}   — typography constants
 *   DESIGN        {Object}   — layout constants
 *
 * Ref:
 *   scrollTo(index) — programmatic navigation (used by external dot indicators)
 */
const PoemCarousel = forwardRef(({
  poems,
  currentIndex,
  onSlideChange,
  darkMode,
  showTranslation,
  showTransliteration,
  textScale,
  currentFontClass,
  POEM_META,
  DESIGN,
  onLoadMore,
  // TTS highlight props — only used for the active slide
  highlightStyle = 'none',
  activeVersePairs = [],
  wordRefs = [],
  wordOffsets = [],
}, ref) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    dragFree: false,
    loop: true,
    startIndex: currentIndex,
    duration: 25,
  });

  // Expose scrollTo so parent can render dot indicators externally
  useImperativeHandle(ref, () => ({
    scrollTo: (index) => emblaApi?.scrollTo(index),
  }), [emblaApi]);

  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Hide swipe hint after 3 seconds
  useEffect(() => {
    if (poems.length <= 1) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [poems.length]);

  const updateScrollButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  // Notify parent when user swipes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const prev = emblaApi.previousScrollSnap();
    const idx = emblaApi.selectedScrollSnap();
    const direction = idx > prev ? 'next' : idx < prev ? 'prev' : 'same';
    onSlideChange(idx, direction);
    setHasSwiped(true);
    setShowSwipeHint(false);
    updateScrollButtons();
  }, [emblaApi, onSlideChange, updateScrollButtons]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', updateScrollButtons);
    updateScrollButtons();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', updateScrollButtons);
    };
  }, [emblaApi, onSelect, updateScrollButtons]);

  // Scroll to slide when currentIndex changes from outside (e.g. "Surprise Me")
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== currentIndex) {
      emblaApi.scrollTo(currentIndex, true);
    }
  }, [emblaApi, currentIndex]);

  // Infinite scroll: fetch more poems when nearing the end
  const onFetchMore = useCallback(() => {
    if (!emblaApi || !onLoadMore) return;
    const idx = emblaApi.selectedScrollSnap();
    const total = emblaApi.scrollSnapList().length;
    if (total > 0 && idx >= total - 2) {
      onLoadMore();
    }
  }, [emblaApi, onLoadMore]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onFetchMore);
    return () => emblaApi.off('select', onFetchMore);
  }, [emblaApi, onFetchMore]);

  // Re-initialise Embla when new poems are appended so it picks up new slides
  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, poems.length]);

  const goldColor = '#c5a059';

  return (
    <div className="w-full relative">
      {/* Desktop chevron — previous */}
      {poems.length > 1 && (
        <button
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous poem"
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 transition-all duration-300 ease-in-out"
          style={{
            opacity: canScrollPrev ? 0.5 : 0.15,
            color: goldColor,
            pointerEvents: canScrollPrev ? 'auto' : 'none',
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Desktop chevron — next */}
      {poems.length > 1 && (
        <button
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next poem"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 transition-all duration-300 ease-in-out"
          style={{
            opacity: canScrollNext ? 0.5 : 0.15,
            color: goldColor,
            pointerEvents: canScrollNext ? 'auto' : 'none',
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Carousel viewport — no touchAction override so Embla can receive horizontal swipe */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full"
      >
        <div className="flex items-start">
          {poems.map((poem, slideIdx) => {
            const isActive = slideIdx === currentIndex;
            const useHighlight = isActive && highlightStyle !== 'none' && activeVersePairs.length > 0;
            const pairs = useHighlight
              ? activeVersePairs
              : (() => {
                  const lines = poem.arabic ? poem.arabic.split('\n') : [];
                  const enLines = poem.english ? poem.english.split('\n') : [];
                  return lines.map((ar, i) => ({ ar, en: enLines[i] || '' }));
                })();

            return (
              <div
                key={poem.id ?? slideIdx}
                className="flex-shrink-0 w-full h-fit"
              >
                <div className="px-4 md:px-20 py-2 text-center">
                  <div className={`flex flex-col gap-5 md:gap-7${useHighlight ? ` tts-style-${highlightStyle}` : ''}`}>
                    {pairs.map((pair, idx) => (
                      <div
                        key={`${poem.id}-${idx}`}
                        className="flex flex-col gap-0.5 verse-fade-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        {useHighlight ? (
                          <HighlightedVerse
                            text={pair.ar}
                            wordRefs={wordRefs}
                            wordOffset={wordOffsets[idx] ?? 0}
                            verseIndex={idx}
                            className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                            style={{ fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})` }}
                          />
                        ) : (
                          <p
                            dir="rtl"
                            className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                            style={{ fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})` }}
                          >
                            {pair.ar}
                          </p>
                        )}
                        {showTransliteration && pair.ar && (
                          <p
                            dir="ltr"
                            className={`font-brand-en opacity-50 ${DESIGN.anim}`}
                            style={{
                              fontSize: `calc(${POEM_META.verseTranslitSize} * ${textScale})`,
                            }}
                          >
                            {transliterate(pair.ar)}
                          </p>
                        )}
                        {showTranslation && pair.en && (
                          <p
                            dir="ltr"
                            className={`font-brand-en inline-fade-in mx-auto`}
                            style={{
                              fontSize: `calc(${POEM_META.verseEnglishSize} * ${textScale})`,
                              maxWidth: '90%',
                              animationDelay: `${idx * 120}ms`,
                            }}
                          >
                            {pair.en}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Swipe hint — fades out after 3s or after first swipe */}
      {poems.length > 1 && !hasSwiped && (
        <div
          className="flex justify-center mt-2 md:hidden transition-all duration-300 ease-in-out"
          style={{ opacity: showSwipeHint ? 0.4 : 0 }}
          aria-hidden="true"
        >
          <span className="font-brand-en text-xs" style={{ color: goldColor }}>
            Swipe for more by this poet →
          </span>
        </div>
      )}
    </div>
  );
});

export default PoemCarousel;
