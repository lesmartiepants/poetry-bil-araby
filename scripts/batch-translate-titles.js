/* global process */
/**
 * Batch translate Arabic poem titles to English using Gemini API.
 *
 * Usage:
 *   node scripts/batch-translate-titles.js [--batch-size=50] [--dry-run]
 *
 * Requires:
 *   DATABASE_URL or PGHOST/PGDATABASE env vars
 *   GEMINI_API_KEY env var
 *
 * Processes poems that have no title_en yet, in batches.
 * Each batch sends multiple titles to Gemini in one request for efficiency.
 */
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        query_timeout: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        user: process.env.PGUSER || process.env.USER,
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'qafiyah',
        password: process.env.PGPASSWORD || '',
        port: process.env.PGPORT || 5432,
        query_timeout: 30000,
      }
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY or VITE_GEMINI_API_KEY is required');
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = args.includes('--dry-run');

async function translateBatch(titles) {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const prompt = `Translate these Arabic poem titles to English. Return ONLY the translations, one per line, numbered to match. Keep titles poetic but accurate. Do not add explanations.

${numbered}`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse numbered responses
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l));
  const translations = lines.map((l) => l.replace(/^\d+\.\s*/, '').trim());

  if (translations.length !== titles.length) {
    console.warn(
      `Warning: expected ${titles.length} translations, got ${translations.length}. Padding with null.`
    );
    while (translations.length < titles.length) translations.push(null);
  }

  return translations;
}

async function main() {
  // Check if title_en column exists
  const colCheck = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'poems' AND column_name = 'title_en' LIMIT 1"
  );
  if (colCheck.rows.length === 0) {
    console.error(
      'Error: title_en column does not exist. Run the migration first:\n  supabase db push'
    );
    process.exit(1);
  }

  // Count untranslated poems
  const countResult = await pool.query('SELECT COUNT(*) FROM poems WHERE title_en IS NULL');
  const total = parseInt(countResult.rows[0].count);
  console.log(`Found ${total} poems without English titles`);

  if (total === 0) {
    console.log('Nothing to do.');
    await pool.end();
    return;
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would translate ${total} titles in batches of ${BATCH_SIZE}`);
    const sample = await pool.query(
      'SELECT id, title FROM poems WHERE title_en IS NULL ORDER BY id LIMIT 5'
    );
    console.log('Sample titles:');
    sample.rows.forEach((r) => console.log(`  ${r.id}: ${r.title}`));
    await pool.end();
    return;
  }

  let processed = 0;
  let errors = 0;

  while (processed < total) {
    const batch = await pool.query(
      'SELECT id, title FROM poems WHERE title_en IS NULL ORDER BY id LIMIT $1',
      [BATCH_SIZE]
    );

    if (batch.rows.length === 0) break;

    const titles = batch.rows.map((r) => r.title);

    try {
      const translations = await translateBatch(titles);

      // Update each poem
      for (let i = 0; i < batch.rows.length; i++) {
        if (translations[i]) {
          await pool.query('UPDATE poems SET title_en = $1 WHERE id = $2', [
            translations[i],
            batch.rows[i].id,
          ]);
        }
      }

      processed += batch.rows.length;
      console.log(`Translated ${processed}/${total} (${Math.round((processed / total) * 100)}%)`);

      // Rate limit: 500ms between batches
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      errors++;
      console.error(`Batch error (${errors}): ${err.message}`);
      if (errors > 10) {
        console.error('Too many errors, stopping.');
        break;
      }
      // Wait longer on error
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`Done. Translated: ${processed}, Errors: ${errors}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
