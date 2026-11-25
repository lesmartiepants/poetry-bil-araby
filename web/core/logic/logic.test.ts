import { describe, expect, it } from 'vitest';
import { deriveBands } from './bands';
import { autoIconLetter, iconLetterChoices, iconLetterOf } from './iconLetter';
import { DEFAULT_PREFS, mergePrefs } from './prefs';
import { cardSvg, splitForCards } from './shareCard';
import { arabicInitial, arabicSortKey, matchRange, normalizeArabic, stripMarks } from './arabic';
import { chooseDoors, doorPools, parseSteer, uniqueHooks, wordDoors } from './guide';
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
  it('files names as a dictionary does: the article set aside, every alif under أ', () => {
    expect(arabicInitial('الخنساء')).toBe('خ');
    expect(arabicInitial('امرؤ القيس')).toBe('أ');
    expect(arabicInitial('أبو فراس')).toBe('أ');
    expect(['جبران', 'الخنساء', 'أبو نواس'].sort((a, b) => arabicSortKey(a).localeCompare(arabicSortKey(b), 'ar'))).toEqual(['أبو نواس', 'جبران', 'الخنساء']);
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

describe('share cards', () => {
  const spec = { titleAr: 'أمرُّ على الديار', titleEn: 'I pass by the dwellings', poetAr: 'قيس', poetEn: 'Majnun Layla', lines: [{ ar: 'أَمُرُّ', en: 'I pass' }], showEn: true, colourway: 'obsidian' };
  it('draws the dedication, escaped', () => {
    const svg = cardSvg({ ...spec, dedication: '<b>Nour</b>' });
    expect(svg).toContain('for &lt;b&gt;Nour&lt;/b&gt;');
    expect(svg).not.toContain('<b>');
  });
  it('is 1080 × 1350 for saved images', () => {
    expect(cardSvg(spec, { width: 1080 })).toMatch(/width="1080" height="1350"/);
  });
});

describe('search match highlighting', () => {
  const line = 'أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى';
  it('finds a bare word inside fully marked text, marks included', () => {
    const [a, b] = matchRange(line, 'ليلي')!;
    expect(line.slice(a, b)).toBe('لَيلى');
  });
  it('spans words, and folds hamza forms', () => {
    const [a, b] = matchRange(line, 'امر علي')!;
    expect(line.slice(a, b)).toBe('أَمُرُّ عَلى');
  });
  it('matches English case-insensitively and says when nothing matches', () => {
    expect(matchRange('I pass by the dwellings', 'DWELL')).toEqual([14, 19]);
    expect(matchRange(line, 'قمر')).toBeNull();
  });
});

describe('the guide’s doors', () => {
  const row = (id: number, poetId: number, poet: string, era: string, mood: string, extra = {}) => ({
    id, title: `قصيدة ${id}`, title_en: `Poem ${id}`, poet_id: poetId, poet_en: poet, era_id: era === 'modern' ? 9 : era === 'umayyad' ? 3 : era === 'abbasid' ? 4 : 1,
    era_key: era, mood_primary: mood, death_year: { 1: 646, 2: 704, 3: 1964, 4: 965 }[poetId], ...extra,
  });
  const me = row(10, 1, 'Al-Khansa', 'pre-islamic', 'grief');
  const near = [row(11, 1, 'Al-Khansa', 'pre-islamic', 'pride'), row(12, 2, 'Layla al-Akhyaliyya', 'umayyad', 'grief'), row(13, 3, 'Al-Sayyab', 'modern', 'grief')];
  const anywhere = [...near, row(14, 4, 'Al-Mutanabbi', 'abbasid', 'pride')];

  it('offers one door of each kind, in specific words, with no hook repeated', () => {
    const chosen = chooseDoors(me, doorPools(me, near, anywhere, null));
    expect(chosen.map((d) => `${d.kind}:${d.row.id}`)).toEqual(['feeling:12', 'poet:11', 'era:13']);
    const words = wordDoors(chosen, me, 'grief');
    expect(words.map((d) => d.hook)).toEqual(['Also grief, from the Umayyad age', 'More from Al-Khansa', 'Same grief, 1,300 years on']);
    expect(words.every((d) => d.reason.length > 0)).toBe(true);
  });

  it('puts the complete poem first when the poem read is an excerpt', () => {
    const excerpt = row(15, 1, 'Al-Khansa', 'pre-islamic', 'grief', { full_poem_id: 11 });
    const chosen = chooseDoors(excerpt, doorPools(excerpt, near, anywhere, near[0]));
    expect(chosen).toHaveLength(3);
    expect(chosen[0]).toMatchObject({ kind: 'full', row: { id: 11 } });
    expect(wordDoors(chosen, excerpt, 'grief')[0].hook).toBe('The whole poem');
  });

  it('tops up with somewhere new, on a poet and an age not already offered', () => {
    const lonely = row(11, 1, 'Al-Khansa', 'pre-islamic', 'pride');
    const chosen = chooseDoors(lonely, doorPools(lonely, [], anywhere, null));
    expect(chosen).toHaveLength(3);
    expect(chosen.every((d) => d.kind === 'new')).toBe(true);
    expect(new Set(chosen.map((d) => d.row.poet_id)).size).toBe(3);
    expect(new Set(wordDoors(chosen, lonely, 'pride').map((d) => d.hook)).size).toBe(3);
  });

  it('never offers the poem itself or a poem twice, even from small pools', () => {
    const chosen = chooseDoors(me, doorPools(me, [me], [me, near[0]], null));
    expect(chosen.map((d) => d.row.id)).toEqual([11]);
  });

  it('uniqueHooks rewrites a repeated hook so no two doors read the same', () => {
    const door = (id: string, hook: string) => ({ hook, poem: { id, poetEn: `Poet ${id}`, titleEn: `Title ${id}` } });
    const out = uniqueHooks([door('1', 'More from X'), door('2', 'more from x'), door('3', 'Other')]);
    expect(out.map((d) => d.hook)).toEqual(['More from X', 'Another way in: Poet 2', 'Other']);
  });

  it('parseSteer reads the guide’s settings from the query and ignores anything else', () => {
    expect(parseSteer({ cm: '0.3', difficulty: 'gentle', length: 'short', feelings: 'grief, love,' })).toEqual({ cm: 0.3, difficulty: 'gentle', length: 'short', feelings: ['grief', 'love'] });
    expect(parseSteer({ cm: '7', difficulty: 'hard', length: 'epic' })).toEqual({ cm: 1, difficulty: 'any', length: 'any', feelings: [] });
    expect(parseSteer({ cm: 'abc' }).cm).toBeNull();
    expect(parseSteer()).toEqual({ cm: null, difficulty: 'any', length: 'any', feelings: [] });
  });
});
