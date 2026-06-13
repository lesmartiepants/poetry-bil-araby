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
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = new Set(process.argv.slice(2));
const MODE = {
  checkOnly: args.has('--check'),
  updateOnly: args.has('--update'),
  json: args.has('--json'),
};

const MANIFEST_PATH = join(ROOT, 'feature-manifest.json');
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
    else if (test(entry.name)) out.push(relative(ROOT, full));
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

/* ---------- doc generation ---------- */

function pct(n, d) {
  return d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`;
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
        `| \`${x.id}\` | ${x.tier} | ${x.coverage} | ${x.deviceOnly ? 'yes' : '-'} | ${(x.gap || '').replace(/\|/g, '\\|')} |`,
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

if (MODE.json) {
  console.log(JSON.stringify({ discovered: {
    endpoints: discovered.endpoints.length,
    components: discovered.components.length,
    tests: discovered.tests.length,
  }, ...result }, null, 2));
}

// Refresh the doc unless --check (check-only never writes).
let docChanged = false;
if (!MODE.checkOnly) {
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

  if (result.warn.length) {
    console.log(`\n⚠️  ${result.warn.length} warning(s):`);
    for (const w of result.warn) console.log(`   [${w.type}] ${w.detail}`);
  }
}

// Exit code: fail on drift unless --update (local convenience).
if (result.fail.length && !MODE.updateOnly) {
  process.exitCode = 1;
}
