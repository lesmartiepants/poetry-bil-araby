/**
 * Shared reader engine for the reader-layout options.
 *
 * Every option in this folder is a real working screen driven by this one file: same real
 * poems, same navigation contract, same reveal mechanic. Only the LAYOUT differs, so a
 * side-by-side comparison is honest — nothing wins because it quietly dropped a feature.
 *
 * Navigation contract (must survive in every option — see PoemFeed / useSparklerReveal):
 *   • vertical swipe / wheel between poems, via pointer listeners on `window`
 *   • word-by-word sparkler reveal, advanced by the Next Verse control
 *   • the poem body is deliberately NOT a tap target
 *   • progress scrubber (drag to seek)
 *   • reader actions + bottom nav
 *   • `data-owns-gesture` opts a floating panel out of the poem swipe
 *
 * Layout hooks an option can set on <body data-layout="...">, read by each option's CSS.
 * The engine only reports geometry; it never hard-codes a look.
 */

import { transliterate } from './transliterate.js';

/**
 * Language mode. The shipping reader renders Arabic → transliteration → English per verse
 * (SparklerStage), with `showTranslation = true` and `showTransliteration = false` as the
 * defaults (PoemReader.jsx / uiStore.js). So the DEFAULT row is bilingual — Arabic plus
 * English — and measuring on Arabic-only rows overstates how many verses fit.
 *
 *   ?lang=bi        Arabic + English   (default; what ships)
 *   ?lang=ar        Arabic only        (what a database poem without a translation shows)
 *   ?lang=translit  all three rows     (transliteration toggled on)
 */
const LANG_MODES = new Set(['ar', 'bi', 'translit']);

export async function boot(opts = {}) {
  const {
    /** How many verse rows the stage may show. 'fit' = as many as the box allows. */
    rows = 'fit',
    /** Continuous-scroll layouts manage their own scrolling; the stage never translates. */
    flow = false,
    /**
     * Grow the stage to the number of lines actually REVEALED (capped at what fits),
     * instead of holding `visRows` open from the first frame. This is the single change
     * that removes the reserved-but-empty rows the measurement found (339px at 393x852).
     */
    grow = false,
    /** Called after each render so an option can re-measure its own chrome. */
    onRender = null,
  } = opts;

  // ?poem=N pins a specific poem so the same verse is compared across every option.
  // ?reveal=all lands fully revealed, which is the steady state worth comparing.
  const qs = new URLSearchParams(location.search);
  const lang = LANG_MODES.has(qs.get('lang')) ? qs.get('lang') : 'bi';
  document.body.dataset.lang = lang;

  // All three language modes read the SAME bilingual sample, so `?lang=ar` is a true
  // control — the identical poem with the English row withheld, not a different poem that
  // happens to lack a translation. Only ~13% of the corpus carries one (the API's
  // `english` field is hardcoded ''; real translations arrive as `cachedTranslation`).
  const poems = await fetch('./poems-bilingual.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .catch(() => fetch('./poems.json').then((r) => r.json()));
  let poemIndex = Math.min(poems.length - 1, Math.max(0, +qs.get('poem') || 0));
  const startRevealed = qs.get('reveal') === 'all';
  let revealed = 0;
  let windowTop = 0;
  let busy = false;

  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const track = $('#track');
  const railFill = $('#rail-fill');
  const railHandle = $('#rail-handle');

  const lines = () => {
    const p = poems[poemIndex];
    const ar = p.arabic.split('\n').filter((l) => l.trim());
    const en = (p.english || '').split('\n').filter((l) => l.trim());
    return ar.map((a, i) => ({ ar: a, en: en[i] || '' }));
  };

  // ── render ────────────────────────────────────────────────────────────────
  function render() {
    const p = poems[poemIndex];
    const ls = lines();
    revealed = flow ? ls.length : Math.min(revealed, ls.length);
    windowTop = 0;

    $('#title-ar').textContent = p.titleArabic || p.title;
    $('#title-en').textContent = p.title || '';
    $('#poet-ar').textContent = p.poetArabic || p.poet;
    $('#poet-en').textContent = p.poet && p.poetArabic && p.poet !== p.poetArabic ? p.poet : '';
    const badge = $('#len-badge');
    if (badge) badge.textContent = `${ls.length} lines · ${p.bucket}`;

    track.innerHTML = '';
    ls.forEach((ln, i) => {
      const unit = document.createElement('div');
      unit.className = 'unit';
      unit.dataset.revealed = i < revealed ? 'true' : 'false';
      unit.dataset.i = i;

      const ar = document.createElement('div');
      ar.className = 'ar-line';
      ar.lang = 'ar';
      ar.dir = 'rtl';
      // Word spans: the reveal clips word by word, same DOM path the TTS highlight uses.
      ln.ar.split(/\s+/).forEach((w, wi) => {
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        s.style.transitionDelay = `${wi * 0.055}s`;
        ar.appendChild(s);
        ar.appendChild(document.createTextNode(' '));
      });
      unit.appendChild(ar);

      // Row order matches SparklerStage: Arabic → transliteration → English, revealed
      // together as one unit. Each extra row makes the unit taller, which is exactly why
      // the language mode changes how many verses fit.
      if (lang === 'translit') {
        const tr = document.createElement('div');
        tr.className = 'translit-line';
        tr.dir = 'ltr';
        tr.textContent = transliterate(ln.ar);
        unit.appendChild(tr);
      }
      if (ln.en && lang !== 'ar') {
        const en = document.createElement('div');
        en.className = 'en-line';
        en.dir = 'ltr';
        en.textContent = ln.en;
        unit.appendChild(en);
      }
      track.appendChild(unit);
    });

    fitLines();
    layout();
    onRender?.({ poem: p, lines: ls });
  }

  // Shrink an overflowing Arabic line rather than wrapping it (ligature-safe), exactly like
  // SparklerStage's `--fit`. If this multiplier is < 1 the verse is being rendered SMALLER
  // than its design size purely to survive the box width — a width-budget smell.
  // Arabic AND transliteration are both nowrap shrink-to-fit in SparklerStage; English
  // wraps instead. Fit the same two.
  function fitLines() {
    track.querySelectorAll('.ar-line, .translit-line').forEach((el) => {
      el.style.setProperty('--fit', '1');
      const avail = el.clientWidth * 0.98;
      const need = el.scrollWidth;
      if (need > avail && avail > 0) el.style.setProperty('--fit', (avail / need).toFixed(4));
    });
  }

  /**
   * Derive the reading bands from the chrome that is actually painted, rather than from
   * hand-tuned constants. Each option then competes on how much chrome it shows — it can't
   * win by setting a band smaller than its own buttons and letting verses run underneath.
   * The reading area is whatever is left between the header's bottom and the topmost
   * bottom-chrome element that is currently visible.
   */
  function syncBands() {
    if (flow) return; // the flow column scrolls under its own scrim; bands don't apply
    const shell = document.getElementById('shell');
    const H = shell.getBoundingClientRect().height;
    const GUTTER = 12;

    const metaEl = document.getElementById('meta');
    const metaBottom = metaEl ? metaEl.getBoundingClientRect().bottom : 0;

    // Bottom chrome: consider every band that can sit over the poem, and take the highest
    // one that is currently on screen (a receded nav no longer costs anything).
    let lowest = H;
    for (const sel of ['#actions', '#nav']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.opacity === '0' || cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      lowest = Math.min(lowest, r.top);
    }

    document.body.style.setProperty('--band-top', `${Math.round(metaBottom + GUTTER)}px`);
    document.body.style.setProperty('--band-bottom', `${Math.round(H - lowest + GUTTER)}px`);
  }

  // ── layout: how many rows fit, and where the window sits ──────────────────
  function layout() {
    const units = [...track.querySelectorAll('.unit')];
    if (!units.length) return;

    if (flow) {
      // Continuous column: no fixed window, no translate. The stage scrolls natively.
      track.style.transform = '';
      units.forEach((u, i) => u.setAttribute('data-revealed', i < revealed ? 'true' : 'false'));
      updateRail();
      return;
    }

    syncBands();

    // Available height is the body box's CONTENT height — clientHeight still includes the
    // top/bottom bands, so subtract them or the window sizes itself over the chrome.
    const box = stage.parentElement;
    const cs = getComputedStyle(box);
    const avail =
      box.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
    // Every unit is forced to the tallest unit's height, exactly as SparklerStage does
    // (`runMax` applied as a fixed row height). Bilingual rows vary — an English line can
    // wrap to two — and without this the window's translate drifts out of sync with the
    // content it is scrolling.
    units.forEach((u) => (u.style.height = ''));
    const rowH = Math.ceil(Math.max(...units.map((u) => u.getBoundingClientRect().height)));
    units.forEach((u) => (u.style.height = `${rowH}px`));
    const fit = rows === 'fit' ? Math.max(1, Math.floor(avail / rowH)) : rows;
    // `grow`: the window is only as tall as there is poem to put in it, so an unrevealed
    // line never reserves a blank row. Once the reveal passes what fits, it behaves
    // exactly like the shipping window and starts scrolling.
    const visRows = grow
      ? Math.min(fit, units.length, Math.max(1, revealed))
      : Math.min(fit, units.length);
    stage.style.height = `${visRows * rowH}px`;
    stage.dataset.visRows = visRows;

    // Keep the newest revealed line inside the window.
    windowTop = Math.max(0, Math.min(revealed - visRows, units.length - visRows));
    if (revealed === 0) windowTop = 0;
    track.style.transform = `translateY(${-windowTop * rowH}px)`;
    units.forEach((u, i) => u.setAttribute('data-revealed', i < revealed ? 'true' : 'false'));
    updateRail();
  }

  function updateRail() {
    const total = lines().length || 1;
    const frac = Math.min(1, revealed / total);
    if (railFill) railFill.style.height = `${(frac * 100).toFixed(1)}%`;
    if (railHandle) railHandle.style.top = `${(frac * 100).toFixed(1)}%`;
  }

  // ── reveal ────────────────────────────────────────────────────────────────
  function advance() {
    if (busy) return;
    const ls = lines();
    if (revealed >= ls.length) return;
    busy = true;
    revealed++;
    layout();
    const wordCount = ls[revealed - 1].ar.split(/\s+/).length;
    setTimeout(() => {
      busy = false;
      syncActions();
    }, 120 + wordCount * 55);
    syncActions();
  }

  function revealAll() {
    revealed = lines().length;
    busy = false;
    layout();
    // Rest at the top so the reader picks up from the first line (matches #614).
    windowTop = 0;
    const units = [...track.querySelectorAll('.unit')];
    if (!flow && units.length) {
      const rowH = units[0].getBoundingClientRect().height;
      track.style.transform = `translateY(0px)`;
      stage.dataset.visRows = Math.min(+stage.dataset.visRows || 4, units.length);
    }
    syncActions();
  }

  function scrubTo(frac) {
    const ls = lines();
    revealed = Math.max(1, Math.round(frac * ls.length));
    layout();
    syncActions();
  }

  // ── poem navigation (vertical swipe / wheel on window) ────────────────────
  function goTo(next) {
    const n = poems.length;
    poemIndex = ((next % n) + n) % n;
    revealed = flow ? 0 : 1;
    const shell = $('#shell');
    shell.classList.add('poem-out');
    setTimeout(() => {
      render();
      if (!flow) revealed = 1;
      layout();
      shell.classList.remove('poem-out');
      shell.classList.add('poem-in');
      setTimeout(() => shell.classList.remove('poem-in'), 420);
      syncActions();
    }, 200);
  }

  let startY = null;
  let owns = false;
  const ownsGesture = (t) => !!(t && t.closest?.('[data-owns-gesture]'));

  window.addEventListener(
    'pointerdown',
    (e) => {
      owns = ownsGesture(e.target);
      startY = owns ? null : e.clientY;
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (startY == null || owns) return;
      const dy = e.clientY - startY;
      startY = null;
      if (Math.abs(dy) < 60) return;
      goTo(poemIndex + (dy < 0 ? 1 : -1)); // swipe up → next poem
    },
    { passive: true }
  );

  let wheelLock = 0;
  window.addEventListener(
    'wheel',
    (e) => {
      if (ownsGesture(e.target)) return;
      // In a flow layout the wheel scrolls the poem until it bottoms out, then pages.
      if (flow) {
        const sc = document.querySelector('.flow-scroll');
        if (sc) {
          const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
          const atTop = sc.scrollTop <= 2;
          if (!(e.deltaY > 0 && atEnd) && !(e.deltaY < 0 && atTop)) return;
        }
      }
      const now = Date.now();
      if (now - wheelLock < 700) return;
      if (Math.abs(e.deltaY) < 20) return;
      wheelLock = now;
      goTo(poemIndex + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: true }
  );

  // ── reader actions ────────────────────────────────────────────────────────
  function syncActions() {
    const ls = lines();
    const done = revealed >= ls.length;
    const next = $('#act-next');
    const readfull = $('.ra-readfull');
    if (next) {
      next.textContent = done ? 'POEM INSIGHTS' : 'NEXT VERSE';
      next.disabled = busy && !done;
    }
    if (readfull) readfull.style.visibility = done ? 'hidden' : 'visible';
    const cue = $('#cue');
    if (cue) cue.style.opacity = done ? '0.95' : '0';
    const nextState = done ? 'done' : 'reading';
    if (document.body.dataset.readState !== nextState) {
      document.body.dataset.readState = nextState;
      // Chrome that recedes/returns changes the reading area. Re-measure once its
      // transition has settled so the window resizes to the space actually freed.
      clearTimeout(syncActions._t);
      syncActions._t = setTimeout(layout, 460);
    }
  }

  $('#act-next')?.addEventListener('click', () => {
    if (revealed >= lines().length) return; // insights stage — out of scope for a layout probe
    advance();
  });
  $('.ra-readfull')?.addEventListener('click', revealAll);
  $('#act-listen')?.addEventListener('click', () => {
    revealAll();
    document.body.dataset.playing = document.body.dataset.playing === 'true' ? 'false' : 'true';
  });

  // Scrubber drag. Marked data-owns-gesture in markup so dragging it never swipes the poem.
  const rail = $('#rail');
  if (rail) {
    const seek = (clientY) => {
      const r = rail.getBoundingClientRect();
      scrubTo(Math.max(0, Math.min(1, (clientY - r.top) / r.height)));
    };
    let dragging = false;
    rail.addEventListener('pointerdown', (e) => {
      dragging = true;
      rail.setPointerCapture(e.pointerId);
      seek(e.clientY);
    });
    rail.addEventListener('pointermove', (e) => dragging && seek(e.clientY));
    rail.addEventListener('pointerup', () => (dragging = false));
  }

  // Keyboard parity for desktop verification.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') advance();
    if (e.key === 'ArrowDown') goTo(poemIndex + 1);
    if (e.key === 'ArrowUp') goTo(poemIndex - 1);
  });

  // Poem picker (prototype affordance so a reviewer can jump to a length on purpose).
  const picker = $('#picker');
  if (picker) {
    poems.forEach((p, i) => {
      const b = document.createElement('button');
      b.textContent = `${p.lines}`;
      b.title = `${p.bucket} — ${p.poet}`;
      b.onclick = () => goTo(i);
      picker.appendChild(b);
    });
  }

  window.addEventListener('resize', () => {
    fitLines();
    layout();
  });

  render();
  revealed = flow || startRevealed ? lines().length : 1;
  layout();
  syncActions();

  // Expose a geometry probe so scripts/measure-*.mjs can score every option the same way.
  window.__readerProbe = () => {
    const units = [...track.querySelectorAll('.unit[data-revealed="true"]')];
    const sr = stage.getBoundingClientRect();
    let top = Infinity;
    let bottom = -Infinity;
    let n = 0;
    for (const u of units) {
      const r = u.querySelector('.ar-line').getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.bottom <= sr.top + 1 || r.top >= sr.bottom - 1) continue;
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
      n++;
    }
    const ink = n ? Math.round(bottom - top) : 0;
    const fits = [...track.querySelectorAll('.ar-line')].map(
      (el) => parseFloat(getComputedStyle(el).getPropertyValue('--fit')) || 1
    );

    // CAPACITY is the number the layout actually controls: how many verse rows the reading
    // area could hold, independent of how far the reveal has got. `linesVisible` is capped
    // by the reveal, so on landing every fixed-window option scores the same — capacity is
    // what separates them.
    const all = [...track.querySelectorAll('.unit')];
    const rowH = all.length ? Math.max(...all.map((u) => u.getBoundingClientRect().height)) : 0;
    let readingH;
    if (flow) {
      const sc = document.querySelector('.flow-scroll');
      readingH = sc ? sc.clientHeight : innerHeight;
    } else {
      const box = stage.parentElement;
      const cs = getComputedStyle(box);
      readingH =
        box.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
    }
    const capacityRows = rowH ? Math.floor(readingH / rowH) : 0;

    return {
      layout: document.body.dataset.layout,
      viewport: { w: innerWidth, h: innerHeight },
      linesTotal: lines().length,
      linesVisible: n,
      capacityRows,
      readingAreaPx: Math.round(readingH),
      readingAreaPct: +((readingH / innerHeight) * 100).toFixed(1),
      // Reserved-but-blank rows held open INSIDE the window (what `grow` removes).
      stageEmptyPx: Math.max(0, Math.round(sr.height - ink)),
      // Blank reading area at the SCREEN level. On landing this stays large in every
      // fixed-window option, because only one verse has been revealed — that emptiness
      // belongs to the reveal mechanic, not to the layout. Layout owns `capacityRows`.
      screenEmptyPx: Math.max(0, Math.round(readingH - ink)),
      inkPx: ink,
      inkPct: +((ink / innerHeight) * 100).toFixed(1),
      poemBoxW: Math.round(sr.width),
      poemBoxPct: +((sr.width / innerWidth) * 100).toFixed(1),
      fitMin: fits.length ? +Math.min(...fits).toFixed(3) : 1,
    };
  };

  return { goTo, advance, revealAll };
}
