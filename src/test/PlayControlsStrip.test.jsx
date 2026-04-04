import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayControlsStrip from '../components/PlayControlsStrip';
import { useUIStore } from '../stores/uiStore';

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

// Mock useTTSHighlight — only startPlayer and pauseOffset are used by the strip
const mockStartPlayer = vi.fn();
vi.mock('../hooks/useTTSHighlight', () => ({
  startPlayer: (...args) => mockStartPlayer(...args),
  pauseOffset: 0,
}));

// Minimal mock player object
const mockPlayer = { start: vi.fn(), stop: vi.fn() };

const VERSE_TIMES = [0, 12.5, 25.0, 40.0];

beforeEach(() => {
  useUIStore.getState().reset();
  mockStartPlayer.mockClear();
  mockPlayer.start.mockClear();
  mockPlayer.stop.mockClear();
});

describe('PlayControlsStrip — visibility', () => {
  it('is hidden when highlightStyle is "none"', () => {
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
    // AnimatePresence is mocked; when style is none the strip should not render
    expect(container.firstChild).toBeNull();
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

  it('Prev is disabled at first verse', () => {
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
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
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
