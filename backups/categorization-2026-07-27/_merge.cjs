// Merge the distilled re-classification into the DB, mirroring the real
// import_categories.import_rows exactly. Batched transactions (commit every
// COMMIT_EVERY poems); on any error the open batch ROLLS BACK and the run stops.
// Backup at backups/categorization-2026-07-27/ is the full-reversal safety net.
//
//   node backups/.../_merge.cjs           # dry run: projected numbers, NO writes
//   node backups/.../_merge.cjs --apply   # perform the merge
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const DIR = __dirname;
const CKPT = path.join(DIR, '_full_checkpoint.jsonl');
const COMMIT_EVERY = 300;
const FLOOR = 65;
const MODEL = 'gemini/gemini-3.6-flash';
const TAXV = '3', PROMPTV = 'distill-1';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// mirror config.apply_confidence_floor
function applyFloor(dimLists, confidences, moodPrimary) {
  const kept = {};
  for (const [dim, keys] of Object.entries(dimLists)) {
    const out = [];
    for (const k of keys) { const c = confidences[k]; if (c == null || c >= FLOOR || (dim === 'mood' && k === moodPrimary)) out.push(k); }
    kept[dim] = out;
  }
  if (moodPrimary && !(kept.mood || []).includes(moodPrimary)) (kept.mood = kept.mood || []).unshift(moodPrimary);
  return kept;
}

async function loadRows() {
  const rows = [];
  const seen = new Set();
  const rl = readline.createInterface({ input: fs.createReadStream(CKPT), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim(); if (!t) continue;
    let r; try { r = JSON.parse(t); } catch { continue; }
    if (seen.has(r.poem_id)) continue; // last-write-wins would need reverse; checkpoint is append-once per id
    seen.add(r.poem_id); rows.push(r);
  }
  return rows;
}

(async () => {
  const rows = await loadRows();
  // value_id lookup: (dim_key|value_key) -> value_id
  const vlook = {};
  const vres = (await pool.query(`SELECT cv.key val, d.key dim, cv.id FROM category_values cv JOIN category_dimensions d ON d.id = cv.dimension_id`)).rows;
  vres.forEach(v => vlook[`${v.dim}|${v.val}`] = v.id);

  // Project the merge (works for both dry-run and pre-apply summary).
  let totalLinks = 0, noMood = 0, noTopic = 0, missingVid = 0;
  const perPoem = rows.map(r => {
    const dimLists = applyFloor({ mood: r.moods || [], topic: r.topics || [], motif: r.motifs || [] }, r.confidences || {}, r.mood_primary);
    const entries = [];
    for (const dim of ['mood', 'topic', 'motif']) for (const k of dimLists[dim]) { const vid = vlook[`${dim}|${k}`]; if (vid) entries.push([vid, k]); else missingVid++; }
    totalLinks += entries.length;
    if (!dimLists.mood.length) noMood++;
    if (!dimLists.topic.length) noTopic++;
    return { r, dimLists, entries };
  });
  console.log(`checkpoint poems: ${rows.length}`);
  console.log(`projected links: ${totalLinks} (avg ${(totalLinks / rows.length).toFixed(2)}/poem)`);
  console.log(`poems with 0 mood after floor: ${noMood}; 0 topic: ${noTopic}; unmapped value keys: ${missingVid}`);

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to merge. No writes.'); await pool.end(); return; }

  const client = await pool.connect();
  let poemsUpdated = 0, linksWritten = 0, processed = 0;
  try {
    await client.query('BEGIN');
    for (const { r, dimLists, entries } of perPoem) {
      const payload = { moods: dimLists.mood, topics: dimLists.topic, motifs: dimLists.motif, confidences: r.confidences || {}, taxonomy_version: TAXV, prompt_version: PROMPTV };
      if (r.rationale) payload.rationale = r.rationale;
      const up = await client.query(
        `UPDATE poems SET mood_primary=$1, emotional_intensity=$2, accessibility_level=$3,
           categories=$4::jsonb, categorized_at=now(), categorization_model=$5 WHERE id=$6`,
        [r.mood_primary || null, r.emotional_intensity, r.accessibility_level, JSON.stringify(payload), MODEL, r.poem_id]);
      poemsUpdated += up.rowCount;
      await client.query('DELETE FROM poem_categories WHERE poem_id=$1', [r.poem_id]);
      for (const [vid, vkey] of entries) {
        const ins = await client.query(
          `INSERT INTO poem_categories (poem_id, value_id, confidence, model) VALUES ($1,$2,$3,$4) ON CONFLICT (poem_id, value_id) DO NOTHING`,
          [r.poem_id, vid, (r.confidences || {})[vkey] ?? null, MODEL]);
        linksWritten += ins.rowCount;
      }
      processed++;
      if (processed % COMMIT_EVERY === 0) { await client.query('COMMIT'); await client.query('BEGIN'); console.log(`  committed ${processed}/${perPoem.length} poems, ${linksWritten} links so far`); }
    }
    await client.query('COMMIT');
    console.log(`\nMERGE DONE: ${poemsUpdated} poems updated, ${linksWritten} links written.`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`\nERROR after ${processed} poems — open batch ROLLED BACK. Committed batches remain (restore available). Message: ${e.message}`);
    process.exit(1);
  } finally { client.release(); await pool.end(); }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
