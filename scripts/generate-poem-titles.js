/* global process */
/**
 * Generate thematic Arabic + English titles for poems using Gemini Flash.
 *
 * Usage:
 *   # Load env first:
 *   set -a && source .env && set +a
 *   node scripts/generate-poem-titles.js [--dry-run] [--batch-size=50] [--limit=N]
 *
 * Requires:
 *   VITE_GEMINI_API_KEY   — Gemini API key
 *   VITE_SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY — Supabase key
 *
 * Strategy:
 *   - Batch 50 poems per Gemini Flash call (one call → both AR + EN titles)
 *   - ~182 API calls total for 9,072 poems
 *   - Resume support: skips poems that already have title_en
 *   - Progress saved to scripts/title-progress.json
 *   - Retry once on failure, then skip and log
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = resolve(__dirname, 'title-progress.json');

// --- Config from env ---
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: VITE_GEMINI_API_KEY or GEMINI_API_KEY is required');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: VITE_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY) are required');
  process.exit(1);
}

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = parseInt(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const LIMIT = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0');

// gemini-2.0-flash is no longer available to new API users; gemini-2.5-flash-lite is the
// cost-equivalent successor (cheap + fast, same price tier).
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Rate limiting: 500ms between batches (safe for paid tier; increase to 6000 for free tier)
const BATCH_DELAY_MS = 500;

const SYSTEM_PROMPT = `You are an Arabic poetry expert. For each poem given, generate:
1. A concise thematic Arabic title (3-6 words) that captures the poem's essence — NOT the first line, NOT a transliteration
2. A poetic English title (3-6 words) that evokes the same theme

Return ONLY a valid JSON array, no markdown code fences, no explanation:
[{"id": 123, "title_ar": "عنوان عربي هنا", "title_en": "English Title Here"}, ...]

Important:
- The Arabic title must be in Arabic script
- The English title should be evocative and poetic, not a literal translation
- Do not use the poem's first line as the title
- If you cannot generate a good title, return null for that field`;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Progress tracking ---
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    } catch {
      return { completed_ids: [], errors: [] };
    }
  }
  return { completed_ids: [], errors: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// --- Gemini API call ---
async function generateTitlesForBatch(poems, attempt = 1) {
  const poemData = poems.map((p) => {
    const lines = (p.content || '').split('*').map((l) => l.trim()).filter(Boolean);
    return {
      id: p.id,
      first_line: lines[0] || '',
      content_preview: lines.slice(0, 3).join(' / '),
    };
  });

  const userPrompt = `Generate titles for these ${poemData.length} poems:\n${JSON.stringify(poemData)}`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini API error ${response.status}: ${errText}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON — strip markdown fences if present
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let results;
  try {
    results = JSON.parse(cleaned);
  } catch (parseErr) {
    if (attempt < 2) {
      console.warn(`  JSON parse error on attempt ${attempt}, retrying...`);
      await sleep(2000);
      return generateTitlesForBatch(poems, attempt + 1);
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${parseErr.message}\nRaw: ${rawText.slice(0, 200)}`);
  }

  if (!Array.isArray(results)) {
    throw new Error(`Gemini returned non-array JSON: ${cleaned.slice(0, 200)}`);
  }

  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---
async function main() {
  console.log(`\n=== Poem Title Generator ===`);
  console.log(`Model: ${GEMINI_MODEL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  if (LIMIT > 0) console.log(`Limit: ${LIMIT} poems`);
  console.log();

  // Load progress
  const progress = loadProgress();
  const completedSet = new Set(progress.completed_ids);
  console.log(`Resuming: ${completedSet.size} poems already completed`);

  // Fetch poems without title_en from Supabase
  console.log('Fetching poems without English titles from Supabase...');

  let query = supabase
    .from('poems')
    .select('id, title, content')
    .is('title_en', null)
    .order('id', { ascending: true });

  if (LIMIT > 0) {
    query = query.limit(LIMIT);
  } else {
    // Fetch in pages to handle large datasets
    query = query.limit(10000);
  }

  const { data: poems, error: fetchError } = await query;

  if (fetchError) {
    console.error('Failed to fetch poems:', fetchError.message);
    process.exit(1);
  }

  if (!poems || poems.length === 0) {
    console.log('No poems need titles. All done!');
    return;
  }

  // Filter out already-completed ones (in case of concurrent runs or stale state)
  const pending = poems.filter((p) => !completedSet.has(p.id));
  console.log(`Total pending: ${pending.length} poems (${poems.length} fetched, ${completedSet.size} already done)`);

  if (pending.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would process ${pending.length} poems in ${Math.ceil(pending.length / BATCH_SIZE)} batches`);
    console.log('\nSample (first 5 poems):');
    pending.slice(0, 5).forEach((p) => {
      const preview = (p.content || '').split('*')[0]?.trim() || '(no content)';
      console.log(`  ID ${p.id}: "${p.title}" | First line: "${preview}"`);
    });
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  // Process in batches
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);
  let totalProcessed = 0;
  let totalErrors = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const batch = pending.slice(start, start + BATCH_SIZE);

    console.log(`\nBatch ${batchIdx + 1}/${totalBatches} (IDs ${batch[0].id}–${batch[batch.length - 1].id})`);

    let results;
    try {
      results = await generateTitlesForBatch(batch);
    } catch (err) {
      totalErrors++;
      console.error(`  Batch error: ${err.message}`);
      progress.errors.push({
        batch: batchIdx + 1,
        ids: batch.map((p) => p.id),
        error: err.message,
        timestamp: new Date().toISOString(),
      });
      saveProgress(progress);

      // Retry once after delay
      console.log('  Retrying batch after 3s...');
      await sleep(3000);
      try {
        results = await generateTitlesForBatch(batch);
      } catch (retryErr) {
        console.error(`  Retry failed: ${retryErr.message}. Skipping batch.`);
        progress.errors.push({
          batch: batchIdx + 1,
          ids: batch.map((p) => p.id),
          error: `RETRY_FAILED: ${retryErr.message}`,
          timestamp: new Date().toISOString(),
        });
        saveProgress(progress);
        if (totalErrors > 5) {
          console.error('Too many errors, stopping.');
          break;
        }
        await sleep(BATCH_DELAY_MS);
        continue;
      }
    }

    // Build upsert payload
    // Map results by id for easy lookup
    const resultMap = new Map(results.map((r) => [r.id, r]));
    const upsertRows = [];

    for (const poem of batch) {
      const generated = resultMap.get(poem.id);
      if (!generated) {
        console.warn(`  Warning: no result for poem ID ${poem.id}`);
        continue;
      }

      const row = { id: poem.id };

      // Always set title_en if generated
      if (generated.title_en) {
        row.title_en = generated.title_en;
      } else {
        row.title_en = null; // will remain null, skip
        continue;
      }

      // Only update 'title' (Arabic) if:
      // 1. A new title_ar was generated
      // 2. It differs from the existing title
      if (generated.title_ar && generated.title_ar !== poem.title) {
        row.title = generated.title_ar;
      }

      upsertRows.push(row);
    }

    if (upsertRows.length === 0) {
      console.warn('  No valid results to upsert for this batch.');
    } else {
      // Update poems individually using .update().eq() to avoid not-null constraint
      // issues that upsert/insert triggers on missing required columns.
      let batchSuccesses = 0;
      let batchUpdateErrors = 0;

      for (const row of upsertRows) {
        const updateFields = { title_en: row.title_en };
        if (row.title !== undefined) {
          updateFields.title = row.title;
        }

        const { error: updateError } = await supabase
          .from('poems')
          .update(updateFields)
          .eq('id', row.id);

        if (updateError) {
          console.error(`  Update error for ID ${row.id}: ${updateError.message}`);
          batchUpdateErrors++;
        } else {
          completedSet.add(row.id);
          batchSuccesses++;
        }
      }

      if (batchUpdateErrors > 0) {
        totalErrors += batchUpdateErrors;
        console.warn(`  ${batchUpdateErrors} update errors in this batch.`);
      }

      // Save progress after each batch
      progress.completed_ids = [...completedSet];
      saveProgress(progress);

      totalProcessed += batchSuccesses;
      console.log(`  Updated ${batchSuccesses}/${upsertRows.length} rows. Total processed: ${totalProcessed} (${Math.round((totalProcessed / pending.length) * 100)}%)`);

      // Log a sample from this batch
      if (upsertRows[0]) {
        const sample = upsertRows[0];
        console.log(`  Sample: ID ${sample.id} | AR: "${sample.title || '(unchanged)'}" | EN: "${sample.title_en}"`);
      }
    }

    // Rate limiting delay between batches
    if (batchIdx < totalBatches - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Processed: ${totalProcessed}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);

  if (progress.errors.length > 0) {
    console.log(`\nFailed batches (${progress.errors.length}):`);
    progress.errors.forEach((e) => {
      console.log(`  Batch ${e.batch}: ${e.error}`);
    });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
