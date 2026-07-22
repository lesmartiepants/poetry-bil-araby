/**
 * Share Card LAYOUT DRAFTS — composition studies (NOT wired into the app yet)
 *
 * These explore alternate *compositions* for the share card — layout,
 * ornament, typographic hierarchy, how Arabic/English relate on the page.
 * Colour is deliberately held constant (the Dīwān obsidian-and-gold palette)
 * so the comparison is purely about structure, not theme.
 *
 * Once a direction is chosen, its renderer can be promoted into
 * shareCardDesigns.js (same ctx signature, same helpers).
 *
 * Each renderer has the signature (ctx, w, h, poem, opts) and honours
 * opts.maxLines. They reuse the shared helpers from shareCardDesigns.js.
 */

import {
  CARD_WIDTH,
  CARD_HEIGHT,
  prepareVerses,
  prepareTranslation,
  resolveBilingual,
} from './shareCardDesigns';

// ── Constant palette (Dīwān) so drafts differ only in composition ──────
const P = {
  ink: '#e8e0d0',
  gold: '#c5a059',
  goldBright: '#d4b463',
  goldSoft: 'rgba(197,160,89,0.62)',
  goldFaint: 'rgba(197,160,89,0.22)',
  grey: 'rgba(184,180,170,0.62)',
};

function paintObsidian(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h * 0.34, 0, w / 2, h * 0.34, w * 0.72);
  g.addColorStop(0, '#151210');
  g.addColorStop(1, '#0c0c0e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function brand(ctx, w, h, opts = {}) {
  const { align = 'right', x = w - 76, y = h - 74 } = opts;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = P.goldSoft;
  const arFont = 'bold 30px "Reem Kufi", sans-serif';
  const enFont = '26px "Forum", serif';
  const arText = 'بالعربي ';
  const enText = 'poetry';
  ctx.font = arFont;
  const arW = ctx.measureText(arText).width;
  ctx.font = enFont;
  const enW = ctx.measureText(enText).width;
  const total = arW + enW;
  // Anchor the whole "بالعربي poetry" unit, then lay it out left→right so it
  // never overlaps itself regardless of alignment.
  const startX = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  ctx.font = arFont;
  ctx.fillText(arText, startX, y);
  ctx.font = enFont;
  ctx.fillText(enText, startX + arW, y);
  ctx.restore();
}

/**
 * Set ctx.font to the largest size (stepping down from `size`) at which
 * `text` fits within `maxWidth`, and return that size. Keeps long verses /
 * translations inside their column instead of overflowing.
 */
function fitFont(ctx, text, family, size, maxWidth, style = '') {
  let s = size;
  const prefix = style ? `${style} ` : '';
  ctx.font = `${prefix}${s}px ${family}`;
  while (s > 15 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${prefix}${s}px ${family}`;
  }
  return s;
}

// ══════════════════════════════════════════════════════════════════════
//  L1 — MUSNAD (مسند)  "Numbered Margin"
//  Editorial manuscript: poet as a top-left slug, a vertical margin rule,
//  verses numbered in the right margin. Asymmetric, left whitespace.
// ══════════════════════════════════════════════════════════════════════
function renderMusnad(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const verses = prepareVerses(poem.arabic, opts.maxLines || 4);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, opts.maxLines || 4);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  // Top-left slug — poet
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 52px "Reem Kufi", sans-serif';
  ctx.fillText(poet.arabic || '', 96, 150);
  if (poet.english) {
    ctx.direction = 'ltr';
    ctx.fillStyle = P.grey;
    ctx.font = '26px "Forum", serif';
    ctx.save();
    ctx.letterSpacing = '4px';
    ctx.fillText(poet.english.toUpperCase(), 98, 196);
    ctx.restore();
  }
  // short rule under the slug
  ctx.strokeStyle = P.goldFaint;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(98, 224);
  ctx.lineTo(360, 224);
  ctx.stroke();

  // Title — running head, top right
  if (title.arabic) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillStyle = P.goldSoft;
    ctx.font = '34px "Reem Kufi", sans-serif';
    ctx.fillText(title.arabic, w - 96, 150);
  }

  // Vertical margin rule
  const marginX = w - 168;
  ctx.strokeStyle = P.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, 320);
  ctx.lineTo(marginX, h - 150);
  ctx.stroke();

  // Verses — right aligned, numbered in the margin
  const arabicNums = ['١', '٢', '٣', '٤', '٥', '٦'];
  const top = 400;
  const gap = Math.min(170, (h - 200 - top) / Math.max(verses.length, 1));
  const anchorX = marginX - 34;
  const colWidth = anchorX - 96; // right anchor back to the left edge
  verses.forEach((v, i) => {
    const y = top + i * gap;
    // numeral in margin
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = P.goldSoft;
    ctx.font = '30px "Amiri", serif';
    ctx.fillText(arabicNums[i] || String(i + 1), w - 118, y - 6);
    // verse
    ctx.textAlign = 'right';
    ctx.fillStyle = P.ink;
    fitFont(ctx, v, '"Amiri", serif', 46, colWidth);
    ctx.fillText(v, anchorX, y);
    // translation
    if (tr[i]) {
      ctx.direction = 'ltr';
      ctx.fillStyle = P.grey;
      fitFont(ctx, tr[i], '"Playfair Display", serif', 31, colWidth, 'italic');
      ctx.fillText(tr[i], anchorX, y + 50);
    }
  });

  brand(ctx, w, h, { align: 'left', x: 96, y: h - 96 });
}

// ══════════════════════════════════════════════════════════════════════
//  L2 — MATLA' (مطلع)  "Hero Opening"
//  The opening hemistich set enormous; the rest follow small. Pure scale
//  hierarchy — one line is the star.
// ══════════════════════════════════════════════════════════════════════
function renderMatla(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const max = Math.min(opts.maxLines || 4, 4);
  const verses = prepareVerses(poem.arabic, max);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, max);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  // small title top
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = P.goldSoft;
  ctx.font = '34px "Reem Kufi", sans-serif';
  ctx.fillText(title.arabic || '', w / 2, 150);
  // thin rule
  ctx.strokeStyle = P.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 70, 180);
  ctx.lineTo(w / 2 + 70, 180);
  ctx.stroke();

  // Hero line
  const hero = verses[0] || '';
  ctx.fillStyle = P.gold;
  ctx.direction = 'rtl';
  fitFont(ctx, hero, '"Reem Kufi", sans-serif', 92, w - 150, 'bold');
  ctx.save();
  ctx.shadowColor = 'rgba(197,160,89,0.35)';
  ctx.shadowBlur = 22;
  ctx.fillText(hero, w / 2, 360);
  ctx.restore();
  if (tr[0]) {
    ctx.fillStyle = P.grey;
    ctx.font = 'italic 38px "Playfair Display", serif';
    ctx.direction = 'ltr';
    ctx.fillText(tr[0], w / 2, 428);
  }

  // Divider gem
  ctx.save();
  ctx.translate(w / 2, 512);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = P.goldSoft;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();

  // Remaining verses, smaller
  const rest = verses.slice(1);
  const top = 620;
  const gap = Math.min(165, (h - 180 - top) / Math.max(rest.length, 1));
  rest.forEach((v, i) => {
    const y = top + i * gap;
    ctx.fillStyle = P.ink;
    ctx.font = '44px "Amiri", serif';
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillText(v, w / 2, y);
    if (tr[i + 1]) {
      ctx.fillStyle = P.grey;
      ctx.font = 'italic 30px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(tr[i + 1], w / 2, y + 46);
    }
  });

  // Footer attribution
  ctx.fillStyle = P.goldSoft;
  ctx.font = '30px "Reem Kufi", sans-serif';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText(poet.arabic || '', w / 2, h - 120);

  brand(ctx, w, h, { align: 'center', x: w / 2, y: h - 74 });
}

// ══════════════════════════════════════════════════════════════════════
//  L3 — NAJMA (نجمة)  "Star Medallion"
//  Verses cradled inside a large eight-point geometric medallion. Symmetric,
//  ornamental containment.
// ══════════════════════════════════════════════════════════════════════
function renderNajma(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const max = Math.min(opts.maxLines || 4, 4);
  const verses = prepareVerses(poem.arabic, max);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, max);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  const cx = w / 2;
  const cy = h / 2 + 20;

  // Eight-point star = two overlapping rotated squares
  const drawSquare = (r, rot, alpha) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(197,160,89,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };
  drawSquare(430, 0, 0.3);
  drawSquare(430, Math.PI / 4, 0.3);
  // inner echo
  drawSquare(360, 0, 0.14);
  drawSquare(360, Math.PI / 4, 0.14);

  // Title cartouche at top point
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 46px "Reem Kufi", sans-serif';
  ctx.save();
  ctx.shadowColor = 'rgba(197,160,89,0.3)';
  ctx.shadowBlur = 10;
  ctx.fillText(title.arabic || '', cx, cy - 300);
  ctx.restore();

  // Verses stacked in the medallion core — generous, non-crowding spacing
  const coreWidth = 620;
  const top = cy - 150;
  const gap = Math.min(150, 440 / Math.max(verses.length, 1));
  verses.forEach((v, i) => {
    const y = top + i * gap;
    ctx.fillStyle = P.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    fitFont(ctx, v, '"Amiri", serif', 42, coreWidth);
    ctx.fillText(v, cx, y);
    if (tr[i]) {
      ctx.fillStyle = P.grey;
      ctx.direction = 'ltr';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 27, coreWidth, 'italic');
      ctx.fillText(tr[i], cx, y + 40);
    }
  });

  // Poet tab at bottom point
  ctx.fillStyle = P.goldSoft;
  ctx.font = '30px "Reem Kufi", sans-serif';
  ctx.direction = 'rtl';
  ctx.fillText(poet.arabic || '', cx, cy + 300);

  brand(ctx, w, h, { align: 'center', x: w / 2, y: h - 56 });
}

// ══════════════════════════════════════════════════════════════════════
//  L4 — MUQABALA (مقابلة)  "Facing Columns"
//  Arabic and English in two facing columns split by a central rule —
//  bilingual side-by-side instead of interleaved.
// ══════════════════════════════════════════════════════════════════════
function renderMuqabala(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const verses = prepareVerses(poem.arabic, opts.maxLines || 4);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, opts.maxLines || 4);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  // Title centered top + poet
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 50px "Reem Kufi", sans-serif';
  ctx.fillText(title.arabic || '', w / 2, 168);
  ctx.fillStyle = P.goldSoft;
  ctx.font = '32px "Amiri", serif';
  ctx.fillText(poet.arabic || '', w / 2, 224);
  if (poet.english) {
    ctx.direction = 'ltr';
    ctx.fillStyle = P.grey;
    ctx.font = '24px "Forum", serif';
    ctx.save();
    ctx.letterSpacing = '3px';
    ctx.fillText(poet.english.toUpperCase(), w / 2, 262);
    ctx.restore();
  }

  // Central rule
  const top = 380;
  const bottom = h - 170;
  ctx.strokeStyle = P.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, top);
  ctx.lineTo(w / 2, bottom);
  ctx.stroke();
  // gem at rule midpoint
  ctx.save();
  ctx.translate(w / 2, (top + bottom) / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = P.goldSoft;
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();

  // Each column is bounded to its half with a gutter around the rule so the
  // two languages never collide in the middle.
  const gutter = 46;
  const arAnchor = w - 96; // right column, right aligned
  const arColWidth = arAnchor - (w / 2 + gutter);
  const enAnchor = 96; // left column, left aligned
  const enColWidth = w / 2 - gutter - enAnchor;
  const gap = Math.min(150, (bottom - top - 60) / Math.max(verses.length, 1));
  const rowTop = top + 70;
  verses.forEach((v, i) => {
    const y = rowTop + i * gap;
    // Arabic — right column, right aligned
    ctx.fillStyle = P.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    fitFont(ctx, v, '"Amiri", serif', 42, arColWidth);
    ctx.fillText(v, arAnchor, y);
    // English — left column, left aligned
    if (tr[i]) {
      ctx.fillStyle = P.grey;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 28, enColWidth, 'italic');
      ctx.fillText(tr[i], enAnchor, y);
    }
  });

  brand(ctx, w, h, { align: 'center', x: w / 2, y: h - 96 });
}

// ══════════════════════════════════════════════════════════════════════
//  L5 — IQTIBAS (اقتباس)  "Pull-Quote"
//  An oversized quotation motif and a literary pull-quote block; attribution
//  on a gold rule bottom-right. Magazine feel.
// ══════════════════════════════════════════════════════════════════════
function renderIqtibas(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const max = Math.min(opts.maxLines || 4, 4);
  const verses = prepareVerses(poem.arabic, max);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, max);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  // Giant decorative quotation mark, top-left, low opacity
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = P.gold;
  ctx.font = '340px "Playfair Display", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', 60, 400);
  ctx.restore();

  // Verse block — centered, generous leading
  const top = 470;
  const gap = Math.min(158, (h - 320 - top) / Math.max(verses.length, 1));
  verses.forEach((v, i) => {
    const y = top + i * gap;
    ctx.fillStyle = P.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    fitFont(ctx, v, '"Amiri", serif', 48, w - 200);
    ctx.fillText(v, w / 2, y);
    if (tr[i]) {
      ctx.fillStyle = P.grey;
      ctx.direction = 'ltr';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 31, w - 200, 'italic');
      ctx.fillText(tr[i], w / 2, y + 48);
    }
  });

  // Attribution on a gold underline, bottom-right
  const baseY = h - 150;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = P.gold;
  ctx.font = 'bold 40px "Reem Kufi", sans-serif';
  ctx.fillText(poet.arabic || '', w - 96, baseY);
  if (title.english || title.arabic) {
    ctx.direction = 'ltr';
    ctx.fillStyle = P.grey;
    ctx.font = 'italic 30px "Playfair Display", serif';
    ctx.fillText(title.english || '', w - 96, baseY + 46);
  }
  ctx.strokeStyle = P.goldSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - 96, baseY + 70);
  ctx.lineTo(w - 300, baseY + 70);
  ctx.stroke();

  brand(ctx, w, h, { align: 'left', x: 96, y: h - 90 });
}

// ── Registry ───────────────────────────────────────────────────────────
export const LAYOUT_DRAFTS = [
  { id: 'musnad', name: 'Musnad', nameAr: 'مسند', note: 'Numbered margin — editorial manuscript, poet slug top-left, verses numbered against a margin rule' },
  { id: 'matla', name: "Matla'", nameAr: 'مطلع', note: 'Hero opening — the first hemistich set enormous, the rest follow small' },
  { id: 'najma', name: 'Najma', nameAr: 'نجمة', note: 'Star medallion — verses cradled inside an eight-point geometric star' },
  { id: 'muqabala', name: 'Muqabala', nameAr: 'مقابلة', note: 'Facing columns — Arabic and English side by side, split by a central rule' },
  { id: 'iqtibas', name: 'Iqtibas', nameAr: 'اقتباس', note: 'Pull-quote — oversized quotation motif, attribution on a gold rule' },
];

const DRAFT_RENDERERS = {
  musnad: renderMusnad,
  matla: renderMatla,
  najma: renderNajma,
  muqabala: renderMuqabala,
  iqtibas: renderIqtibas,
};

export function renderLayoutDraft(ctx, w, h, poem, id, opts = {}) {
  (DRAFT_RENDERERS[id] || renderMusnad)(ctx, w, h, poem, opts);
}

export function generateLayoutDraftDataURL(poem, id, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  renderLayoutDraft(ctx, CARD_WIDTH, CARD_HEIGHT, poem, id, opts);
  return canvas.toDataURL('image/png');
}
