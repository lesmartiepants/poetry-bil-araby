#!/usr/bin/env node
/**
 * Render Sahifa at both `preferredRowGap` candidates (148 vs 180) at 6 verses,
 * so a reviewer can see the tradeoff instead of reading about it.
 *
 * Ad hoc script — there is no committed render generator for the share-card
 * PNGs in design-review/share-modal/renders/. This is a rough one, built to
 * unblock this PR's comparison images. It shells out to the gstack `browse`
 * headless-Chromium CLI rather than bundling a Playwright script, per this
 * repo's browsing skill guidance.
 *
 * Usage: node scripts/render-sahifa-rowgap-compare.mjs
 *
 * Requires the gstack browse binary at .claude/skills/gstack/browse/dist/browse
 * (project- or home-relative — see resolveBrowseBin() below).
 *
 * Implementation note: shareCardDesigns.js has zero imports, so its source is
 * inlined into a classic (non-module) <script> tag rather than loaded via
 * `<script type="module"> import ...`. Chromium blocks cross-file ES module
 * imports from a file:// origin (CORS), which a plain inlined script sidesteps.
 * The gstack browse daemon also sandboxes itself to a fixed set of path
 * prefixes, so the harness HTML is written under /private/tmp rather than
 * os.tmpdir() (which resolves to /var/folders/... on macOS, outside the
 * sandbox's allowlist).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'design-review/share-modal/renders/rowgap-compare');

function resolveBrowseBin() {
  const candidates = [
    path.join(PROJECT_ROOT, '.claude/skills/gstack/browse/dist/browse'),
    path.join(os.homedir(), '.claude/skills/gstack/browse/dist/browse'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    'gstack browse binary not found. Checked: ' + candidates.join(', ')
  );
}

// Stand-in poem: the original source (Abu Nuwas, مطايا الأمين) is not in the
// repo. This reuses the vocalized 6-verse fixture from
// src/test/share-card.test.jsx (VOCALIZED_SIX / LONG_ENGLISH) so the two
// renders are apples-to-apples with what the differential harness exercised.
const ARABIC = [
  'إِنَّ الحَيَاةَ دَقِيقَةٌ',
  'فَاجْعَلْهَا نُورًا وَسَكِينَةً',
  'وَاخْتَرْ لِقَلْبِكَ مَوْعِدًا',
  'يُحْيِي الرُّوحَ وَيُطْمَئِنُهَا',
  'فَكُلُّ دَرْبٍ فِي المَدَى',
  'يَبْدَأُ بِخُطْوَةٍ أَمِينَةٍ',
].join('\n');

const ENGLISH = [
  'Life is but a fleeting minute, so make of it light and a deep abiding calm',
  'And choose for your heart a meeting place that revives the weary soul',
  'For every single road that runs across the far expanse of the world',
  'Begins, as it always has, with one faithful and unhurried step',
  'And the one who walks it slowly will arrive before the one who runs',
  'Such is the way of the road, and such is the way of the patient heart',
].join('\n');

const POEM = {
  arabic: ARABIC,
  english: ENGLISH,
  poet: 'Abu Nuwas (stand-in fixture — see script header)',
  poetAr: 'أبو نواس',
};

// gstack's headless Chromium enforces normal cross-origin rules, and
// `type="module"` <script src> imports over file:// are blocked by CORS
// (no bundler/dev-server in the loop here). shareCardDesigns.js has zero
// import statements, so instead of an ES module import we inline its source
// as a classic script with the `export` keywords stripped — same code,
// runs as plain globals in the page.
function toInlineScript(moduleSource) {
  return moduleSource.replace(/^export\s+/gm, '');
}

function buildHtml(moduleSource) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700&family=Reem+Kufi:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:#111}canvas{display:block}</style>
</head>
<body>
<canvas id="stage" width="1080" height="1350"></canvas>
<script>
${toInlineScript(moduleSource)}

const poem = ${JSON.stringify(POEM)};

async function run() {
  // Let web fonts settle before drawing (fonts.ready resolves once the
  // @font-face declarations above have loaded/failed).
  await document.fonts.ready;
  // Give Google Fonts network fetch a beat in case fonts.ready races ahead.
  await new Promise((r) => setTimeout(r, 600));
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, 'sahifa', { maxLines: 6 });
  document.title = 'RENDER_DONE';
}
run();
<\/script>
</body>
</html>
`;
}

// Sahifa's only preferredRowGap literal, as of this writing. Swapped to 148
// in-memory for the "tight" comparison render; the tracked source file is
// never touched.
const SOURCE_MODULE = path.join(PROJECT_ROOT, 'src/utils/shareCardDesigns.js');
const ORIGINAL_GAP_LITERAL = 'preferredRowGap: 180,';
const TIGHT_GAP_LITERAL = 'preferredRowGap: 148,';

// The gstack browse daemon sandboxes itself to a fixed set of path prefixes
// (os.tmpdir() on macOS is /var/folders/... which is NOT one of them), so the
// harness HTML has to live under one of those allowed roots instead of the
// system temp dir. /private/tmp is allowed; use this repo's scratch area
// under it rather than a bare mkdtemp in os.tmpdir().
const WORK_ROOT = '/private/tmp/sahifa-rowgap-harness';

function main() {
  const browseBin = resolveBrowseBin();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(WORK_ROOT, { recursive: true });

  const sourceContent = fs.readFileSync(SOURCE_MODULE, 'utf8');
  const occurrences = sourceContent.split(ORIGINAL_GAP_LITERAL).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one "${ORIGINAL_GAP_LITERAL}" in shareCardDesigns.js, found ${occurrences}. ` +
        'Update this script if Sahifa\'s rowGap literal moved or changed.'
    );
  }
  const tightContent = sourceContent.replace(ORIGINAL_GAP_LITERAL, TIGHT_GAP_LITERAL);

  const jobs = [
    { label: '180', content: sourceContent, out: path.join(OUT_DIR, 'sahifa-rowgap-180.png') },
    { label: '148', content: tightContent, out: path.join(OUT_DIR, 'sahifa-rowgap-148.png') },
  ];

  for (const job of jobs) {
    const workDir = fs.mkdtempSync(path.join(WORK_ROOT, `run-${job.label}-`));
    const htmlPath = path.join(workDir, 'harness.html');
    // Inline the (possibly gap-patched) module source directly into the page
    // rather than importing it as a separate file — see toInlineScript()
    // above for why: file:// + `type="module"` cross-file imports are
    // blocked by Chromium's CORS policy, and this repo has no dev server
    // in the loop for this ad hoc script.
    fs.writeFileSync(htmlPath, buildHtml(job.content));

    console.log(`[rowgap=${job.label}] loading ${htmlPath}`);
    execFileSync(browseBin, ['viewport', '1080x1350'], { stdio: 'inherit' });
    execFileSync(browseBin, ['goto', `file://${htmlPath}`], { stdio: 'inherit' });
    execFileSync(browseBin, ['wait', '--load'], { stdio: 'inherit' });
    // Fonts + rAF settle time (run() itself awaits document.fonts.ready plus
    // a fixed delay, so this just waits out the same window from the CLI side).
    execFileSync(browseBin, ['js', 'new Promise(r => setTimeout(r, 1200))'], {
      stdio: 'inherit',
    });
    execFileSync(browseBin, ['screenshot', '#stage', job.out], {
      stdio: 'inherit',
    });
    console.log(`[rowgap=${job.label}] wrote ${job.out}`);
  }
}

main();
