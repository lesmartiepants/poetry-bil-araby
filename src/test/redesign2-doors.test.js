// ReDesign2 V3.2: the guide's doors from GET /api/v2/poems/:id/doors, driven
// through the real route handlers with an in-memory pool.
import { describe, expect, it, vi } from 'vitest';
import { registerRedesign2 } from '../../server/redesign2.js';

const P = (id, poet, era, mood, extra = {}) => ({
  id,
  title: `قصيدة ${id}`,
  title_en: `Poem ${id}`,
  arabic: 'سطر أول * سطر ثان',
  cached_translation: 'first * second',
  accessibility_score: 1,
  mood_primary: mood,
  poet_id: poet.id,
  era_id: era.id,
  era_key: era.slug,
  poet_slug: poet.slug,
  poet_ar: poet.slug,
  poet_en: poet.name,
  death_year: poet.died ?? null,
  birth_year: null,
  active_year: null,
  full_poem_id: null,
  feeling_keys: mood ? [mood] : [],
  motif_keys: [],
  ...extra,
});
const KHANSA = { id: 1, slug: 'al-khansa', name: 'Al-Khansa', died: 646 };
const LAYLA = { id: 2, slug: 'layla', name: 'Layla al-Akhyaliyya', died: 704 };
const SAYYAB = { id: 3, slug: 'al-sayyab', name: 'Al-Sayyab', died: 1964 };
const MUTANABBI = { id: 4, slug: 'al-mutanabbi', name: 'Al-Mutanabbi', died: 965 };
const PRE = { id: 1, slug: 'pre-islamic' };
const UMA = { id: 3, slug: 'umayyad' };
const MOD = { id: 9, slug: 'modern' };
const ABB = { id: 4, slug: 'abbasid' };

const POEMS = [
  P(10, KHANSA, PRE, 'grief', { arabic: 'يَا عَيْنُ جُودِي بِدَمْعٍ', motif_keys: ['tears'] }),
  P(11, KHANSA, PRE, 'pride'),
  P(12, LAYLA, UMA, 'grief'),
  P(13, SAYYAB, MOD, 'grief'),
  P(14, MUTANABBI, ABB, 'pride', { arabic: 'حَبَسْتُ الدَّمْعَ', motif_keys: ['tears'] }),
  P(15, KHANSA, PRE, 'grief', { full_poem_id: 11 }), // an excerpt of 11
];

function harness() {
  const routes = {};
  const gemini = vi.fn().mockRejectedValue(new Error('Recommendations do not call Gemini'));
  const app = { get: (path, fn) => (routes[path] = fn) };
  const byId = (id) => POEMS.filter((p) => p.id === Number(id));
  const pool = {
    query: vi.fn(async (sql, args = []) => {
      if (sql.includes('width_bucket')) return { rows: [] };
      if (sql.includes('p.mood_primary = $2 OR p.poet_id = $3'))
        return {
          rows: POEMS.filter(
            (p) =>
              p.id !== args[0] &&
              !p.full_poem_id &&
              (p.mood_primary === args[1] || p.poet_id === args[2])
          ),
        };
      if (sql.includes('tags.key = ANY'))
        return {
          rows: POEMS.filter(
            (p) =>
              p.id !== args[0] &&
              !p.full_poem_id &&
              p.poet_id !== args[1] &&
              p.mood_primary !== args[2] &&
              p.motif_keys.some((key) => args[3].includes(key))
          ),
        };
      if (sql.includes('p.poet_id <> $2'))
        return {
          rows: POEMS.filter((p) => p.id !== args[0] && !p.full_poem_id && p.poet_id !== args[1]),
        };
      if (sql.includes('WHERE p.id = $1')) return { rows: byId(args[0]) };
      throw new Error(`unexpected query: ${sql.slice(0, 80)}`);
    }),
  };
  registerRedesign2(app, {
    pool,
    log: { error: () => {} },
    contentExpr: () => 'p.content',
    servingFilters: () => '',
    gemini,
  });
  const doors = async (id, query = {}, route = 'doors') => {
    let body;
    let status = 200;
    const res = { json: (b) => (body = b), status: (s) => ((status = s), res) };
    await routes[`/api/v2/poems/:id/${route}`]({ params: { id: String(id) }, query }, res);
    return { status, body };
  };
  return { doors, gemini, pool };
}

describe('the guide’s doors', () => {
  it('names the connection for the same three picks and preserves the legacy copy', async () => {
    const { doors } = harness();
    const { body } = await doors(10);
    expect(body.map((d) => d.poem.id)).toEqual(['12', '11', '14']);
    expect(body.map((d) => d.connection)).toEqual([
      { kind: 'feeling', label: 'Grief, in another poet’s voice' },
      { kind: 'poet', label: 'More from this poet' },
      { kind: 'image', label: 'Tears, from grief to pride' },
    ]);
    expect(body.map((d) => d.hook)).toEqual([
      'Also grief, from the Umayyad age',
      'More from Al-Khansa',
      'Tears, this time with pride',
    ]);
    expect(body.every((d) => d.reason.length > 0)).toBe(true);
    expect(new Set(body.map((d) => d.hook)).size).toBe(3);
  });

  it('puts the complete poem first when the poem is an excerpt', async () => {
    const { doors } = harness();
    const { body } = await doors(15);
    expect(body[0]).toMatchObject({
      poem: { id: '11' },
      hook: 'The whole poem',
      connection: { kind: 'full', label: 'The full poem behind this excerpt' },
    });
    expect(body).toHaveLength(3);
  });

  it('follows the guide’s settings: modern first when the reader leans modern', async () => {
    const { doors } = harness();
    const { body } = await doors(11, { cm: '1' });
    const fresh = body.find((d) => d.connection.kind === 'new');
    expect(fresh.poem.eraKey).toBe('modern');
    expect(fresh.connection.label).toBe('A new voice from the Modern era');
  });

  it('serves both routes without calling Gemini or touching its cache', async () => {
    const { doors, gemini, pool } = harness();
    const result = await doors(10, { cm: '1' });
    expect(result.status).toBe(200);
    expect(result.body.map((d) => d.poem.id)).toEqual(['13', '11', '14']);
    expect(await doors(10, { kind: 'doors', cm: '1' }, 'ai')).toEqual(result);
    expect(gemini).not.toHaveBeenCalled();
    expect(pool.query.mock.calls.every(([sql]) => !sql.includes('poem_ai_text'))).toBe(true);
  });
});
