import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PoemColumn from './PoemColumn.jsx';
import PoemSeal, { useSummon } from './PoemSeal.jsx';
import InlineInsights, { INSIGHT_LABELS } from './InlineInsights.jsx';
import ReaderActions from './ReaderActions.jsx';
import ScrollHairline from './ScrollHairline.jsx';
import '../../styles/reader-actions.css';
import '../../styles/poem-column.css';
import { useAudioStore } from '../../stores/audioStore';

// The poem is a continuous scrolling column now, so there is no pinned header to clear and no
// scrubber lane to reserve. The head scrolls with the poem (PoemColumn pads its own scroller),
// which is where most of the reclaimed vertical space comes from: the old BODY_TOP_INSET reserved
// 116-148px for a fixed title, and the scrub lane took another 56px horizontally.
const BODY_BOTTOM_INSET = 'calc(env(safe-area-inset-bottom, 0px) + clamp(96px, 13vh, 120px))';
const ACTIONS_MAX_WIDTH =
  'min(420px, calc(100vw - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))';

// px of sustained over-pull past the end of the poem equal to one full 760ms hold of the quill.
const PULL_NEED = 120;

/**
 * PoemReader — one poem panel in the vertical feed.
 *
 * The whole poem scrolls in a single column (PoemColumn); reaching the end reveals a quill
 * (PoemSeal) you hold to summon the next poem. There is no reveal controller and no progress rail:
 * scroll position IS the progress, and the dimmed-ahead verses show the poem's shape from the
 * first frame.
 *
 * The end-of-poem insight stages (idle -> meaning -> author) are unchanged; they simply swap the
 * column out for the inline insight rather than swapping out a teleprompter stage.
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
  // Playback / transport (threaded from app via PoemFeed)
  isGeneratingAudio = false,
  onTogglePlay,
  onStopAudio,
  onPrev,
  onNext,
  onShare,
}) {
  const poemId = poem?.id;
  const summon = useSummon();
  // Same values PoemColumn computes for its own (scrolling) pc-head, duplicated here because the
  // insight header below needs them while PoemColumn itself is unmounted.
  const goldColor = darkMode ? '#c5a059' : '#8B6430';
  const enTitleColor = darkMode ? 'rgba(255,253,247,0.88)' : 'rgba(28,25,23,0.8)';

  // Flat verse lines — match app.jsx's versePairs (blank lines filtered) so wordOffsets/TTS align.
  const lines = useMemo(() => {
    const arLines = (poem?.arabic || '').split('\n').filter((l) => l.trim());
    const enLines = (poem?.english || '').split('\n').filter((l) => l.trim());
    return arLines.map((ar, i) => ({ ar, en: enLines[i] || '' }));
  }, [poem]);

  // End-of-poem insight stage: 'idle' (reading) -> 'meaning' -> 'author'. Reset on poem change.
  const [endStage, setEndStage] = useState('idle');
  // Which insight sections have already been opened this poem — the reveal flourish plays only the
  // first time; revisits show the full text instantly. State, not a ref, because `animate` is read
  // during render and a ref read there cannot trigger the re-render that would correct it.
  const [seenStages, setSeenStages] = useState({});

  const columnRef = useRef(null);
  const insightWrapRef = useRef(null);
  // The quill element, so the pull-at-bottom summon can anchor its FX to it. PoemSeal renders
  // the element; it accepts this ref and writes it on mount.
  const sealRef = useRef(null);
  // Set when the reader taps "Back to Poem" so the column returns to the top once it is visible.
  const cameFromInsightsRef = useRef(false);

  const isPlaying = useAudioStore((s) => s.isPlaying);

  // Reset during render rather than in an effect, so a new poem never paints one frame showing the
  // previous poem's insight stage. This is React's documented "adjusting state when a prop changes"
  // pattern, and it is the same render-phase timing the old reveal-window reset was tested for.
  const [prevPoemId, setPrevPoemId] = useState(poemId);
  if (poemId !== prevPoemId) {
    setPrevPoemId(poemId);
    setEndStage('idle');
    setSeenStages({});
  }

  const inInsight = endStage !== 'idle';

  // The reveal is scroll-driven, so there is no "still revealing" state and no 'reading' mode.
  // ReaderActions only ever sees idle / meaning / author now.
  const mode = endStage;
  const hasAuthor = !!insightParts?.author;

  // How far into the final stretch of the poem the reader has scrolled (0 to 1), whether the column
  // scrolls at all, and whether they have actually moved it. PoemColumn computes all three.
  const [endApproach, setEndApproach] = useState(0);
  const [arrived, setArrived] = useState(false);
  const handleScrollProgress = useCallback((frac, { lastStretch, scrollable, travelled } = {}) => {
    setEndApproach(lastStretch ?? 0);
    setArrived(!!scrollable && !!travelled);
  }, []);

  // Arriving at the quill is the end-of-poem moment, and it was arriving into competition: a
  // filled-gold "Poem Insights" pill is the loudest object on the screen, so the reader met two
  // primary next-actions at once. The fixed row recedes as the quill comes into view. It stays
  // interactive at low opacity rather than disappearing, so a reader who wanted Insights after all
  // is never trapped, and it returns the moment they scroll back up.
  //
  // `arrived` is the whole point of the gate. The dimming is a response to the reader TRAVELLING to
  // the quill, so it must not fire when there was no journey: a poem short enough to fit reports
  // itself at the end from the first frame, and a poem only slightly taller than the viewport has
  // its entire scroll range inside the final 170px, so `endApproach` alone dimmed the actions at
  // rest in both cases, with the quill and the buttons plainly visible and nothing having happened.
  const actionsDimmed = !inInsight && arrived && endApproach > 0.15;

  const handleSeeMeaning = () => {
    onStopAudio?.(); // entering insights stops the recitation (it's prose, not the poem)
    onSeeInsight?.(poem);
    setEndStage('meaning');
  };
  const handleSeeAuthor = () => setEndStage('author');
  const handleBackToPoem = () => {
    cameFromInsightsRef.current = true;
    setEndStage('idle');
  };
  const handleBackToInsights = () => setEndStage('meaning');
  // Listen just plays now. There is nothing to pre-reveal: the whole poem is already present, and
  // PoemColumn scrolls the spoken verse into view on its own.
  const handleListen = () => onTogglePlay?.();

  // Returning from an insight puts the reader back at the top of the poem.
  useLayoutEffect(() => {
    if (endStage === 'idle' && cameFromInsightsRef.current) {
      cameFromInsightsRef.current = false;
      columnRef.current?.getScroller?.()?.scrollTo({ top: 0 });
    }
  }, [endStage]);

  const onInsightProgress = (done) => {
    // RevealText reports a fraction (0..1) on every tween tick, not a boolean. Anything below 1
    // is mid-reveal; treating 0.02 as done marked the section seen on the first frame, which
    // flipped animate to false and cancelled the word-by-word reveal it was still playing.
    if (done >= 1 && endStage !== 'idle') {
      setSeenStages((s) => (s[endStage] ? s : { ...s, [endStage]: true }));
    }
  };

  // A sustained pull past the end of the poem charges the same summon the quill drives. A flick
  // lifts early, so endCharge sees an incomplete charge and decays it: nothing happens. Only a
  // sustained pull reaches 1 while still down, which is what keeps summoning a decision.
  const handleOverPull = useCallback(
    ({ distance, phase }) => {
      if (!summon || !isActive) return;
      // Route through pull(), not setCharge/endCharge. pull() anchors --sx/--sy to the quill on
      // the first movement and hands commit the seal element, so the burst, sparks and quill lift
      // all fire at the control the reader is pulling past. Calling setCharge directly left the
      // FX on CSS defaults (50%/62%), or on coordinates left over from the previous quill hold,
      // and committed with no seal element, which skips the spark burst entirely.
      summon.pull({ distance, phase }, sealRef.current);
    },
    [summon, isActive]
  );

  // The progress hairline reads whichever scroller is live (D9): the poem column while reading,
  // the inline insight's viewport while a section is open. Identity changes with endStage and
  // activation so ScrollHairline re-attaches at the right moments.
  const getHairlineScroller = useCallback(() => {
    if (endStage === 'idle') return columnRef.current?.getScroller?.() || null;
    return insightWrapRef.current?.querySelector('[data-insight-scroll]') || null;
  }, [endStage, isActive]);

  return (
    <div className="relative w-full h-full select-none" data-testid="poem-reader">
      {/* Body — the scrolling poem, or the inline insight at the end. */}
      <div
        className="absolute inset-0"
        style={{ paddingBottom: inInsight ? BODY_BOTTOM_INSET : 0 }}
      >
        {!inInsight && (
          <PoemColumn
            ref={columnRef}
            poem={poem}
            lines={lines}
            isActive={isActive}
            darkMode={darkMode}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            textScale={textScale}
            currentFontClass={currentFontClass}
            highlightStyle={isActive ? highlightStyle : 'none'}
            wordRefs={wordRefs}
            wordOffsets={wordOffsets}
            currentVerseIndex={currentVerseIndex}
            isPlaying={isPlaying}
            onOverPull={handleOverPull}
            onScrollProgress={handleScrollProgress}
          >
            {/* The quill lives inside the column so it scrolls with the poem: it exists only at
                the end, where the reader has arrived deliberately. */}
            {isActive && <PoemSeal sealRef={sealRef} />}
          </PoemColumn>
        )}

        {/* Scrim over the bottom of the reading surface so verses dissolve before they reach the
            action buttons rather than being sliced by them. Sits above the scroller and below the
            buttons, and is drawn here rather than as a mask on the scroller so the quill's caption
            never fades out at the moment the reader arrives at it. */}
        {!inInsight && (
          <div
            className="pc-scrim"
            aria-hidden="true"
            style={{
              background: darkMode
                ? 'linear-gradient(to bottom, rgba(10,10,15,0) 0%, rgba(10,10,15,0.82) 52%, rgba(10,10,15,0.96) 100%)'
                : 'linear-gradient(to bottom, rgba(250,248,243,0) 0%, rgba(250,248,243,0.86) 52%, rgba(250,248,243,0.97) 100%)',
            }}
          />
        )}

        {/* Insight view: a title card over an essay. Header and body are flex siblings sharing one
            measure, NOT an absolute header over a body that hand-reserves room for it — the old
            108px reservation was 6px shy of the header's real height, so the section label landed
            on the byline. A flex row that shrinks to its content cannot drift out of agreement.
            It also drops the reading view's .pc-head/.pc-ttl-en classes: those encode the poem
            column's flush-right axis, which exists to align Latin rows to the Arabic verses. There
            are no verses here, just centred prose, so the header centres with it. */}
        {inInsight && (
          <div className="w-full h-full flex flex-col">
            <div
              data-testid="insight-header"
              className="shrink-0 w-full max-w-xl mx-auto px-4 text-center"
              style={{ paddingTop: 22 }}
            >
              {/* Kicker. It was the most functional text on the screen — it names which insight
                  you are reading — and it was the quietest, tucked under the byline. Leading the
                  card gives it a job the eye can find without making it loud. */}
              <div
                className="font-brand-en"
                style={{
                  fontSize: '0.625rem',
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: goldColor,
                  opacity: 0.72,
                  marginBottom: 12,
                }}
              >
                {INSIGHT_LABELS[endStage]}
              </div>

              {/* Primary. line-height is explicit because Reem Kufi's diacritics overrun a default
                  line box at this size and were being clipped by the top of the screen. */}
              <div
                lang="ar"
                dir="rtl"
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: `calc(1.75rem * ${textScale})`,
                  lineHeight: 1.4,
                  color: goldColor,
                  margin: '0 0 6px',
                }}
              >
                {poem?.titleArabic || poem?.title}
              </div>

              {/* Subordinate. Was 0.82rem of near-white at 0.88 alpha, which outshouted the gold
                  title above it: uppercase Latin at high contrast beats larger gold every time. */}
              {poem?.title && poem.title !== poem?.titleArabic && (
                <div
                  className="font-brand-en"
                  dir="ltr"
                  style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    lineHeight: 1.5,
                    color: enTitleColor,
                    opacity: 0.6,
                    margin: '0 0 8px',
                  }}
                >
                  {poem.title}
                </div>
              )}

              {/* Quiet. The Arabic poet name was 1.0625rem, larger than the English title it sat
                  under, which is part of why the stack read as four competing rows. */}
              <div
                className="font-brand-en"
                dir="ltr"
                style={{ fontSize: '0.8rem', color: 'rgba(212,180,99,0.72)' }}
              >
                <span
                  lang="ar"
                  style={{ fontFamily: "'Reem Kufi', sans-serif", fontSize: '0.9rem' }}
                >
                  {poem?.poetArabic || poem?.poet}
                </span>
                {poem?.poet && poem?.poetArabic && poem.poet !== poem.poetArabic && (
                  <span> · {poem.poet}</span>
                )}
              </div>

              {/* Ends the header rather than letting it bleed into the prose. Fades at both ends so
                  it reads as a breath, not a box edge. */}
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  margin: '18px 0 0',
                  background: `linear-gradient(to right, transparent, ${
                    darkMode ? 'rgba(197,160,89,0.28)' : 'rgba(139,100,48,0.3)'
                  }, transparent)`,
                }}
              />
            </div>

            <div
              ref={insightWrapRef}
              className="flex-1 min-h-0 w-full max-w-xl mx-auto px-4 flex items-center"
              data-insight-ui
              // paddingTop, not just the rule's own margin: `items-center` only holds prose off the
              // header while the prose is short enough to centre. A full-length insight fills the
              // box and starts flush against the hairline, which is the cramped seam this pass is
              // meant to remove.
              style={{ paddingTop: 20, paddingBottom: 32 }}
            >
              <InlineInsights
                stage={endStage}
                darkMode={darkMode}
                isInterpreting={isInterpreting}
                insightParts={insightParts}
                interpretation={interpretation}
                animate={!seenStages[endStage]}
                onProgress={onInsightProgress}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons — same position in every state, but they yield to the quill at the end of
          the poem (see actionsDimmed). */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-2 px-4"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
          zIndex: 5,
          opacity: actionsDimmed ? 0.2 : 1,
          transition: 'opacity 0.45s ease',
        }}
      >
        {isActive && (
          <div className="w-full" style={{ maxWidth: ACTIONS_MAX_WIDTH }}>
            <ReaderActions
              mode={mode}
              poemId={poemId}
              hasAuthor={hasAuthor}
              isPlaying={isPlaying}
              isGeneratingAudio={isGeneratingAudio}
              onSeeMeaning={handleSeeMeaning}
              onSeeAuthor={handleSeeAuthor}
              onBackToPoem={handleBackToPoem}
              onBackToInsights={handleBackToInsights}
              onShare={onShare}
              onListen={handleListen}
              onTogglePlay={onTogglePlay}
              onPrevVerse={onPrev}
              onNextVerse={onNext}
            />
          </div>
        )}
      </div>

      {/* Progress hairline (D7/D9) — 2px right-edge line over the live scroller. Only on the
          active column so the stacked-but-hidden readers don't all hold listeners. */}
      {isActive && (
        <ScrollHairline getScroller={getHairlineScroller} source={`${poemId}:${endStage}`} />
      )}
    </div>
  );
});

export default PoemReader;
