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
 *   node scripts/check-feature-manifest.mjs --reconcile      # bot heal: add skeletons for new
 *                                                            # code, re-baseline hashes, refresh doc
 *   node scripts/check-feature-manifest.mjs --update-hashes  # re-baseline feature-hashes.json only
 *   node scripts/check-feature-manifest.mjs --needs-reconcile # exit 1 iff the bot has work to do
 *
 * Testability: set FEATURE_MANIFEST_ROOT=<dir> to run against a sandbox copy of
 * the repo layout (manifest + src/components + server.js) instead of this repo.
 *
 * No external dependencies (Node >= 18 built-ins only).
 */

import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

// Manifest paths are POSIX (forward-slash). path.relative() emits the platform
// separator ('\' on Windows), so normalize discovered paths before comparing.
const toPosix = (p) => p.split(sep).join('/');

const __dirname = dirname(fileURLToPath(import.meta.url));
// FEATURE_MANIFEST_ROOT lets tests point the whole script at a sandbox repo
// layout (manifest + src/components + server.js) instead of this checkout.
const ROOT = process.env.FEATURE_MANIFEST_ROOT
  ? resolve(process.env.FEATURE_MANIFEST_ROOT)
  : join(__dirname, '..');

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
  // reconcile: the bot's deterministic heal — add skeleton entries for new
  // components/endpoints, re-baseline hashes, refresh the doc. Never deletes.
  reconcile: args.has('--reconcile'),
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

/* ---------- deterministic skeleton reconcile ---------- */

// A schema-valid manifest id: lowercase, starts alnum, only [a-z0-9-].
function slugify(s) {
  const out = String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return out || 'feature';
}

// A fresh, schema-complete feature entry with honest empty coverage. The bot
// adds these mechanically so no released feature is ever missing from the
// inventory; the enrichment step (or a human) writes the real description and
// upgrades coverage once a verified test exists.
function skeletonFeature({ id, name, entrypoints = [], endpoints = [], userFacing }) {
  return {
    id,
    name,
    tier: 'internal',
    userFacing,
    entrypoints,
    endpoints,
    tests: { unit: [], e2e: [] },
    deviceOnly: false,
    coverage: 'none',
    gap: 'Auto-added by reconcile bot; coverage unverified.',
  };
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

// --reconcile: the bot's deterministic heal. Add a skeleton entry for every new
// component/endpoint (honest coverage:"none"), re-baseline hashes, refresh the
// doc. It never deletes: a dead reference (removed file/endpoint) is a semantic
// call left for a human, so it stays surfaced and the workflow's follow-up
// --needs-reconcile check will still fail loudly on it.
if (MODE.reconcile) {
  const added = [];
  const existingIds = new Set(manifest.features.map((f) => f.id));
  const uniqueId = (base) => {
    let id = base;
    let n = 2;
    while (existingIds.has(id)) id = `${base}-${n++}`;
    existingIds.add(id);
    return id;
  };
  for (const d of result.fail) {
    if (d.type === 'component_unmapped') {
      const baseName = d.detail.split('/').pop().replace(/\.[jt]sx?$/, '');
      const sk = skeletonFeature({
        id: uniqueId(slugify(baseName)),
        name: baseName,
        entrypoints: [d.detail],
        userFacing: `Auto-added from ${d.detail}; description pending human review.`,
      });
      manifest.raw.features.push(sk);
      added.push(sk.id);
    } else if (d.type === 'endpoint_added') {
      const sk = skeletonFeature({
        id: uniqueId('endpoint-' + slugify(d.detail)),
        name: d.detail,
        endpoints: [d.detail],
        userFacing: `Auto-added HTTP endpoint ${d.detail}; description pending human review.`,
      });
      manifest.raw.features.push(sk);
      added.push(sk.id);
    }
    // endpoint_removed / dead_entrypoint / dead_test → left for a human.
  }

  if (added.length) writeFileSync(MANIFEST_PATH, JSON.stringify(manifest.raw, null, 2) + '\n');

  // Re-aggregate from disk so the doc + hashes reflect the new feature set.
  const m2 = loadManifest();
  const d2 = {
    endpoints: discoverEndpoints(),
    components: discoverComponents(),
    tests: discoverTests(),
  };
  const r2 = reconcile(m2, d2);
  const u2 = detectUpdates(m2.features);
  r2.updated = u2.updated;
  r2.unhashed = u2.unhashed;
  refreshDoc(m2, d2, r2);
  writeHashes(m2.features);

  const blocking2 = r2.fail.filter((d) => BLOCKING_TYPES.has(d.type));
  console.log(
    `🤖 reconcile: added ${added.length} feature(s)` +
      (added.length ? ` — ${added.join(', ')}` : '') +
      '; hashes re-baselined; doc refreshed.'
  );
  if (blocking2.length) {
    console.log(`⚠️  ${blocking2.length} issue(s) reconcile can't auto-fix (a human must resolve):`);
    for (const d of blocking2) console.log(`   [${d.type}] ${d.detail}`);
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `added=${added.length}\nadded_ids=${added.join(',')}\n`,
    );
  }
  process.exit(0);
}

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

// Write the doc only for --update or a default human run. Every check-style mode
// is read-only and must leave docs/APP-STATE.md untouched: --check, --json (CI
// pipes it), --deadref-only (the PR gate), and --needs-reconcile (the bot's
// trigger check). (--reconcile / --update-hashes exit before reaching here.)
let docChanged = false;
if (!MODE.checkOnly && !MODE.json && !MODE.deadrefOnly && !MODE.needsReconcile) {
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
