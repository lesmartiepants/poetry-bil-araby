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
// A rough year per era, for "1,300 years on" when a poet has no dates.
const ERA_YEAR = {
  'pre-islamic': 560,
  islamic: 640,
  umayyad: 700,
  abbasid: 900,
  andalusian: 1100,
  ayyubid: 1200,
  mamluk: 1350,
  ottoman: 1700,
  modern: 1950,
};
export const yearOf = (r) =>
  r.death_year ??
  r.active_year ??
  (r.birth_year ? r.birth_year + 40 : (ERA_YEAR[r.era_key] ?? null));
const eraName = (slug) => (slug && slug !== 'unspecified' ? (ERA_NAMES[slug] ?? null) : null);
const lineCount = (arabic) =>
  arabic ? arabic.split(/\s*\*\s*|\n+/).filter((x) => x.trim()).length : 0;

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
    const n = lineCount(r.arabic);
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
 * The candidate pools for a poem's doors, from poems related to it (`near`:
 * same feeling or poet) and poems from anywhere, each already in fit order.
 */
export function doorPools(me, near, anywhere, full) {
  const otherPoet = near.filter((r) => r.poet_id !== me.poet_id);
  const sameMood = (r) => Boolean(me.mood_primary) && r.mood_primary === me.mood_primary;
  const gap = (r) => Math.abs((yearOf(r) ?? 0) - (yearOf(me) ?? 0));
  return {
    full: full ?? null,
    feeling: otherPoet.filter(sameMood),
    poet: near.filter((r) => r.poet_id === me.poet_id),
    // The same feeling from another age, the farther the better; with no feeling, the same age.
    era: me.mood_primary
      ? otherPoet
          .filter((r) => sameMood(r) && r.era_id !== me.era_id)
          .sort((x, y) => gap(y) - gap(x))
      : anywhere.filter((r) => r.era_id === me.era_id),
    new: anywhere,
  };
}

/**
 * At most one door of each kind: the complete poem when this is an excerpt,
 * then the same feeling in another poet, more from this poet, the same
 * feeling from another age; "somewhere new" tops up to three.
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
  for (const k of ['feeling', 'poet', 'era']) if (out.length < n) take(k, pools[k]);
  // Somewhere new means a poet and an age not already on offer, when there is one.
  const fresh = (r) => !out.some((d) => d.row.poet_id === r.poet_id || d.row.era_key === r.era_key);
  while (out.length < n && take('new', [...(pools.new ?? []).filter(fresh), ...(pools.new ?? [])]));
  return out.slice(0, n);
}

const fmtYears = (n) => (Math.round(n / 100) * 100).toLocaleString('en-US');

/** The guide's own words for a set of chosen doors; "somewhere new" varies its wording down the set. */
export function wordDoors(chosen, me, mood) {
  let nth = 0;
  return chosen.map(({ kind, row }) => ({
    kind,
    row,
    ...doorWords(kind, me, row, mood, kind === 'new' ? nth++ : 0),
  }));
}

/** The guide's own words for a door: real names, feelings and ages. */
export function doorWords(kind, me, r, mood, nth = 0) {
  const era = eraName(r.era_key);
  const title = r.title_en || r.title;
  switch (kind) {
    case 'full':
      return { hook: 'The whole poem', reason: `You read an excerpt; here is all of ${title}.` };
    case 'feeling':
      return {
        hook: mood
          ? era
            ? `Also ${mood}, from the ${era} age`
            : `Also ${mood}, in another voice`
          : `Another voice: ${r.poet_en}`,
        reason: `${r.poet_en} on ${mood ? `the same ${mood}` : 'what you just read'}.`,
      };
    case 'poet':
      return { hook: `More from ${r.poet_en}`, reason: `The same hand, in ${title}.` };
    case 'era': {
      const a = yearOf(me);
      const b = yearOf(r);
      const gap = a !== null && b !== null ? b - a : 0;
      if (mood && Math.abs(gap) >= 150)
        return {
          hook: `Same ${mood}, ${fmtYears(Math.abs(gap))} years ${gap > 0 ? 'on' : 'earlier'}`,
          reason: `${r.poet_en}${era ? `, writing in the ${era} age` : ''}.`,
        };
      return {
        hook: era ? `Also from the ${era} age` : 'Written in the same world',
        reason: `${r.poet_en}, a contemporary in spirit.`,
      };
    }
    default: {
      const hooks = [
        era ? `Somewhere new: the ${era} age` : `Somewhere new: ${r.poet_en}`,
        era ? `Or the ${era} age, with ${r.poet_en}` : `Or a change of voice: ${r.poet_en}`,
        `Or try ${r.poet_en}`,
      ];
      return {
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

/** Gemini's door text, kept only when it follows the brief: a hook under 8 words and a one-line reason. */
export function cleanDoorText(x) {
  if (!x || typeof x.hook !== 'string' || typeof x.reason !== 'string') return null;
  const hook = x.hook.replace(/["“”]/g, '').trim();
  const reason = x.reason.replace(/\s+/g, ' ').trim();
  if (!hook || hook.split(/\s+/).length >= 8 || !reason || reason.length > 160) return null;
  return { hook, reason };
}
