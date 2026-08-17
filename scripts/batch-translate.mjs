#!/usr/bin/env node
/**
 * Backfill cached translations for the corpus via the Gemini Batch API.
 *
 * Batch is half the price of the interactive endpoint and has no urgency
 * attached, which fits a backfill. The job is submitted as a file of requests,
 * runs asynchronously (minutes to 24h), and the results are written back into
 * poems.cached_translation / cached_explanation / cached_author_bio.
 *
 * The script is resumable: it only ever selects rows where cached_translation
 * IS NULL, so re-running after a partial write picks up where it stopped.
 *
 * Usage:
 *   node scripts/batch-translate.mjs --scope serving --dry-run
 *   node scripts/batch-translate.mjs --scope serving --limit 25
 *   node scripts/batch-translate.mjs --scope serving
 *   node scripts/batch-translate.mjs --scope all
 *   node scripts/batch-translate.mjs --resume batches/<id>
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { buildInsightPrompt } from '../src/utils/insightPrompt.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const SCOPE = arg('scope', 'serving'); // serving | all
const LIMIT = parseInt(arg('limit', '0'), 10); // 0 = no cap
const MODEL = arg('model', 'gemini-3.7-flash');
const DRY_RUN = flag('dry-run');
const RESUME = arg('resume', null);
const POLL_SECONDS = parseInt(arg('poll', '60'), 10);

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ── env ────────────────────────────────────────────────────────────────────
// --env lets a git worktree borrow the main checkout's .env, which is where
// the credentials live; worktrees don't get their own copy.
const envPath = path.resolve(arg('env', path.resolve(process.cwd(), '.env')));
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
}
const KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!KEY) die('GEMINI_API_KEY (or VITE_GEMINI_API_KEY) is not set');
if (!DATABASE_URL) die('DATABASE_URL is not set');

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

/**
 * fetch with retry on transport failures.
 *
 * The request payload runs to tens of megabytes and the poll loop can span
 * hours, so a single ECONNRESET should cost a few seconds rather than the
 * whole run. Only transport errors are retried — an HTTP error response is
 * returned to the caller, which knows whether it is fatal.
 */
async function fetchRetry(url, init, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      const wait = 2000 * 2 ** i;
      console.log(`  network error (${e.cause?.code || e.message}), retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

// ── prompt ─────────────────────────────────────────────────────────────────
// Read the live prompt rather than a copy, so a batch backfill and an
// in-app translation can never drift apart.
const promptsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/prompts.js'), 'utf8');
const promptMatch = promptsSrc.match(/export const INSIGHTS_SYSTEM_PROMPT = `([\s\S]*?)`/);
if (!promptMatch) die('could not read INSIGHTS_SYSTEM_PROMPT from src/prompts.js');
const SYSTEM_PROMPT = promptMatch[1].trim();

// The corpus stores hemistichs separated by '*'; the reader renders them as
// newlines. Translate against the newline form so the line contract in the
// prompt counts what the reader will actually display.
const toLines = (body) => body.split('*').join('\n');

const buildPrompt = (poem) => buildInsightPrompt({ arabic: toLines(poem.body), poet: poem.poet });

const parseInsight = (text) => {
  if (!text) return null;
  const parts = text
    .split(/POEM:|THE DEPTH:|THE AUTHOR:/i)
    .map((p) => p.trim())
    .filter(Boolean);
  return { poeticTranslation: parts[0] || '', depth: parts[1] || '', author: parts[2] || '' };
};

// ── db ─────────────────────────────────────────────────────────────────────
// Timeouts are not optional here. Without a query timeout, a dropped pooler
// connection leaves the client waiting forever on the next write, process
// alive at 0% CPU — indistinguishable from slow progress.
const dbOptions = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  statement_timeout: 120_000,
  query_timeout: 120_000,
  connectionTimeoutMillis: 30_000,
};

let db = new pg.Client(dbOptions);

async function reconnect() {
  try {
    await db.end();
  } catch {
    /* already closed */
  }
  db = new pg.Client(dbOptions);
  await db.connect();
}

// Mirrors SERVING in server.js. Poems outside it are never returned to a
// reader, so translating them buys nothing until the filter changes.
const SERVING_CLAUSE = `p.quality_score >= 75
  AND array_length(string_to_array(coalesce(p.diacritized_content, p.content), '*'), 1) <= 24`;

async function selectPoems() {
  const where =
    SCOPE === 'all' ? 'p.cached_translation IS NULL' : `p.cached_translation IS NULL AND ${SERVING_CLAUSE}`;
  const { rows } = await db.query(
    `SELECT p.id, po.name AS poet, coalesce(p.diacritized_content, p.content) AS body
       FROM poems p JOIN poets po ON po.id = p.poet_id
      WHERE ${where}
      ORDER BY p.quality_score DESC NULLS LAST, p.id
      ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ''}`
  );
  return rows;
}

// ── batch job ──────────────────────────────────────────────────────────────
async function submit(poems) {
  // Requests go up as a JSONL file: inline request lists are capped well below
  // corpus scale, and the file route is what the Batch API expects for bulk.
  const jsonl = poems
    .map((p) =>
      JSON.stringify({
        key: String(p.id),
        request: {
          contents: [{ parts: [{ text: buildPrompt(p) }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
        },
      })
    )
    .join('\n');

  const tmp = path.resolve(process.cwd(), `.batch-translate-${Date.now()}.jsonl`);
  fs.writeFileSync(tmp, jsonl);
  const bytes = fs.statSync(tmp).size;
  console.log(`  request file: ${(bytes / 1024 / 1024).toFixed(1)} MB`);

  // Resumable uploads use the /upload/ host prefix, not the plain API base.
  const start = await fetchRetry(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes),
      'X-Goog-Upload-Header-Content-Type': 'application/jsonl',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: 'poem-translations' } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    // Leave no 30MB payload behind when the upload never gets off the ground.
    fs.unlinkSync(tmp);
    die(`file upload did not start (HTTP ${start.status}): ${(await start.text()).slice(0, 300)}`);
  }

  const up = await fetchRetry(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fs.readFileSync(tmp),
  });
  const uploaded = await up.json();
  fs.unlinkSync(tmp);
  if (!uploaded.file?.name) die(`upload failed: ${JSON.stringify(uploaded).slice(0, 300)}`);
  console.log(`  uploaded as ${uploaded.file.name}`);

  const create = await fetchRetry(`${BASE}/models/${MODEL}:batchGenerateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batch: {
        display_name: `translations-${SCOPE}-${new Date().toISOString().slice(0, 10)}`,
        input_config: { file_name: uploaded.file.name },
      },
    }),
  });
  const job = await create.json();
  if (!job.name) die(`batch create failed: ${JSON.stringify(job).slice(0, 400)}`);
  return job.name;
}

async function waitFor(jobName) {
  console.log(`\nPolling ${jobName} every ${POLL_SECONDS}s (Ctrl-C is safe; resume with --resume)`);
  for (;;) {
    const r = await fetchRetry(`${BASE}/${jobName}?key=${KEY}`);
    const j = await r.json();
    const state = j.metadata?.state || j.state;
    const done = j.metadata?.completedRequestCount ?? j.metadata?.succeededRequestCount;
    console.log(`  ${new Date().toISOString().slice(11, 19)} ${state}${done ? ` (${done} done)` : ''}`);
    if (state === 'BATCH_STATE_SUCCEEDED') return j;
    if (state === 'BATCH_STATE_FAILED' || state === 'BATCH_STATE_CANCELLED') {
      die(`batch ${state}: ${JSON.stringify(j).slice(0, 400)}`);
    }
    await new Promise((res) => setTimeout(res, POLL_SECONDS * 1000));
  }
}

async function collect(job) {
  const out = [];
  const fileName = job.response?.responsesFile;
  if (fileName) {
    const dl = await fetchRetry(`${BASE}/${fileName}:download?alt=media&key=${KEY}`);
    const text = await dl.text();
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        /* a malformed line costs one poem, not the run */
      }
    }
  } else {
    for (const r of job.response?.inlinedResponses?.inlinedResponses || []) out.push(r);
  }
  return out;
}

// ── write back ─────────────────────────────────────────────────────────────
async function writeBack(results, poemsById) {
  const stats = { written: 0, shortLines: 0, noPoem: 0, apiError: 0 };
  const pending = [];

  for (const r of results) {
    const id = r.key ?? r.metadata?.key;
    const poem = poemsById.get(String(id));
    if (!poem) continue;

    const text = r.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      stats.apiError++;
      continue;
    }
    const parts = parseInsight(text);
    if (!parts?.poeticTranslation) {
      stats.noPoem++;
      continue;
    }

    // Same guard the app applies before caching: a translation with fewer
    // lines than the original is truncated, and caching it would freeze the
    // truncation in place for every future reader.
    const arabicLines = toLines(poem.body).split('\n').filter((l) => l.trim()).length;
    const englishLines = parts.poeticTranslation.split('\n').filter((l) => l.trim()).length;
    if (englishLines < arabicLines) {
      stats.shortLines++;
      continue;
    }

    // Newlines are stored as '*', matching the corpus convention and the
    // app's own saveTranslation().
    pending.push([
      poem.id,
      parts.poeticTranslation.replace(/\n/g, '*'),
      parts.depth || null,
      parts.author || null,
    ]);
  }

  if (DRY_RUN) {
    stats.written = pending.length;
    return stats;
  }

  // One round trip per chunk rather than per poem. Against the Supabase pooler
  // a single-row UPDATE costs ~700ms, so row-at-a-time writes took 45 minutes
  // for a serving-set backfill that the database itself handles in seconds.
  const CHUNK = 250;
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const values = chunk
      .map((_, j) => `($${j * 4 + 1}::int, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`)
      .join(',');
    await db.query(
      `UPDATE poems p
          SET cached_translation = v.translation,
              cached_explanation = v.explanation,
              cached_author_bio  = v.bio,
              translated_at      = now()
         FROM (VALUES ${values}) AS v(id, translation, explanation, bio)
        WHERE p.id = v.id AND p.cached_translation IS NULL`,
      chunk.flat()
    );
    stats.written += chunk.length;
    process.stdout.write(`\r  writing ${stats.written}/${pending.length}`);
  }
  if (pending.length) process.stdout.write('\n');
  return stats;
}

// ── main ───────────────────────────────────────────────────────────────────
await db.connect();

const poems = await selectPoems();
console.log('='.repeat(64));
console.log('BATCH TRANSLATION BACKFILL');
console.log('='.repeat(64));
console.log(`  scope:   ${SCOPE}${LIMIT ? ` (capped at ${LIMIT})` : ''}`);
console.log(`  model:   ${MODEL} (thinkingLevel: low)`);
console.log(`  poems:   ${poems.length} untranslated`);
console.log(`  mode:    ${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — writes to the database'}`);

if (poems.length === 0) {
  console.log('\nNothing to do.');
  await db.end();
  process.exit(0);
}

const poemsById = new Map(poems.map((p) => [String(p.id), p]));

const jobName = RESUME || (await submit(poems));
if (!RESUME) console.log(`  job:     ${jobName}`);

// Release the connection across the poll — it can run for hours, and an idle
// pooler connection is a connection the pooler is entitled to close.
await db.end();

const job = await waitFor(jobName);
const results = await collect(job);
console.log(`\nCollected ${results.length} responses`);

await reconnect();
const stats = await writeBack(results, poemsById);
console.log('\n' + '-'.repeat(64));
console.log(`  written:            ${stats.written}`);
console.log(`  skipped (short):    ${stats.shortLines}`);
console.log(`  skipped (no POEM):  ${stats.noPoem}`);
console.log(`  skipped (api err):  ${stats.apiError}`);
console.log('-'.repeat(64));

const { rows } = await db.query(
  `SELECT count(*) FILTER (WHERE cached_translation IS NOT NULL) translated,
          count(*) total
     FROM poems p WHERE ${SERVING_CLAUSE}`
);
console.log(
  `  serving coverage now: ${rows[0].translated}/${rows[0].total} ` +
    `(${((rows[0].translated / rows[0].total) * 100).toFixed(1)}%)`
);

await db.end();
