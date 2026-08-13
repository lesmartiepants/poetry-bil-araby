#!/usr/bin/env node
/**
 * How often does the production corpus actually ship a verse translation?
 *
 * This decides whether the reader's bilingual default (`showTranslation = true`,
 * PoemReader.jsx) is the common case or the rare one — which in turn decides what a
 * layout measurement should be measured against.
 *
 * Read-only: GET /api/poems/random only.
 */
const API = process.env.SAMPLE_API || 'https://poetry-bil-araby-2mb0.onrender.com';
const N = +(process.argv[2] || 20);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let withEnglish = 0;
let checked = 0;
const samples = [];

for (let i = 0; i < N; i++) {
  if (i) await sleep(1200);
  let p;
  try {
    const res = await fetch(`${API}/api/poems/random`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) continue;
    p = await res.json();
  } catch {
    continue;
  }
  if (!p?.arabic) continue;
  checked++;
  const en = (p.cachedTranslation || p.english || '').trim();
  if (en) {
    withEnglish++;
    samples.push({ id: p.id, poet: p.poet, en: en.slice(0, 120) });
  }
}

console.log(`checked ${checked} poems`);
console.log(`with a verse translation: ${withEnglish} (${((withEnglish / checked) * 100).toFixed(0)}%)`);
for (const s of samples) console.log(`  ${s.id} ${s.poet}: ${s.en}`);
