// Saved share images (7.11–7.14): the app's card layout (web/core/logic/shareCard.js)
// rasterised with resvg at 1080 × 1350, with the same fonts the app loads, so a
// card looks the same on every platform. Fonts are OFL; licences sit beside them.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { cardSvg, cardsFor, COLOURWAYS, EXPORT_W } from '../web/core/logic/shareCard.js';

// Found on first render, not at import, so importing the server never touches the disk.
let fontFiles;
function fonts() {
  if (!fontFiles) {
    const dir = fileURLToPath(new URL('./fonts/', import.meta.url));
    fontFiles = readdirSync(dir)
      .filter((f) => f.endsWith('.ttf'))
      .map((f) => dir + f);
  }
  return fontFiles;
}

const MAX_LINES = 6;

/**
 * Validate a request into a card spec, or return an error message.
 * `query`: lines (comma-separated indexes), en (1/0), cw (colourway key),
 * for (dedication), card and of (which card of how many), link (footer text).
 */
export function cardRequest(poem, query) {
  const lines = String(query.lines ?? '')
    .split(',')
    .filter((x) => x !== '')
    .map(Number);
  const indexes = lines.length ? lines : poem.lines.map((_, i) => i);
  if (indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= poem.lines.length))
    return { error: 'lines out of range' };
  const pages = cardsFor(indexes);
  const of = pages.length;
  const index = Math.min(Math.max(Number(query.card) || 0, 0), of - 1);
  const onCard = query.lines ? pages[index] : indexes.slice(0, MAX_LINES);
  if (onCard.length > MAX_LINES) return { error: 'too many lines for one card' };
  const colourway = COLOURWAYS.some((c) => c.key === query.cw) ? query.cw : 'obsidian';
  const dedication =
    String(query.for ?? '')
      .trim()
      .slice(0, 40) || undefined;
  const link =
    String(query.link ?? '')
      .replace(/^https?:\/\//, '')
      .slice(0, 80) || undefined;
  return {
    spec: {
      titleAr: poem.titleAr,
      titleEn: poem.titleEn,
      poetAr: poem.poetAr,
      poetEn: poem.poetEn,
      lines: onCard.map((i) => poem.lines[i]),
      showEn: query.en === '1',
      colourway,
      dedication,
      link,
      card: { index, of },
    },
  };
}

export function renderCardPng(spec) {
  const svg = cardSvg(spec, { width: EXPORT_W, rounded: false });
  const resvg = new Resvg(svg, {
    font: { fontFiles: fonts(), loadSystemFonts: false, defaultFontFamily: 'Amiri' },
  });
  return resvg.render().asPng();
}
