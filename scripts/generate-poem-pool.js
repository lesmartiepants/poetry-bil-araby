#!/usr/bin/env node
/**
 * generate-poem-pool.js
 *
 * Fetches 5 short poems from the database and generates translations via Gemini,
 * writing them to src/data/seed-poems.json.
 *
 * Usage: node scripts/generate-poem-pool.js
 *
 * Requires: DATABASE_URL and GEMINI_API_KEY environment variables.
 * Falls back silently if either is unavailable (used as prebuild script).
 */

import pg from 'pg';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/seed-poems.json');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!dbUrl) {
    console.log('[seed-pool] No DATABASE_URL — skipping generation, keeping existing seed-poems.json');
    process.exit(0);
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    // Fetch 5 short, high-quality poems from diverse poets
    const result = await pool.query(`
      SELECT DISTINCT ON (po.name)
        p.id, p.title,
        COALESCE(p.diacritized_content, p.content) as arabic,
        po.name as poet,
        t.name as theme
      FROM poems p
      JOIN poets po ON p.poet_id = po.id
      JOIN themes t ON p.theme_id = t.id
      WHERE length(COALESCE(p.diacritized_content, p.content)) < 500
        AND length(COALESCE(p.diacritized_content, p.content)) > 50
      ORDER BY po.name, RANDOM()
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('[seed-pool] No poems found matching criteria — keeping existing seed-poems.json');
      process.exit(0);
    }

    const seeds = result.rows.map(row => ({
      id: row.id,
      poet: row.poet,
      poetArabic: row.poet,
      title: row.title,
      titleArabic: row.title,
      arabic: row.arabic.replace(/\*/g, '\n'),
      english: '',
      tags: [row.theme],
      cachedTranslation: null,
      cachedExplanation: null,
      cachedAuthorBio: null,
      isSeedPoem: true,
    }));

    // If Gemini key is available, generate translations
    if (geminiKey) {
      console.log(`[seed-pool] Generating translations for ${seeds.length} poems via Gemini...`);

      for (const seed of seeds) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Translate this Arabic poem to English poetically, then provide a brief explanation (2-3 sentences) and a brief author bio (2 sentences).\n\nPoet: ${seed.poet}\nPoem:\n${seed.arabic}\n\nRespond in JSON: {"translation":"...","explanation":"...","authorBio":"..."}` }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              seed.cachedTranslation = parsed.translation || null;
              seed.cachedExplanation = parsed.explanation || null;
              seed.cachedAuthorBio = parsed.authorBio || null;
              seed.english = parsed.translation || '';
              console.log(`  ✓ ${seed.poet} — ${seed.title}`);
            }
          }
        } catch (e) {
          console.log(`  ✗ ${seed.poet} — ${seed.title}: ${e.message}`);
        }
      }
    } else {
      console.log('[seed-pool] No GEMINI_API_KEY — skipping translation generation');
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(seeds, null, 2) + '\n');
    console.log(`[seed-pool] Wrote ${seeds.length} poems to ${OUTPUT_PATH}`);
  } catch (e) {
    console.log(`[seed-pool] Error: ${e.message} — keeping existing seed-poems.json`);
  } finally {
    await pool.end();
  }
}

main();
