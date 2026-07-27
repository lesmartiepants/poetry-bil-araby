#!/usr/bin/env node
/**
 * check_audit.mjs — lightweight, read-only diagnostic for the categorization audit.
 *
 * Asserts the audit's key facts. Two parts:
 *   1. STATIC (always runs, no network): the distilled sample output stays <= 6
 *      tags/poem and is strictly smaller than the production tagging.
 *   2. LIVE DB (skips gracefully if no DATABASE_URL / no `pg` / can't connect):
 *      coverage ~100%, avg labels/poem > 6 (documents over-tagging), and at least
 *      one value on > 40% of poems (documents weak filters).
 *
 * This is a diagnostic, not a unit test. It is READ-ONLY: it never writes to the
 * DB. Exit 0 on pass OR skip; exit 1 only when data is present and an assertion
 * actually fails.
 *
 *   node poetry_quality_and_curation/categorization/audit/check_audit.mjs
 *   DATABASE_URL=... node .../check_audit.mjs        # includes live DB checks
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
let failures = 0;
const ok = (msg) => console.log(`  PASS  ${msg}`);
const bad = (msg) => { console.log(`  FAIL  ${msg}`); failures++; };
const check = (cond, msg) => { try { assert.ok(cond); ok(msg); } catch { bad(msg); } };

// -- Part 1: static assertions on the committed sample -----------------------
console.log('\n[1] Distilled sample (static, no DB)');
const CAP_TOTAL = 6; // mood 2 + topic 2 + motif 2
const sample = JSON.parse(readFileSync(join(HERE, 'samples', 'before_after.json'), 'utf8'));
assert.ok(Array.isArray(sample.samples) && sample.samples.length >= 1, 'sample file has entries');
for (const s of sample.samples) {
  const a = s.after;
  const afterTotal = (a.moods?.length || 0) + (a.topics?.length || 0) + (a.motifs?.length || 0);
  const beforeTotal =
    (s.before.mood?.length || 0) + (s.before.topic?.length || 0) + (s.before.motif?.length || 0);
  check(afterTotal <= CAP_TOTAL, `poem ${s.id}: distilled output ${afterTotal} tags <= ${CAP_TOTAL}`);
  check((a.moods?.length || 0) <= 2 && (a.topics?.length || 0) <= 2 && (a.motifs?.length || 0) <= 2,
    `poem ${s.id}: each dimension <= 2 labels`);
  check(afterTotal < beforeTotal, `poem ${s.id}: distilled (${afterTotal}) < production (${beforeTotal})`);
  check(a.mood_primary && a.moods?.includes(a.mood_primary),
    `poem ${s.id}: mood_primary present and within moods`);
}

// -- Part 2: live DB assertions (skip if unavailable) ------------------------
console.log('\n[2] Live corpus (skips gracefully)');
const url = process.env.DATABASE_URL;
if (!url) { console.log('  SKIP  DATABASE_URL not set — live checks skipped.'); report(); }

let pg;
try { pg = (await import('pg')).default ?? (await import('pg')); }
catch { console.log('  SKIP  `pg` not installed here — live checks skipped.'); report(); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
} catch (e) {
  console.log(`  SKIP  could not connect (${e.code || e.message}) — live checks skipped.`);
  report();
}

try {
  const cov = (await client.query(`
    SELECT count(*) FILTER (WHERE content IS NOT NULL AND content <> '') AS with_content,
           count(*) FILTER (WHERE content IS NOT NULL AND content <> '' AND categorized_at IS NOT NULL) AS categorized
    FROM poems`)).rows[0];
  const ratio = cov.categorized / cov.with_content;
  console.log(`        coverage: ${cov.categorized}/${cov.with_content} = ${(ratio * 100).toFixed(2)}%`);
  check(ratio >= 0.99, `coverage >= 99% of content-bearing poems (got ${(ratio * 100).toFixed(2)}%)`);

  const avg = (await client.query(`
    WITH t AS (SELECT poem_id, count(*) n FROM poem_categories GROUP BY poem_id)
    SELECT round(avg(n), 2)::float AS avg_total, max(n) AS max FROM t`)).rows[0];
  console.log(`        avg labels/poem: ${avg.avg_total} (max ${avg.max})`);
  check(avg.avg_total > 6, `over-tagging present: avg labels/poem > 6 (got ${avg.avg_total})`);

  const top = (await client.query(`
    WITH cat AS (SELECT count(*) n FROM poems WHERE categorized_at IS NOT NULL)
    SELECT v.key, round(100.0 * count(DISTINCT pc.poem_id) / (SELECT n FROM cat), 1)::float AS pct
    FROM poem_categories pc JOIN category_values v ON pc.value_id = v.id
    GROUP BY v.key ORDER BY pct DESC LIMIT 1`)).rows[0];
  console.log(`        most prevalent value: ${top.key} on ${top.pct}% of poems`);
  check(top.pct > 40, `weak filters: at least one value on > 40% of poems (${top.key} @ ${top.pct}%)`);
} finally {
  await client.end();
}
report();

function report() {
  console.log(`\n${failures === 0 ? 'OK' : 'FAILED'} — ${failures} failure(s).`);
  process.exit(failures === 0 ? 0 : 1);
}
