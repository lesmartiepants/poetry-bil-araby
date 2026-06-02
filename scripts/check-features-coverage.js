#!/usr/bin/env node
/**
 * CI gate: every key in FEATURES must have at least one behavioral test assertion
 * (not just a toHaveProperty existence check).
 *
 * A "behavioral" hit means the flag name appears in a test file in a context
 * that is NOT toHaveProperty — e.g. FEATURES.logging is used in an expect()
 * that verifies the flag's effect, not just that the flag exists.
 *
 * Exit 1 if any flag has zero behavioral coverage.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const featuresPath = resolve('src/constants/features.js');
const testDir = resolve('src/test');

let featuresContent;
try {
  featuresContent = readFileSync(featuresPath, 'utf8');
} catch {
  // Fall back to reading from app.jsx (legacy location)
  try {
    const appContent = readFileSync(resolve('src/app.jsx'), 'utf8');
    const match = appContent.match(/const FEATURES\s*=\s*\{([^}]+)\}/s);
    featuresContent = match ? `const FEATURES = {${match[1]}}` : '';
  } catch {
    console.log('FEATURES file not found — skipping gate.');
    process.exit(0);
  }
}

const featureKeys = [...featuresContent.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);

if (featureKeys.length === 0) {
  console.log('No FEATURES keys found — skipping gate.');
  process.exit(0);
}

const testFiles = readdirSync(testDir)
  .filter((f) => /\.(js|jsx|ts|tsx)$/.test(f))
  .map((f) => readFileSync(join(testDir, f), 'utf8'));

const allTestContent = testFiles.join('\n');

const missing = featureKeys.filter((key) => {
  const refs = [...allTestContent.matchAll(new RegExp(`FEATURES\\.${key}`, 'g'))];
  // A ref only counts if it is NOT inside a toHaveProperty call
  return !refs.some((m) => {
    const ctx = allTestContent.slice(Math.max(0, m.index - 120), m.index + 120);
    return !ctx.includes('toHaveProperty');
  });
});

if (missing.length > 0) {
  console.error(`\nFEATURES flags with no behavioral test coverage:\n  ${missing.join(', ')}`);
  console.error('\nEach flag needs at least one test that uses FEATURES.flagName');
  console.error('in a toBe/toEqual/toStrictEqual assertion (not just toHaveProperty).\n');
  process.exit(1);
}

console.log(`All ${featureKeys.length} FEATURES flags have behavioral test coverage.`);
