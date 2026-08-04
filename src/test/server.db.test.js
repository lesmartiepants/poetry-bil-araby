/**
 * @vitest-environment node
 *
 * API tests against a REAL PostgreSQL, seeded with the fabricated fixtures in
 * supabase/seed/fixtures.sql.
 *
 * Why this exists alongside server.test.js
 * ----------------------------------------
 * server.test.js mocks `pg`. That is the right tool for control flow — status
 * codes, validation, auth, error branches — and it stays as it is. But a mocked
 * pool answers whatever the test told it to, so an entire class of bug is
 * invisible to it: a column that does not exist, a join on the wrong key, a CTE
 * that binds the wrong number of parameters, a filter that silently matches
 * everything. Those only fail against Postgres.
 *
 * So this file deliberately targets the endpoints where the SQL is doing real
 * work rather than the handler:
 *
 *   /api/poems/by-category   composed EXISTS-per-dimension SQL, a family join
 *                            across dimensions, era resolved by name, a nullable
 *                            century column, an id-set path ordered by
 *                            array_position, and a two-stage CTE whose parameter
 *                            count changes with the query string. Most of that
 *                            is string-built at request time.
 *   /api/categories          GROUP BY across three tables plus a correlated
 *                            COUNT(DISTINCT) per family. A mock cannot tell you
 *                            the grouping is wrong; it just returns rows.
 *   random / by-poet / search / poets / :id
 *                            all interpolate poemContentExpr(), servingFilters(),
 *                            poetNameEnExpr(), titleEnExpr() and
 *                            translationSelectExpr() straight into SQL. A typo in
 *                            any of those is a runtime 500 that no mock sees.
 *   /api/health/full         the only endpoint that exercises servingFilters()
 *                            as a standalone count.
 *
 * Not covered here, on purpose: design-review, curation lab, AI proxy and bug
 * reports. They need GitHub/Gemini credentials or write to tables the fixtures
 * do not populate, so a DB-backed test of them would assert on plumbing rather
 * than on SQL.
 *
 * Skipped unless TEST_DATABASE_URL is set, so `npm run test:run` is unaffected:
 *
 *   npm run db:setup && npm run db:seed
 *   TEST_DATABASE_URL=postgresql://localhost:5432/qafiyah npm run test:db
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

let app;
let pool;

if (TEST_DB_URL) {
  // Connecting through DATABASE_URL is deliberate: it used to be impossible
  // against a local Postgres, because server.js forced
  // `ssl: { rejectUnauthorized: false }` whenever the variable was set and a
  // stock local server answers that with "does not support SSL connections".
  // Reaching the assertions below at all proves the host-aware SSL decision
  // still works.
  process.env.DATABASE_URL = TEST_DB_URL;

  const mod = await import('../../server.js');
  app = mod.app;
  pool = mod.pool;
  // Startup capability detection is fire-and-forget in production. Awaiting it
  // here is the difference between asserting on detected state and racing it.
  await mod.__test.ready;
}

const describeDb = TEST_DB_URL ? describe : describe.skip;

// Fixture ids, from supabase/seed/fixtures.sql. Referenced by number rather
// than re-derived, so a change to the fixtures fails these loudly.
const SERVABLE = 24; // of 26; 25 is below the quality floor, 26 is over the verse cap
const TOTAL = 26;

/** Ids from a by-category response, sorted, for stable comparison. */
const ids = (body) => body.map((p) => p.id).sort((a, b) => a - b);

/**
 * Strip Arabic diacritics (U+064B-U+065F, the superscript alef U+0670, and the
 * tatweel U+0640) before matching on served text.
 *
 * Necessary, not cosmetic. The API serves COALESCE(diacritized_content, content),
 * so a poem that has been vocalized comes back as اخْتِبَارٍ rather than اختبار
 * and a plain substring match silently misses it. With one vocalized poem in 24
 * servable ones, an unnormalized assertion against /api/poems/random fails
 * roughly 4% of the time — which is how this was found.
 */
const stripTashkeel = (s) => (s || '').replace(/[ً-ٰٟـ]/g, '');

// One long-lived server for the whole file. `request(app)` would spin up a
// fresh ephemeral listener per call — 43 of them in this suite — and that churn
// of bind/close cycles is a source of rare, unattributable failures that look
// like the endpoint misbehaved. Listening once is also closer to how the API
// actually runs.
let http;

describeDb('API against a real PostgreSQL (seeded fixtures)', () => {
  beforeAll(async () => {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM poems WHERE source_dataset = 'fixture'"
    );
    if (rows[0].n !== TOTAL) {
      throw new Error(
        `Expected ${TOTAL} fixture poems, found ${rows[0].n}. Run: npm run db:setup && npm run db:seed`
      );
    }
    await new Promise((resolve) => {
      http = app.listen(0, resolve);
    });
  });

  afterAll(async () => {
    if (http) await new Promise((resolve) => http.close(resolve));
    await pool.end();
  });

  // --------------------------------------------------------------------------
  describe('startup capability detection', () => {
    it('finds the categorization layer and reads its dimensions from the DB', async () => {
      const state = (await import('../../server.js')).__test.getCategorizationState();
      expect(state.hasCategorization).toBe(true);
      // Order comes from category_dimensions.sort_order, not from a literal.
      expect(state.categorizationDimensions).toEqual(['mood', 'topic', 'motif']);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/health/full', () => {
    it('separates total poems from the ones the serving filters allow', async () => {
      const res = await request(http).get('/api/health/full').expect(200);
      expect(res.body.database).toBe('connected');
      expect(res.body.totalPoems).toBe(TOTAL);
      // The gap is the whole point: two fixture poems are deliberately
      // unservable. If servingFilters() ever degrades to a no-op these match.
      expect(res.body.servedPoems).toBe(SERVABLE);
      expect(res.body.servedPoems).toBeLessThan(res.body.totalPoems);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/categories', () => {
    it('groups values under their dimension with real counts', async () => {
      const res = await request(http).get('/api/categories').expect(200);
      const dims = res.body.dimensions;
      expect(dims.map((d) => d.key)).toEqual(['mood', 'topic', 'motif']);

      const mood = dims.find((d) => d.key === 'mood');
      expect(mood.label_en).toBe('Mood');
      expect(mood.label_ar).toBeTruthy();
      // The full vocabulary is listed even where nothing is tagged, so a filter
      // UI can render an empty facet rather than hiding it.
      expect(mood.values.length).toBe(16);

      const melancholy = mood.values.find((v) => v.key === 'melancholy');
      // pg returns COUNT as a string; the handler parseInts it.
      expect(typeof melancholy.poem_count).toBe('number');

      // melancholy is assigned to poems 1 and 25, but only poem 1 is servable
      // (25 sits below minQualityScore). So the count is 1 or 2 depending on a
      // genuine product decision: whether a facet advertises every assignment
      // or only the poems selecting it would actually yield. Both are
      // defensible, so this asserts the bounds instead of picking a side —
      // pinning either number would make a deliberate change to that decision
      // look like a regression.
      const selected = await request(http)
        .get('/api/poems/by-category?mood=melancholy&limit=50')
        .expect(200);
      expect(melancholy.poem_count).toBeGreaterThanOrEqual(selected.body.length);
      expect(melancholy.poem_count).toBeLessThanOrEqual(2);
      // What must never happen: a facet the vocabulary lists, that poems carry,
      // reading zero. That is what a broken GROUP BY or a wrong join key looks
      // like, and it is invisible to a mocked pool.
      expect(melancholy.poem_count).toBeGreaterThan(0);

      // reverence is on poem 6 only, which is servable, so this one is
      // unambiguous under either rule.
      const unused = mood.values.find((v) => v.key === 'reverence');
      expect(unused.poem_count).toBe(1);

      // The vocabulary is listed exhaustively, so a facet nobody has tagged
      // must be present and read zero rather than be omitted. No fixture poem
      // is tagged war-conflict, deliberately.
      const topic = dims.find((d) => d.key === 'topic');
      const untagged = topic.values.find((v) => v.key === 'war-conflict');
      expect(untagged).toBeDefined();
      expect(untagged.poem_count).toBe(0);
    });

    it('counts families across dimensions without double-counting a poem', async () => {
      const res = await request(http).get('/api/categories').expect(200);
      const families = res.body.families;
      expect(families.length).toBe(7);

      const nature = families.find((f) => f.key === 'nature-cosmos');
      // Poem 7 carries three nature-cosmos values (topic nature, motifs night
      // and moon-stars). A COUNT without DISTINCT would report more poems than
      // exist, which is exactly what the correlated subquery guards against.
      expect(nature.poem_count).toBe(4);
      expect(nature.values.length).toBeGreaterThan(1);
      expect(new Set(nature.values.map((v) => v.dim)).size).toBeGreaterThan(1);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poems/by-category', () => {
    it('filters by a single mood and applies the serving filters', async () => {
      const res = await request(http).get('/api/poems/by-category?mood=melancholy').expect(200);
      // Poems 1 and 25 are both melancholy; 25 sits below minQualityScore.
      expect(ids(res.body)).toEqual([1]);
      expect(res.body[0].moodPrimary).toBe('melancholy');
      expect(res.body[0].emotionalIntensity).toBe(70);
      expect(res.body[0].accessibilityScore).toBeCloseTo(8.5, 5);
      expect(res.body[0].confidence).toBe(92);
      expect(res.body[0].categories.moods).toContain('melancholy');
    });

    it('ANDs across dimensions', async () => {
      const both = await request(http)
        .get('/api/poems/by-category?mood=serenity&topic=nature')
        .expect(200);
      // serenity: 7, 8, 17. nature: 7, 8, 18. Intersection: 7, 8.
      expect(ids(both.body)).toEqual([7, 8]);
    });

    it('ORs within a dimension by default and ANDs with {dim}Mode=and', async () => {
      const or = await request(http)
        .get('/api/poems/by-category?mood=nostalgia,satire')
        .expect(200);
      expect(ids(or.body)).toEqual([9, 19]);

      const and = await request(http)
        .get('/api/poems/by-category?mood=nostalgia,satire&moodMode=and')
        .expect(200);
      // Only poem 19 carries both moods.
      expect(ids(and.body)).toEqual([19]);
    });

    it('filters by motif, the optional dimension', async () => {
      const res = await request(http).get('/api/poems/by-category?motif=tears').expect(200);
      expect(ids(res.body)).toEqual([1, 16]);
    });

    it('matches a family across dimensions', async () => {
      const res = await request(http)
        .get('/api/poems/by-category?family=nature-cosmos&limit=50')
        .expect(200);
      // 6 (motif dawn), 7, 8 and 18 — reached through three different
      // dimensions, which a per-dimension filter could not express.
      expect(ids(res.body)).toEqual([6, 7, 8, 18]);
    });

    it('returns poems for every family', async () => {
      // The seed's stated guarantee. A family whose members were all filtered
      // out would make a filter chip in the UI dead on arrival.
      const cats = await request(http).get('/api/categories').expect(200);
      for (const family of cats.body.families) {
        const res = await request(http)
          .get(`/api/poems/by-category?family=${family.key}&limit=50`)
          .expect(200);
        expect(res.body.length, `family ${family.key} returned nothing`).toBeGreaterThan(0);
      }
    });

    it('resolves era by name and by id to the same poems', async () => {
      const byName = await request(http)
        .get(`/api/poems/by-category?era=${encodeURIComponent('العصر الجاهلي')}&limit=50`)
        .expect(200);
      const byId = await request(http).get('/api/poems/by-category?era=1&limit=50').expect(200);
      // era is a POET-level facet resolved through a subquery on eras.name —
      // poems has no era column, so this join is easy to get wrong.
      expect(ids(byName.body)).toEqual([1, 2, 18]);
      expect(ids(byId.body)).toEqual(ids(byName.body));
    });

    it('filters by century and never matches the NULL-century poems', async () => {
      const res = await request(http).get('/api/poems/by-category?century=6&limit=50').expect(200);
      expect(ids(res.body)).toEqual([1, 2, 18]);
      for (const poem of res.body) expect(poem.century).toBe(6);

      // 6 of 26 fixture poems have a NULL century. `p.century = $n` is NULL-safe
      // by accident rather than by design, so pin it: an unfiltered query must
      // still surface them, and a century filter must never leak them in.
      const all = await request(http).get('/api/poems/by-category?limit=50').expect(200);
      expect(all.body.length).toBe(SERVABLE);
      expect(all.body.filter((p) => p.century === undefined).length).toBeGreaterThan(0);
    });

    it('applies accessibility and intensity bounds', async () => {
      const hard = await request(http)
        .get('/api/poems/by-category?minAccessibility=8&limit=50')
        .expect(200);
      expect(ids(hard.body)).toEqual([1, 2, 15, 17]);

      const calm = await request(http)
        .get('/api/poems/by-category?maxIntensity=25&limit=50')
        .expect(200);
      expect(ids(calm.body)).toEqual([12, 15, 17]);

      const band = await request(http)
        .get('/api/poems/by-category?minAccessibility=6&maxAccessibility=7&limit=50')
        .expect(200);
      // 3 (6.0), 20 (6.2), 10 (6.5), 9 (7.0) — inclusive on both bounds.
      expect(ids(band.body)).toEqual([3, 9, 10, 20]);
    });

    it('returns an explicit id set in the order given, bypassing the limit', async () => {
      const res = await request(http).get('/api/poems/by-category?ids=17,1,9').expect(200);
      // array_position ordering — not sorted, not random. The id path also
      // binds one parameter fewer than the random path, so a mismatch here is
      // a bind error rather than a wrong result.
      expect(res.body.map((p) => p.id)).toEqual([17, 1, 9]);
    });

    it('honours limit and defaults to 10', async () => {
      const two = await request(http).get('/api/poems/by-category?limit=2').expect(200);
      expect(two.body.length).toBe(2);

      const dflt = await request(http).get('/api/poems/by-category').expect(200);
      expect(dflt.body.length).toBe(10);
    });

    it('returns an empty array for a value that matches nothing', async () => {
      const res = await request(http)
        .get('/api/poems/by-category?mood=no-such-mood-key')
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('includes uncategorized poems when no facet is requested', async () => {
      const res = await request(http).get('/api/poems/by-category?limit=50').expect(200);
      const uncategorized = res.body.filter((p) => p.moodPrimary == null);
      expect(uncategorized.length).toBe(4);
      // They still come back as complete poems, joined through themes.
      expect(uncategorized[0].arabic).toBeTruthy();
      expect(uncategorized[0].tags[0]).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poems/random', () => {
    it('serves a real poem and never one the filters exclude', async () => {
      const res = await request(http).get('/api/poems/random').expect(200);
      expect(res.body.id).toBeGreaterThan(0);
      expect(res.body.id).toBeLessThanOrEqual(24);
      // Normalized: this poem may or may not be the vocalized one.
      expect(stripTashkeel(res.body.arabic)).toContain('اختبار');
      expect(stripTashkeel(res.body.poetArabic)).toContain('الاختبار');
      // formatPoem prefers the English name when poets.name_en exists, which
      // only happens if poetNameEnExpr() interpolated correctly.
      expect(res.body.poet).toMatch(/^Test Poet /);
      expect(res.body.tags).toHaveLength(1);
    });

    it('serves diacritized_content in preference to content', async () => {
      const res = await request(http)
        .get(`/api/poems/random?poet=${encodeURIComponent('شاعر الاختبار الأول')}&exclude=2,18,25`)
        .expect(200);
      expect(res.body.id).toBe(1);
      // COALESCE(diacritized_content, content): poem 1 is the vocalized fixture,
      // so the served text must carry tashkeel (U+064B..U+0652).
      expect(res.body.arabic).toMatch(/[ً-ْ]/);
      expect(res.body.cachedTranslation).toContain('Fabricated fixture text');
    });

    it('filters by poet', async () => {
      const res = await request(http)
        .get(`/api/poems/random?poet=${encodeURIComponent('شاعر الاختبار السابع')}`)
        .expect(200);
      expect([13, 17]).toContain(res.body.id);
    });

    it('excludes ids that have already been seen', async () => {
      const res = await request(http)
        .get(`/api/poems/random?poet=${encodeURIComponent('شاعر الاختبار السابع')}&exclude=13`)
        .expect(200);
      expect(res.body.id).toBe(17);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poems/by-poet/:poet', () => {
    it('returns only that poet, serving-filtered', async () => {
      const res = await request(http)
        .get(`/api/poems/by-poet/${encodeURIComponent('شاعر الاختبار الأول')}?limit=50`)
        .expect(200);
      // Poet one has four poems; 25 is below the quality floor.
      expect(ids(res.body)).toEqual([1, 2, 18]);
      for (const poem of res.body) expect(poem.poet).toBe('Test Poet One');
    });

    it('drops poems over the verse cap', async () => {
      const res = await request(http)
        .get(`/api/poems/by-poet/${encodeURIComponent('شاعر الاختبار الثالث')}?limit=50`)
        .expect(200);
      // Poem 26 has 30 verses. maxVerseLines is 24.
      expect(ids(res.body)).toEqual([5, 6, 19]);
    });

    it('returns an empty array for an unknown poet', async () => {
      const res = await request(http).get('/api/poems/by-poet/nobody').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poems/search', () => {
    it('matches poem content', async () => {
      const res = await request(http).get('/api/poems/search?q=الغربة&limit=50').expect(200);
      expect(ids(res.body)).toEqual([9]);
    });

    it('matches the poet name', async () => {
      const res = await request(http)
        .get(`/api/poems/search?q=${encodeURIComponent('السابع')}&limit=50`)
        .expect(200);
      expect(ids(res.body)).toEqual([13, 17]);
    });

    it('matches the title', async () => {
      const res = await request(http)
        .get(`/api/poems/search?q=${encodeURIComponent('بلا تصنيف')}&limit=50`)
        .expect(200);
      expect(ids(res.body)).toEqual([21, 22, 23, 24]);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poets', () => {
    it('returns every poet with a servable poem count', async () => {
      const res = await request(http).get('/api/poets?all=1').expect(200);
      expect(res.body.length).toBe(8);

      const one = res.body.find((p) => p.name === 'شاعر الاختبار الأول');
      expect(one.name_en).toBe('Test Poet One');
      // 4 poems, 3 servable. pg returns COUNT as a string.
      expect(Number(one.poem_count)).toBe(3);

      const total = res.body.reduce((sum, p) => sum + Number(p.poem_count), 0);
      expect(total).toBe(SERVABLE);
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /api/poems/:id', () => {
    it('returns a poem with its cached translation', async () => {
      const res = await request(http).get('/api/poems/9').expect(200);
      expect(res.body.id).toBe(9);
      expect(res.body.title).toBe('Test Poem 9 — Exile');
      expect(res.body.titleArabic).toContain('قصيدة اختبار');
      expect(res.body.cachedTranslation).toContain('Fabricated fixture text');
    });

    it('404s for an id that is not there', async () => {
      const res = await request(http).get('/api/poems/999999').expect(404);
      expect(res.body.error).toBe('Poem not found');
    });
  });

  // --------------------------------------------------------------------------
  describe('fixture integrity', () => {
    it('holds nothing but synthetic rows', async () => {
      // The licensing guarantee, asserted rather than asserted-in-a-comment.
      const { rows } = await pool.query(`
        SELECT
          (SELECT count(*)::int FROM poems WHERE source_dataset IS DISTINCT FROM 'fixture') AS foreign_poems,
          (SELECT count(*)::int FROM poems WHERE title NOT LIKE 'قصيدة اختبار%') AS odd_titles,
          (SELECT count(*)::int FROM poets WHERE name NOT LIKE '%الاختبار%') AS odd_poets
      `);
      expect(rows[0]).toEqual({ foreign_poems: 0, odd_titles: 0, odd_poets: 0 });
    });

    it('satisfies the v3 label contract from migration 20260727000000', async () => {
      // mood and topic are required (min_labels >= 1), motif optional, and no
      // dimension may exceed max_labels. The fixtures have to obey the contract
      // the schema declares, or they are not a fair stand-in for real data.
      const { rows } = await pool.query(`
        SELECT p.id, cd.key AS dim, count(*)::int AS n, cd.max_labels
          FROM poems p
          JOIN poem_categories pc ON pc.poem_id = p.id
          JOIN category_values cv ON cv.id = pc.value_id
          JOIN category_dimensions cd ON cd.id = cv.dimension_id
         GROUP BY p.id, cd.key, cd.max_labels
        HAVING count(*) > cd.max_labels
      `);
      expect(rows).toEqual([]);

      const { rows: missing } = await pool.query(`
        SELECT p.id, cd.key
          FROM poems p
          CROSS JOIN category_dimensions cd
         WHERE p.categorized_at IS NOT NULL AND cd.min_labels >= 1
           AND NOT EXISTS (
             SELECT 1 FROM poem_categories pc
               JOIN category_values cv ON cv.id = pc.value_id
              WHERE pc.poem_id = p.id AND cv.dimension_id = cd.id)
      `);
      expect(missing).toEqual([]);
    });

    it('keeps poems.categories in step with the poem_categories join', async () => {
      // The API reads mood_primary off poems but filters through the join. If
      // the two ever disagree a filter returns a poem whose displayed mood is
      // something else.
      const { rows } = await pool.query(`
        SELECT p.id FROM poems p
         WHERE p.mood_primary IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM poem_categories pc
               JOIN category_values cv ON cv.id = pc.value_id
               JOIN category_dimensions cd ON cd.id = cv.dimension_id
              WHERE pc.poem_id = p.id AND cd.key = 'mood' AND cv.key = p.mood_primary)
      `);
      expect(rows).toEqual([]);
    });
  });
});
