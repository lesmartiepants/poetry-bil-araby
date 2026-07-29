// Tests the deterministic --reconcile mode of scripts/check-feature-manifest.mjs.
// This is the bot's mechanical heal: it must add a schema-shaped skeleton entry
// for any new component (honest coverage:"none"), re-baseline the hashes, and
// bring `--needs-reconcile` to exit 0 — all with NO LLM. We drive the real
// script as a subprocess against a sandbox repo via FEATURE_MANIFEST_ROOT, so
// the test exercises the actual CI code path, not a reimplementation.
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'scripts',
  'check-feature-manifest.mjs'
);

const sandboxes = [];
afterEach(() => {
  while (sandboxes.length) rmSync(sandboxes.pop(), { recursive: true, force: true });
});

function run(root, ...flags) {
  return spawnSync('node', [SCRIPT, ...flags], {
    env: { ...process.env, FEATURE_MANIFEST_ROOT: root, GITHUB_OUTPUT: '' },
    encoding: 'utf8',
  });
}

function readManifest(root) {
  return JSON.parse(readFileSync(join(root, 'feature-manifest.json'), 'utf8'));
}

// A sandbox with one already-mapped feature; extra components are "new".
function makeSandbox(extraComponents = {}) {
  const sb = mkdtempSync(join(tmpdir(), 'manifest-reconcile-'));
  sandboxes.push(sb);
  mkdirSync(join(sb, 'src', 'components'), { recursive: true });
  mkdirSync(join(sb, 'src', 'test'), { recursive: true });
  mkdirSync(join(sb, 'e2e'), { recursive: true });
  writeFileSync(
    join(sb, 'feature-manifest.json'),
    JSON.stringify(
      {
        tiers: { critical: 'c', important: 'i', nice: 'n', internal: 't' },
        coverageLegend: {
          behavioral: 'b',
          mocked: 'm',
          'source-only': 's',
          'device-only': 'd',
          none: 'x',
        },
        features: [
          {
            id: 'existing-thing',
            name: 'Existing',
            tier: 'internal',
            userFacing: 'x',
            entrypoints: ['src/components/ExistingThing.jsx'],
            endpoints: [],
            tests: { unit: [], e2e: [] },
            deviceOnly: false,
            coverage: 'none',
            gap: 'n/a',
          },
        ],
      },
      null,
      2
    )
  );
  writeFileSync(
    join(sb, 'src/components/ExistingThing.jsx'),
    'export default function ExistingThing(){return null}'
  );
  for (const [name, body] of Object.entries(extraComponents)) {
    writeFileSync(join(sb, 'src/components', name), body);
  }
  return sb;
}

describe('check-feature-manifest --reconcile', () => {
  it('adds a schema-shaped skeleton with honest coverage for a new component and heals drift', () => {
    const sb = makeSandbox({
      'ProbeThing.jsx': 'export default function ProbeThing(){return null}',
    });

    // Precondition: the new component is drift.
    expect(run(sb, '--needs-reconcile').status).toBe(1);

    const rec = run(sb, '--reconcile');
    expect(rec.status).toBe(0);
    expect(rec.stdout).toMatch(/added 1 feature/);

    const added = readManifest(sb).features.find((f) => f.id === 'probe-thing');
    expect(added).toBeTruthy();
    // Honesty rule: the bot never claims coverage it didn't verify.
    expect(added.coverage).toBe('none');
    expect(added.entrypoints).toEqual(['src/components/ProbeThing.jsx']);
    // Every schema-required field must be present with the right shape.
    expect(added.tier).toBe('internal');
    expect(added.deviceOnly).toBe(false);
    expect(added.tests).toEqual({ unit: [], e2e: [] });
    expect(typeof added.gap).toBe('string');

    // Postcondition: the tree is fully reconciled.
    expect(run(sb, '--needs-reconcile').status).toBe(0);
    expect(existsSync(join(sb, 'feature-hashes.json'))).toBe(true);
  });

  it('never deletes: an already-mapped feature survives reconcile untouched', () => {
    const sb = makeSandbox({
      'ProbeThing.jsx': 'export default function ProbeThing(){return null}',
    });
    run(sb, '--reconcile');
    const ids = readManifest(sb).features.map((f) => f.id);
    expect(ids).toContain('existing-thing');
    expect(ids).toContain('probe-thing');
  });

  it('is idempotent: a second reconcile adds nothing and stays in sync', () => {
    const sb = makeSandbox({
      'ProbeThing.jsx': 'export default function ProbeThing(){return null}',
    });
    run(sb, '--reconcile');
    const again = run(sb, '--reconcile');
    expect(again.status).toBe(0);
    expect(again.stdout).toMatch(/added 0 feature/);
    expect(run(sb, '--needs-reconcile').status).toBe(0);
  });
});
