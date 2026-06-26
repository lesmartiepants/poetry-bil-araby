import { useLayoutEffect, useMemo, useState } from 'react';
import HighlightedVerse from '../HighlightedVerse.jsx';
import { transliterate } from '../../utils/transliterate.js';
import { POEM_META } from '../../constants/index.js';

/**
 * SparklerStage — presentational teleprompter window for the sparkler reveal.
 *
 * Renders a fixed-height stage (4 unit-rows) over a translated track of verse units. Each unit
 * shows Arabic → transliteration → English, revealed together. The Arabic line is rendered via
 * HighlightedVerse word-spans (clip-path on the wrapper) so the reveal-clip and TTS word-highlight
 * share one DOM path. All animation is driven imperatively by useSparklerReveal via the refs the
 * parent (PoemReader) passes in; this component only lays out the DOM and keeps line heights/fit.
 *
 * Refs (owned by PoemReader, attached here): stageRef, trackRef, headRef, canvasRef, unitRefs[].
 */
export default function SparklerStage({
  lines,
  isActive,
  darkMode,
  showTranslation,
  showTransliteration,
  textScale = 1,
  currentFontClass = 'font-amiri',
  revealedCount = 0,
  wordRefs = [],
  wordOffsets = [],
  stageRef,
  trackRef,
  headRef,
  canvasRef,
  unitRefs,
}) {
  const [unitH, setUnitH] = useState(null);

  const arColor = darkMode ? 'rgba(236,232,224,0.94)' : 'rgba(28,25,23,0.92)';
  const enColor = darkMode ? 'rgba(236,232,224,0.62)' : 'rgba(28,25,23,0.6)';
  const translitColor = darkMode ? 'rgba(212,180,99,0.7)' : 'rgba(139,100,48,0.7)';

  const translits = useMemo(
    () => (showTransliteration ? lines.map((l) => transliterate(l.ar)) : []),
    [lines, showTransliteration]
  );

  // Measure the tallest unit → constant row rhythm (stage = 4 × maxUnitH); then fit each line
  // (shrink font only, never wrap). Re-runs on content/toggle/scale/font change + resize.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const inners = track.querySelectorAll('.unit-inner');
      let max = 0;
      inners.forEach((el) => {
        max = Math.max(max, el.getBoundingClientRect().height);
      });
      if (max > 0) setUnitH(Math.ceil(max + 18)); // breathing room so tashkeel never clips
      // fitLine: shrink any overflowing line to keep it on one row
      track.querySelectorAll('.ar-line, .translit-line, .en-line').forEach((el) => {
        el.style.fontSize = '';
        const w = el.clientWidth * 0.97;
        const sw = el.scrollWidth;
        if (sw > w && w > 0) {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = (fs * w) / sw + 'px';
        }
      });
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [lines, showTranslation, showTransliteration, textScale, currentFontClass, trackRef]);

  const rowH = unitH ?? undefined;

  return (
    <div
      ref={stageRef}
      data-testid="sparkler-stage"
      className="relative w-full overflow-hidden"
      style={{ height: rowH ? rowH * 4 : 'auto', zIndex: 2 }}
    >
      <div
        ref={trackRef}
        className="absolute left-0 right-0 top-0 will-change-transform"
        data-window-top="0"
      >
        {lines.map((ln, i) => (
          <div
            key={i}
            ref={(el) => {
              if (unitRefs.current) unitRefs.current[i] = el;
            }}
            data-testid={`sparkler-unit-${i}`}
            data-revealed={i < revealedCount ? 'true' : 'false'}
            className="flex flex-col items-center justify-center text-center"
            style={{ height: rowH }}
          >
            <div className="unit-inner flex flex-col items-center justify-center gap-[0.12rem] w-full">
              <HighlightedVerse
                text={ln.ar}
                wordRefs={wordRefs}
                wordOffset={wordOffsets[i] ?? 0}
                verseIndex={i}
                className={`ar-line ${currentFontClass} arabic-shadow`}
                style={{
                  fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})`,
                  lineHeight: 1.75,
                  whiteSpace: 'nowrap',
                  color: arColor,
                  clipPath: 'inset(0 0 0 100%)',
                  willChange: 'clip-path',
                  margin: 0,
                }}
              />
              {showTransliteration && (
                <div
                  dir="ltr"
                  className="translit-line font-brand-en"
                  style={{
                    fontSize: `calc(${POEM_META.verseTranslitSize} * ${textScale})`,
                    whiteSpace: 'nowrap',
                    fontStyle: 'italic',
                    letterSpacing: '0.02em',
                    color: translitColor,
                    opacity: 0,
                  }}
                >
                  {translits[i]}
                </div>
              )}
              {showTranslation && ln.en && (
                <div
                  dir="ltr"
                  className="en-line font-brand-en"
                  style={{
                    fontSize: `calc(${POEM_META.verseEnglishSize} * ${textScale})`,
                    whiteSpace: 'nowrap',
                    fontStyle: 'italic',
                    lineHeight: 1.2,
                    color: enColor,
                    opacity: 0,
                  }}
                >
                  {ln.en}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* sparkler head */}
      <div
        ref={headRef}
        aria-hidden="true"
        className="sparkler-head"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 18,
          height: 18,
          margin: '-9px 0 0 -9px',
          zIndex: 4,
          pointerEvents: 'none',
          opacity: 0,
          willChange: 'transform, opacity',
          background:
            'radial-gradient(circle, #fff 0%, #ffe9b0 32%, rgba(212,180,99,.55) 54%, transparent 76%)',
          filter: 'blur(.4px) drop-shadow(0 0 6px rgba(255,210,120,.8))',
          mixBlendMode: 'screen',
        }}
      />

      {/* spark canvas — only the active slide mounts a live canvas (perf) */}
      {isActive && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0"
          style={{ zIndex: 3, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
