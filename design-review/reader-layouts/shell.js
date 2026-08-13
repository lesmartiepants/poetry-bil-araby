/**
 * Shared reader DOM. One source of truth so every layout option renders the SAME markup
 * and the same navigation affordances — a comparison then isolates layout, and no option
 * can look better by quietly dropping a control.
 */

const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  dislike: icon('<path d="M17 2h3v12h-3zM3 10l3-8h8l2 8-4 8-4-2 1-6z"/>'),
  save: icon('<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z"/>'),
  library: icon('<path d="M4 3h3v18H4zM10 3h3v18h-3zM16.5 3.5l3 .8L16 21l-3-.8z"/>'),
  discover: icon('<path d="M12 2c2 4 5 5 5 9a5 5 0 0 1-10 0c0-4 3-5 5-9z"/>'),
  account: icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
};

export function mountShell({ layout, note = '' }) {
  document.body.dataset.layout = layout;
  // ?clean hides the prototype-only probe/picker for an undistracted design read.
  if (new URLSearchParams(location.search).has('clean')) document.body.classList.add('hide-probe');
  document.body.innerHTML = `
    <div id="shell">
      <div id="probe">—</div>
      <div id="picker"></div>

      <header id="meta">
        <div id="title-ar"></div>
        <div id="title-en"></div>
        <div id="poet"><span id="poet-ar"></span><span id="poet-en"></span></div>
        <div id="len-badge" hidden></div>
      </header>

      <div id="body">
        <div id="stage"><div id="track"></div></div>
      </div>

      <div id="rail" data-owns-gesture aria-label="Reading progress">
        <div id="rail-track"><div id="rail-fill"></div><div id="rail-handle"></div></div>
      </div>

      <div id="actions">
        <div class="ra-row">
          <button class="ra-btn" id="act-listen">LISTEN</button>
          <button class="ra-btn primary" id="act-next">NEXT VERSE</button>
        </div>
        <button class="ra-readfull">Read full poem</button>
        <div id="cue">swipe up for next poem</div>
      </div>

      <nav id="nav">
        <div class="nav-pill">
          <button class="nav-item">${ICONS.dislike}<span>Dislike</span></button>
          <button class="nav-item">${ICONS.save}<span>Save</span></button>
          <button class="nav-item">${ICONS.library}<span>Library</span></button>
          <button class="nav-item" aria-current="true">${ICONS.discover}<span>Discover</span></button>
          <button class="nav-item">${ICONS.account}<span>Account</span></button>
        </div>
      </nav>
    </div>`;

  if (note) document.title = `${layout} — ${note}`;
}

/** Live geometry readout, so the win (or loss) is visible in every screenshot. */
export function startProbe() {
  const el = document.getElementById('probe');
  const tick = () => {
    const p = window.__readerProbe?.();
    if (p) {
      el.textContent =
        `${p.viewport.w}x${p.viewport.h}   ${p.linesVisible}/${p.linesTotal} shown\n` +
        `CAPACITY ${p.capacityRows} rows  (reading area ${p.readingAreaPx}px = ${p.readingAreaPct}%)\n` +
        `ink ${p.inkPx}px ${p.inkPct}%   blank: window ${p.stageEmptyPx}px / screen ${p.screenEmptyPx}px\n` +
        `box ${p.poemBoxW}px (${p.poemBoxPct}%)  fit ${p.fitMin}`;
    }
    requestAnimationFrame(tick);
  };
  tick();
}
