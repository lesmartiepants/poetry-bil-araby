import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { transliterate } from '../utils/transliterate.js';

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
 */
const PoemCarousel = ({
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
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    dragFree: false,
    loop: false,
    startIndex: currentIndex,
    containScroll: 'trimSnaps',
  });

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
    const idx = emblaApi.selectedScrollSnap();
    onSlideChange(idx);
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

  const dotColor = darkMode ? 'rgba(197,160,89,0.5)' : 'rgba(140,100,30,0.4)';
  const dotActiveColor = darkMode ? 'rgba(197,160,89,1)' : 'rgba(140,100,30,0.85)';
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
        <div className="flex">
          {poems.map((poem, slideIdx) => {
            const lines = poem.arabic ? poem.arabic.split('\n') : [];
            const enLines = poem.english ? poem.english.split('\n') : [];
            const versePairs = lines.map((ar, i) => ({ ar, en: enLines[i] || '' }));

            return (
              <div
                key={poem.id ?? slideIdx}
                className="flex-shrink-0 w-full"
              >
                <div className="px-4 md:px-20 py-2 text-center">
                  <div className="flex flex-col gap-5 md:gap-7">
                    {versePairs.map((pair, idx) => (
                      <div
                        key={`${poem.id}-${idx}`}
                        className="flex flex-col gap-0.5 verse-fade-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <p
                          dir="rtl"
                          className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                          style={{ fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})` }}
                        >
                          {pair.ar}
                        </p>
                        {showTransliteration && pair.ar && (
                          <p
                            dir="ltr"
                            className={`font-brand-en italic opacity-50 ${DESIGN.anim}`}
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
                            className={`font-brand-en italic opacity-60 ${DESIGN.anim} mx-auto`}
                            style={{
                              fontSize: `calc(${POEM_META.verseEnglishSize} * ${textScale})`,
                              maxWidth: '90%',
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

      {/* Dot indicators — only show when more than one poem */}
      {poems.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {poems.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to poem ${i + 1}`}
              style={{
                width: i === currentIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentIndex ? dotActiveColor : dotColor,
                transition: 'all 0.25s ease',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}

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
};

export default PoemCarousel;
