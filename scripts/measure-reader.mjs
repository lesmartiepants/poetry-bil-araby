// Measure how the reader viewport is actually spent. Run via: browse eval scripts/measure-reader.mjs
// Returns a JSON budget: total viewport height vs. the band the poem's own glyphs occupy,
// with every competing band itemised.
(() => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const rect = (el) => (el ? el.getBoundingClientRect() : null);
  const box = (el) => {
    const r = rect(el);
    return r ? { top: Math.round(r.top), h: Math.round(r.height), bottom: Math.round(r.bottom) } : null;
  };

  const reader = document.querySelector('[data-testid="poem-reader"]');
  const meta = document.querySelector('[data-testid="poem-meta"]');
  const stage = document.querySelector('[data-testid="sparkler-stage"]');
  const nav = document.querySelector('.safe-bottom');
  const actions = document.querySelector('.ra-root, [data-testid="reader-actions"]')
    || document.querySelector('button[data-testid="reader-read-full"]')?.closest('div')?.parentElement;

  // Every verse row that exists, and which of them are actually revealed (visible ink).
  const units = [...document.querySelectorAll('[data-testid^="sparkler-unit-"]')];
  const revealed = units.filter((u) => u.dataset.revealed === 'true');

  // Ink band = the union of the bounding boxes of the ARABIC lines that are actually
  // revealed AND inside the stage's clipping window. This is the honest "poem you can see".
  const stageR = rect(stage);
  let inkTop = Infinity;
  let inkBottom = -Infinity;
  let visibleLines = 0;
  for (const u of revealed) {
    const ar = u.querySelector('.ar-line');
    const r = rect(ar);
    if (!r || r.height === 0) continue;
    // must be within the stage window (the track translates; overflow is hidden)
    if (stageR && (r.bottom <= stageR.top + 1 || r.top >= stageR.bottom - 1)) continue;
    inkTop = Math.min(inkTop, r.top);
    inkBottom = Math.max(inkBottom, r.bottom);
    visibleLines++;
  }
  const inkH = visibleLines ? Math.round(inkBottom - inkTop) : 0;

  const unitH = units.length ? Math.round(rect(units[0]).height) : 0;
  const arH = units.length ? Math.round(rect(units[0].querySelector('.ar-line'))?.height || 0) : 0;

  return JSON.stringify(
    {
      viewport: { w: vw, h: vh },
      poem: {
        totalLines: units.length,
        revealedLines: revealed.length,
        linesVisibleNow: visibleLines,
        inkBandPx: inkH,
        inkPctOfViewport: +((inkH / vh) * 100).toFixed(1),
        unitRowHpx: unitH,
        arabicLineHpx: arH,
        // dead space inside the stage: rows allocated but showing nothing
        stageHpx: stageR ? Math.round(stageR.height) : 0,
        stageEmptyPx: stageR ? Math.round(stageR.height - inkH) : 0,
      },
      chrome: {
        headerMeta: box(meta),
        stage: box(stage),
        readerActions: box(actions),
        bottomNav: box(nav),
      },
      // The two hard insets PoemReader reserves before any text can be placed.
      insets: (() => {
        const body = stage?.closest('.absolute.inset-0');
        if (!body) return null;
        const cs = getComputedStyle(body);
        return { paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom };
      })(),
    },
    null,
    2
  );
})();
