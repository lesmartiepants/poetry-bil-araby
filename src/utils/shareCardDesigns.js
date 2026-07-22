/**
 * Share Card Designs — Canvas-based poem card renderers
 *
 * Five materially different designs, each named after a famous
 * Islamic / Arabic artist or visionary — reimagined as modern UX designers:
 *
 * 1. Dīwān (default)  — Luxe editorial: gold foil on obsidian, large serif
 * 2. Ibn Muqla         — Illuminated manuscript: aged vellum, ornate borders
 * 3. Sinan             — Geometric majesty: deep ocean, turquoise & gold arches
 * 4. Zaha Hadid        — Bold fluid: neon gradients, asymmetric, glass
 * 5. Hassan Fathy      — Warm earthcraft: terracotta, handmade texture, sunlight
 *
 * Each card shows:
 *   - Arabic poem lines (LARGE) with English translation below each line
 *   - Poet name in Arabic + English
 *   - Poem title in Arabic + English
 *   - Brand watermark "بالعربي poetry" in bottom-right corner
 */

// ── Canvas dimensions (Instagram-friendly 4:5 ratio) ───────────────────
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

// ── Design registry ────────────────────────────────────────────────────
export const SHARE_CARD_DESIGNS = [
  {
    id: 'diwan',
    name: 'Dīwān',
    nameAr: 'الديوان',
    artist: 'Default',
    description: 'Luxe editorial — gold foil calligraphy on obsidian, sparkling separators',
  },
  {
    id: 'ibnMuqla',
    name: 'Ibn Muqla',
    nameAr: 'ابن مقلة',
    artist: 'Abu Ali ibn Muqla (886–940 CE)',
    description: 'Illuminated manuscript — warm vellum, ornate gilded borders, rich brown ink',
  },
  {
    id: 'sinan',
    name: 'Sinan',
    nameAr: 'سنان',
    artist: 'Mimar Sinan (1489–1588 CE)',
    description: 'Geometric majesty — deep ocean blue, turquoise arches, celestial gold',
  },
  {
    id: 'zahaHadid',
    name: 'Zaha Hadid',
    nameAr: 'زها حديد',
    artist: 'Zaha Hadid (1950–2016 CE)',
    description: 'Bold fluid — vivid neon gradients, asymmetric glass panels, dramatic curves',
  },
  {
    id: 'hassanFathy',
    name: 'Hassan Fathy',
    nameAr: 'حسن فتحي',
    artist: 'Hassan Fathy (1900–1989 CE)',
    description: 'Warm earthcraft — sunlit clay, woven lattice, organic warmth, terracotta',
  },
  {
    id: 'layl',
    name: 'Layl',
    nameAr: 'ليل',
    artist: 'New — whisper minimal',
    description: 'Midnight whisper — near-black silence, a single star, nothing but the words',
  },
  {
    id: 'mishkat',
    name: 'Mishkat',
    nameAr: 'مشكاة',
    artist: 'New — lantern niche',
    description: 'Lantern niche — deep emerald night, a glowing mihrab arch cradles the verse',
  },
  {
    id: 'sahifa',
    name: 'Sahifa',
    nameAr: 'صحيفة',
    artist: 'New — broadsheet',
    description: 'Poetry broadsheet — bone paper, masthead rules, madder-red ink, newsprint bones',
  },
  {
    id: 'musnad',
    name: 'Musnad',
    nameAr: 'مسند',
    artist: 'Layout — numbered margin',
    description: 'Numbered margin — editorial manuscript, poet slug top-left, verses numbered against a margin rule',
  },
  {
    id: 'muqabala',
    name: 'Muqabala',
    nameAr: 'مقابلة',
    artist: 'Layout — facing columns',
    description: 'Facing columns — Arabic and English side by side, split by a central rule',
  },
  {
    id: 'najma',
    name: 'Najma',
    nameAr: 'نجمة',
    artist: 'Layout — star medallion',
    description: 'Star medallion — verses cradled inside an eight-point geometric star',
  },
  {
    id: 'iqtibas',
    name: 'Iqtibas',
    nameAr: 'اقتباس',
    artist: 'Layout — pull-quote',
    description: 'Pull-quote — oversized quotation motif, attribution on a gold rule',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

/** Returns true if a string contains Arabic/RTL characters */
export function isArabicText(str) {
  if (!str) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * Resolve poet/title for bilingual display.
 * When DB doesn't have English columns, poet and poetArabic are both Arabic.
 * This helper detects that and returns { english, arabic } correctly.
 */
export function resolveBilingual(englishField, arabicField) {
  const en = englishField || '';
  const ar = arabicField || '';
  // If "English" field is actually Arabic (same as Arabic field, or no Arabic field but looks Arabic)
  if (en === ar || (!ar && isArabicText(en))) {
    return { english: '', arabic: en || ar };
  }
  // If English field looks Arabic and differs from Arabic field
  if (isArabicText(en) && ar) {
    return { english: '', arabic: ar };
  }
  return { english: en, arabic: ar || en };
}

/** Prepare poem text: take first N non-empty verse lines */
export function prepareVerses(arabicText, maxLines = 4) {
  if (!arabicText) return [];
  return arabicText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

/** Prepare English translation lines */
export function prepareTranslation(englishText, maxLines = 4) {
  if (!englishText) return [];
  return englishText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

/**
 * Calculate the approximate height of the bilingual header block.
 */
function calculateHeaderHeight(poem) {
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);
  let height = 0;
  // Title
  if (resolvedTitle.arabic) height += 62;
  // Poet name
  if (resolvedPoet.arabic) height += 48;
  // English summary line: "[author] – [title]"
  const enPoet = resolvedPoet.english || '';
  const enTitle = resolvedTitle.english || '';
  if (enPoet || enTitle) height += 40;
  return height;
}

/**
 * Calculate vertically-centered layout for header + verse content.
 * Returns { headerY, titleBodyGap, pairSpacing }.
 */
function calculateCenteredLayout(h, poem, verseCount) {
  const headerHeight = calculateHeaderHeight(poem);
  const titleBodyGap = 80;
  const minMargin = 80;
  const spaceForVerses = h - minMargin * 2 - headerHeight - titleBodyGap;
  const pairSpacing = Math.min(180, spaceForVerses / Math.max(verseCount, 1));
  const contentHeight = verseCount * pairSpacing;
  const totalHeight = headerHeight + titleBodyGap + contentHeight;
  const headerY = Math.max(minMargin, (h - totalHeight) / 2) + 35;
  return { headerY, titleBodyGap, pairSpacing };
}

/**
 * Resolve shared render options for a design.
 * `align` falls back to the design's own default; `xText` is the anchor
 * X for verse/translation text; `maxLines` caps how many pairs draw.
 */
function resolveRenderOpts(w, opts = {}, defaultAlign = 'center') {
  const align = opts.align === 'center' || opts.align === 'right' ? opts.align : defaultAlign;
  const xText = align === 'right' ? w - 90 : w / 2;
  const maxLines = opts.maxLines || 4;
  return { align, xText, maxLines };
}

/**
 * Set ctx.font to the largest size (stepping down from `size`) at which `text`
 * fits within `maxWidth`, and return that size. Keeps long verses/titles inside
 * their column or frame instead of overflowing.
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

/**
 * Draw the brand mark "بالعربي poetry" as one left→right unit, anchored either
 * centered on `cx`, at a right edge, or at a left edge — never overlapping
 * itself regardless of alignment. Used by the composition layouts.
 */
function drawBrandUnit(ctx, w, h, color, opts = {}) {
  const { align = 'right', x = w - 76, y = h - 74, opacity = 0.55 } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = color;
  const arFont = 'bold 30px "Reem Kufi", sans-serif';
  const enFont = '26px "Forum", serif';
  const arText = 'بالعربي ';
  const enText = 'poetry';
  ctx.font = arFont;
  const arW = ctx.measureText(arText).width;
  ctx.font = enFont;
  const enW = ctx.measureText(enText).width;
  const total = arW + enW;
  const startX = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  ctx.font = arFont;
  ctx.fillText(arText, startX, y);
  ctx.font = enFont;
  ctx.fillText(enText, startX + arW, y);
  ctx.restore();
}

/**
 * Draw the brand mark "بالعربي poetry" on a SINGLE line in the bottom-right corner.
 * Matches the app header style: Arabic "بالعربي" first (Reem Kufi) + English "poetry" (Forum).
 * The brand font is NOT changed, but color/opacity/effects vary by design.
 */
function drawBrandBottomRight(ctx, w, h, brandColor, opts = {}) {
  const { glowColor, glowBlur = 0, opacity = 0.65, size = 36, innerInset = 58 } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Position inside the inner border box with padding
  const padding = 18;
  const bx = w - innerInset - padding;
  const by = h - innerInset - padding - 11;

  // Optional glow
  if (glowColor && glowBlur > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  // Single line: "بالعربي poetry" — Arabic first, then English (matching main app header)
  // Draw "poetry" rightmost, then "بالعربي" to its left
  ctx.fillStyle = brandColor;
  const enSize = Math.round(size * 0.85);
  ctx.font = `${enSize}px "Forum", serif`;
  const enText = 'poetry';
  const enWidth = ctx.measureText(enText).width;
  ctx.fillText(enText, bx, by);

  // "بالعربي" to the left of English text, with a small gap
  ctx.shadowBlur = 0;
  ctx.font = `bold ${size}px "Reem Kufi", sans-serif`;
  ctx.fillText('بالعربي ', bx - enWidth - 4, by);

  ctx.restore();
}

/**
 * Draw a book-inspired decorative flourish — two mirrored curves with a central
 * diamond. Always drawn horizontally centered on `cx`; `span` controls how far
 * each wing reaches so the ornament can be made wider/narrower per design.
 */
function drawBookFlourish(ctx, cx, cy, color, span = 128) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.0;
  ctx.globalAlpha = 0.5;

  const mid = span * 0.55; // control-point x for the gentle arc

  // Central small diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();

  // Left open-book page curve
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.quadraticCurveTo(cx - mid, cy - 18, cx - span, cy - 3);
  ctx.stroke();

  // Right open-book page curve (mirrored)
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy);
  ctx.quadraticCurveTo(cx + mid, cy - 18, cx + span, cy - 3);
  ctx.stroke();

  // Small end dots
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(cx - span, cy - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + span, cy - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw the bilingual header: Book flourish first, then title, poet, English summary.
 * Hierarchy: book flourish → Arabic title → Arabic poet → English "[author] – [title]" (grey).
 * Automatically detects when both fields are Arabic (DB has no English column)
 * and renders a single large Arabic-only name instead of duplicating.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} headerY - top Y position of header
 * @param {Object} poem - poem data
 * @param {Object} colors - { poet, poetAr, title, separator, englishGrey }
 * @param {Object} opts - { align: 'center'|'right', xPos: number, borderTop: number }
 * @returns {number} the Y position after the header (for separator placement)
 */
function drawBilingualHeader(ctx, w, headerY, poem, colors, opts = {}) {
  const align = opts.align || 'center';
  const xPos = opts.xPos || w / 2;
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);
  let curY = headerY;

  ctx.textAlign = align;

  // ── 1. Arabic poem title — biggest, gold foil ──
  if (resolvedTitle.arabic) {
    ctx.fillStyle = colors.poet;
    ctx.font = 'bold 54px "Reem Kufi", "Amiri", sans-serif';
    ctx.direction = 'rtl';
    ctx.save();
    ctx.shadowColor = colors.poet;
    ctx.shadowBlur = 6;
    ctx.fillText(resolvedTitle.arabic, xPos, curY);
    ctx.restore();
    curY += 62;
  }

  // ── 3. Arabic poet name ──
  if (resolvedPoet.arabic) {
    ctx.fillStyle = colors.poetAr || colors.poet;
    ctx.font = '40px "Amiri", serif';
    ctx.direction = 'rtl';
    ctx.save();
    ctx.shadowColor = colors.poet;
    ctx.shadowBlur = 4;
    ctx.fillText(resolvedPoet.arabic, xPos, curY);
    ctx.restore();
    curY += 48;
  }

  // ── 4. English summary: "[author] – [title]" in dark grey ──
  const enPoet = resolvedPoet.english || '';
  const enTitle = resolvedTitle.english || '';
  let englishSummary = '';
  if (enPoet && enTitle && enTitle !== enPoet) {
    englishSummary = `${enPoet} \u2013 ${enTitle}`; // en dash
  } else if (enPoet) {
    englishSummary = enPoet;
  } else if (enTitle) {
    englishSummary = enTitle;
  }
  if (englishSummary) {
    ctx.fillStyle = colors.englishGrey || 'rgba(150, 150, 150, 0.7)';
    ctx.font = '600 32px "Playfair Display", serif';
    ctx.direction = 'ltr';
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillText(englishSummary, xPos, curY);
    ctx.restore();
    curY += 40;
  }

  // ── Book flourish ornament — sits BETWEEN the header and the poem, centered
  //   on the card (it stays put regardless of text alignment). Placed in the
  //   gap the caller leaves before the first verse (titleBodyGap), so it never
  //   collides with the title or the verses even at six lines.
  //   opts.flourish === false → the design supplies its own ornament. ──
  if (opts.flourish !== false) {
    drawBookFlourish(ctx, w / 2, curY + (opts.flourishGap || 34), colors.separator || colors.poet);
  }

  return curY;
}

// ──────────────────────────────────────────────────────────────────────
//  Design 1: DĪWĀN — Luxe Editorial
//  Gold foil calligraphy on obsidian, generous typography, editorial feel
// ──────────────────────────────────────────────────────────────────────
function renderDiwan(ctx, w, h, poem, opts = {}) {
  // Obsidian background with subtle warm radial
  const radial = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, w * 0.7);
  radial.addColorStop(0, '#141210');
  radial.addColorStop(1, '#0c0c0e');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, w, h);

  // Gold border — elegant double rule
  const inset = 44;
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.15)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(inset + 14, inset + 14, w - (inset + 14) * 2, h - (inset + 14) * 2);

  // Subtle corner accent dots
  ctx.fillStyle = 'rgba(197, 160, 89, 0.35)';
  for (const [cx, cy] of [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Layout: centered vertically ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  // ── Header: bilingual poet & title ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#c5a059',
      poetAr: 'rgba(197, 160, 89, 0.7)',
      title: 'rgba(197, 160, 89, 0.55)',
      separator: '#c5a059',
      englishGrey: 'rgba(180, 178, 172, 0.65)',
    },
    { borderTop: 58, align, xPos: xText }
  );

  // ── Interleaved verses + translations (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    // Arabic verse
    ctx.fillStyle = '#e8e0d0';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);

    // English translation below
    if (translation[i]) {
      ctx.fillStyle = 'rgba(197, 160, 89, 0.55)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.5)', {
    glowColor: 'rgba(197, 160, 89, 0.2)',
    glowBlur: 15,
    opacity: 0.6,
    size: 30,
    innerInset: 58,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 2: IBN MUQLA — Illuminated Manuscript
//  Aged vellum, ornate gilded borders, rich brown ink, jewel-tone accents
// ──────────────────────────────────────────────────────────────────────
function renderIbnMuqla(ctx, w, h, poem, opts = {}) {
  // Warm vellum background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#f5e6c8');
  bg.addColorStop(0.5, '#f0ddb5');
  bg.addColorStop(1, '#e8d1a0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle aged paper texture — sparse, gentle
  ctx.fillStyle = 'rgba(160, 120, 60, 0.025)';
  for (let i = 0; i < 200; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
  }

  // Ornate outer frame — elegant double rule
  const m = 40;
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.35)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(m + 12, m + 12, w - (m + 12) * 2, h - (m + 12) * 2);

  // Top center rosette ornament — small, elegant
  ctx.save();
  ctx.fillStyle = 'rgba(139, 105, 20, 0.5)';
  ctx.translate(w / 2, m + 30);
  for (let k = 0; k < 6; k++) {
    ctx.save();
    ctx.rotate((Math.PI / 3) * k);
    ctx.beginPath();
    ctx.ellipse(0, -6, 2.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Layout: centered vertically ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#4A2800',
      poetAr: 'rgba(74, 40, 0, 0.65)',
      title: 'rgba(92, 58, 10, 0.5)',
      separator: '#8B6914',
      englishGrey: 'rgba(90, 85, 75, 0.6)',
    },
    { borderTop: 52, align, xPos: xText }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#2C1A00';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.48)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(139, 105, 20, 0.4)', {
    opacity: 0.5,
    size: 30,
    innerInset: 52,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 3: SINAN — Geometric Majesty
//  Deep ocean blue, turquoise & gold arches, celestial atmosphere
// ──────────────────────────────────────────────────────────────────────
function renderSinan(ctx, w, h, poem, opts = {}) {
  // Deep ocean gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#061424');
  bg.addColorStop(0.4, '#0A1E38');
  bg.addColorStop(1, '#061220');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Elegant outer frame — turquoise & gold double rule
  const m = 42;
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.18)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(m + 12, m + 12, w - (m + 12) * 2, h - (m + 12) * 2);

  // Corner star ornaments — small, out of text area
  const drawStar = (cx, cy, r, points, color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = 0; k < points * 2; k++) {
      const radius = k % 2 === 0 ? r : r * 0.4;
      const angle = (Math.PI / points) * k - Math.PI / 2;
      const sx = cx + Math.cos(angle) * radius;
      const sy = cy + Math.sin(angle) * radius;
      if (k === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawStar(m + 7, m + 7, 6, 6, 'rgba(79, 166, 183, 0.25)');
  drawStar(w - m - 7, m + 7, 6, 6, 'rgba(79, 166, 183, 0.25)');
  drawStar(m + 7, h - m - 7, 6, 6, 'rgba(197, 160, 89, 0.2)');
  drawStar(w - m - 7, h - m - 7, 6, 6, 'rgba(197, 160, 89, 0.2)');

  // ── Layout: centered vertically ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#c5a059',
      poetAr: 'rgba(197, 160, 89, 0.65)',
      title: 'rgba(79, 166, 183, 0.6)',
      separator: '#c5a059',
      englishGrey: 'rgba(170, 180, 190, 0.6)',
    },
    { borderTop: 54, align, xPos: xText }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#E8E4DC';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(79, 166, 183, 0.55)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.45)', {
    glowColor: 'rgba(79, 166, 183, 0.15)',
    glowBlur: 10,
    opacity: 0.55,
    size: 30,
    innerInset: 54,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 4: ZAHA HADID — Bold Fluid
//  Vivid neon gradients, dramatic curves, asymmetric glass panels
// ──────────────────────────────────────────────────────────────────────
function renderZahaHadid(ctx, w, h, poem, opts = {}) {
  // Deep cosmic gradient
  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, '#08001A');
  bg.addColorStop(0.3, '#150030');
  bg.addColorStop(0.7, '#0A0025');
  bg.addColorStop(1, '#08001A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Flowing parametric curves — subtle background only
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, `rgba(200, 100, 255, ${0.03 + i * 0.01})`);
    gradient.addColorStop(1, `rgba(80, 160, 255, ${0.03 + i * 0.008})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-50, 200 + i * 280);
    ctx.bezierCurveTo(w * 0.25, 100 + i * 220, w * 0.75, 350 + i * 250, w + 50, 230 + i * 290);
    ctx.stroke();
  }
  ctx.restore();

  // Clean neon frame — subtle double rule
  const m = 42;
  ctx.strokeStyle = 'rgba(200, 100, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.1)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(m + 10, m + 10, w - (m + 10) * 2, h - (m + 10) * 2);

  // Corner neon dot accents — small, in frame corners only
  ctx.fillStyle = 'rgba(200, 100, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(m + 4, m + 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80, 180, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(w - m - 4, h - m - 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Layout: centered vertically ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  // ── Header — bilingual, right-aligned for drama ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#C864FF',
      poetAr: 'rgba(200, 100, 255, 0.65)',
      title: 'rgba(100, 180, 255, 0.55)',
      separator: '#C864FF',
      englishGrey: 'rgba(180, 180, 200, 0.6)',
    },
    { borderTop: 48, align, xPos: xText }
  );

  // ── Interleaved verses — right-aligned, line by line ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#F0E8FF';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(150, 180, 255, 0.52)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  // Brand — bottom-right with subtle neon glow, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(200, 100, 255, 0.45)', {
    glowColor: 'rgba(200, 100, 255, 0.25)',
    glowBlur: 15,
    opacity: 0.6,
    size: 30,
    innerInset: 52,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 5: HASSAN FATHY — Warm Earthcraft
//  Sunlit clay, organic warmth, handmade texture
// ──────────────────────────────────────────────────────────────────────
function renderHassanFathy(ctx, w, h, poem, opts = {}) {
  // Warm sand-to-clay gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#F8EDD8');
  bg.addColorStop(0.5, '#F0DFC0');
  bg.addColorStop(1, '#E5CFA5');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle handmade paper texture — very sparse
  ctx.fillStyle = 'rgba(160, 120, 60, 0.02)';
  for (let i = 0; i < 150; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, Math.random() * 1.5 + 0.5, Math.random() * 1.5 + 0.5);
  }

  // Elegant terracotta frame — double rule
  const m = 42;
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.15)';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(m + 12, m + 12, w - (m + 12) * 2, h - (m + 12) * 2);

  // Small terracotta corner diamonds — decorative accents in border margin
  const drawDiamond = (cx, cy, size, color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  drawDiamond(m + 6, m + 6, 3, 'rgba(160, 82, 45, 0.3)');
  drawDiamond(w - m - 6, m + 6, 3, 'rgba(160, 82, 45, 0.3)');
  drawDiamond(m + 6, h - m - 6, 3, 'rgba(160, 82, 45, 0.3)');
  drawDiamond(w - m - 6, h - m - 6, 3, 'rgba(160, 82, 45, 0.3)');

  // ── Layout: centered vertically ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#3D1F00',
      poetAr: 'rgba(61, 31, 0, 0.65)',
      title: 'rgba(74, 40, 0, 0.45)',
      separator: '#A0522D',
      englishGrey: 'rgba(95, 85, 75, 0.6)',
    },
    { borderTop: 52, align, xPos: xText }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#2A1500';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.45)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  // Brand — bottom-right in terracotta, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(160, 82, 45, 0.35)', {
    opacity: 0.45,
    size: 30,
    innerInset: 54,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 6: LAYL (ليل) — Midnight Whisper
//  Near-black silence, a single gold star, nothing but the words.
// ──────────────────────────────────────────────────────────────────────
function renderLayl(ctx, w, h, poem, opts = {}) {
  // Flat midnight with the faintest vertical lift
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0b0e');
  bg.addColorStop(0.5, '#0a0a0c');
  bg.addColorStop(1, '#08080a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ── Layout — no ornament at all; the words are the whole design ──
  const { align, xText, maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const layout = calculateCenteredLayout(h, poem, verses.length);

  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    layout.headerY,
    poem,
    {
      poet: '#d4b463',
      poetAr: 'rgba(212, 180, 99, 0.6)',
      title: 'rgba(212, 180, 99, 0.45)',
      separator: 'rgba(212, 180, 99, 0.45)',
      englishGrey: 'rgba(160, 155, 145, 0.55)',
    },
    { borderTop: 170, align, xPos: xText, flourish: false }
  );

  const contentStartY = headerBottom + layout.titleBodyGap;
  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;
    ctx.fillStyle = '#ece5d8';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = align;
    ctx.direction = 'rtl';
    ctx.fillText(verse, xText, y);
    if (translation[i]) {
      ctx.fillStyle = 'rgba(197, 160, 89, 0.42)';
      ctx.font = 'italic 33px "Playfair Display", serif';
      ctx.textAlign = align;
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], xText, y + 62);
    }
  });

  drawBrandBottomRight(ctx, w, h, 'rgba(212, 180, 99, 0.35)', {
    opacity: 0.45,
    size: 28,
    innerInset: 30,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 7: MISHKAT (مشكاة) — Lantern Niche
//  Deep emerald night; a glowing mihrab arch cradles the verse.
// ──────────────────────────────────────────────────────────────────────
function renderMishkat(ctx, w, h, poem, opts = {}) {
  // Deep emerald gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#04211d');
  bg.addColorStop(0.45, '#06302a');
  bg.addColorStop(1, '#031a17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Lantern light spilling from the top of the niche
  const glow = ctx.createRadialGradient(w / 2, 300, 0, w / 2, 300, 560);
  glow.addColorStop(0, 'rgba(255, 224, 160, 0.1)');
  glow.addColorStop(1, 'rgba(255, 224, 160, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Mihrab arch — a WIDE border frame that cradles the whole card. Its straight
  // sides sit far outside the text column and its curved crown lives up in the
  // top margin, so the outline never crosses the title or the verses.
  const HALF = 452; // sides at x = 88 and 992
  const APEX = 96;
  const SPRING = 300; // straight sides start here, going down
  const ARCH_BOTTOM = 1250;
  const drawArch = (halfW, apex, spring, color, lw, blur) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    if (blur) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
    }
    ctx.beginPath();
    ctx.moveTo(w / 2 - halfW, ARCH_BOTTOM);
    ctx.lineTo(w / 2 - halfW, spring);
    ctx.quadraticCurveTo(w / 2 - halfW, apex + 70, w / 2, apex);
    ctx.quadraticCurveTo(w / 2 + halfW, apex + 70, w / 2 + halfW, spring);
    ctx.lineTo(w / 2 + halfW, ARCH_BOTTOM);
    ctx.stroke();
    ctx.restore();
  };
  drawArch(HALF, APEX, SPRING, 'rgba(79, 183, 160, 0.5)', 2, 26);
  drawArch(HALF - 26, APEX + 34, SPRING + 22, 'rgba(212, 180, 99, 0.22)', 1, 0);

  // ── Layout — content is kept entirely below the springline (inside the arch's
  //   straight-sided body) and width-limited to the arch interior, so it never
  //   touches the outline. ──
  const { maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const textWidth = 700; // fits comfortably between the arch sides
  const xText = w / 2;

  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    SPRING + 96,
    poem,
    {
      poet: '#d4b463',
      poetAr: 'rgba(212, 180, 99, 0.65)',
      title: 'rgba(79, 183, 160, 0.6)',
      separator: '#d4b463',
      englishGrey: 'rgba(165, 190, 180, 0.6)',
    },
    { borderTop: SPRING, align: 'center', xPos: xText, flourish: false }
  );

  // Distribute verses in the remaining body of the arch. The niche interior is
  // shorter than a full card, so when many lines are selected the type steps
  // down to keep each verse clear of the next line's translation.
  const contentTop = headerBottom + 68;
  const contentBottom = ARCH_BOTTOM - 60;
  const dense = verses.length >= 5;
  const vSize = dense ? 40 : 46;
  const tSize = dense ? 27 : 33;
  const tOffset = dense ? 46 : 58;
  const gap = Math.min(160, (contentBottom - contentTop) / Math.max(verses.length, 1));
  verses.forEach((verse, i) => {
    const y = contentTop + i * gap;
    ctx.fillStyle = '#efe9da';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    fitFont(ctx, verse, '"Amiri", serif', vSize, textWidth);
    ctx.fillText(verse, xText, y);
    if (translation[i]) {
      ctx.fillStyle = 'rgba(120, 200, 180, 0.55)';
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      fitFont(ctx, translation[i], '"Playfair Display", serif', tSize, textWidth, 'italic');
      ctx.fillText(translation[i], xText, y + tOffset);
    }
  });

  drawBrandBottomRight(ctx, w, h, 'rgba(212, 180, 99, 0.45)', {
    glowColor: 'rgba(79, 183, 160, 0.2)',
    glowBlur: 12,
    opacity: 0.55,
    size: 28,
    innerInset: 40,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 8: SAHIFA (صحيفة) — Poetry Broadsheet
//  Bone paper, masthead rules, madder-red ink. Right-aligned newsprint.
// ──────────────────────────────────────────────────────────────────────
function renderSahifa(ctx, w, h, poem, opts = {}) {
  // Bone paper
  ctx.fillStyle = '#f6f1e6';
  ctx.fillRect(0, 0, w, h);

  const m = 70;

  // Masthead — thick and thin rule, like a broadsheet nameplate
  ctx.fillStyle = '#191512';
  ctx.fillRect(m, 78, w - m * 2, 6);
  ctx.fillRect(m, 94, w - m * 2, 1.5);

  // Madder folio square on the masthead
  ctx.fillStyle = '#8e2a2a';
  ctx.fillRect(w - m - 14, 60, 14, 14);

  // Colophon — inverted rules at the foot
  ctx.fillStyle = '#191512';
  ctx.fillRect(m, h - 96, w - m * 2, 1.5);
  ctx.fillRect(m, h - 86, w - m * 2, 6);

  // ── Layout — the masthead and colophon are fixed; the header and verses are
  //   pinned into the band between them and shrunk to fit, so even at six lines
  //   nothing rides up over the top bar. ──
  const { maxLines } = resolveRenderOpts(w, opts);
  const verses = prepareVerses(poem.arabic, maxLines);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, maxLines);
  const xText = w / 2;
  const textWidth = w - m * 2 - 24; // inside the masthead/colophon rules

  // Header sits safely below the masthead (title cap-height clears the bars).
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    206,
    poem,
    {
      poet: '#191512',
      poetAr: '#8e2a2a',
      title: 'rgba(25, 21, 18, 0.5)',
      separator: '#8e2a2a',
      englishGrey: 'rgba(90, 82, 72, 0.65)',
    },
    { borderTop: 130, align: 'center', xPos: xText, flourish: false }
  );

  // Verses fill the band down to just above the colophon.
  const contentTop = headerBottom + 72;
  const contentBottom = h - 140;
  const gap = Math.min(150, (contentBottom - contentTop) / Math.max(verses.length, 1));
  verses.forEach((verse, i) => {
    const y = contentTop + i * gap;
    ctx.fillStyle = '#191512';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    fitFont(ctx, verse, '"Amiri", serif', 46, textWidth);
    ctx.fillText(verse, xText, y);
    if (translation[i]) {
      ctx.fillStyle = 'rgba(25, 21, 18, 0.55)';
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      fitFont(ctx, translation[i], '"Playfair Display", serif', 33, textWidth, 'italic');
      ctx.fillText(translation[i], xText, y + 56);
    }
  });

  drawBrandBottomRight(ctx, w, h, 'rgba(25, 21, 18, 0.5)', {
    opacity: 0.55,
    size: 28,
    innerInset: 40,
  });
}

// ══════════════════════════════════════════════════════════════════════
//  COMPOSITION LAYOUTS — different structures on the Dīwān obsidian palette.
//  Each is a self-contained arrangement (they do not use the shared centered
//  layout / bilingual header).
// ══════════════════════════════════════════════════════════════════════

// Shared obsidian palette for the composition layouts.
const LP = {
  ink: '#e8e0d0',
  gold: '#c5a059',
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

// ── Design: MUSNAD (مسند) — Numbered Margin ────────────────────────────
function renderMusnad(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const verses = prepareVerses(poem.arabic, opts.maxLines || 4);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, opts.maxLines || 4);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillStyle = LP.gold;
  ctx.font = 'bold 52px "Reem Kufi", sans-serif';
  ctx.fillText(poet.arabic || '', 96, 150);
  if (poet.english) {
    ctx.direction = 'ltr';
    ctx.fillStyle = LP.grey;
    ctx.font = '26px "Forum", serif';
    ctx.save();
    ctx.letterSpacing = '4px';
    ctx.fillText(poet.english.toUpperCase(), 98, 196);
    ctx.restore();
  }
  ctx.strokeStyle = LP.goldFaint;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(98, 224);
  ctx.lineTo(360, 224);
  ctx.stroke();

  if (title.arabic) {
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillStyle = LP.goldSoft;
    ctx.font = '34px "Reem Kufi", sans-serif';
    ctx.fillText(title.arabic, w - 96, 150);
  }

  const marginX = w - 168;
  ctx.strokeStyle = LP.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, 320);
  ctx.lineTo(marginX, h - 150);
  ctx.stroke();

  const arabicNums = ['١', '٢', '٣', '٤', '٥', '٦'];
  const top = 400;
  const gap = Math.min(170, (h - 200 - top) / Math.max(verses.length, 1));
  const anchorX = marginX - 34;
  const colWidth = anchorX - 96;
  verses.forEach((v, i) => {
    const y = top + i * gap;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = LP.goldSoft;
    ctx.font = '30px "Amiri", serif';
    ctx.fillText(arabicNums[i] || String(i + 1), w - 118, y - 6);
    ctx.textAlign = 'right';
    ctx.fillStyle = LP.ink;
    fitFont(ctx, v, '"Amiri", serif', 46, colWidth);
    ctx.fillText(v, anchorX, y);
    if (tr[i]) {
      ctx.direction = 'ltr';
      ctx.fillStyle = LP.grey;
      fitFont(ctx, tr[i], '"Playfair Display", serif', 31, colWidth, 'italic');
      ctx.fillText(tr[i], anchorX, y + 50);
    }
  });

  drawBrandUnit(ctx, w, h, LP.goldSoft, { align: 'left', x: 96, y: h - 96 });
}

// ── Design: NAJMA (نجمة) — Star Medallion ──────────────────────────────
function renderNajma(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const max = Math.min(opts.maxLines || 4, 6);
  const verses = prepareVerses(poem.arabic, max);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, max);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  const cx = w / 2;
  const cy = h / 2 + 20;

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
  drawSquare(360, 0, 0.14);
  drawSquare(360, Math.PI / 4, 0.14);

  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = LP.gold;
  ctx.save();
  ctx.shadowColor = 'rgba(197,160,89,0.3)';
  ctx.shadowBlur = 10;
  fitFont(ctx, title.arabic || '', '"Reem Kufi", sans-serif', 46, 560, 'bold');
  ctx.fillText(title.arabic || '', cx, cy - 300);
  ctx.restore();

  const coreWidth = 620;
  const top = cy - 150;
  const gap = Math.min(150, 440 / Math.max(verses.length, 1));
  verses.forEach((v, i) => {
    const y = top + i * gap;
    ctx.fillStyle = LP.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    fitFont(ctx, v, '"Amiri", serif', 42, coreWidth);
    ctx.fillText(v, cx, y);
    if (tr[i]) {
      ctx.fillStyle = LP.grey;
      ctx.direction = 'ltr';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 27, coreWidth, 'italic');
      ctx.fillText(tr[i], cx, y + 40);
    }
  });

  ctx.fillStyle = LP.goldSoft;
  ctx.font = '30px "Reem Kufi", sans-serif';
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText(poet.arabic || '', cx, cy + 300);

  drawBrandUnit(ctx, w, h, LP.goldSoft, { align: 'center', x: w / 2, y: h - 56 });
}

// ── Design: MUQABALA (مقابلة) — Facing Columns ─────────────────────────
function renderMuqabala(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const verses = prepareVerses(poem.arabic, opts.maxLines || 4);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, opts.maxLines || 4);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = LP.gold;
  ctx.font = 'bold 50px "Reem Kufi", sans-serif';
  ctx.fillText(title.arabic || '', w / 2, 168);
  ctx.fillStyle = LP.goldSoft;
  ctx.font = '32px "Amiri", serif';
  ctx.fillText(poet.arabic || '', w / 2, 224);
  if (poet.english) {
    ctx.direction = 'ltr';
    ctx.fillStyle = LP.grey;
    ctx.font = '24px "Forum", serif';
    ctx.save();
    ctx.letterSpacing = '3px';
    ctx.fillText(poet.english.toUpperCase(), w / 2, 262);
    ctx.restore();
  }

  const top = 380;
  const bottom = h - 170;
  ctx.strokeStyle = LP.goldFaint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, top);
  ctx.lineTo(w / 2, bottom);
  ctx.stroke();
  ctx.save();
  ctx.translate(w / 2, (top + bottom) / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = LP.goldSoft;
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();

  const gutter = 46;
  const arAnchor = w - 96;
  const arColWidth = arAnchor - (w / 2 + gutter);
  const enAnchor = 96;
  const enColWidth = w / 2 - gutter - enAnchor;
  const gap = Math.min(150, (bottom - top - 60) / Math.max(verses.length, 1));
  const rowTop = top + 70;
  verses.forEach((v, i) => {
    const y = rowTop + i * gap;
    ctx.fillStyle = LP.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    fitFont(ctx, v, '"Amiri", serif', 42, arColWidth);
    ctx.fillText(v, arAnchor, y);
    if (tr[i]) {
      ctx.fillStyle = LP.grey;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 28, enColWidth, 'italic');
      ctx.fillText(tr[i], enAnchor, y);
    }
  });

  drawBrandUnit(ctx, w, h, LP.goldSoft, { align: 'center', x: w / 2, y: h - 96 });
}

// ── Design: IQTIBAS (اقتباس) — Pull-Quote ──────────────────────────────
function renderIqtibas(ctx, w, h, poem, opts = {}) {
  paintObsidian(ctx, w, h);
  const max = Math.min(opts.maxLines || 4, 6);
  const verses = prepareVerses(poem.arabic, max);
  const tr = prepareTranslation(poem.english || poem.cachedTranslation, max);
  const poet = resolveBilingual(poem.poet, poem.poetArabic);
  const title = resolveBilingual(poem.title, poem.titleArabic);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = LP.gold;
  ctx.font = '340px "Playfair Display", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', 60, 400);
  ctx.restore();

  const top = 470;
  const gap = Math.min(158, (h - 320 - top) / Math.max(verses.length, 1));
  verses.forEach((v, i) => {
    const y = top + i * gap;
    ctx.fillStyle = LP.ink;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    fitFont(ctx, v, '"Amiri", serif', 48, w - 200);
    ctx.fillText(v, w / 2, y);
    if (tr[i]) {
      ctx.fillStyle = LP.grey;
      ctx.direction = 'ltr';
      fitFont(ctx, tr[i], '"Playfair Display", serif', 31, w - 200, 'italic');
      ctx.fillText(tr[i], w / 2, y + 48);
    }
  });

  const baseY = h - 150;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = LP.gold;
  ctx.font = 'bold 40px "Reem Kufi", sans-serif';
  ctx.fillText(poet.arabic || '', w - 96, baseY);
  if (title.english) {
    ctx.direction = 'ltr';
    ctx.fillStyle = LP.grey;
    ctx.font = 'italic 30px "Playfair Display", serif';
    ctx.fillText(title.english, w - 96, baseY + 46);
  }
  ctx.strokeStyle = LP.goldSoft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - 96, baseY + 70);
  ctx.lineTo(w - 300, baseY + 70);
  ctx.stroke();

  drawBrandUnit(ctx, w, h, LP.goldSoft, { align: 'left', x: 96, y: h - 90 });
}

// ── Design dispatcher ──────────────────────────────────────────────────
const RENDERERS = {
  diwan: renderDiwan,
  ibnMuqla: renderIbnMuqla,
  sinan: renderSinan,
  zahaHadid: renderZahaHadid,
  hassanFathy: renderHassanFathy,
  layl: renderLayl,
  mishkat: renderMishkat,
  sahifa: renderSahifa,
  musnad: renderMusnad,
  muqabala: renderMuqabala,
  najma: renderNajma,
  iqtibas: renderIqtibas,
};

/**
 * Render a share card to a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Object} poem — { arabic, english, poet, poetArabic, title, titleArabic, cachedTranslation }
 * @param {string} designId — one of the keys in SHARE_CARD_DESIGNS
 * @param {Object} [opts] — { align: 'center'|'right', maxLines: number }
 *   align: overrides the design's default text alignment
 *   maxLines: how many verse lines to draw (default 4; the modal caps at 6)
 */
export function renderShareCard(ctx, width, height, poem, designId = 'diwan', opts = {}) {
  const renderer = RENDERERS[designId] || RENDERERS.diwan;
  renderer(ctx, width, height, poem, opts);
}

/**
 * Generate a share card as a Blob (PNG).
 * Returns a Promise<Blob>.
 */
export async function generateShareCardBlob(poem, designId = 'diwan', opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, designId, opts);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Generate a share card as a data URL (PNG).
 */
export function generateShareCardDataURL(poem, designId = 'diwan', opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, designId, opts);
  return canvas.toDataURL('image/png');
}
