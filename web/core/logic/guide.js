// The guide (V3.2 doors, V3.5 settings): how it steers, which doors it opens
// and the words it uses when Gemini isn't there. Plain JavaScript so the
// server (server/redesign2.js) and the mock API share one rule; types live in
// guide.d.ts. A row is a poem as the server reads it (snake_case columns).

export const ERA_NAMES = {
  'pre-islamic': 'Pre-Islamic',
  islamic: 'Early Islamic',
  umayyad: 'Umayyad',
  abbasid: 'Abbasid',
  andalusian: 'Andalusian',
  ayyubid: 'Ayyubid',
  mamluk: 'Mamluk',
  ottoman: 'Ottoman',
  modern: 'Modern',
};
// A broad catalog tag supplies candidates. Both poems must also contain words for the same
// concrete image, so (for example) a reference to sand alone cannot match abandoned dwellings.
const MOTIF_IMAGES = {
  night: [['Night', 'ليل|ليله|ليالي']],
  'desert-ruins': [
    ['The abandoned dwellings', 'اطلال|طلل|ديار|دمن'],
    ['Sand', 'رمل|رمال'],
  ],
  'moon-stars': [
    ['Stars', 'نجم|نجوم|كوكب|كواكب|شهاب|شهب'],
    ['The moon', 'قمر|اقمار|بدر|بدور'],
  ],
  'sea-water': [
    ['The sea', 'بحر|بحار'],
    ['Rivers', 'نهر|انهار|جدول|جداول'],
    ['Water', 'ماء|مياه'],
  ],
  'garden-flowers': [
    ['Flowers', 'زهر|زهور|ازهار|ورد|ورود|اقاح|اقحوان'],
    ['Gardens', 'روض|رياض|حديقه|حدائق|بستان|بساتين'],
  ],
  'wine-cup': [
    ['The wine vessel', 'كاس|كؤوس|اكواب|كوب|ابريق|اباريق'],
    ['Wine', 'خمر|خمور|راح|مدام'],
  ],
  'sword-battle': [
    ['Swords', 'سيف|سيوف|حسام|حسامه'],
    ['Battle', 'حرب|حروب|معركه|معارك'],
  ],
  birds: [
    ['Doves', 'حمام|حمامه|يمام|يمامه|ورقاء'],
    ['Birds', 'طير|طيور|طائر|عصفور|عصافير'],
  ],
  'fire-light': [
    ['Fire', 'نار|نيران|لهب|جمر'],
    ['Light', 'نور|انوار|ضوء|اضواء|ضياء'],
  ],
  tears: [['Tears', 'دمع|دمعه|دموع|ذرفت|تذرف']],
  journey: [
    ['The mount', 'ناقه|نوق|راحله|رواحل|بعير|ابل'],
    ['The caravan', 'قافله|قوافل|ركب'],
  ],
  dawn: [['Dawn', 'فجر|صباح|صبح']],
};
const imagePatterns = Object.fromEntries(
  Object.entries(MOTIF_IMAGES).map(([key, images]) => [
    key,
    images.map(([label, words]) => ({
      label,
      pattern: new RegExp(`^(?:[وف]?(?:[بكل]?(?:ال)?|لل))?(?:${words})(?:ها|هم|نا|ك|ي|ه)?$`),
    })),
  ])
);
const verseLines = (arabic) => arabic?.split(/\s*\*\s*|\n+/).filter((line) => line.trim()) ?? [];
const imageWords = (line) =>
  line
    .replace(/[\p{M}\u0640]/gu, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .match(/\p{L}+/gu) ?? [];

export function sharedImage(me, candidate) {
  if (
    me.poet_id === candidate.poet_id ||
    !me.mood_primary ||
    !candidate.mood_primary ||
    me.mood_primary === candidate.mood_primary
  )
    return null;
  const motifs = me.motif_keys?.filter((key) => candidate.motif_keys?.includes(key));
  if (!motifs?.length) return null;
  const evidence = (row) =>
    verseLines(row.arabic).map((line) => ({ line, words: imageWords(line) }));
  const source = evidence(me);
  const target = evidence(candidate);
  for (const key of motifs) {
    for (const { label, pattern } of imagePatterns[key] ?? []) {
      const from = source.find(({ words }) => words.some((word) => pattern.test(word)));
      if (!from) continue;
      const to = target.find(({ words }) => words.some((word) => pattern.test(word)));
      if (to) return { label, fromLine: from.line, toLine: to.line };
    }
  }
  return null;
}
const eraName = (slug) => (slug && slug !== 'unspecified' ? (ERA_NAMES[slug] ?? null) : null);
const feelingNouns = { amorous: 'desire', bittersweet: 'bittersweetness' };
const feelingName = (row) =>
  feelingNouns[row.mood_primary] ?? row.mood_label ?? row.mood_primary?.replaceAll('-', ' ');

/** The guide's settings as a query string, so doors and Next poem follow them. */
export function steerQuery(prefs) {
  if (!prefs) return '';
  const q = new URLSearchParams();
  q.set('cm', String(Math.round(prefs.classicalModern * 100) / 100));
  if (prefs.difficulty !== 'any') q.set('difficulty', prefs.difficulty);
  if (prefs.length !== 'any') q.set('length', prefs.length);
  if (prefs.feelings.length) q.set('feelings', prefs.feelings.join(','));
  return q.toString();
}

/** The guide's settings from a query string: ?cm=0.3&difficulty=gentle&length=short&feelings=grief,love */
export function parseSteer(q = {}) {
  const cm = q.cm === undefined || q.cm === '' ? null : Math.min(1, Math.max(0, Number(q.cm)));
  return {
    cm: Number.isFinite(cm) ? cm : null,
    difficulty: ['gentle', 'measured', 'demanding'].includes(q.difficulty) ? q.difficulty : 'any',
    length: ['short', 'long'].includes(q.length) ? q.length : 'any',
    feelings: String(q.feelings ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

/**
 * How well a poem fits the reader's settings: today's preferenceWeighting.js
 * cut to the four the guide exposes (classical or modern, difficulty band,
 * length, the feelings that move them). Each counts 0–1.
 */
export function guideScore(r, steer, bandOf = () => 'measured') {
  let s = 0;
  if (steer.cm !== null) s += 1 - Math.abs(steer.cm - (r.era_key === 'modern' ? 1 : 0));
  if (steer.difficulty !== 'any')
    s += bandOf(r.accessibility_score, r) === steer.difficulty ? 1 : 0;
  if (steer.length !== 'any') {
    const n = verseLines(r.arabic).length;
    s += steer.length === 'short' ? (n <= 8 ? 1 : 0) : n >= 14 ? 1 : 0;
  }
  if (steer.feelings.length) {
    const mine = [r.mood_primary, ...(r.feeling_keys ?? [])];
    s += mine.some((k) => steer.feelings.includes(k)) ? 1 : 0;
  }
  return s;
}

/** Best fit for the settings first; ties keep the order given (a daily shuffle on the server). */
export function byFit(rows, steer, bandOf) {
  return rows
    .map((r, i) => ({ r, i, s: guideScore(r, steer, bandOf) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.r);
}

/**
 * The candidate pools for a poem's doors, each already in fit order.
 */
export function doorPools(me, near, anywhere, full, images = []) {
  const otherPoet = near.filter((r) => r.poet_id !== me.poet_id);
  const sameMood = (r) => Boolean(me.mood_primary) && r.mood_primary === me.mood_primary;
  return {
    full: full ?? null,
    feeling: otherPoet.filter(sameMood),
    poet: near.filter((r) => r.poet_id === me.poet_id),
    image: images.filter((row) => sharedImage(me, row)),
    new: anywhere,
  };
}

/**
 * At most one door of each kind: the complete poem when this is an excerpt,
 * then the same feeling in another poet, more from this poet, or the same
 * image with a different feeling. "Somewhere new" tops up to three.
 */
export function chooseDoors(me, pools, n = 3) {
  const out = [];
  const taken = new Set([String(me.id)]);
  const take = (kind, rows) => {
    const r = (rows ?? []).find((x) => !taken.has(String(x.id)));
    if (!r) return false;
    taken.add(String(r.id));
    out.push({ kind, row: r });
    return true;
  };
  if (pools.full) take('full', [pools.full]);
  for (const k of ['feeling', 'poet', 'image']) if (out.length < n) take(k, pools[k]);
  // Somewhere new means a poet and an age not already on offer, when there is one.
  const fresh = (r) => !out.some((d) => d.row.poet_id === r.poet_id || d.row.era_key === r.era_key);
  while (out.length < n && take('new', [...(pools.new ?? []).filter(fresh), ...(pools.new ?? [])]));
  return out.slice(0, n);
}

/** The guide's own words for a set of chosen doors; "somewhere new" varies its wording down the set. */
export function wordDoors(chosen, me, mood) {
  let nth = 0;
  return chosen.map(({ kind, row }) => {
    const { label, hook, reason } = doorWords(kind, me, row, mood, kind === 'new' ? nth++ : 0);
    return { row, connection: { kind, label }, hook, reason };
  });
}

/** The guide's own words for a door. */
export function doorWords(kind, me, r, mood, nth = 0) {
  const era = eraName(r.era_key);
  const title = r.title_en || r.title;
  switch (kind) {
    case 'full':
      return {
        label: 'The full poem behind this excerpt',
        hook: 'The whole poem',
        reason: `You read an excerpt; here is all of ${title}.`,
      };
    case 'feeling': {
      const feeling = feelingName(me);
      return {
        label: feeling
          ? `${feeling[0].toUpperCase()}${feeling.slice(1)}, in another poet’s voice`
          : 'Same feeling, another poet',
        hook: mood
          ? era
            ? `Also ${mood}, from the ${era} age`
            : `Also ${mood}, in another voice`
          : `Another voice: ${r.poet_en}`,
        reason: `${r.poet_en} on ${mood ? `the same ${mood}` : 'what you just read'}.`,
      };
    }
    case 'poet':
      return {
        label: 'More from this poet',
        hook: `More from ${r.poet_en}`,
        reason: `The same hand, in ${title}.`,
      };
    case 'image': {
      const image = sharedImage(me, r);
      const originalFeeling = feelingName(me);
      const feeling = feelingName(r);
      return {
        label: `${image.label}, from ${originalFeeling} to ${feeling}`,
        hook: `${image.label}, this time with ${feeling}`,
        reason: `The image carries a different feeling, from ${originalFeeling} to ${feeling}.`,
      };
    }
    default: {
      const hooks = [
        era ? `Somewhere new: the ${era} age` : `Somewhere new: ${r.poet_en}`,
        era ? `Or the ${era} age, with ${r.poet_en}` : `Or a change of voice: ${r.poet_en}`,
        `Or try ${r.poet_en}`,
      ];
      return {
        label: era ? `A new voice from the ${era} era` : 'A different voice',
        hook: hooks[Math.min(nth, 2)],
        // Reasons vary down the set too, so several "somewhere new" doors never read the same.
        reason: [
          `A change of voice: ${r.poet_en}${era ? `, from the ${era} age` : ''}.`,
          `${r.poet_en}, in ${title}: another way of seeing.`,
          `Unlike what you just read: ${title}.`,
        ][Math.min(nth, 2)],
      };
    }
  }
}

/** No two doors in a set share a hook. */
export function uniqueHooks(doors) {
  const seen = new Set();
  return doors.map((d) => {
    let hook = d.hook;
    if (seen.has(hook.toLowerCase())) hook = `Another way in: ${d.poem.poetEn}`;
    if (seen.has(hook.toLowerCase())) hook = d.poem.titleEn;
    seen.add(hook.toLowerCase());
    return { ...d, hook };
  });
}
