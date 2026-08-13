// Width budget probe: how much of the screen width the poem box actually gets,
// and how hard the Arabic lines are being shrunk to fit it (`--fit` < 1 means the
// verse is rendered SMALLER than its design size purely to survive the box width).
(() => {
  const vw = window.innerWidth;
  const stage = document.querySelector('[data-testid="sparkler-stage"]');
  const stageW = stage ? Math.round(stage.getBoundingClientRect().width) : 0;
  const fits = [...document.querySelectorAll('.ar-line')]
    .map((el) => parseFloat(getComputedStyle(el).getPropertyValue('--fit')) || 1)
    .filter((n) => n > 0);
  const sizes = [...document.querySelectorAll('.ar-line')].map((el) =>
    +parseFloat(getComputedStyle(el).fontSize).toFixed(1)
  );
  const rail = document.querySelector('[data-testid="progress-scrubber"]');
  return JSON.stringify(
    {
      viewportW: vw,
      poemBoxW: stageW,
      poemBoxPctOfWidth: +((stageW / vw) * 100).toFixed(1),
      widthLostPx: vw - stageW,
      fitMin: fits.length ? Math.min(...fits) : null,
      fitAvg: fits.length ? +(fits.reduce((a, b) => a + b, 0) / fits.length).toFixed(3) : null,
      shrunkLines: fits.filter((f) => f < 0.999).length,
      totalLines: fits.length,
      renderedFontPx: sizes,
      railW: rail ? Math.round(rail.getBoundingClientRect().width) : null,
    },
    null,
    2
  );
})();
