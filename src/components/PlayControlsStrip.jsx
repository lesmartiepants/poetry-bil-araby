import { AnimatePresence, motion } from 'framer-motion';
import { SkipBack, Play, Pause, SkipForward } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { startPlayer } from '../hooks/useTTSHighlight';

/**
 * PlayControlsStrip — floating transport bar above the poem.
 *
 * Props:
 *   player           {object}   Tone.Player instance
 *   isPlaying        {boolean}
 *   verseStartTimes  {number[]} Array of verse start offsets in seconds
 *   currentVerseIndex {number}  Index of the currently active verse
 *   onPlayPause      {function} Callback to toggle play/pause in the parent
 */
const PlayControlsStrip = ({
  player,
  isPlaying,
  verseStartTimes = [],
  currentVerseIndex = 0,
  onPlayPause,
}) => {
  const highlightStyle = useUIStore((s) => s.highlightStyle);
  const isVisible = highlightStyle !== 'none' && player != null;

  const handlePrev = () => {
    const prevIndex = currentVerseIndex - 1;
    if (prevIndex >= 0) {
      startPlayer(player, verseStartTimes[prevIndex]);
    }
  };

  const handleNext = () => {
    const nextIndex = currentVerseIndex + 1;
    if (nextIndex < verseStartTimes.length) {
      startPlayer(player, verseStartTimes[nextIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="play-controls-strip"
          data-testid="play-controls-strip"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/10 bg-black/40"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
        >
          {/* Prev verse */}
          <button
            aria-label="Prev verse"
            onClick={handlePrev}
            disabled={currentVerseIndex <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-30 hover:bg-white/10"
            style={{ color: 'var(--gold, #c9a84c)' }}
          >
            <SkipBack size={16} />
          </button>

          {/* Play / Pause */}
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={onPlayPause}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-white/10"
            style={{ color: 'var(--gold, #c9a84c)' }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Next verse */}
          <button
            aria-label="Next verse"
            onClick={handleNext}
            disabled={currentVerseIndex >= verseStartTimes.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-30 hover:bg-white/10"
            style={{ color: 'var(--gold, #c9a84c)' }}
          >
            <SkipForward size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlayControlsStrip;
