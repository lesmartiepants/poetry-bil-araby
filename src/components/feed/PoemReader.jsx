import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PoemColumn from './PoemColumn.jsx';
import PoemSeal, { useSummon } from './PoemSeal.jsx';
import InlineInsights from './InlineInsights.jsx';
import ReaderActions from './ReaderActions.jsx';
import ScrollHairline from './ScrollHairline.jsx';
import '../../styles/reader-actions.css';
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
    if (done && endStage !== 'idle') {
      setSeenStages((s) => (s[endStage] ? s : { ...s, [endStage]: true }));
    }
  };

  // A sustained pull past the end of the poem charges the same summon the quill drives. A flick
  // lifts early, so endCharge sees an incomplete charge and decays it: nothing happens. Only a
  // sustained pull reaches 1 while still down, which is what keeps summoning a decision.
  const handleOverPull = useCallback(
    ({ distance, phase }) => {
      if (!summon || !isActive) return;
      if (phase === 'move') summon.setCharge(distance / PULL_NEED);
      else summon.endCharge();
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
          >
            {/* The quill lives inside the column so it scrolls with the poem: it exists only at
                the end, where the reader has arrived deliberately. */}
            {isActive && <PoemSeal />}
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

        {inInsight && (
          <div
            ref={insightWrapRef}
            className="w-full max-w-xl mx-auto h-full flex items-center"
            data-insight-ui
            style={{ paddingBottom: 32 }}
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
        )}
      </div>

      {/* Action buttons — same position in every state. */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-2 px-4"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
          zIndex: 5,
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
