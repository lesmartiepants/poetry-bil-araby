/**
 * Shared reading engine for the poem-navigation prototypes.
 *
 * Every option renders the SAME B-Flow reading surface on the SAME real bilingual poems, so
 * comparing options isolates the NAVIGATION MODEL rather than the layout or the styling.
 *
 * B · Flow (chosen in #707): the poem renders in full and scrolls; verses ahead of the read
 * position are dimmed rather than absent, so the shape of the whole poem is on screen from the
 * first frame. That property is load-bearing here — it's what makes reaching the end a visible,
 * anticipated event instead of a surprise, which is the precondition for an end-of-poem
 * invitation being a real interaction rather than a jump-scare.
 *
 * Read-only. Nothing here touches src/ or any database.
 */

export const GOLD = '#c5a059';
export const GOLD_BRIGHT = '#d4b463';
export const BG = '#0a0a0f';

// The app encodes verse breaks as `*` (src/services/database.js normalisePoem).
const norm = (s) => (s || '').replace(/\*/g, '\n');
export const linesOf = (s) =>
  norm(s)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// Arabic diacritics (tashkeel) + tatweel. Stripped only to find a line's final LETTER.
const TASHKEEL = /[ً-ْٰـ]/g;
export const finalLetter = (line) => {
  const t = (line || '').replace(TASHKEEL, '').trim();
  return t[t.length - 1] || '';
};

/**
 * The closing letter of the poem — the letter its last verse ends on.
 *
 * Deliberately NOT called "the qāfiyah". A true qasida rhymes every line on one letter, but this
 * corpus doesn't hold that: the 22-line poem in our sample ends on ل only 5 times out of 22, and
 * the 4-line epigram splits ا/ي two-and-two. Poems here are largely free verse or excerpts, so a
 * corpus-wide rhyme letter is not a real property of the data and anything built on it would be
 * decoration pretending to be structure.
 *
 * The letter the poem CLOSES on, by contrast, is always well-defined for every poem. That's what
 * the seal uses.
 */
export const closingLetter = (poem) => {
  const ls = linesOf(poem.arabic);
  return finalLetter(ls[ls.length - 1]);
};

export async function loadPoems() {
  const res = await fetch('./poems-bilingual.json');
  const arr = await res.json();
  return arr.map((p) => ({
    ...p,
    arLines: linesOf(p.arabic),
    enLines: linesOf(p.english),
  }));
}

/**
 * Render one poem as a flow column into `host`.
 *
 * `scrubber` — whether the 56px right-hand scrubber lane is reserved. This is the toggle the
 * type-size argument rests on: with the lane gone, the poem box widens and the Arabic stops
 * taking a shrink to fit.
 */
export function renderPoem(host, poem, opts = {}) {
  const { scrubber = false, dimAhead = true } = opts;
  host.innerHTML = '';
  host.classList.toggle('has-scrub', !!scrubber);

  const col = document.createElement('div');
  col.className = 'poem-col';

  const head = document.createElement('header');
  head.className = 'poem-head';
  head.innerHTML = `
    <h1 class="ttl-ar">${poem.titleArabic || poem.title}</h1>
    <p class="ttl-en">${poem.title}</p>
    <p class="byline">${poem.poetArabic || ''} · ${poem.poet}</p>`;
  col.appendChild(head);

  const body = document.createElement('div');
  body.className = 'verses';
  poem.arLines.forEach((ar, i) => {
    const u = document.createElement('div');
    u.className = 'unit' + (dimAhead ? ' ahead' : '');
    u.dataset.i = String(i);
    const a = document.createElement('p');
    a.className = 'ar';
    // The text sits in an inline span so its NATURAL width is measurable even when it fits the
    // box. A block element's scrollWidth clamps to clientWidth once the content is narrower, which
    // silently reports "no headroom" — the exact number the scrubber argument turns on.
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = ar;
    a.appendChild(t);
    u.appendChild(a);
    if (poem.enLines[i]) {
      const e = document.createElement('p');
      e.className = 'en';
      e.textContent = poem.enLines[i];
      u.appendChild(e);
    }
    body.appendChild(u);
  });
  col.appendChild(body);

  const end = document.createElement('div');
  end.className = 'poem-end';
  col.appendChild(end);

  host.appendChild(col);
  fitVerses(host);
  return { col, body, end, units: [...body.children] };
}

/**
 * Shrink any Arabic line that overflows its box, exactly as SparklerStage does: a `--fit`
 * multiplier rather than a wrap, because wrapping breaks naskh ligatures.
 *
 * This is the measurement that carries the scrubber argument. `--fit < 1` means the type is being
 * shrunk below its clamp() floor purely to survive the box width.
 */
export function fitVerses(host) {
  host.querySelectorAll('.ar').forEach((el) => {
    el.style.setProperty('--fit', '1');
    const w = el.clientWidth;
    const sw = naturalWidth(el);
    if (sw > w && w > 0) el.style.setProperty('--fit', (w / sw).toFixed(4));
  });
}

/** Natural rendered width of a verse's text, independent of whether it currently fits. */
function naturalWidth(el) {
  const span = el.querySelector('.t');
  const fit = parseFloat(el.style.getPropertyValue('--fit') || '1') || 1;
  const w = span ? span.getBoundingClientRect().width : el.scrollWidth;
  return w / fit; // un-shrink, so this is the width it wants at the clamped size
}

/** Instrumentation for tools/measure.mjs — real numbers, not claims. */
export function measure(host) {
  const arEls = [...host.querySelectorAll('.ar')];
  const fits = arEls.map((el) => parseFloat(el.style.getPropertyValue('--fit') || '1'));
  const box = host.querySelector('.poem-col');
  const first = arEls[0];
  // Headroom: how much bigger the type could be before the WIDEST line needs a shrink again.
  // Text width scales linearly with font-size, so box / widest-natural-width is the multiplier
  // available. This is the type-size prize, measured rather than asserted.
  let headroom = Infinity;
  arEls.forEach((el) => {
    const natural = naturalWidth(el);
    if (natural > 0) headroom = Math.min(headroom, el.clientWidth / natural);
  });
  if (!isFinite(headroom)) headroom = 1;
  return {
    poemBoxWidth: box ? Math.round(box.getBoundingClientRect().width) : 0,
    viewport: window.innerWidth,
    minFit: fits.length ? Math.min(...fits) : 1,
    renderedArabicPx: first ? +getComputedStyle(first).fontSize.replace('px', '') : 0,
    typeHeadroom: +headroom.toFixed(3),
    verseCount: arEls.length,
  };
}
