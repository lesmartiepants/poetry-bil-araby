// The playback store shared by the reader and the player. State comes from
// the pure machine in core; the listening feature's engine drives it.
import { DEV_PANEL_ENABLED, logEvent, type DevEvent } from './devlog';
import { create } from 'zustand';
import {
  initialPlayback,
  playbackReducer,
  type PlaybackEvent,
  type PlaybackState,
} from '@core/logic/playback';

const playbackMessages = {
  PLAY: ['user', 'Tapped Listen'],
  LOADED: ['success', 'Recitation ready'],
  PAUSE: ['user', 'Paused recitation'],
  RESUME: ['user', 'Resumed recitation'],
  STALL: ['error', 'Recitation stalled'],
  LOAD_FAILED: ['error', 'Recitation failed to load'],
  SEEK_LINE: ['user', 'Played from a different line'],
  SWITCH_VOICE: ['user', 'Changed reciter'],
  VOICE_FAILED: ['warning', 'Voice unavailable. Kept the previous voice.'],
  ENDED: ['success', 'Recitation ended'],
  STOP: ['event', 'Recitation stopped'],
} as const satisfies Record<
  Exclude<PlaybackEvent['type'], 'TICK'>,
  readonly [DevEvent['kind'], string]
>;

interface S extends PlaybackState {
  send: (e: PlaybackEvent) => void;
}
export const usePlayback = create<S>((set, get) => ({
  ...initialPlayback(),
  send: (e) => {
    const { send: _send, ...state } = get();
    const next = playbackReducer(state, e);
    set(next);
    if (
      !DEV_PANEL_ENABLED ||
      next === state ||
      e.type === 'TICK' ||
      (!next.poemId && !state.poemId)
    )
      return;
    const [kind, message] = playbackMessages[e.type];
    const { poemId, voice, line } = next.poemId ? next : state;
    logEvent({
      kind,
      source: 'app',
      label: 'Playback',
      text: `${message} · poem ${poemId} · ${voice} · line ${line + 1}`,
    });
  },
}));
