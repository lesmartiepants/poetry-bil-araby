import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayControlsStrip from '../components/PlayControlsStrip';
import { useUIStore } from '../stores/uiStore';
import { useAudioStore } from '../stores/audioStore';

// Mock framer-motion AnimatePresence + motion so tests work without the full library
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        (_, tag) =>
        ({ children, ...rest }) => {
          const { initial, animate, exit, transition, ...domProps } = rest;
          return createElement(tag, domProps, children);
        },
    }
  ),
}));

// Import createElement after the mock so it's available in the proxy factory
import { createElement } from 'react';

// Mock useTTSHighlight — the strip imports startPlayer, pauseOffset, playbackStartTime,
// isSeeking and applyHighlightsOnce. The signal-like values must be objects with a
// settable `.value` because seek() assigns to them (e.g. `pauseOffset.value = offset`).
const mockStartPlayer = vi.fn();
const mockApplyHighlightsOnce = vi.fn();
vi.mock('../hooks/useTTSHighlight', () => ({
  startPlayer: (...args) => mockStartPlayer(...args),
  applyHighlightsOnce: (...args) => mockApplyHighlightsOnce(...args),
  pauseOffset: { value: 0 },
  playbackStartTime: { value: 0 },
  isSeeking: { value: false },
}));

// Minimal mock player object
const mockPlayer = { start: vi.fn(), stop: vi.fn() };

const VERSE_TIMES = [0, 12.5, 25.0, 40.0];

beforeEach(() => {
  useUIStore.getState().reset();
  useAudioStore.getState().reset();
  mockStartPlayer.mockClear();
  mockApplyHighlightsOnce.mockClear();
  mockPlayer.start.mockClear();
  mockPlayer.stop.mockClear();
});

describe('PlayControlsStrip — visibility', () => {
  it('renders its transport regardless of highlightStyle (parent gates visibility)', () => {
    // The strip itself does not read highlightStyle — the parent (app.jsx) only mounts
    // it when highlightStyle !== 'none'. So when rendered directly it always shows.
    useUIStore.getState().setHighlightStyle('none');
    const { container } = render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={false}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={vi.fn()}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('renders when highlightStyle is active and player is loaded', () => {
    useUIStore.getState().setHighlightStyle('glow');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={false}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={1}
        onPlayPause={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('renders when highlightStyle is "pill"', () => {
    useUIStore.getState().setHighlightStyle('pill');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={true}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});

describe('PlayControlsStrip — play/pause button', () => {
  it('shows play icon when isPlaying=false', () => {
    useUIStore.getState().setHighlightStyle('glow');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={false}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('shows pause icon when isPlaying=true', () => {
    useUIStore.getState().setHighlightStyle('glow');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={true}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button is clicked', () => {
    const onPlayPause = vi.fn();
    useUIStore.getState().setHighlightStyle('glow');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={false}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={onPlayPause}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });
});

describe('PlayControlsStrip — prev/next verse navigation', () => {
  it('calls startPlayer with previous verse time when Prev is clicked', () => {
    useUIStore.getState().setHighlightStyle('glow');
    // seek() reads wasPlaying from the audio store (the isPlaying prop is stale by the
    // time onstop fires), so the store must report playing for it to restart playback.
    useAudioStore.getState().setPlaying(true);
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={true}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={2}
        onPlayPause={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(mockStartPlayer).toHaveBeenCalledWith(mockPlayer, VERSE_TIMES[1]);
  });

  it('calls startPlayer with next verse time when Next is clicked', () => {
    useUIStore.getState().setHighlightStyle('glow');
    useAudioStore.getState().setPlaying(true);
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={true}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={1}
        onPlayPause={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(mockStartPlayer).toHaveBeenCalledWith(mockPlayer, VERSE_TIMES[2]);
  });

  it('Prev stays enabled at first verse and restarts from the beginning', () => {
    useUIStore.getState().setHighlightStyle('glow');
    // seek() restarts playback only when the store reports playing.
    useAudioStore.getState().setPlaying(true);
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={true}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={0}
        onPlayPause={vi.fn()}
      />
    );
    // Prev is intentionally NOT disabled at verse 0 — it restarts from the start.
    const prev = screen.getByRole('button', { name: /prev/i });
    expect(prev).not.toBeDisabled();
    fireEvent.click(prev);
    expect(mockStartPlayer).toHaveBeenCalledWith(mockPlayer, 0);
  });

  it('Next is disabled at last verse', () => {
    useUIStore.getState().setHighlightStyle('glow');
    render(
      <PlayControlsStrip
        player={mockPlayer}
        isPlaying={false}
        verseStartTimes={VERSE_TIMES}
        currentVerseIndex={3}
        onPlayPause={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
