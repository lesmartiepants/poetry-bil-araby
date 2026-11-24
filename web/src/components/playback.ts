// The playback store shared by the reader and the player. State comes from
// the pure machine in core; the listening feature's engine drives it.
import { create } from 'zustand';
import { initialPlayback, playbackReducer, type PlaybackEvent, type PlaybackState } from '@core/logic/playback';

interface S extends PlaybackState { send: (e: PlaybackEvent) => void }
export const usePlayback = create<S>((set, get) => ({
  ...initialPlayback(),
  send: (e) => {
    const { send: _send, ...state } = get();
    set(playbackReducer(state, e));
  },
}));
