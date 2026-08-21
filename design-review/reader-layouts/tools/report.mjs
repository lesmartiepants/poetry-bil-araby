#!/usr/bin/env node
// Pretty-print the shipping-reader geometry probe (see tools/measure-app.sh).
import { readFileSync } from 'node:fs';

const j = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { poem: p, chrome: c, viewport: v, width: w } = j;
const pad = (s, n) => String(s).padEnd(n);
const pct = (px) => `${((px / v.h) * 100).toFixed(1)}%`;

console.log(`  viewport        ${v.w}x${v.h}`);
console.log(`  poem lines      ${p.totalLines}   visible now ${p.linesVisibleNow}`);
console.log(`  POEM INK        ${p.inkBandPx}px = ${p.inkPctOfViewport}% of viewport`);
console.log(`  stage           ${p.stageHpx}px  (reserved but blank: ${p.stageEmptyPx}px)`);
console.log(`  row height      ${p.unitRowHpx}px   arabic line ${p.arabicLineHpx}px`);
for (const k of ['headerMeta', 'stage', 'readerActions', 'bottomNav']) {
  const b = c[k];
  if (b) console.log(`  ${pad(k, 15)} top ${pad(b.top, 5)} h ${pad(b.h, 4)} ${pct(b.h)}`);
}
console.log(`  insets          top ${j.insets?.paddingTop}  bottom ${j.insets?.paddingBottom}`);
if (w) {
  console.log(
    `  WIDTH           poem box ${w.poemBoxPx}px (${w.poemBoxPct}%), ${w.lostPx}px lost`
  );
  console.log(
    `                  --fit min ${w.fitMin} (${w.shrunkLines} lines shrunk), rendered ${w.renderedFontPx}px`
  );
}
