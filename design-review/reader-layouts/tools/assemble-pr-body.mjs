#!/usr/bin/env node
/**
 * Assemble the #707 decision-record body: take the current PR body and splice in the
 * decision banner, the deferred-coverage link, the poem-length argument for B, and the
 * implementation handoff. Anchored on exact strings so a miss fails loudly instead of
 * silently producing a half-updated body.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath, partsDir] = process.argv;
let body = readFileSync(inPath, 'utf8');
const part = (n) => readFileSync(`${partsDir}/${n}`, 'utf8');

const splice = (anchor, text, where = 'before') => {
  const i = body.indexOf(anchor);
  if (i === -1) throw new Error(`anchor not found: ${anchor.slice(0, 60)}`);
  body =
    where === 'before'
      ? body.slice(0, i) + text + body.slice(i)
      : body.slice(0, i + anchor.length) + text + body.slice(i + anchor.length);
};

const replace = (from, to) => {
  if (!body.includes(from)) throw new Error(`replace target not found: ${from.slice(0, 60)}`);
  body = body.replace(from, to);
};

// 1 — decision banner at the very top
splice('> "The issue right now is', part('decision.md'));

// 2 — link the deferred coverage issue where the 13% finding is stated
replace(
  '(`tools/probe-english.mjs`: 2/15).',
  '(`tools/probe-english.mjs`: 2/15). That coverage gap is deferred and tracked in **#713** — not solved here.'
);

// 3 — the poem-length argument for B, appended to B's section
splice('**Trades** the sparkler\'s fixed-frame choreography', part('length-argument.md'));

// 4 — implementation handoff, before the desktop section
splice('## Desktop — no regression', part('handoff.md'));

writeFileSync(outPath, body);
console.log(`wrote ${outPath} (${body.split('\n').length} lines)`);
