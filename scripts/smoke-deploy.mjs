#!/usr/bin/env node
/**
 * Post-deploy smoke check for the poetry-bil-araby API.
 *
 * Catches the failure mode that hid for ~2 months: a stale Render build that
 * silently 404s newer endpoints (e.g. /api/ai/live-tts) while /api/health still
 * returns 200. Run after a deploy, or in CI.
 *
 *   node scripts/smoke-deploy.mjs [baseUrl]
 *   API_BASE=https://my-api.onrender.com node scripts/smoke-deploy.mjs
 *   EXPECTED_COMMIT=$(git rev-parse HEAD) node scripts/smoke-deploy.mjs   # assert deployed SHA
 *
 * Exits non-zero if any check fails.
 */
const BASE = (process.argv[2] || process.env.API_BASE || 'https://poetry-bil-araby-2mb0.onrender.com').replace(/\/$/, '');
const EXPECTED_COMMIT = process.env.EXPECTED_COMMIT || '';

let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.error(`  ✗ ${m}`);
  failed++;
};

const matches = (a, b) => a && b && (a.startsWith(b) || b.startsWith(a));

async function main() {
  console.log(`Smoke-testing ${BASE}`);

  // 1. Health + deployed commit
  try {
    const r = await fetch(`${BASE}/api/health`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) ok(`/api/health 200 (commit: ${j.commit ?? 'n/a'}, uptime ${Math.round(j.uptime || 0)}s)`);
    else bad(`/api/health ${r.status}`);
    if (EXPECTED_COMMIT) {
      if (!j.commit || j.commit === 'unknown') bad(`deployed commit not reported — cannot confirm build (expected ${EXPECTED_COMMIT.slice(0, 8)})`);
      else if (!matches(j.commit, EXPECTED_COMMIT)) bad(`STALE BUILD: deployed ${j.commit} != expected ${EXPECTED_COMMIT.slice(0, 8)}`);
      else ok(`deployed commit matches expected (${j.commit.slice(0, 8)})`);
    }
  } catch (e) {
    bad(`/api/health threw: ${e.message}`);
  }

  // 2. DB connectivity
  try {
    const r = await fetch(`${BASE}/api/health/full`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.database === 'connected') ok(`/api/health/full DB connected (${j.totalPoems} poems)`);
    else bad(`/api/health/full ${r.status} db=${j.database ?? 'n/a'}`);
  } catch (e) {
    bad(`/api/health/full threw: ${e.message}`);
  }

  // 3. Live TTS route present. An empty body should hit the handler's validation
  //    (400) or the no-key guard (503) — NOT a 404, which means the deployed
  //    build predates the endpoint. Cheap: no audio generated, no quota spent.
  try {
    const r = await fetch(`${BASE}/api/ai/live-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (r.status === 404) bad(`/api/ai/live-tts 404 — endpoint missing (STALE BUILD)`);
    else ok(`/api/ai/live-tts route present (HTTP ${r.status})`);
  } catch (e) {
    bad(`/api/ai/live-tts threw: ${e.message}`);
  }

  console.log(failed ? `\nFAILED (${failed} check${failed === 1 ? '' : 's'})` : `\nAll checks passed`);
  process.exit(failed ? 1 : 0);
}

main();
