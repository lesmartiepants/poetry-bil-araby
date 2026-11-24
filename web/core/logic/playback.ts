// The playback engine's state machine: events in, state out. No audio here;
// an adapter in the app turns state into sound.
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stalled' | 'error';

export interface PlaybackState {
  status: PlaybackStatus;
  poemId: string | null;
  voice: string;
  line: number; // current verse line
  word: number; // current word in the line, -1 when timings are missing
  lineCount: number;
  hasTimings: boolean;
  error?: 'load' | 'stopped' | 'voice';
  failedVoice?: string;
}

export type PlaybackEvent =
  | { type: 'PLAY'; poemId: string; lineCount: number; voice: string; fromLine?: number }
  | { type: 'LOADED'; hasTimings: boolean }
  | { type: 'TICK'; line: number; word: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STALL' }
  | { type: 'LOAD_FAILED' }
  | { type: 'SEEK_LINE'; line: number }
  | { type: 'SWITCH_VOICE'; voice: string }
  | { type: 'VOICE_FAILED'; voice: string; previous: string }
  | { type: 'ENDED' }
  | { type: 'STOP' };

export const initialPlayback = (voice = 'Zephyr'): PlaybackState => ({
  status: 'idle', poemId: null, voice, line: 0, word: -1, lineCount: 0, hasTimings: true,
});

export function playbackReducer(s: PlaybackState, e: PlaybackEvent): PlaybackState {
  switch (e.type) {
    case 'PLAY':
      return { ...s, status: 'loading', poemId: e.poemId, lineCount: e.lineCount, voice: e.voice, line: e.fromLine ?? 0, word: -1, error: undefined };
    case 'LOADED':
      return s.status === 'loading' ? { ...s, status: 'playing', hasTimings: e.hasTimings } : s;
    case 'TICK':
      return s.status === 'playing' ? { ...s, line: e.line, word: s.hasTimings ? e.word : -1 } : s;
    case 'PAUSE':
      return s.status === 'playing' ? { ...s, status: 'paused' } : s;
    case 'RESUME':
      return s.status === 'paused' || s.status === 'stalled' ? { ...s, status: 'playing', error: undefined } : s;
    case 'STALL':
      return s.status === 'playing' ? { ...s, status: 'stalled', error: 'stopped' } : s;
    case 'LOAD_FAILED':
      return { ...s, status: 'error', error: 'load' };
    case 'SEEK_LINE':
      if (!s.poemId) return s;
      return { ...s, status: 'loading', line: Math.max(0, Math.min(e.line, s.lineCount - 1)), word: -1 };
    case 'SWITCH_VOICE':
      // Switching restarts the current line in the new voice.
      return s.poemId ? { ...s, status: 'loading', voice: e.voice, word: -1, failedVoice: undefined } : { ...s, voice: e.voice };
    case 'VOICE_FAILED':
      return { ...s, status: 'playing', voice: e.previous, failedVoice: e.voice };
    case 'ENDED':
      return { ...s, status: 'idle', line: Math.max(0, s.lineCount - 1), word: -1 };
    case 'STOP':
      return { ...initialPlayback(s.voice) };
    default:
      return s;
  }
}
