#!/usr/bin/env node
/**
 * Bulk Re-Translation Script
 *
 * Translates poems using the backend Gemini proxy and saves results
 * via the translation cache endpoint.
 *
 * Usage:
 *   node scripts/bulk-retranslate.mjs [--limit 100] [--concurrency 5] [--api http://localhost:3001]
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const LIMIT = parseInt(getArg('limit', '100'));
const CONCURRENCY = parseInt(getArg('concurrency', '5'));
const API_BASE = getArg('api', 'http://localhost:3001');
const MODEL = getArg('model', 'gemini-2.5-flash');

// Load .env
try {
  const envPath = resolve(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* .env is optional if DATABASE_URL is already set */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

// Extract system prompt from prompts.js
const promptsSrc = readFileSync(resolve(__dirname, '..', 'src', 'prompts.js'), 'utf-8');
const promptMatch = promptsSrc.match(/export const INSIGHTS_SYSTEM_PROMPT = `([\s\S]*?)`/);
if (!promptMatch) {
  console.error('ERROR: Could not extract INSIGHTS_SYSTEM_PROMPT from src/prompts.js');
  process.exit(1);
}
const SYSTEM_PROMPT = promptMatch[1].trim();

console.log('='.repeat(60));
console.log('BULK RE-TRANSLATION');
console.log('='.repeat(60));
console.log(`  Poems: ${LIMIT}`);
console.log(`  Concurrency: ${CONCURRENCY}`);
console.log(`  Model: ${MODEL}`);
console.log(`  API: ${API_BASE}`);
console.log(`  Prompt length: ${SYSTEM_PROMPT.length} chars`);
console.log();

// DB connection
const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function fetchPoems() {
  const { rows } = await pool.query(`
    SELECT p.id, pt.name as poet, p.title, p.content as arabic
    FROM poems p
    JOIN poets pt ON p.poet_id = pt.id
    WHERE p.quality_score >= 75
      AND p.translated_at IS NULL
      AND array_length(string_to_array(
        COALESCE(p.diacritized_content, p.content), '*'), 1) <= 24
    ORDER BY p.quality_score DESC, random()
    LIMIT $1
  `, [LIMIT]);
  return rows;
}

async function translatePoem(poem) {
  const poetInfo = poem.poet ? ` by ${poem.poet}` : '';
  const userPrompt = `Deep Analysis of${poetInfo}:\n\n${poem.arabic}`;

  const body = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  };

  const url = `${API_BASE}/api/ai/${MODEL}/generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

function parseInsight(text) {
  const parts = text.split(/POEM:|THE DEPTH:|THE AUTHOR:/i);
  if (parts.length < 4) return null;
  return {
    translation: parts[1].trim(),
    explanation: parts[2].trim(),
    authorBio: parts[3].trim(),
  };
}

async function saveToDB(poemId, parsed) {
  // Write directly to DB (bypasses write-once guard since we cleared translated_at)
  const result = await pool.query(
    `UPDATE poems SET cached_translation = $1, cached_explanation = $2,
     cached_author_bio = $3, translated_at = NOW()
     WHERE id = $4 AND translated_at IS NULL
     RETURNING id`,
    [parsed.translation, parsed.explanation, parsed.authorBio, poemId]
  );
  return result.rowCount > 0;
}

async function processPoem(poem, index, total) {
  const tag = `[${index + 1}/${total}]`;
  const start = Date.now();

  try {
    const raw = await translatePoem(poem);
    const parsed = parseInsight(raw);

    if (!parsed) {
      console.log(`  ${tag} PARSE_FAIL  ${poem.id} (${poem.poet})`);
      return { id: poem.id, status: 'parse_fail' };
    }

    const saved = await saveToDB(poem.id, parsed);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (saved) {
      console.log(`  ${tag} OK  ${poem.id} (${poem.poet}) ${elapsed}s`);
      return { id: poem.id, status: 'ok', elapsed: parseFloat(elapsed) };
    } else {
      console.log(`  ${tag} SKIP  ${poem.id} (already translated)`);
      return { id: poem.id, status: 'skip' };
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${tag} ERROR  ${poem.id} (${poem.poet}) ${elapsed}s — ${err.message.slice(0, 100)}`);
    return { id: poem.id, status: 'error', error: err.message };
  }
}

async function main() {
  console.log('[1/3] Fetching poems...');
  const poems = await fetchPoems();
  console.log(`  Found ${poems.length} poems to translate`);

  if (poems.length === 0) {
    console.log('  Nothing to do.');
    await pool.end();
    return;
  }

  console.log(`\n[2/3] Translating (concurrency: ${CONCURRENCY})...`);
  const start = Date.now();
  const results = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < poems.length; i += CONCURRENCY) {
    const batch = poems.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((poem, j) => processPoem(poem, i + j, poems.length))
    );
    results.push(...batchResults);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const ok = results.filter(r => r.status === 'ok');
  const errors = results.filter(r => r.status === 'error');
  const parseFails = results.filter(r => r.status === 'parse_fail');
  const skipped = results.filter(r => r.status === 'skip');
  const avgTime = ok.length > 0 ? (ok.reduce((s, r) => s + r.elapsed, 0) / ok.length).toFixed(1) : 0;

  console.log(`\n[3/3] Summary`);
  console.log(`  Total time: ${elapsed}s`);
  console.log(`  Translated: ${ok.length}/${poems.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Parse fails: ${parseFails.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  console.log(`  Avg per poem: ${avgTime}s`);

  if (errors.length > 0) {
    console.log('\n  Failed poems:');
    for (const r of errors) {
      console.log(`    ${r.id}: ${r.error?.slice(0, 100)}`);
    }
  }

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
