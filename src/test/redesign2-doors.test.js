// ReDesign2 V3.2: the guide's doors from GET /api/v2/poems/:id/doors, driven
// through the real route handler with an in-memory pool. Gemini is reached by
// stubbing fetch, never with a real key.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiText, registerRedesign2 } from '../../server/redesign2.js';

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
  P(10, KHANSA, PRE, 'grief'), // the poem just read
  P(11, KHANSA, PRE, 'pride'),
  P(12, LAYLA, UMA, 'grief'),
  P(13, SAYYAB, MOD, 'grief'),
  P(14, MUTANABBI, ABB, 'pride'),
  P(15, KHANSA, PRE, 'grief', { full_poem_id: 11 }), // an excerpt of 11
];

function harness() {
  const routes = {};
  const stored = [];
  const app = { get: (path, fn) => (routes[path] = fn) };
  const byId = (id) => POEMS.filter((p) => p.id === Number(id));
  const pool = {
    query: async (sql, args = []) => {
      if (sql.includes('width_bucket')) return { rows: [] };
      if (sql.includes('category_values') && sql.includes('label_en'))
        return { rows: [{ label: String(args[0]) }] };
      if (sql.includes('FROM poem_ai_text'))
        return { rows: stored.filter((r) => r.poem_id === args[0] && args[1].includes(r.key)) };
      if (sql.includes('INSERT INTO poem_ai_text')) {
        stored.push({ poem_id: args[0], key: args[1], payload: args[2] });
        return { rows: [] };
      }
      if (sql.includes('p.mood_primary = $2 OR p.poet_id = $3'))
        return {
          rows: POEMS.filter(
            (p) =>
              p.id !== args[0] &&
              !p.full_poem_id &&
              (p.mood_primary === args[1] || p.poet_id === args[2])
          ),
        };
      if (sql.includes('p.poet_id <> $2'))
        return {
          rows: POEMS.filter((p) => p.id !== args[0] && !p.full_poem_id && p.poet_id !== args[1]),
        };
      if (sql.includes('WHERE p.id = $1')) return { rows: byId(args[0]) };
      throw new Error(`unexpected query: ${sql.slice(0, 80)}`);
    },
  };
  registerRedesign2(app, {
    pool,
    log: { error: () => {} },
    contentExpr: () => 'p.content',
    servingFilters: () => '',
    gemini: geminiText,
  });
  const doors = async (id, query = {}) => {
    let body;
    let status = 200;
    const res = { json: (b) => (body = b), status: (s) => ((status = s), res) };
    await routes['/api/v2/poems/:id/doors']({ params: { id: String(id) }, query }, res);
    return { status, body };
  };
  return { doors, stored };
}

describe('the guide’s doors', () => {
  beforeEach(() => vi.stubEnv('GEMINI_API_KEY', ''));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses Gemini’s hook and reason for each pair, stores them, and reads them back', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const fetch = vi.fn(async (_url, init) => {
      const prompt = JSON.parse(init.body).contents[0].parts[0].text;
      expect(prompt).toContain('Al-Khansa');
      const reply = {
        doors: [
          {
            id: 12,
            hook: 'Another woman of the desert',
            reason: 'Layla answered grief with defiance.',
          },
          { id: 11, hook: 'Her pride, not her tears', reason: 'Al-Khansa before the elegies.' },
          {
            id: 13,
            hook: 'a hook that runs on far past the eight word limit',
            reason: 'Too long a hook.',
          },
        ],
      };
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }],
        }),
      };
    });
    vi.stubGlobal('fetch', fetch);
    const { doors, stored } = harness();
    const { body } = await doors(10);
    expect(body.map((d) => d.hook)).toEqual([
      'Another woman of the desert',
      'Her pride, not her tears',
      'Same grief, 1,300 years on', // Gemini broke the brief here, so the guide's own words stand
    ]);
    expect(body[0].reason).toBe('Layla answered grief with defiance.');
    expect(stored.map((r) => r.key)).toEqual(['12', '11']);
    // Second time: the stored pairs are read; only the missing one is asked for.
    await doors(10);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body).contents[0].parts[0].text).not.toContain(
      'id 12'
    );
  });

  it('falls back to the guide’s own words when Gemini fails', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 }))
    );
    const { doors } = harness();
    const { status, body } = await doors(10);
    expect(status).toBe(200);
    expect(body.map((d) => d.hook)).toContain('More from Al-Khansa');
  });
});
