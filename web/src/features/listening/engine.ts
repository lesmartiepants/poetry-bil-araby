// Turns playback state into sound. Mock source: a timer walks the words.
// Live source (V1.4): /api/ai/live-tts with word timings.
import { useEffect } from 'react';
import { usePlayback } from '@components/playback';
import { sourceOf } from '@core/sources';
import { words } from '@core/logic/arabic';
import type { Poem } from '@core/types';

const WORD_MS = 420;

export function useEngine(poem: Poem | undefined) {
  const { status, line, word, poemId, voice, hasTimings, send } = usePlayback();
  // loading → playing (mock fetch). A voice named in localStorage 'mock.failVoice' fails, to show 3.11.
  useEffect(() => {
    if (status !== 'loading' || !poem || poemId !== poem.id) return;
    const t = window.setTimeout(() => {
      if (sourceOf('tts') === 'mock') {
        if (localStorage.getItem('mock.ttsFail') === '1') return send({ type: 'LOAD_FAILED' });
        const failing = localStorage.getItem('mock.failVoice');
        if (failing && failing === voice) {
          const prev = localStorage.getItem('mock.prevVoice') ?? 'Zephyr';
          return send({ type: 'VOICE_FAILED', voice, previous: prev });
        }
        send({ type: 'LOADED', hasTimings: localStorage.getItem('mock.noTimings') !== '1' });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [status, poem, poemId, voice, send]);

  // playing: advance word by word, line by line.
  useEffect(() => {
    if (status !== 'playing' || !poem || poemId !== poem.id) return;
    const count = words(poem.lines[line]?.ar ?? '').length;
    if (!hasTimings) {
      // Verse fallback (3.10): no word timing, so move a line at a time.
      const t = window.setTimeout(() => {
        if (line + 1 < poem.lines.length) send({ type: 'TICK', line: line + 1, word: -1 });
        else send({ type: 'ENDED' });
      }, count * WORD_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      const w = Math.max(word, 0);
      if (w + 1 < count) send({ type: 'TICK', line, word: w + 1 });
      else if (line + 1 < poem.lines.length) send({ type: 'TICK', line: line + 1, word: 0 });
      else send({ type: 'ENDED' });
    }, WORD_MS);
    return () => window.clearTimeout(t);
  }, [status, poem, poemId, line, word, hasTimings, send]);
}
