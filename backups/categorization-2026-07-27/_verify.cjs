// Post-merge verification. Read-only. Compares live DB to the pre-merge backup.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const DIR = __dirname;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const q = async (s) => (await pool.query(s)).rows;
  const one = async (s) => (await q(s))[0];
  const R = {};

  R.total_poems = +(await one('SELECT count(*) c FROM poems')).c;
  R.with_content = +(await one("SELECT count(*) c FROM poems WHERE content IS NOT NULL AND content<>''")).c;
  R.categorized_at = +(await one('SELECT count(*) c FROM poems WHERE categorized_at IS NOT NULL')).c;
  R.with_jsonb = +(await one('SELECT count(*) c FROM poems WHERE categories IS NOT NULL')).c;
  R.with_links = +(await one('SELECT count(DISTINCT poem_id) c FROM poem_categories')).c;
  R.total_links = +(await one('SELECT count(*) c FROM poem_categories')).c;
  R.avg_labels = +(R.total_links / R.with_links).toFixed(3);

  // version stamp coverage
  R.v3_stamped = +(await one(`SELECT count(*) c FROM poems WHERE categories->>'taxonomy_version'='3'`)).c;
  R.model_stamped = +(await one(`SELECT count(*) c FROM poems WHERE categorization_model='gemini/gemini-3.6-flash'`)).c;

  // per-dim avg
  R.per_dim = await q(`SELECT d.key, round(count(*)::numeric/count(distinct pc.poem_id),2) avg
    FROM poem_categories pc JOIN category_values cv ON cv.id=pc.value_id JOIN category_dimensions d ON d.id=cv.dimension_id
    GROUP BY d.key ORDER BY d.key`);

  // integrity
  R.orphan_links = +(await one('SELECT count(*) c FROM poem_categories pc LEFT JOIN poems p ON p.id=pc.poem_id WHERE p.id IS NULL')).c;
  R.categorized_no_links = +(await one(`SELECT count(*) c FROM poems p WHERE p.categorized_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM poem_categories pc WHERE pc.poem_id=p.id)`)).c;
  R.no_mood = +(await one(`SELECT count(*) c FROM poems p WHERE p.categorized_at IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM poem_categories pc JOIN category_values cv ON cv.id=pc.value_id JOIN category_dimensions d ON d.id=cv.dimension_id WHERE pc.poem_id=p.id AND d.key='mood')`)).c;
  R.no_topic = +(await one(`SELECT count(*) c FROM poems p WHERE p.categorized_at IS NOT NULL AND NOT EXISTS
     (SELECT 1 FROM poem_categories pc JOIN category_values cv ON cv.id=pc.value_id JOIN category_dimensions d ON d.id=cv.dimension_id WHERE pc.poem_id=p.id AND d.key='topic')`)).c;
  // duplicate links impossible (PK) but check anyway
  R.dup_links = +(await one('SELECT count(*) c FROM (SELECT poem_id, value_id, count(*) n FROM poem_categories GROUP BY 1,2 HAVING count(*)>1) s')).c;

  // JSONB == table: compare the set of value keys in categories (moods+topics+motifs) to poem_categories keys
  const mism = await q(`
    WITH jsonb_keys AS (
      SELECT p.id poem_id, k FROM poems p,
      LATERAL (SELECT jsonb_array_elements_text(coalesce(p.categories->'moods','[]'::jsonb)) k
               UNION ALL SELECT jsonb_array_elements_text(coalesce(p.categories->'topics','[]'::jsonb))
               UNION ALL SELECT jsonb_array_elements_text(coalesce(p.categories->'motifs','[]'::jsonb))) x
      WHERE p.categories IS NOT NULL
    ),
    tbl_keys AS (SELECT pc.poem_id, cv.key k FROM poem_categories pc JOIN category_values cv ON cv.id=pc.value_id)
    SELECT count(*) c FROM (
      SELECT poem_id, k FROM jsonb_keys EXCEPT SELECT poem_id, k FROM tbl_keys
      UNION ALL
      SELECT poem_id, k FROM tbl_keys EXCEPT SELECT poem_id, k FROM jsonb_keys
    ) diff`);
  R.jsonb_table_mismatched_keys = +mism[0].c;

  // prevalence after vs backup(before) for broad values
  const before = JSON.parse(fs.readFileSync(path.join(DIR, 'poem_categories.json'), 'utf8'));
  const bvals = JSON.parse(fs.readFileSync(path.join(DIR, 'category_values.json'), 'utf8'));
  const vid2key = Object.fromEntries(bvals.map(v => [v.id, v.key]));
  const beforePrev = {}; const beforePoems = new Set(before.map(r => r.poem_id));
  const seenBV = {}; // poem->set
  before.forEach(r => { const k = vid2key[r.value_id]; (seenBV[r.poem_id] = seenBV[r.poem_id] || new Set()).add(k); });
  Object.values(seenBV).forEach(set => set.forEach(k => beforePrev[k] = (beforePrev[k] || 0) + 1));
  const nBefore = beforePoems.size;
  const afterPrevRows = await q(`SELECT cv.key, count(distinct pc.poem_id) c FROM poem_categories pc JOIN category_values cv ON cv.id=pc.value_id GROUP BY cv.key`);
  const afterPrev = Object.fromEntries(afterPrevRows.map(r => [r.key, +r.c]));
  const nAfter = R.with_links;
  const watch = ['love', 'melancholy', 'tears', 'yearning', 'honor-pride', 'night', 'grief', 'passion', 'amorous'];
  R.prevalence = watch.map(k => ({ value: k, before: (100 * (beforePrev[k] || 0) / nBefore).toFixed(1) + '%', after: (100 * (afterPrev[k] || 0) / nAfter).toFixed(1) + '%' }));

  console.log(JSON.stringify(R, null, 2));

  // spot-check 10: top/mid/bottom by label count
  const spot = await q(`
    WITH lc AS (SELECT poem_id, count(*) n FROM poem_categories GROUP BY poem_id)
    (SELECT poem_id, n, 'top' bucket FROM lc ORDER BY n DESC LIMIT 4)
    UNION ALL (SELECT poem_id, n, 'mid' FROM lc ORDER BY abs(n-4) LIMIT 3)
    UNION ALL (SELECT poem_id, n, 'bottom' FROM lc ORDER BY n ASC LIMIT 3)`);
  console.log('\n=== SPOT CHECK (10 poems) ===');
  for (const s of spot) {
    const p = (await q(`SELECT left(title,36) title, categories->>'rationale' rat,
      categories->'moods' m, categories->'topics' t, categories->'motifs' mo, mood_primary FROM poems WHERE id=${s.poem_id}`))[0];
    console.log(`[${s.bucket}] #${s.poem_id} (${s.n} labels) "${p.title}" | mood=${JSON.stringify(p.m)} topic=${JSON.stringify(p.t)} motif=${JSON.stringify(p.mo)} | primary=${p.mood_primary}`);
    console.log(`    rationale: ${(p.rat || '').slice(0, 120)}`);
  }
  await pool.end();
})().catch(e => { console.error('VERIFY ERR:', e.message); process.exit(1); });
