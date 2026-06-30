import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import '../../styles/reader-actions.css';

/* ── transport icons (inline SVG so they render consistently) ── */
const IconPrev = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5h2v14H7z" />
    <path d="M20 5L9 12l11 7z" />
  </svg>
);
const IconNext = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15 5h2v14h-2z" />
    <path d="M4 5l11 7-11 7z" />
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 4l14 8-14 8z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
const IconSpinner = () => (
  <svg
    className="ra-spin"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    aria-hidden="true"
  >
    <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
  </svg>
);

/**
 * ReaderActions — the two-button bottom chrome that replaces the old "tap to continue" prompt.
 * Design: "Molten Gold × Option-2 transport" (design-sprint winner). State-driven:
 *
 *   reading  → [Listen]            [Next Verse]
 *   idle     → [Listen]            [Poem Insights]
 *   meaning  → [Back to Poem]      [Author Insights]  (or [Share] when the poem has no bio)
 *   author   → [Back to Insights]  [Share]
 *
 * Tapping Listen starts playback and morphs the left pill into a transport (⏮ ▶/⏸ ⏭).
 * Right is always the primary/forward action. Buttons-only — the poem body no longer advances.
 */
export default function ReaderActions({
  mode, // 'reading' | 'idle' | 'meaning' | 'author'
  poemId,
  isRevealing = false,
  hasAuthor = false,
  isPlaying = false,
  isGeneratingAudio = false,
  onAdvance,
  onSeeMeaning,
  onSeeAuthor,
  onBackToPoem,
  onBackToInsights,
  onShare,
  onListen,
  onTogglePlay,
  onPrevVerse,
  onNextVerse,
}) {
  const [listenActive, setListenActive] = useState(false);
  const actionWeight = useUIStore((s) => s.actionWeight);

  // Reset the transport back to a plain "Listen" pill on poem change.
  useEffect(() => {
    setListenActive(false);
  }, [poemId]);

  const handleListen = () => {
    setListenActive(true);
    onListen?.();
  };

  const reading = mode === 'reading';
  const idle = mode === 'idle';
  const onPoem = reading || idle;
  const showTransport = onPoem && (listenActive || isPlaying || isGeneratingAudio);

  // ── left half ──
  let left;
  if (showTransport) {
    left = (
      <div className="ra-transport" role="group" aria-label="Playback controls">
        <button className="ra-disc ra-disc-ghost" onClick={onPrevVerse} aria-label="Previous verse">
          <IconPrev />
        </button>
        <button
          className="ra-disc ra-disc-play"
          onClick={onTogglePlay}
          aria-label={isGeneratingAudio ? 'Preparing audio' : isPlaying ? 'Pause' : 'Play'}
        >
          {isGeneratingAudio ? <IconSpinner /> : isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button className="ra-disc ra-disc-ghost" onClick={onNextVerse} aria-label="Next verse">
          <IconNext />
        </button>
      </div>
    );
  } else if (onPoem) {
    left = (
      <button
        className="ra-btn ra-btn-secondary"
        onClick={handleListen}
        aria-label="Start recitation"
      >
        <span className="ra-label">Listen</span>
      </button>
    );
  } else if (mode === 'meaning') {
    left = (
      <button className="ra-btn ra-btn-secondary" onClick={onBackToPoem}>
        <span className="ra-label">Back to Poem</span>
      </button>
    );
  } else {
    left = (
      <button className="ra-btn ra-btn-secondary" onClick={onBackToInsights}>
        <span className="ra-label">Back to Insights</span>
      </button>
    );
  }

  // ── right half (primary / forward) ──
  let right;
  if (reading) {
    right = (
      <button className="ra-btn ra-btn-primary" onClick={onAdvance} disabled={isRevealing}>
        <span className="ra-label">Next Verse</span>
      </button>
    );
  } else if (idle) {
    right = (
      <button className="ra-btn ra-btn-primary" onClick={onSeeMeaning}>
        <span className="ra-label">Poem Insights</span>
      </button>
    );
  } else if (mode === 'meaning' && hasAuthor) {
    // Always enabled — the reader can jump to the author note at any point on the meaning screen,
    // even while it's still revealing (it loads/animates on arrival just like the meaning did).
    right = (
      <button className="ra-btn ra-btn-primary" onClick={onSeeAuthor}>
        <span className="ra-label">Author Insights</span>
      </button>
    );
  } else {
    // author stage, or meaning stage with no bio → Share is the forward action
    right = (
      <button className="ra-btn ra-btn-primary" onClick={onShare}>
        <span className="ra-label">Share</span>
      </button>
    );
  }

  return (
    <div className="reader-actions" data-weight={actionWeight} data-testid="reader-actions">
      {left}
      {right}
    </div>
  );
}
