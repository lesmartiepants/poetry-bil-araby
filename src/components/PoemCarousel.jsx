import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
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
  });

  // Notify parent when user swipes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    onSlideChange(idx);
  }, [emblaApi, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  // Scroll to slide when currentIndex changes from outside (e.g. "Surprise Me")
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== currentIndex) {
      emblaApi.scrollTo(currentIndex, true);
    }
  }, [emblaApi, currentIndex]);

  const dotColor = darkMode ? 'rgba(197,160,89,0.5)' : 'rgba(140,100,30,0.4)';
  const dotActiveColor = darkMode ? 'rgba(197,160,89,1)' : 'rgba(140,100,30,0.85)';

  return (
    <div className="w-full">
      {/* Carousel viewport — allow horizontal drag, preserve vertical scroll */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full"
        style={{ touchAction: 'pan-y pinch-zoom' }}
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
    </div>
  );
};

export default PoemCarousel;
