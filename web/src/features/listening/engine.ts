// Turns playback state into sound. Mock source: a timer walks the words.
// Live source (V7): the server's recitation (Gemini audio, one file per poem and voice) plays in an
// <audio> element; the line follows the clock. There are no word timings, so the reader highlights by verse.
import { useEffect, useRef } from 'react';
import { usePlayback } from '@components/playback';
import { usePrefs } from '@core/hooks';
import { api } from '@core/api';
import { sourceOf } from '@core/sources';
import { words } from '@core/logic/arabic';
import type { Poem } from '@core/types';

const WORD_MS = 420;
const BREATH_MS = 900; // pauseLines: the rest after each bayt

let audio: HTMLAudioElement | null = null;
let loaded: { poemId: string; voice: string; starts: number[]; objectUrl: string } | null = null;

/** A tenth of a second of silence. Playing it inside the tap that starts listening unlocks the element on iOS Safari. */
function silence() {
  const n = 2400;
  const b = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o: number, t: string) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 24000, true); b.setUint32(28, 48000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
const element = () => (audio ??= Object.assign(new Audio(), { preload: 'auto' }));
const lineAt = (starts: number[], t: number) => starts.reduce((acc, s, i) => (s <= t + 0.05 ? i : acc), 0);

/** Fetches the recitation as a blob (so seeking never depends on range requests) and waits until it can play. */
async function loadRecitation(poemId: string, voice: string) {
  const r = await api.tts.recitation(poemId, voice);
  if (!r.url) throw new Error('no audio');
  const res = await fetch(r.url);
  if (!res.ok) throw new Error(`audio ${res.status}`);
  const objectUrl = URL.createObjectURL(await res.blob());
  const a = element();
  await new Promise<void>((ok, bad) => {
    a.onloadedmetadata = () => ok();
    a.onerror = () => bad(new Error('audio decode'));
    a.src = objectUrl;
    a.load();
  });
  if (loaded) URL.revokeObjectURL(loaded.objectUrl);
  loaded = { poemId, voice, starts: r.lineStarts, objectUrl };
}

export function useEngine(poem: Poem | undefined) {
  const { status, line, word, poemId, voice, hasTimings, send } = usePlayback();
  const pauseLines = usePrefs().data?.pauseLines ?? false;
  const lineRef = useRef(line);
  lineRef.current = line;
  const breath = useRef<number | null>(null);
  const live = sourceOf('tts') === 'live';

  // Live: loading → fetch the recitation (once per poem and voice), put the clock on the wanted line, then play.
  useEffect(() => {
    if (!live || status !== 'loading' || !poem || poemId !== poem.id) return;
    let dead = false;
    const a = element();
    const silent = silence();
    if (!loaded || loaded.poemId !== poem.id || loaded.voice !== voice) {
      a.src = silent;
      a.play().catch(() => undefined);
    }
    (async () => {
      if (!loaded || loaded.poemId !== poem.id || loaded.voice !== voice) await loadRecitation(poem.id, voice);
      if (dead || !loaded) return;
      a.currentTime = loaded.starts[lineRef.current] ?? 0;
      send({ type: 'LOADED', hasTimings: false });
    })().catch(() => { if (!dead) send({ type: 'LOAD_FAILED' }); }).finally(() => URL.revokeObjectURL(silent));
    return () => { dead = true; };
  }, [live, status, poem, poemId, voice, send]);

  // Live: play and pause follow the status; the verse follows the clock.
  useEffect(() => {
    if (!live || !poem || poemId !== poem.id) return;
    const a = element();
    if (status !== 'playing') {
      if (breath.current) { window.clearTimeout(breath.current); breath.current = null; }
      if (status !== 'loading') a.pause();
      return;
    }
    a.play().catch(() => send({ type: 'STALL' }));
    const onEnded = () => send({ type: 'ENDED' });
    const onStall = () => send({ type: 'STALL' });
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onStall);
    const tick = window.setInterval(() => {
      if (!loaded || breath.current) return;
      const at = lineAt(loaded.starts, a.currentTime);
      if (at <= lineRef.current) return;
      send({ type: 'TICK', line: at, word: -1 });
      if (pauseLines && !a.ended) {
        a.pause();
        breath.current = window.setTimeout(() => { breath.current = null; void a.play().catch(() => send({ type: 'STALL' })); }, BREATH_MS);
      }
    }, 80);
    return () => { window.clearInterval(tick); a.removeEventListener('ended', onEnded); a.removeEventListener('error', onStall); };
  }, [live, status, poem, poemId, pauseLines, send]);

  // Leaving the player stops the sound.
  useEffect(() => () => { if (live) { element().pause(); if (breath.current) window.clearTimeout(breath.current); } }, [live]);

  // loading → playing (mock fetch). A voice named in localStorage 'mock.failVoice' fails, to show 3.11.
  useEffect(() => {
    if (live || status !== 'loading' || !poem || poemId !== poem.id) return;
    const t = window.setTimeout(() => {
      {
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
  }, [live, status, poem, poemId, voice, send]);

  // playing: advance word by word, line by line.
  // 'mock.stall' in localStorage stalls once on reaching line 2, to show 3.9.
  const stalled = useRef(false);
  useEffect(() => {
    if (live || status !== 'playing' || !poem || poemId !== poem.id) return;
    if (line === 1 && !stalled.current && localStorage.getItem('mock.stall') === '1') {
      stalled.current = true;
      send({ type: 'STALL' });
      return;
    }
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
  }, [live, status, poem, poemId, line, word, hasTimings, send]);
}
