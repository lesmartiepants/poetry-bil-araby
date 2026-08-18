#!/usr/bin/env node
/**
 * Detect misaligned cached translations.
 *
 * The line-count guard in the backfill only checks that a translation has at
 * least as many lines as the original. A translation that merges the opening
 * bayt and then shifts by one has a matching count and is wrong from line 2
 * onward (see issue #733). Counting cannot see that; meaning can.
 *
 * Each Arabic line and each English line is embedded with a multilingual
 * model, and the line-to-line similarity matrix is scored. A correct
 * translation is diagonal. A shifted one has a bright off-diagonal band, which
 * is what this reports.
 *
 * Read-only: it never writes to the database.
 *
 * Usage:
 *   node scripts/check-translation-alignment.mjs --ids 87900,66800
 *   node scripts/check-translation-alignment.mjs --limit 200
 *   node scripts/check-translation-alignment.mjs --limit 200 --json report.json
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { scoreAlignment } from '../src/utils/alignmentScore.js';

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const IDS = arg('ids', null);
const LIMIT = parseInt(arg('limit', '100'), 10);
const JSON_OUT = arg('json', null);
const EMBED_MODEL = arg('embed-model', 'gemini-embedding-001');
const MIN_LINES = parseInt(arg('min-lines', '4'), 10);
const CONCURRENCY = parseInt(arg('concurrency', '4'), 10);

const envPath = path.resolve(arg('env', path.resolve(process.cwd(), '.env')));
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}
const KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set');
  process.exit(1);
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function embed(texts) {
  // batchEmbedContents caps per call, so chunk. Order is preserved.
  const out = [];
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    // The embedding endpoint rate-limits hard on a corpus sweep, and a 429 is
    // a "wait", not a failure — treat it as retryable alongside transport
    // errors, or most of the sample is lost to noise rather than to signal.
    let j;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(`${BASE}/models/${EMBED_MODEL}:batchEmbedContents?key=${KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: chunk.map((t) => ({
              model: `models/${EMBED_MODEL}`,
              content: { parts: [{ text: t }] },
              outputDimensionality: 768,
            })),
          }),
        });
        j = await res.json();
        if (j.embeddings) break;
        if (res.status !== 429 || attempt >= 6) {
          throw new Error(`embed failed (HTTP ${res.status}): ${JSON.stringify(j).slice(0, 160)}`);
        }
      } catch (e) {
        if (attempt >= 6) throw e;
      }
      await new Promise((r) => setTimeout(r, Math.min(60_000, 3000 * 2 ** attempt)));
    }
    out.push(...j.embeddings.map((e) => e.values));
  }
  return out;
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  query_timeout: 120_000,
});
await db.connect();

const where = IDS
  ? `p.id IN (${IDS.split(',').map((s) => parseInt(s, 10)).filter(Number.isFinite).join(',')})`
  : `p.cached_translation IS NOT NULL AND p.quality_score >= 75`;

const { rows } = await db.query(
  `SELECT p.id, po.name AS poet, coalesce(p.diacritized_content, p.content) AS body,
          p.cached_translation AS ct
     FROM poems p JOIN poets po ON po.id = p.poet_id
    WHERE ${where}
    ORDER BY ${IDS ? 'p.id' : 'random()'}
    ${IDS ? '' : `LIMIT ${LIMIT}`}`
);
await db.end();

const results = [];
let done = 0;

async function one(r) {
  // --ids may name a poem that has no translation yet. Nothing to score, and
  // it is not an error worth a stack trace mid-sweep.
  if (!r.ct) return;
  const ar = r.body.split('*').map((s) => s.trim()).filter(Boolean);
  const en = r.ct.split('*').map((s) => s.trim()).filter(Boolean);
  if (ar.length < MIN_LINES || en.length < MIN_LINES) return;
  const vecs = await embed([...ar, ...en]);
  const s = scoreAlignment(vecs.slice(0, ar.length), vecs.slice(ar.length));
  if (s.diagonal === null) return;
  results.push({ id: r.id, poet: r.poet, lines: ar.length, enLines: en.length, ...s });
  done++;
  if (done % 25 === 0) process.stdout.write(`\r  scored ${done}/${rows.length}`);
}

// Bounded concurrency: the embedding endpoint rate-limits, and a corpus sweep
// is not worth losing to a 429 storm.
const queue = [...rows];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const r = queue.shift();
      if (!r) return;
      try {
        await one(r);
      } catch (e) {
        console.error(`\n  poem ${r.id}: ${e.message}`);
      }
    }
  })
);
process.stdout.write('\n');

const misaligned = results.filter((r) => r.shift !== 0 && r.margin > 0.02);
misaligned.sort((a, b) => b.margin - a.margin);

console.log(`\nscored ${results.length} poems`);
console.log(`shifted: ${misaligned.length} (${((misaligned.length / results.length) * 100).toFixed(1)}%)\n`);
for (const m of misaligned.slice(0, 25)) {
  console.log(
    `  id ${String(m.id).padEnd(6)} ${String(m.lines).padStart(2)} lines  shift ${m.shift > 0 ? '+' : ''}${m.shift}  diag ${m.diagonal.toFixed(3)} -> ${m.best.toFixed(3)}  (+${m.margin.toFixed(3)})  ${m.poet}`
  );
}
if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ results, misaligned }, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}
