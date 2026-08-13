#!/usr/bin/env node
// Pretty-print the reader-geometry probe output (see scripts/measure-reader.sh).
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { poem: p, chrome: c, viewport: v } = j;
const pad = (s, n) => String(s).padEnd(n);
console.log(`  viewport       ${v.w}x${v.h}`);
console.log(`  poem lines     ${p.totalLines}   visible now ${p.linesVisibleNow}`);
console.log(`  POEM INK       ${p.inkBandPx}px = ${p.inkPctOfViewport}% of viewport`);
console.log(`  stage          ${p.stageHpx}px (empty ${p.stageEmptyPx}px)`);
for (const k of ['headerMeta', 'stage', 'readerActions', 'bottomNav']) {
  const b = c[k];
  if (b) console.log(`  ${pad(k, 14)} top ${pad(b.top, 5)} h ${b.h}`);
}
console.log(`  insets         top ${j.insets?.paddingTop}  bottom ${j.insets?.paddingBottom}`);
