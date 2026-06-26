import { memo, useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import SparklerStage from './SparklerStage.jsx';
import ProgressScrubber from './ProgressScrubber.jsx';
import InlineInsights from './InlineInsights.jsx';
import { useRevealWindow } from '../../hooks/useRevealWindow.js';
import { useSparklerReveal } from '../../hooks/useSparklerReveal.js';
import { useAudioStore } from '../../stores/audioStore';
import { POEM_META } from '../../constants/index.js';

const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * PoemReader — one poem panel in the vertical feed, rendered as the sparkler teleprompter.
 *
 * A big centered title animates up to the top, then the poem reveals line-by-line with the
 * sparkler. Tap advances the reveal (4-line sliding window); a draggable scrubber seeks. When
 * TTS plays, the window follows the spoken line. At the end, an inline insight (or drawer)
 * surfaces the meaning + author.
 */
const PoemReader = memo(function PoemReader({
  poem,
  isActive = false,
  darkMode = true,
  showTranslation = true,
  showTransliteration = false,
  textScale = 1,
  currentFontClass = 'font-amiri',
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
  onNextPoem,
  // Reveal controller registration (replaces onRevealAllReady)
  onRevealReady,
}) {
  const poemId = poem?.id;

  // Flat verse lines — match app.jsx's versePairs (blank lines filtered) so wordOffsets/TTS align.
  const lines = useMemo(() => {
    const arLines = (poem?.arabic || '').split('\n').filter((l) => l.trim());
    const enLines = (poem?.english || '').split('\n').filter((l) => l.trim());
    return arLines.map((ar, i) => ({ ar, en: enLines[i] || '' }));
  }, [poem]);
  const lineCount = lines.length;

  const { revealedCount, isAllRevealed, setRevealed, reset } = useRevealWindow(lineCount, poemId);

  // DOM refs the controller animates.
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const headRef = useRef(null);
  const canvasRef = useRef(null);
  const unitRefs = useRef([]);
  const scrubFillRef = useRef(null);
  const scrubHandleRef = useRef(null);
  const metaRef = useRef(null);
  const stageWrapRef = useRef(null);
  const scrubWrapRef = useRef(null);
  const introForRef = useRef(null);

  const refs = useMemo(
    () => ({ stageRef, trackRef, headRef, canvasRef, unitRefs, scrubFillRef, scrubHandleRef }),
    []
  );

  const controller = useSparklerReveal({
    isActive,
    poemId,
    lineCount,
    reducedMotion: REDUCED_MOTION,
    onRevealedChange: setRevealed,
    refs,
  });

  // Register the controller with the feed (TTS / programmatic control).
  useEffect(() => {
    if (onRevealReady) onRevealReady(poemId, controller);
  }, [poemId, onRevealReady, controller]);

  const isPlaying = useAudioStore((s) => s.isPlaying);
  const goldColor = darkMode ? '#c5a059' : '#8B6430';

  // ── Title intro: big centered header → settles to top → poem reveals ──
  useEffect(() => {
    if (!isActive || lineCount === 0) return;
    if (introForRef.current === poemId) return; // run once per poem activation
    introForRef.current = poemId;
    reset();
    const ctrl = controller;
    ctrl?.reset();
    const meta = metaRef.current;
    const stageWrap = stageWrapRef.current;
    const scrub = scrubWrapRef.current;
    gsap.killTweensOf([meta, stageWrap, scrub]);

    if (REDUCED_MOTION) {
      gsap.set(meta, { opacity: 1, y: 0, scale: 1 });
      gsap.set([stageWrap, scrub], { opacity: 1 });
      ctrl?.start();
      return;
    }

    gsap.set(stageWrap, { opacity: 0 });
    gsap.set(scrub, { opacity: 0 });
    gsap.set(meta, {
      opacity: 0,
      y: Math.round((typeof window !== 'undefined' ? window.innerHeight : 700) * 0.24),
      scale: 1.4,
      transformOrigin: 'center top',
    });
    const tl = gsap.timeline();
    tl.to(meta, { opacity: 1, duration: 1.0, ease: 'power2.out' })
      .to({}, { duration: 1.1 })
      .to(meta, { y: 0, scale: 1, duration: 0.9, ease: 'power3.inOut' })
      .add(() => {
        gsap.to(stageWrap, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        gsap.to(scrub, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      })
      .add(() => ctrl?.start(), '-=0.05');

    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, poemId, lineCount]);

  // Allow the intro to replay if this slide is scrolled away and back.
  useEffect(() => {
    if (!isActive) introForRef.current = null;
  }, [isActive]);

  // ── TTS line-sync: follow the spoken line while playing, keeping the 4-line frame ──
  useEffect(() => {
    if (!isActive || !isPlaying || highlightStyle === 'none') return;
    controller?.revealUpTo(currentVerseIndex, { animate: true });
  }, [isActive, isPlaying, highlightStyle, currentVerseIndex, controller]);

  const handleTap = (e) => {
    if (e.target.closest('[data-scrub], [data-insight-ui], .sparkler-head, button, a')) return;
    if (isAllRevealed) return; // end-state uses explicit buttons
    controller?.advance();
  };

  const handleBackToPoem = () => {
    reset();
    const ctrl = controller;
    ctrl?.reset();
    ctrl?.start();
  };

  const showInitialPrompt = revealedCount === 1 && lineCount > 1;

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full h-full px-4 md:px-12 text-center select-none"
      data-testid="poem-reader"
      data-poem-id={poemId}
      onClick={handleTap}
      role={!isAllRevealed ? 'button' : undefined}
      aria-label={!isAllRevealed ? 'Tap to reveal the next lines' : undefined}
    >
      {/* Title intro / resting meta */}
      <div
        ref={metaRef}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-[2px] pointer-events-none whitespace-nowrap"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)', zIndex: 5 }}
        data-testid="poem-meta"
      >
        <div
          lang="ar"
          dir="rtl"
          style={{
            ...POEM_META.title,
            fontSize: `calc(${POEM_META.title.fontSize} * ${textScale})`,
          }}
        >
          {poem?.titleArabic || poem?.title}
        </div>
        {poem?.title && poem.title !== poem?.titleArabic && (
          <div
            dir="ltr"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: `calc(clamp(1.05rem, 4.2vw, 1.45rem) * ${textScale})`,
              color: 'rgba(212,180,99,0.9)',
              marginTop: 2,
            }}
          >
            {poem.title}
          </div>
        )}
        <div
          dir="ltr"
          className="flex items-center gap-[0.4rem]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700,
            fontSize: `calc(clamp(0.95rem, 3.8vw, 1.2rem) * ${textScale})`,
            color: goldColor,
            marginTop: 5,
          }}
        >
          <span lang="ar" style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600 }}>
            {poem?.poetArabic || poem?.poet}
          </span>
          {poem?.poet && poem?.poetArabic && poem.poet !== poem.poetArabic && (
            <span style={{ opacity: 0.6, fontWeight: 400 }}>·</span>
          )}
          {poem?.poet && poem?.poetArabic && poem.poet !== poem.poetArabic && (
            <span>{poem.poet}</span>
          )}
        </div>
      </div>

      {/* Reveal stage */}
      <div ref={stageWrapRef} className="w-full" style={{ maxWidth: 'min(760px, 92vw)' }}>
        <SparklerStage
          lines={lines}
          isActive={isActive}
          darkMode={darkMode}
          showTranslation={showTranslation}
          showTransliteration={showTransliteration}
          textScale={textScale}
          currentFontClass={currentFontClass}
          revealedCount={revealedCount}
          wordRefs={wordRefs}
          wordOffsets={wordOffsets}
          stageRef={stageRef}
          trackRef={trackRef}
          headRef={headRef}
          canvasRef={canvasRef}
          unitRefs={unitRefs}
        />
      </div>

      {/* Progress scrubber */}
      <div ref={scrubWrapRef} className="w-full mt-7" style={{ opacity: 0 }}>
        <ProgressScrubber
          total={lineCount}
          goldColor={goldColor}
          visible={isActive}
          scrubFillRef={scrubFillRef}
          scrubHandleRef={scrubHandleRef}
          onScrub={(f) => controller?.scrubTo(f, false)}
          onScrubEnd={(f) => controller?.scrubTo(f, true)}
        />
      </div>

      {/* Tap-to-continue prompt (mid-poem) */}
      {isActive && !isAllRevealed && (
        <div className="mt-6 flex flex-col items-center gap-1" aria-hidden="true">
          <span
            className="font-brand-en text-xs tracking-[0.16em] uppercase"
            style={{ color: goldColor, opacity: 0.8 }}
          >
            {showInitialPrompt ? 'tap to begin' : 'tap to continue'}
          </span>
        </div>
      )}

      {/* End-state: see the meaning + pull-up cue */}
      {isActive && isAllRevealed && (
        <div className="mt-6 flex flex-col items-center gap-3 w-full" data-insight-ui>
          <InlineInsights
            mode={insightsMode}
            poem={poem}
            darkMode={darkMode}
            isInterpreting={isInterpreting}
            insightParts={insightParts}
            interpretation={interpretation}
            onSeeInsight={() => onSeeInsight?.(poem)}
            onBackToPoem={handleBackToPoem}
            onNextPoem={() => onNextPoem?.()}
          />
          <div className="flex flex-col items-center gap-[1px] mt-1" aria-hidden="true">
            <span
              className="cue-arrow"
              style={{
                color: goldColor,
                fontSize: '1.5em',
                lineHeight: 1,
                animation: 'cueBounce 1.5s ease-in-out infinite',
              }}
            >
              ↑
            </span>
            <span
              className="font-brand-en italic"
              style={{
                color: goldColor,
                fontSize: 'clamp(0.85rem, 3.6vw, 1rem)',
                letterSpacing: '0.05em',
                opacity: 0.95,
              }}
            >
              pull up for the next poem
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default PoemReader;
