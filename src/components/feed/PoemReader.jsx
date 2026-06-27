import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
 * Layout matches the prototype: the title settles at the top, the verses sit in the centre, and
 * the progress scrubber + tap prompt are anchored near the bottom. Tapping drives everything —
 * it advances the reveal, then ("tap for meaning") opens the inline insight (The Meaning → tap →
 * About the Author). Pull up for the next poem.
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
  isInterpreting = false,
  insightParts = null,
  interpretation = null,
  onSeeInsight,
  // Reveal controller registration
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
  // End-of-poem insight stage: 'idle' (reading done) → 'meaning' → 'author'. Reset on poem change.
  const [endStage, setEndStage] = useState('idle');

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
  const insightScrollRef = useRef(null);
  const prevStageRef = useRef('idle');

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
    setEndStage('idle');
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
      y: Math.round((typeof window !== 'undefined' ? window.innerHeight : 700) * 0.22),
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

  useEffect(() => {
    if (!isActive) introForRef.current = null;
  }, [isActive]);

  // ── TTS line-sync: follow the spoken line while playing, keeping the 4-line frame ──
  useEffect(() => {
    if (!isActive || !isPlaying || highlightStyle === 'none') return;
    controller?.revealUpTo(currentVerseIndex, { animate: true });
  }, [isActive, isPlaying, highlightStyle, currentVerseIndex, controller]);

  // Insight reveal: "tap for meaning" scrolls the meaning up into view (fade + rise); the next
  // tap scrolls down to reveal the poet section so it isn't hidden below the fold.
  useEffect(() => {
    const el = insightScrollRef.current;
    const prev = prevStageRef.current;
    prevStageRef.current = endStage;
    if (!el) return;
    if (endStage === 'meaning' && prev !== 'meaning') {
      el.scrollTop = 0;
      if (!REDUCED_MOTION) {
        gsap.fromTo(
          el,
          { opacity: 0, y: 44 },
          { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }
        );
      }
    } else if (endStage === 'author') {
      requestAnimationFrame(() =>
        el.scrollTo({ top: el.scrollHeight, behavior: REDUCED_MOTION ? 'auto' : 'smooth' })
      );
    }
  }, [endStage]);

  const handleTap = (e) => {
    if (e.target.closest('[data-scrub], button, a')) return; // scrubber/controls handle themselves
    if (!isAllRevealed) {
      controller?.advance();
      return;
    }
    // End-of-poem: tap progresses through the insight (no buttons — same tap rhythm).
    if (endStage === 'idle') {
      onSeeInsight?.(poem);
      setEndStage('meaning');
    } else if (endStage === 'meaning' && insightParts?.author) {
      setEndStage('author');
    }
  };

  const inInsight = endStage !== 'idle';

  // Bottom prompt — single "tap to continue" rhythm (no "tap to begin").
  let promptText = null;
  if (!isAllRevealed) promptText = 'tap to continue';
  else if (endStage === 'idle') promptText = 'tap for meaning';
  else if (endStage === 'meaning' && insightParts?.author) promptText = 'tap for the poet';
  const showCue = isActive && isAllRevealed && (endStage === 'idle' || endStage === 'author');

  return (
    <div
      className="relative w-full h-full select-none"
      data-testid="poem-reader"
      data-poem-id={poemId}
      onClick={handleTap}
      role={!isAllRevealed ? 'button' : undefined}
      aria-label={!isAllRevealed ? 'Tap to reveal the next lines' : undefined}
    >
      {/* Title intro / resting meta — pinned at the top (prototype location) */}
      <div
        ref={metaRef}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-[2px] pointer-events-none whitespace-nowrap"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 18px)', zIndex: 5 }}
        data-testid="poem-meta"
      >
        <div
          lang="ar"
          dir="rtl"
          style={{
            ...POEM_META.title,
            fontSize: `calc(clamp(1.6rem, 6.6vw, 2.25rem) * ${textScale})`,
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
              fontSize: `calc(clamp(1.1rem, 4.4vw, 1.5rem) * ${textScale})`,
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
            fontSize: `calc(clamp(0.98rem, 3.9vw, 1.22rem) * ${textScale})`,
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

      {/* Central body — verses (reading) or the inline insight (end), vertically centred,
          padded to clear the top meta and the bottom chrome band. */}
      <div
        className="absolute inset-0 flex items-center justify-center px-4 md:px-12"
        style={{
          // Asymmetric so the verses sit centred between the (taller) header and the bottom bar.
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + clamp(116px, 16vh, 148px))',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + clamp(60px, 9vh, 92px))',
        }}
      >
        {/* Stage stays mounted (refs persist); hidden when the insight is showing. */}
        <div
          ref={stageWrapRef}
          className="w-full"
          style={{
            maxWidth: 'min(760px, 92vw)',
            opacity: 0,
            display: inInsight ? 'none' : 'block',
          }}
        >
          <SparklerStage
            lines={lines}
            isActive={isActive}
            darkMode={darkMode}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            textScale={textScale}
            currentFontClass={currentFontClass}
            highlightStyle={isActive ? highlightStyle : 'none'}
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

        {inInsight && (
          <div
            ref={insightScrollRef}
            className="w-full max-w-xl mx-auto overflow-y-auto text-center"
            style={{ maxHeight: '100%' }}
            data-insight-ui
          >
            <InlineInsights
              stage={endStage}
              poem={poem}
              darkMode={darkMode}
              isInterpreting={isInterpreting}
              insightParts={insightParts}
              interpretation={interpretation}
            />
          </div>
        )}
      </div>

      {/* Bottom chrome band — scrubber + tap prompt + pull-up cue, anchored near the bottom */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-3 px-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', zIndex: 5 }}
      >
        {!inInsight && (
          <div ref={scrubWrapRef} className="w-full" style={{ opacity: 0 }}>
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
        )}

        {isActive && promptText && (
          <span
            className="font-brand-en text-xs tracking-[0.16em] uppercase"
            style={{ color: goldColor, opacity: 0.85 }}
            aria-hidden="true"
          >
            {promptText}
          </span>
        )}

        {showCue && (
          <div className="flex flex-col items-center gap-[1px]" aria-hidden="true">
            <span
              className="cue-arrow"
              style={{
                color: goldColor,
                fontSize: '1.4em',
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
        )}
      </div>
    </div>
  );
});

export default PoemReader;
