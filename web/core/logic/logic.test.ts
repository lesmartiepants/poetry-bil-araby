import { describe, expect, it } from 'vitest';
import { deriveBands } from './bands';
import { autoIconLetter, iconLetterChoices, iconLetterOf } from './iconLetter';
import { DEFAULT_PREFS, mergePrefs } from './prefs';
import { splitForCards } from './cards';
import { normalizeArabic, stripMarks } from './arabic';
import { initialPlayback, playbackReducer } from './playback';

describe('difficulty bands', () => {
  it('cuts a clustered histogram into three roughly equal thirds, easy to hard', () => {
    const h = [
      { min: 0, max: 1, poemCount: 300 }, { min: 1, max: 2, poemCount: 300 }, { min: 2, max: 3, poemCount: 200 },
      { min: 3, max: 5, poemCount: 100 }, { min: 5, max: 8.3, poemCount: 100 },
    ];
    const b = deriveBands(h);
    expect(b.map((x) => x.key)).toEqual(['gentle', 'measured', 'demanding']);
    expect(b.reduce((n, x) => n + x.poemCount, 0)).toBe(1000);
    expect(b[0].max).toBeLessThanOrEqual(b[1].min + 0.0001);
  });
  it('returns nothing without data', () => expect(deriveBands([])).toEqual([]));
});

describe('list icon letter', () => {
  it('maps the first Latin letter to the nearest Arabic letter', () => {
    expect(autoIconLetter('Longing for home')).toBe('ل');
    expect(autoIconLetter('For Nour')).toBe('ف');
    expect(autoIconLetter('Courage')).toBe('ك');
    expect(autoIconLetter('Poems')).toBe('ب');
  });
  it('uses an Arabic name’s own first letter', () => expect(autoIconLetter('أحلام')).toBe('ا'));
  it('offers the other words’ letters without repeats', () =>
    expect(iconLetterChoices('To learn by heart')).toEqual(['ت', 'ل', 'ب', 'ه']));
  it('a chosen letter wins over the automatic one', () =>
    expect(iconLetterOf({ name: 'For Nour', iconLetter: 'ن' })).toBe('ن'));
});

describe('settings merge', () => {
  it('lays your choices over the defaults and drops junk', () => {
    const p = mergePrefs(DEFAULT_PREFS, { font: 'naskh', textSize: 5, page: 'parchment', bogus: 1 } as never);
    expect(p.font).toBe('naskh');
    expect(p.textSize).toBe(5);
    expect(p.voice).toBe(DEFAULT_PREFS.voice);
    expect('bogus' in p).toBe(false);
  });
});

describe('share card splitting', () => {
  it.each([
    [4, [4]], [6, [6]], [7, [4, 3]], [8, [4, 4]], [10, [6, 4]], [13, [4, 4, 4, 1]],
  ])('%i lines → %j', (n, out) => expect(splitForCards(n)).toEqual(out));
});

describe('arabic text', () => {
  it('strips vowel marks and normalises for search', () => {
    expect(stripMarks('أَمُرُّ عَلى')).toBe('أمر على');
    expect(normalizeArabic('أَمُرُّ عَلى الدِيارِ')).toBe('امر علي الديار');
  });
});

describe('playback state machine', () => {
  const play = playbackReducer(initialPlayback(), { type: 'PLAY', poemId: 'p1', lineCount: 4, voice: 'Zephyr' });
  const playing = playbackReducer(play, { type: 'LOADED', hasTimings: true });
  it('loads, then plays', () => {
    expect(play.status).toBe('loading');
    expect(playing.status).toBe('playing');
  });
  it('switching voice restarts the current line in the new voice', () => {
    const at2 = playbackReducer(playing, { type: 'TICK', line: 2, word: 3 });
    const sw = playbackReducer(at2, { type: 'SWITCH_VOICE', voice: 'Orus' });
    expect(sw).toMatchObject({ status: 'loading', voice: 'Orus', line: 2, word: -1 });
  });
  it('a failed voice keeps the previous one and says which failed', () => {
    const f = playbackReducer(playing, { type: 'VOICE_FAILED', voice: 'Leda', previous: 'Zephyr' });
    expect(f).toMatchObject({ status: 'playing', voice: 'Zephyr', failedVoice: 'Leda' });
  });
  it('without word timings the word stays at -1 (verse highlight)', () => {
    const noT = playbackReducer(play, { type: 'LOADED', hasTimings: false });
    expect(playbackReducer(noT, { type: 'TICK', line: 1, word: 2 }).word).toBe(-1);
  });
  it('a stall can resume; seeking clamps to the poem', () => {
    const st = playbackReducer(playing, { type: 'STALL' });
    expect(st.status).toBe('stalled');
    expect(playbackReducer(st, { type: 'RESUME' }).status).toBe('playing');
    expect(playbackReducer(playing, { type: 'SEEK_LINE', line: 9 }).line).toBe(3);
  });
});
