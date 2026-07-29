// FULL REVERSAL of the distillation merge — restores categorization to the
// exact state captured on 2026-07-27. Transactional: all-or-nothing.
//
//   node backups/categorization-2026-07-27/_restore.cjs          # dry run (counts only)
//   node backups/categorization-2026-07-27/_restore.cjs --apply  # actually restore
//
// What it does, in ONE transaction:
//   1. DELETE every poem_categories row for the poems in the backup, then
//      re-INSERT the backed-up rows verbatim (poem_id, value_id, confidence, model, created_at).
//   2. UPDATE poems.* categorization columns back to the backed-up values.
// Poems not present in the backup are left untouched.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const DIR = __dirname;
const load = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const links = load('poem_categories.json');
  const poems = load('poems_categorization.json');
  const poemIds = [...new Set(links.map(r => r.poem_id).concat(poems.map(p => p.id)))];
  console.log(`Backup holds ${links.length} links across ${new Set(links.map(r=>r.poem_id)).size} poems, ${poems.length} poem rows.`);

  if (!APPLY) {
    console.log('DRY RUN — pass --apply to restore. No changes made.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1. Rebuild poem_categories for the affected poems.
    await client.query('DELETE FROM poem_categories WHERE poem_id = ANY($1::int[])', [poemIds]);
    for (const r of links) {
      await client.query(
        `INSERT INTO poem_categories (poem_id, value_id, confidence, model, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (poem_id, value_id) DO NOTHING`,
        [r.poem_id, r.value_id, r.confidence, r.model, r.created_at]);
    }
    // 2. Restore poems scalars + JSONB.
    for (const p of poems) {
      await client.query(
        `UPDATE poems SET mood_primary=$2, emotional_intensity=$3, accessibility_score=$4,
           accessibility_level=$5, century=$6, categorized_at=$7, categorization_model=$8,
           categories=$9::jsonb WHERE id=$1`,
        [p.id, p.mood_primary, p.emotional_intensity, p.accessibility_score, p.accessibility_level,
         p.century, p.categorized_at, p.categorization_model,
         p.categories == null ? null : JSON.stringify(p.categories)]);
    }
    await client.query('COMMIT');
    const n = (await client.query('SELECT count(*) c FROM poem_categories WHERE poem_id = ANY($1::int[])', [poemIds])).rows[0].c;
    console.log(`RESTORED. poem_categories now holds ${n} links for the restored poems (backup had ${links.length}).`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLED BACK:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
