#!/usr/bin/env node
/**
 * Fetch a length-varied sample of REAL poems from the production API for the
 * reader-layout design prototypes (design-review/reader-layouts/).
 *
 * Read-only: hits GET /api/poems/random only. Never writes to any database.
 *
 * Usage: node scripts/fetch-sample-poems.mjs [outfile]
 */
const API = process.env.SAMPLE_API || 'https://poetry-bil-araby-2mb0.onrender.com';
const out = process.argv[2] || 'design-review/reader-layouts/poems.json';

// The API encodes verse breaks as `*` (see src/services/database.js normalisePoem);
// the app rewrites them to newlines before rendering, so do the same here.
const normalise = (s) => (s || '').replace(/\*/g, '\n');
const lineCount = (p) => normalise(p?.arabic).split('\n').filter((l) => l.trim()).length;

// Buckets we want represented: a short epigram, a mid poem, a long qasida.
const buckets = [
  { name: 'epigram', min: 2, max: 4 },
  { name: 'short', min: 5, max: 8 },
  { name: 'medium', min: 9, max: 16 },
  { name: 'long', min: 17, max: 40 },
  { name: 'qasida', min: 41, max: 999 },
];

const picked = new Map();
const seen = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The API rate-limits; pace the draws rather than hammering it.
for (let i = 0; i < 60 && picked.size < buckets.length; i++) {
  let poem;
  if (i) await sleep(1500);
  try {
    const res = await fetch(`${API}/api/poems/random`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) continue;
    const json = await res.json();
    poem = json.poem || json;
  } catch {
    continue;
  }
  if (!poem?.arabic || seen.has(poem.id)) continue;
  seen.add(poem.id);
  const n = lineCount(poem);
  const bucket = buckets.find((b) => n >= b.min && n <= b.max);
  if (!bucket || picked.has(bucket.name)) continue;
  picked.set(bucket.name, {
    bucket: bucket.name,
    lines: n,
    // Does the Arabic carry tashkeel? Vocalized text needs more vertical room.
    tashkeel: /[ً-ْ]/.test(poem.arabic),
    id: poem.id,
    title: poem.title,
    titleArabic: poem.titleArabic,
    poet: poem.poet,
    poetArabic: poem.poetArabic,
    arabic: normalise(poem.arabic),
    english: normalise(poem.english),
    meter: poem.meter,
    era: poem.era,
  });
  process.stderr.write(`${bucket.name}: ${n} lines — ${poem.poet}\n`);
}

const list = buckets.map((b) => picked.get(b.name)).filter(Boolean);
const { writeFileSync } = await import('node:fs');
writeFileSync(out, JSON.stringify(list, null, 2));
process.stderr.write(`\nwrote ${list.length} poems → ${out}\n`);
