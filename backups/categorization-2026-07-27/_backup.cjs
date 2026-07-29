// Read-only backup of the categorization state, for full reversibility of the
// distillation merge. Exports:
//   - all poem_categories rows (the authoritative normalized links)
//   - the poems categorization columns (JSONB cache + scalars + provenance)
//   - the taxonomy tables (dimensions/values/families) as a value_id safety net
// No writes. Run from the main repo root: `node backups/.../_backup.cjs`
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const OUT = __dirname;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function writeJson(name, rows) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(rows, null, 0));
  const bytes = fs.statSync(p).size;
  return { name, rows: rows.length, bytes };
}

(async () => {
  const q = async (s) => (await pool.query(s)).rows;
  const meta = { created_at: new Date().toISOString(), files: [] };

  // 1. All normalized links — the authoritative query path.
  const pc = await q('SELECT poem_id, value_id, confidence, model, created_at FROM poem_categories ORDER BY poem_id, value_id');
  meta.files.push(writeJson('poem_categories.json', pc));

  // 2. Poems categorization columns (only rows that have any categorization).
  const poems = await q(`
    SELECT id, mood_primary, emotional_intensity, accessibility_score, accessibility_level,
           century, categorized_at, categorization_model, categories
    FROM poems
    WHERE categorized_at IS NOT NULL OR categories IS NOT NULL
    ORDER BY id`);
  meta.files.push(writeJson('poems_categorization.json', poems));

  // 3. Taxonomy snapshot — so a restore can map value_id even if the taxonomy
  //    is later re-seeded. Small, cheap insurance.
  meta.files.push(writeJson('category_dimensions.json', await q('SELECT * FROM category_dimensions ORDER BY id')));
  meta.files.push(writeJson('category_values.json', await q('SELECT * FROM category_values ORDER BY id')));
  meta.files.push(writeJson('category_families.json', await q('SELECT * FROM category_families ORDER BY id')));

  // Integrity fingerprints captured at backup time.
  meta.fingerprint = {
    poem_categories_rows: pc.length,
    distinct_poems_in_links: new Set(pc.map(r => r.poem_id)).size,
    poems_with_categorization: poems.length,
    avg_labels_per_poem: +(pc.length / new Set(pc.map(r => r.poem_id)).size).toFixed(4),
  };

  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));
  await pool.end();
})().catch(e => { console.error('BACKUP FAILED:', e.message); process.exit(1); });
