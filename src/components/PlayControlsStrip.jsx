import { motion } from 'framer-motion';
import { SkipBack, Play, Pause, SkipForward, Loader2 } from 'lucide-react';
import { startPlayer, pauseOffset, playbackStartTime } from '../hooks/useTTSHighlight';
import { useAudioStore } from '../stores/audioStore';
import { useUIStore } from '../stores/uiStore';

/**
 * PlayControlsStrip — transport bar above the footer controls.
 *
 * Props:
 *   player            {object}   Tone.Player instance
 *   isPlaying         {boolean}
 *   isLoading         {boolean}  Audio generation in progress — shows spinner
 *   verseStartTimes   {number[]} Array of verse start offsets in seconds
 *   currentVerseIndex {number}   Index of the currently active verse
 *   onPlayPause       {function} Callback to toggle play/pause in the parent
 */
const PlayControlsStrip = ({
  player,
  isPlaying,
  isLoading = false,
  verseStartTimes = [],
  currentVerseIndex = 0,
  onPlayPause,
}) => {
  const seek = (offset) => {
    // Read live store state BEFORE stop() — the isPlaying prop is stale
    // (onstop fires and updates the store, but this closure captured the old prop)
    const wasPlaying = useAudioStore.getState().isPlaying;
    useUIStore.getState().addLog('Playback', `⏩ Seek to ${offset.toFixed(2)}s | wasPlaying: ${wasPlaying}`, 'user');
    try { player.stop(); } catch {}
    if (wasPlaying) {
      startPlayer(player, offset);
      useAudioStore.getState().setPlaying(true);
    } else {
      // Paused — update position only, don't start
      pauseOffset.value = offset;
      playbackStartTime.value = Date.now() / 1000;
    }
  };

  const handlePrev = () => {
    const offset = currentVerseIndex > 0 ? verseStartTimes[currentVerseIndex - 1] : 0;
    seek(offset);
  };

  const handleNext = () => {
    const nextIndex = currentVerseIndex + 1;
    if (nextIndex < verseStartTimes.length) seek(verseStartTimes[nextIndex]);
  };

  return (
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
      {/* Prev verse — restarts from beginning at verse 0 */}
      <button
        aria-label="Prev verse"
        onClick={handlePrev}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/10"
        style={{ color: 'var(--gold, #c9a84c)' }}
      >
        <SkipBack size={16} />
      </button>

      {/* Play / Pause / Loading */}
      <button
        aria-label={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
        onClick={onPlayPause}
        disabled={isLoading}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-white/10 disabled:opacity-50"
        style={{ color: 'var(--gold, #c9a84c)' }}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isPlaying ? (
          <Pause size={18} />
        ) : (
          <Play size={18} />
        )}
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
  );
};

export default PlayControlsStrip;
