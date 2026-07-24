#!/usr/bin/env node
/**
 * Mutation gauntlet — proves a test is a REAL behavioral guard, not a rubber stamp.
 *
 * A generated (or existing) test only earns "behavioral" coverage if it:
 *   1. PASSES on the current, unbroken code.
 *   2. FAILS when the feature it guards is deliberately broken.
 *   3. is not flaky (passes N times on the reverted code).
 *
 * A test that stays green even when the feature is broken is theater and is
 * rejected. This is what makes "green means the feature works" true instead of
 * aspirational, and it is the gate an auto-generated test must clear before CI
 * labels a feature "behavioral" or auto-merges the test.
 *
 * Usage:
 *   node scripts/guard-gauntlet.mjs <spec.json>
 *   node scripts/guard-gauntlet.mjs --stdin   # read spec JSON from stdin
 *
 * Spec:
 *   {
 *     "test": "src/test/togglePlay.test.js",
 *     "break": [
 *       { "file": "src/stores/actions/togglePlay.js",
 *         "find": "if (!isPlaying && (isTogglingPlay.current || isGenerating)) {",
 *         "replace": "if (isTogglingPlay.current || isGenerating) {" }
 *     ],
 *     "flakeRuns": 2
 *   }
 *
 * Exit 0 = verified guard. Exit 1 = not a guard (reason printed). Always reverts.
 * No external deps (Node built-ins + local vitest binary).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function die(msg, code = 2) {
  console.error(`[gauntlet] ${msg}`);
  process.exit(code);
}

// ---- read spec ----
const arg = process.argv[2];
if (!arg) die('usage: guard-gauntlet.mjs <spec.json | --stdin>');
let specRaw;
if (arg === '--stdin') {
  specRaw = readFileSync(0, 'utf8');
} else {
  if (!existsSync(arg)) die(`spec not found: ${arg}`);
  specRaw = readFileSync(arg, 'utf8');
}
let spec;
try {
  spec = JSON.parse(specRaw);
} catch (e) {
  die(`spec is not valid JSON: ${e.message}`);
}
if (!spec.test) die('spec.test is required');
if (!Array.isArray(spec.break) || spec.break.length === 0) die('spec.break must be a non-empty array');
const flakeRuns = Number.isInteger(spec.flakeRuns) ? spec.flakeRuns : 2;

// ---- run a single test file, return true if it PASSES ----
function runTest(testPath) {
  const bin = resolve(ROOT, 'node_modules/.bin/vitest');
  const r = spawnSync(bin, ['run', testPath, '--reporter=dot'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    env: { ...process.env, CI: 'true' },
  });
  // vitest exit 0 = all passed; non-zero = failures / error.
  return r.status === 0;
}

// ---- apply / revert mutations (string replace, with originals kept) ----
const originals = new Map();
function applyBreaks() {
  for (const b of spec.break) {
    const full = resolve(ROOT, b.file);
    if (!existsSync(full)) die(`break file not found: ${b.file}`);
    const src = readFileSync(full, 'utf8');
    if (!originals.has(full)) originals.set(full, src);
    if (!src.includes(b.find)) {
      revertBreaks();
      die(`break.find not present in ${b.file}: ${JSON.stringify(b.find.slice(0, 80))}`, 3);
    }
    writeFileSync(full, src.split(b.find).join(b.replace));
  }
}
function revertBreaks() {
  for (const [full, src] of originals) writeFileSync(full, src);
  originals.clear();
}

// ---- the gauntlet ----
let verdict = { verified: false, reason: '' };
try {
  // 1. passes clean
  process.stdout.write('[gauntlet] 1/3 baseline (must PASS)... ');
  if (!runTest(spec.test)) {
    console.log('FAIL');
    verdict.reason = 'test does not pass on clean code — not a valid baseline';
    throw null;
  }
  console.log('pass ✓');

  // 2. fails when broken
  process.stdout.write('[gauntlet] 2/3 break-it (test must FAIL)... ');
  applyBreaks();
  const failedOnBreak = !runTest(spec.test);
  revertBreaks();
  if (!failedOnBreak) {
    console.log('DID NOT FAIL');
    verdict.reason = 'test still passes when the feature is broken — THEATER, rejected';
    throw null;
  }
  console.log('failed as required ✓');

  // 3. not flaky
  process.stdout.write(`[gauntlet] 3/3 flake-check (${flakeRuns}x, all PASS)... `);
  for (let i = 0; i < flakeRuns; i++) {
    if (!runTest(spec.test)) {
      console.log(`FLAKY (run ${i + 1} failed)`);
      verdict.reason = `test is flaky — failed on reverted run ${i + 1}/${flakeRuns}`;
      throw null;
    }
  }
  console.log('stable ✓');

  verdict = { verified: true, reason: 'passes clean, fails on break, not flaky' };
} catch (_) {
  // fall through to report
} finally {
  revertBreaks(); // belt and suspenders — never leave the tree mutated
}

console.log('\n' + JSON.stringify({ test: spec.test, ...verdict }, null, 2));
process.exit(verdict.verified ? 0 : 1);
