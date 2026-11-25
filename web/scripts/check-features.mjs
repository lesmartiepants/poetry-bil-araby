// Feature manifest check: every BUILD-SPEC feature maps to the journey tests that cover it.
//
//   npm run check:features             fail when the manifest and the journeys disagree
//   npm run check:features -- --write  refresh `journeys` and add `gap` where none; names and gaps are kept
//
// A journey covers a feature when its test title names the feature id ("9.5 Pathways ...", "9.1–9.4 ...",
// "4.1 → 5.3 ..."). Fails when: a feature has no journey and no `gap`; a title names an id that is not a
// feature; the manifest lists a journey that no longer exists or omits one that does. `gap` is the visible
// backlog: a feature with no journey yet. Remove it when the journey lands.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifestUrl = new URL('feature-manifest.json', root);
const write = process.argv.includes('--write');

const ids = (text) => {
  const out = new Set();
  for (const m of text.matchAll(/(?<![\d.])(\d+)\.(\d+)(?:\s*[–-]\s*(\d+)\.(\d+))?(?![\d.])/g)) {
    const [, a, b, c, d] = m;
    if (c === a) for (let k = +b; k <= +d; k++) out.add(`${a}.${k}`);
    else { out.add(`${a}.${b}`); if (c) out.add(`${c}.${d}`); }
  }
  return out;
};
const byId = (x, y) => { const [a, b] = x.split('.').map(Number); const [c, d] = y.split('.').map(Number); return a - c || b - d; };

// id -> ["file › title"]
const journeys = new Map();
for (const f of readdirSync(new URL('journeys/', root)).filter((n) => n.endsWith('.spec.ts'))) {
  const src = readFileSync(new URL(`journeys/${f}`, root), 'utf8');
  for (const m of src.matchAll(/\btest\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) {
    const title = m[2].replace(/\\(.)/g, '$1').replace(/@\w+\s*/g, '').trim();
    for (const id of ids(title)) (journeys.get(id) ?? journeys.set(id, []).get(id)).push(`${f} › ${title}`);
  }
}

const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
const features = manifest.features;
const problems = [];

if (write) {
  for (const f of features) {
    f.journeys = (journeys.get(f.id) ?? []).sort();
    if (f.journeys.length) delete f.gap;
    else f.gap ??= 'no journey yet';
    if (!f.journeys.length) delete f.journeys;
  }
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
}

const seen = new Set();
for (const f of features) {
  if (seen.has(f.id)) problems.push(`${f.id}: listed twice`);
  seen.add(f.id);
  const have = (journeys.get(f.id) ?? []).slice().sort();
  const listed = (f.journeys ?? []).slice().sort();
  if (!have.length && !f.gap) problems.push(`${f.id} ${f.name}: no journey covers it (write one, or record a gap)`);
  if (have.length && f.gap) problems.push(`${f.id} ${f.name}: has a journey now, remove its gap`);
  for (const j of listed) if (!have.includes(j)) problems.push(`${f.id}: manifest lists a journey that no longer exists: ${j}`);
  for (const j of have) if (!listed.includes(j)) problems.push(`${f.id}: journey not in the manifest: ${j} (run npm run check:features -- --write)`);
}
for (const id of journeys.keys()) if (!seen.has(id)) problems.push(`${id}: named by a journey title (${journeys.get(id)[0]}) but is not a feature`);

const gaps = features.filter((f) => f.gap).map((f) => f.id).sort(byId);
console.log(`features: ${features.length}, with a journey: ${features.length - gaps.length}, gaps: ${gaps.length}`);
if (gaps.length) console.log(`gaps: ${gaps.join(' ')}`);
if (problems.length) { console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`); process.exit(1); }
