// Share cards (7.1–7.14): one layout, drawn as SVG, for the preview in the app
// and the saved 1080 × 1350 image the server renders (resvg), so both match.
// Plain JavaScript so server.js can import it; types live in shareCard.d.ts.
// Sizes follow the ShR4F* frames: a 340 × 425 card, scaled for export.

/** The six card colours, from the share frames' swatches. */
export const COLOURWAYS = [
  {
    key: 'obsidian',
    name: 'gold foil on obsidian',
    bg: '#0D0C10',
    frame: '#8A7442',
    title: '#D4B36A',
    ink: '#EDE6D6',
  },
  {
    key: 'parchment',
    name: 'ink on parchment',
    bg: '#EFE6D2',
    frame: '#A08A5C',
    title: '#7A2230',
    ink: '#2A2420',
  },
  {
    key: 'pomegranate',
    name: 'gold on pomegranate',
    bg: '#4A1620',
    frame: '#9C7A4A',
    title: '#E8CC8A',
    ink: '#F2EEE6',
  },
  {
    key: 'cobalt',
    name: 'ivory on cobalt',
    bg: '#1B2F52',
    frame: '#7F8FB0',
    title: '#E8CC8A',
    ink: '#F2EEE6',
  },
  {
    key: 'verdigris',
    name: 'ivory on verdigris',
    bg: '#1E4A3E',
    frame: '#6F9C8A',
    title: '#E8CC8A',
    ink: '#F2EEE6',
  },
  {
    key: 'indigo',
    name: 'gold on indigo',
    bg: '#141A33',
    frame: '#6C74A8',
    title: '#D4B36A',
    ink: '#E4DED2',
  },
];

/** Who the poem might go to, typed out in turn above the card (ShTo). */
export const RECIPIENTS = [
  'to a lover',
  'to yourself',
  'to your mother',
  'to a friend far away',
  'to someone who left',
];

export const CARD_W = 340;
export const CARD_H = 425;
/** The saved image: 1080 × 1350. */
export const EXPORT_W = 1080;

const MAX_ON_ONE_CARD = 6;

/** How chosen lines split across cards: 7 → 4 + 3, 8 → 4 + 4, 10 → 6 + 4; longer pages by four (7.5, 7.6, 7.9). */
export function splitForCards(lineCount) {
  if (lineCount <= 0) return [];
  if (lineCount <= MAX_ON_ONE_CARD) return [lineCount];
  if (lineCount <= 10) {
    const first = Math.max(4, lineCount - 4);
    return [first, lineCount - first];
  }
  const out = [];
  for (let left = lineCount; left > 0; left -= 4) out.push(Math.min(4, left));
  return out;
}

/** The line indexes on each card, in order. */
export function cardsFor(lineIndexes) {
  const out = [];
  let at = 0;
  for (const n of splitForCards(lineIndexes.length)) {
    out.push(lineIndexes.slice(at, at + n));
    at += n;
  }
  return out;
}

const MARKS = /[ً-ٰۖ-ۭ]/g;
const letters = (s) => s.replace(MARKS, '').length;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const r1 = (n) => Math.round(n * 100) / 100;

const FONT = {
  ruqaa: "'Aref Ruqaa', serif",
  amiri: 'Amiri, serif',
  serif: "'Cormorant Garamond', serif",
  ui: "'Josefin Sans', sans-serif",
  kufi: "'Reem Kufi', sans-serif",
};

// The brand mark, as in design-system/icons (Mark), at viewBox 120.
const MARK_PATHS = [
  ['M21.82 21.82 L98.18 21.82 L98.18 98.18 L21.82 98.18 Z', 2],
  ['M60 6 L114 60 L60 114 L6 60 Z', 2],
  ['M43.93 21.2 L98.8 43.93 L76.07 98.8 L21.2 76.07 Z', 2.6],
  ['M76.07 21.2 L98.8 76.07 L43.93 98.8 L21.2 43.93 Z', 2.6],
  ['M38.79 38.79 L81.21 38.79 L81.21 81.21 L38.79 81.21 Z', 3.2],
  ['M60 30 L90 60 L60 90 L30 60 Z', 3.2],
  ['M53.11 43.37 L76.63 53.11 L66.89 76.63 L43.37 66.89 Z', 3.8],
  ['M66.89 43.37 L76.63 66.89 L53.11 76.63 L43.37 53.11 Z', 3.8],
];
function mark(cx, cy, size, colour) {
  const s = size / 120;
  const paths = MARK_PATHS.map(([d, w]) => `<path d="${d}" stroke-width="${w * 1.6}"/>`).join('');
  return `<g transform="translate(${r1(cx - size / 2)} ${r1(cy - size / 2)}) scale(${r1(s * 1000) / 1000})"><g fill="none" stroke="${colour}">${paths}</g><circle cx="60" cy="60" r="6" fill="${colour}"/></g>`;
}

/** One line of text, centred on x, its line box starting at top. */
function text(
  str,
  { x, top, size, lh, family, colour, weight, italic, spacing, anchor = 'middle', rtl, opacity }
) {
  const y = top + (size * lh) / 2;
  const attrs = [
    `x="${r1(x)}"`,
    `y="${r1(y)}"`,
    `text-anchor="${anchor}"`,
    'dominant-baseline="central"',
    `font-family="${family}"`,
    `font-size="${r1(size)}"`,
    `fill="${colour}"`,
    weight ? `font-weight="${weight}"` : '',
    italic ? 'font-style="italic"' : '',
    spacing ? `letter-spacing="${r1(spacing)}"` : '',
    rtl ? 'direction="rtl"' : '',
    opacity ? `opacity="${opacity}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${attrs}>${esc(str)}</text>`;
}

function wrapTranslation(line) {
  const rows = [];
  let row = '';
  for (const word of line.trim().split(/\s+/)) {
    if (row && row.length + 1 + word.length > 37) {
      rows.push(row);
      row = word;
    } else {
      row = row ? `${row} ${word}` : word;
    }
  }
  if (row) rows.push(row);
  return rows;
}

/**
 * The card's layout at 340 × 425: text sizes come down until every line fits
 * the frame, the way the frames scale an 8- or 10-line card.
 */
export function layoutCard(spec, { preview = false } = {}) {
  const n = spec.lines.length;
  // A whole short poem gets the large title; a card from a longer poem the compact one.
  const long = n > 4 || (spec.card?.of ?? 1) > 1;
  const sz = long
    ? {
        title: 24,
        titleEn: 13.5,
        meta: 9.5,
        poetAr: 12.5,
        ded: 13.5,
        rule: 38,
        ruleGap: 6,
        ruleTop: 8,
        ruleBottom: 9,
        sep: 14,
        sepGap: 4,
      }
    : {
        title: preview ? 36 : 32,
        titleEn: preview ? 18 : 16,
        meta: preview ? 12 : 10.5,
        poetAr: preview ? 16 : 14,
        ded: 16,
        rule: 50,
        ruleGap: 8,
        ruleTop: 10,
        ruleBottom: 12,
        sep: 22,
        sepGap: 7,
      };
  // Inside the frame (10) and its padding (18 16 20), as in the frames.
  const inner = { x: 26, y: 28, w: CARD_W - 20 - 32, h: CARD_H - 20 - 38 };
  // Long titles and names come down to fit the width (rough advances per letter).
  const fit = (size, width) => Math.min(size, (size * inner.w) / Math.max(1, width));
  const t = { ...sz };
  t.title = fit(sz.title, letters(spec.titleAr) * sz.title * 0.5);
  t.titleEn = fit(sz.titleEn, spec.titleEn.length * sz.titleEn * 0.42);
  const metaW = letters(spec.poetAr) * sz.poetAr * 0.45 + (spec.poetEn.length + 3) * sz.meta * 0.82;
  t.poetAr = fit(sz.poetAr, metaW);
  t.meta = (sz.meta * t.poetAr) / sz.poetAr;
  const footer = 8 + 14;
  const head =
    (spec.dedication ? t.ded * 1.2 + 8 : 0) +
    t.title * 1.2 +
    2 +
    t.titleEn * 1.2 +
    3 +
    Math.max(t.meta, t.poetAr) * 1.3;
  const rule = sz.ruleTop + 16 + sz.ruleBottom;
  const room = inner.h - footer - head - rule;
  const pairs = Math.ceil(n / 2);
  const sepH = long ? 2 + 8 + 5 : 3 + 8 + 8;
  const widest = Math.max(1, ...spec.lines.map((l) => letters(l.ar)));
  const english = spec.lines.map((line) =>
    preview ? wrapTranslation(line.en ?? '') : [line.en ?? '']
  );
  const widestEn = Math.max(1, ...english.flat().map((row) => row.length));
  const enRows = english.reduce((count, rows) => count + rows.length, 0);
  const arLh = preview ? 1.52 : 1.38;
  const enLh = preview ? 1.1 : long ? 1.2 : 1.3;
  const enGap = long ? 4 : 8;
  const maxEn = preview ? 19 : long ? 12.6 : 13.5;
  const bodyHeight = (ar, en) =>
    n * ar * arLh + (spec.showEn ? enRows * en * enLh + n * enGap : 0) + (pairs - 1) * sepH;
  let ar = preview ? 29 : long ? 17 : 21;
  let en = maxEn;
  for (; ar > 10; ar -= 0.1) {
    en = Math.min(maxEn, Math.max(9.8, ar * (preview ? 0.68 : 0.643)), inner.w / (0.44 * widestEn));
    // The frames let the block run a few pixels into the padding.
    if (bodyHeight(ar, en) <= room + 4 && ar * (preview ? 0.42 : 0.5) * widest <= inner.w) break;
  }
  return {
    sz: t,
    inner,
    footer,
    head,
    rule,
    ar: r1(ar),
    en: r1(en),
    arLh,
    enLh,
    enGap,
    sepH,
    long,
    english,
    body: bodyHeight(r1(ar), r1(en)),
  };
}

/**
 * The card as SVG markup. `width` scales the 340-wide layout (1080 for the
 * saved image); `link` is printed in the footer on saved images.
 */
export function cardSvg(spec, { width = CARD_W, rounded = true, preview = false } = {}) {
  const cw = COLOURWAYS.find((c) => c.key === spec.colourway) ?? COLOURWAYS[0];
  const L = layoutCard(spec, { preview });
  const { sz, inner } = L;
  const cx = CARD_W / 2;
  const out = [];
  // Ground, frame, inner rule and corner studs.
  out.push(`<rect width="${CARD_W}" height="${CARD_H}" rx="${rounded ? 18 : 0}" fill="${cw.bg}"/>`);
  out.push(
    `<rect x="0.5" y="0.5" width="${CARD_W - 1}" height="${CARD_H - 1}" rx="${rounded ? 17.5 : 0}" fill="none" stroke="${cw.frame}"/>`
  );
  out.push(
    `<rect x="10.5" y="10.5" width="${CARD_W - 21}" height="${CARD_H - 21}" fill="none" stroke="${cw.frame}" opacity="0.7"/>`
  );
  for (const [x, y] of [
    [10, 10],
    [CARD_W - 10, 10],
    [10, CARD_H - 10],
    [CARD_W - 10, CARD_H - 10],
  ])
    out.push(`<circle cx="${x}" cy="${y}" r="2" fill="${cw.frame}"/>`);

  // Everything but the footer sits centred in the frame.
  const n = spec.lines.length;
  let y = inner.y + Math.max(0, (inner.h - L.footer - (L.head + L.rule + L.body)) / 2);
  if (spec.dedication) {
    out.push(
      text(`for ${spec.dedication}`, {
        x: cx,
        top: y,
        size: sz.ded,
        lh: 1.2,
        family: FONT.serif,
        italic: true,
        colour: cw.title,
      })
    );
    y += sz.ded * 1.2 + 8;
  }
  out.push(
    text(spec.titleAr, {
      x: cx,
      top: y,
      size: sz.title,
      lh: 1.2,
      family: FONT.ruqaa,
      weight: 700,
      colour: cw.title,
      rtl: true,
    })
  );
  y += sz.title * 1.2 + 2;
  out.push(
    text(spec.titleEn, {
      x: cx,
      top: y,
      size: sz.titleEn,
      lh: 1.2,
      family: FONT.serif,
      italic: true,
      colour: cw.ink,
      opacity: 0.85,
    })
  );
  y += sz.titleEn * 1.2 + 3;
  // Poet: Arabic name in the title colour, then the English in capitals.
  const metaH = Math.max(sz.meta, sz.poetAr) * 1.3;
  const metaY = y + metaH / 2;
  out.push(
    `<text x="${cx}" y="${r1(metaY)}" text-anchor="middle" dominant-baseline="central"><tspan font-family="${FONT.amiri}" font-size="${sz.poetAr}" fill="${cw.title}">${esc(spec.poetAr)}</tspan><tspan font-family="${FONT.ui}" font-size="${sz.meta}" letter-spacing="${r1(sz.meta * 0.14)}" fill="${cw.frame}"> · ${esc(spec.poetEn.toUpperCase())}</tspan></text>`
  );
  y += metaH;
  // The rule under the title: two lines and the mark.
  y += sz.ruleTop;
  const ry = y + 8;
  out.push(
    `<line x1="${cx - 8 - sz.ruleGap - sz.rule}" y1="${ry}" x2="${cx - 8 - sz.ruleGap}" y2="${ry}" stroke="${cw.frame}"/>`
  );
  out.push(mark(cx, ry, 16, cw.frame));
  out.push(
    `<line x1="${cx + 8 + sz.ruleGap}" y1="${ry}" x2="${cx + 8 + sz.ruleGap + sz.rule}" y2="${ry}" stroke="${cw.frame}"/>`
  );
  y += 16 + sz.ruleBottom;
  // The lines, a small rule between each bayt.
  spec.lines.forEach((l, i) => {
    out.push(
      text(l.ar, {
        x: cx,
        top: y,
        size: L.ar,
        lh: L.arLh,
        family: FONT.amiri,
        colour: cw.ink,
        rtl: true,
      })
    );
    y += L.ar * L.arLh;
    if (spec.showEn) {
      for (const row of L.english[i]) {
        if (row) {
          out.push(
            text(row, {
              x: cx,
              top: y,
              size: L.en,
              lh: L.enLh,
              family: FONT.serif,
              italic: true,
              colour: preview ? cw.title : cw.frame,
            })
          );
        }
        y += L.en * L.enLh;
      }
      y += L.enGap;
    }
    if (i % 2 === 1 && i < n - 1) {
      const sy = y + (L.long ? 2 : 3) + 4;
      out.push(
        `<line x1="${cx - 6 - L.sz.sepGap - L.sz.sep}" y1="${sy}" x2="${cx - 6 - L.sz.sepGap}" y2="${sy}" stroke="${cw.frame}"/>`
      );
      out.push(
        `<rect x="${cx - 3}" y="${sy - 3}" width="6" height="6" transform="rotate(45 ${cx} ${sy})" fill="${cw.frame}"/>`
      );
      out.push(
        `<line x1="${cx + 6 + L.sz.sepGap}" y1="${sy}" x2="${cx + 6 + L.sz.sepGap + L.sz.sep}" y2="${sy}" stroke="${cw.frame}"/>`
      );
      y += L.sepH;
    }
  });
  // Footer: the link (on saved images) or the card count, and the wordmark.
  const fy = inner.y + inner.h - 6;
  const left = [
    spec.link,
    spec.card && spec.card.of > 1 ? `${spec.card.index + 1} / ${spec.card.of}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (left)
    out.push(
      text(left, {
        x: inner.x,
        top: fy - 6,
        size: 9,
        lh: 1.3,
        family: FONT.ui,
        colour: cw.frame,
        spacing: 0.72,
        anchor: 'start',
      })
    );
  const right = inner.x + inner.w;
  out.push(mark(right - 6, fy, 12, cw.frame));
  // Two texts, not tspans: resvg drops end-anchored text made of tspans.
  out.push(
    text('بالعربي', {
      x: right - 15,
      top: fy - 6.5,
      size: 10,
      lh: 1.3,
      family: FONT.kufi,
      weight: 500,
      colour: cw.frame,
      anchor: 'end',
    })
  );
  out.push(
    text('poetry', {
      x: right - 15 - 28,
      top: fy - 7,
      size: 11,
      lh: 1.3,
      family: FONT.ui,
      weight: 200,
      colour: cw.frame,
      anchor: 'end',
    })
  );

  const h = r1(width * (CARD_H / CARD_W));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r1(width)}" height="${h}" viewBox="0 0 ${CARD_W} ${CARD_H}" role="img" aria-label="${esc(`${spec.titleEn}, ${spec.poetEn}`)}">${out.join('')}</svg>`;
}
