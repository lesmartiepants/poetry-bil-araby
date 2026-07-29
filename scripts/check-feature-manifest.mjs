#!/usr/bin/env node
/**
 * Feature-manifest drift detector + living-doc generator.
 *
 * Source of truth: feature-manifest.json (humans edit it).
 * This script discovers the mechanical surface from code (HTTP routes,
 * components, test files) and reconciles it against the manifest:
 *
 *   FAIL (exit 1) on drift:
 *     - endpoint in server.js not declared in any feature  (feature added, manifest not updated)
 *     - endpoint declared in manifest but gone from server.js (feature removed, manifest not updated)
 *     - component file not referenced by any feature's entrypoints
 *     - manifest entrypoint / test path that no longer exists (dead reference)
 *   WARN (does not fail):
 *     - test file not referenced by any feature (untraced test)
 *     - feature whose coverage is "none" or "source-only" (visibility, not a gate)
 *
 * Modes:
 *   node scripts/check-feature-manifest.mjs            # check; fail on drift; refresh doc block
 *   node scripts/check-feature-manifest.mjs --check    # check only; never write the doc
 *   node scripts/check-feature-manifest.mjs --update   # refresh doc block; never fail (for local use)
 *   node scripts/check-feature-manifest.mjs --json     # machine output for CI comment
 *
 * No external dependencies (Node >= 18 built-ins only).
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

// Manifest paths are POSIX (forward-slash). path.relative() emits the platform
// separator ('\' on Windows), so normalize discovered paths before comparing.
const toPosix = (p) => p.split(sep).join('/');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = new Set(process.argv.slice(2));
const MODE = {
  checkOnly: args.has('--check'),
  updateOnly: args.has('--update'),
  json: args.has('--json'),
  // deadref-only: only FAIL on drift that makes the manifest actively wrong
  // (points at a deleted file / removed endpoint). Additions (new component /
  // endpoint) are NOT fatal here — the auto-reconcile bot handles those by
  // opening a PR, so a human's feature PR is never blocked for adding a feature.
  deadrefOnly: args.has('--deadref-only'),
  // update-hashes: recompute + write feature-hashes.json (the bot runs this last).
  updateHashes: args.has('--update-hashes'),
  // needs-reconcile: exit 1 if ANYTHING requires the bot (drift OR a feature
  // whose source changed). This is the trigger the autofix workflow reads.
  needsReconcile: args.has('--needs-reconcile'),
};

// Drift types that mean "the manifest lies about what exists" → a human must fix.
const BLOCKING_TYPES = new Set(['dead_entrypoint', 'dead_test', 'endpoint_removed']);

const MANIFEST_PATH = join(ROOT, 'feature-manifest.json');
const HASHES_PATH = join(ROOT, 'feature-hashes.json');
const DOC_PATH = join(ROOT, 'docs', 'APP-STATE.md');
const SERVER_PATH = join(ROOT, 'server.js');
const COMPONENTS_DIR = join(ROOT, 'src', 'components');
const UNIT_TEST_DIR = join(ROOT, 'src', 'test');
const E2E_DIR = join(ROOT, 'e2e');

/* ---------- discovery ---------- */

function discoverEndpoints() {
  if (!existsSync(SERVER_PATH)) return [];
  const src = readFileSync(SERVER_PATH, 'utf8');
  // Matches app.get('/x'), app.post(\n  '/x', mw, ...), backtick or quote.
  const re = /app\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  const found = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    found.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return [...found].sort();
}

function walk(dir, test) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, test));
    else if (test(entry.name)) out.push(toPosix(relative(ROOT, full)));
  }
  return out;
}

function discoverComponents() {
  return walk(COMPONENTS_DIR, (n) => n.endsWith('.jsx')).sort();
}

function discoverTests() {
  const unit = walk(UNIT_TEST_DIR, (n) => n.endsWith('.test.js') || n.endsWith('.test.jsx'));
  const e2e = walk(E2E_DIR, (n) => n.endsWith('.spec.js'));
  return [...unit, ...e2e].sort();
}

/* ---------- manifest aggregation ---------- */

function loadManifest() {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const features = raw.features || [];
  const endpoints = new Set();
  const entrypoints = new Set();
  const tests = new Set();
  for (const f of features) {
    (f.endpoints || []).forEach((e) => endpoints.add(e));
    (f.entrypoints || []).forEach((e) => entrypoints.add(e));
    (f.tests?.unit || []).forEach((t) => tests.add(t));
    (f.tests?.e2e || []).forEach((t) => tests.add(t));
  }
  return { raw, features, endpoints, entrypoints, tests };
}

/* ---------- reconciliation ---------- */

function pathExists(p) {
  // Entrypoints ending in "/" are directories.
  const full = join(ROOT, p);
  if (!existsSync(full)) return false;
  if (p.endsWith('/')) return statSync(full).isDirectory();
  return true;
}

function reconcile(manifest, discovered) {
  const fail = [];
  const warn = [];

  // Endpoints
  const declaredEndpoints = manifest.endpoints;
  for (const e of discovered.endpoints) {
    if (!declaredEndpoints.has(e)) fail.push({ type: 'endpoint_added', detail: e });
  }
  for (const e of declaredEndpoints) {
    if (!discovered.endpoints.includes(e)) fail.push({ type: 'endpoint_removed', detail: e });
  }

  // Components must be mapped
  for (const c of discovered.components) {
    if (!manifest.entrypoints.has(c)) fail.push({ type: 'component_unmapped', detail: c });
  }

  // Dead manifest references
  for (const e of manifest.entrypoints) {
    if (!pathExists(e)) fail.push({ type: 'dead_entrypoint', detail: e });
  }
  for (const t of manifest.tests) {
    if (!pathExists(t)) fail.push({ type: 'dead_test', detail: t });
  }

  // Untraced tests (warn only)
  for (const t of discovered.tests) {
    if (!manifest.tests.has(t)) warn.push({ type: 'test_untraced', detail: t });
  }

  // Low-coverage critical features (warn, surfaced prominently)
  for (const f of manifest.features) {
    if (f.tier === 'critical' && (f.coverage === 'none' || f.coverage === 'source-only')) {
      warn.push({ type: 'critical_thin_coverage', detail: `${f.id} (${f.coverage})` });
    }
  }

  return { fail, warn };
}

/* ---------- feature source hashing (UPDATE detection) ---------- */

// The files that make up a feature: its file entrypoints, plus every file under
// any directory entrypoint (those end in '/'). Only existing files are included.
function featureFiles(feature) {
  const files = [];
  for (const ep of feature.entrypoints || []) {
    const full = join(ROOT, ep);
    if (!existsSync(full)) continue;
    if (ep.endsWith('/')) {
      files.push(...walk(full, () => true));
    } else if (statSync(full).isFile()) {
      files.push(toPosix(relative(ROOT, full)));
    }
  }
  return [...new Set(files)].sort();
}

// A stable content hash of a feature's own source. Changes when the feature's
// code changes but its file set / manifest entry does not — i.e. an UPDATE.
function computeFeatureHash(feature) {
  const h = createHash('sha256');
  for (const rel of featureFiles(feature)) {
    h.update(rel + '\0');
    h.update(readFileSync(join(ROOT, rel)));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function loadHashes() {
  if (!existsSync(HASHES_PATH)) return {};
  try {
    return JSON.parse(readFileSync(HASHES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function computeAllHashes(features) {
  const out = {};
  for (const f of features) out[f.id] = computeFeatureHash(f);
  return out;
}

function writeHashes(features) {
  const all = computeAllHashes(features);
  const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
  writeFileSync(HASHES_PATH, JSON.stringify(sorted, null, 2) + '\n');
  return sorted;
}

// Compare current feature source against the stored baseline.
//   updated  = has a stored hash that no longer matches (a real UPDATE)
//   unhashed = no stored hash yet (first run / newly added; baseline it, don't flag)
function detectUpdates(features) {
  const stored = loadHashes();
  const updated = [];
  const unhashed = [];
  for (const f of features) {
    const cur = computeFeatureHash(f);
    if (!(f.id in stored)) unhashed.push({ type: 'feature_unhashed', detail: f.id });
    else if (stored[f.id] !== cur) updated.push({ type: 'feature_updated', detail: `${f.id} (${f.coverage})` });
  }
  return { updated, unhashed };
}

/* ---------- doc generation ---------- */

function pct(n, d) {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`;
}

// Escape a value for a single Markdown table cell. Backslash MUST be escaped
// first — otherwise a literal '\' followed by our own '\|' would combine into a
// bad sequence — then escape the pipe delimiter and collapse newlines.
function mdCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function buildDocBlock(manifest, discovered, result) {
  const f = manifest.features;
  const byTier = (t) => f.filter((x) => x.tier === t);
  const byCov = (c) => f.filter((x) => x.coverage === c).length;
  const stamp = new Date().toISOString().slice(0, 10);

  const tierRows = ['critical', 'important', 'nice', 'internal']
    .map((t) => `| ${t} | ${byTier(t).length} |`)
    .join('\n');

  const covRows = ['behavioral', 'mocked', 'source-only', 'device-only', 'none']
    .map((c) => `| ${c} | ${byCov(c)} |`)
    .join('\n');

  const featureRows = f
    .map(
      (x) =>
        `| \`${x.id}\` | ${x.tier} | ${x.coverage} | ${x.deviceOnly ? 'yes' : '-'} | ${mdCell(x.gap)} |`,
    )
    .join('\n');

  const thinCritical = f
    .filter((x) => x.tier === 'critical' && ['none', 'source-only', 'device-only', 'mocked'].includes(x.coverage))
    .map((x) => `- \`${x.id}\` — ${x.coverage}: ${x.gap}`)
    .join('\n');

  const driftLine =
    result.fail.length === 0
      ? '**Manifest is in sync with code.**'
      : `**${result.fail.length} drift issue(s) detected** (see CI).`;

  return `<!-- AUTO:BEGIN (generated by scripts/check-feature-manifest.mjs — do not edit by hand) -->
_Generated ${stamp}. ${driftLine}_

_The Manifest Auto-Reconcile bot regenerates this block and commits it via a PR when changes land on \`main\`. On feature PRs the checker runs \`--deadref-only\` (read-only, no write) — it never rewrites this file in-PR._

### Inventory at a glance

- **Features tracked:** ${f.length}
- **HTTP endpoints in code:** ${discovered.endpoints.length}
- **Components in code:** ${discovered.components.length}
- **Test files in code:** ${discovered.tests.length}
- **Behavioral coverage:** ${byCov('behavioral')}/${f.length} (${pct(byCov('behavioral'), f.length)})

| Tier | Features |
|------|----------|
${tierRows}

| Coverage | Features |
|----------|----------|
${covRows}

### Feature coverage matrix

| Feature | Tier | Coverage | Device-only | Gap |
|---------|------|----------|-------------|-----|
${featureRows}

### Critical features without behavioral CI coverage

These are the highest-leverage gaps. Each is a critical-tier feature whose real failure mode is not exercised by a test that runs in CI:

${thinCritical || '_None._'}
<!-- AUTO:END -->`;
}

function refreshDoc(manifest, discovered, result) {
  if (!existsSync(DOC_PATH)) {
    console.error(`[manifest] doc not found at ${relative(ROOT, DOC_PATH)} — skipping doc refresh.`);
    return false;
  }
  const doc = readFileSync(DOC_PATH, 'utf8');
  const block = buildDocBlock(manifest, discovered, result);
  const re = /<!-- AUTO:BEGIN[\s\S]*?<!-- AUTO:END -->/;
  if (!re.test(doc)) {
    console.error('[manifest] AUTO markers not found in doc — skipping doc refresh.');
    return false;
  }
  const next = doc.replace(re, block);
  if (next !== doc) {
    writeFileSync(DOC_PATH, next);
    return true;
  }
  return false;
}

/* ---------- main ---------- */

const manifest = loadManifest();
const discovered = {
  endpoints: discoverEndpoints(),
  components: discoverComponents(),
  tests: discoverTests(),
};
const result = reconcile(manifest, discovered);

// Update detection: has any feature's own source changed since the last baseline?
const { updated, unhashed } = detectUpdates(manifest.features);
result.updated = updated;
result.unhashed = unhashed;

// --update-hashes: recompute the baseline and exit. The bot runs this LAST, after
// reconciling, so the next push compares against current source.
if (MODE.updateHashes) {
  const written = writeHashes(manifest.features);
  if (!MODE.json) console.log(`feature-hashes.json baselined: ${Object.keys(written).length} features.`);
  process.exit(0);
}

if (MODE.json) {
  console.log(JSON.stringify({ discovered: {
    endpoints: discovered.endpoints.length,
    components: discovered.components.length,
    tests: discovered.tests.length,
  }, ...result }, null, 2));
}

// Write the doc only for --update or a default human run. --json is machine
// output for CI (the autofix workflow pipes it) and --check are read-only; both
// must leave docs/APP-STATE.md untouched.
let docChanged = false;
if (!MODE.checkOnly && !MODE.json) {
  docChanged = refreshDoc(manifest, discovered, result);
}

if (!MODE.json) {
  console.log('\n=== Feature manifest reconciliation ===');
  console.log(`endpoints: ${discovered.endpoints.length} in code | components: ${discovered.components.length} | tests: ${discovered.tests.length}`);
  if (docChanged) console.log('docs/APP-STATE.md auto block refreshed.');

  if (result.fail.length) {
    console.log(`\n❌ ${result.fail.length} drift issue(s):`);
    for (const d of result.fail) console.log(`   [${d.type}] ${d.detail}`);
    console.log('\nFix: update feature-manifest.json to match the code, then re-run.');
  } else {
    console.log('\n✅ No drift. Manifest matches code.');
  }

  if (result.updated.length) {
    console.log(`\n🔧 ${result.updated.length} updated feature(s) — source changed, coverage should be re-verified:`);
    for (const u of result.updated) console.log(`   [${u.type}] ${u.detail}`);
  }

  if (result.warn.length) {
    console.log(`\n⚠️  ${result.warn.length} warning(s):`);
    for (const w of result.warn) console.log(`   [${w.type}] ${w.detail}`);
  }
}

// Exit code.
// - default: fail on ANY drift (unless --update, a local convenience).
// - --deadref-only: fail ONLY on drift that makes the manifest actively wrong
//   (dead file/test ref, removed endpoint). Additions are non-fatal because the
//   auto-reconcile bot opens a PR for them, so feature PRs are never blocked.
const blocking = MODE.deadrefOnly
  ? result.fail.filter((d) => BLOCKING_TYPES.has(d.type))
  : result.fail;
if (MODE.deadrefOnly && !MODE.json) {
  const additions = result.fail.length - blocking.length;
  if (additions > 0) {
    console.log(
      `\nℹ️  ${additions} addition(s) are non-blocking — the auto-reconcile bot will open a manifest PR.`
    );
  }
  if (blocking.length > 0) {
    console.log(`\n❌ ${blocking.length} BLOCKING issue(s) (manifest points at missing code — human fix):`);
    for (const d of blocking) console.log(`   [${d.type}] ${d.detail}`);
  }
}
if (MODE.needsReconcile) {
  // The autofix trigger: exit 1 if the bot has anything to do — any drift
  // (add / remove / rename) OR any updated / newly-unhashed feature.
  const items = result.fail.length + result.updated.length + result.unhashed.length;
  if (!MODE.json) {
    console.log(items ? `\n🔧 needs-reconcile: ${items} item(s) for the bot.` : '\n✅ in sync — nothing for the bot.');
  }
  process.exitCode = items ? 1 : 0;
} else if (blocking.length && !MODE.updateOnly) {
  process.exitCode = 1;
}
