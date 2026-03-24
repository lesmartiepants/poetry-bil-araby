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
  if (resolvedPoet.arabic) height += 52;
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
  const headerY = Math.max(minMargin, (h - totalHeight) / 2) + 32;
  return { headerY, titleBodyGap, pairSpacing };
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
  const by = h - innerInset - padding - 6;

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
 * Draw a book-inspired decorative flourish — two mirrored curves with a central diamond.
 */
function drawBookFlourish(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 0.5;

  // Central small diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();

  // Left open-book page curve — wider span
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.quadraticCurveTo(cx - 50, cy - 18, cx - 90, cy - 3);
  ctx.stroke();

  // Right open-book page curve (mirrored) — wider span
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy);
  ctx.quadraticCurveTo(cx + 50, cy - 18, cx + 90, cy - 3);
  ctx.stroke();

  // Small end dots
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(cx - 90, cy - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 90, cy - 3, 2.5, 0, Math.PI * 2);
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
  const borderTop = opts.borderTop || 60;
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);
  let curY = headerY;

  ctx.textAlign = align;

  // ── 1. Book flourish ornament — positioned halfway between top border and title ──
  const flourishY = Math.round((borderTop + headerY) / 2) - 3;
  drawBookFlourish(
    ctx,
    align === 'right' ? xPos : w / 2,
    flourishY,
    colors.separator || colors.poet
  );

  // ── 2. Arabic poem title — biggest, gold foil ──
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
    ctx.font = 'bold 44px "Reem Kufi", "Amiri", sans-serif';
    ctx.direction = 'rtl';
    ctx.save();
    ctx.shadowColor = colors.poet;
    ctx.shadowBlur = 4;
    ctx.fillText(resolvedPoet.arabic, xPos, curY);
    ctx.restore();
    curY += 52;
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

  return curY;
}

// ──────────────────────────────────────────────────────────────────────
//  Design 1: DĪWĀN — Luxe Editorial
//  Gold foil calligraphy on obsidian, generous typography, editorial feel
// ──────────────────────────────────────────────────────────────────────
function renderDiwan(ctx, w, h, poem) {
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
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
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
    { borderTop: 58 }
  );

  // ── Interleaved verses + translations (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    // Arabic verse
    ctx.fillStyle = '#e8e0d0';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    // English translation below
    if (translation[i]) {
      ctx.fillStyle = 'rgba(197, 160, 89, 0.55)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 62);
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
function renderIbnMuqla(ctx, w, h, poem) {
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
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
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
    { borderTop: 52 }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#2C1A00';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.48)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 62);
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
function renderSinan(ctx, w, h, poem) {
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
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
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
    { borderTop: 54 }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#E8E4DC';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(79, 166, 183, 0.55)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 62);
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
function renderZahaHadid(ctx, w, h, poem) {
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
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
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
    { align: 'right', xPos: w - 85, borderTop: 48 }
  );

  // ── Interleaved verses — right-aligned, line by line ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#F0E8FF';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w - 85, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(150, 180, 255, 0.52)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.textAlign = 'right';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w - 85, y + 62);
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
function renderHassanFathy(ctx, w, h, poem) {
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
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
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
    { borderTop: 52 }
  );

  // ── Interleaved verses (line by line) ──
  const contentStartY = headerBottom + layout.titleBodyGap;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * layout.pairSpacing;

    ctx.fillStyle = '#2A1500';
    ctx.font = '46px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.45)';
      ctx.font = 'italic 34px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 62);
    }
  });

  // Brand — bottom-right in terracotta, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(160, 82, 45, 0.35)', {
    opacity: 0.45,
    size: 30,
    innerInset: 54,
  });
}

// ── Design dispatcher ──────────────────────────────────────────────────
const RENDERERS = {
  diwan: renderDiwan,
  ibnMuqla: renderIbnMuqla,
  sinan: renderSinan,
  zahaHadid: renderZahaHadid,
  hassanFathy: renderHassanFathy,
};

/**
 * Render a share card to a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Object} poem — { arabic, english, poet, poetArabic, title, titleArabic, cachedTranslation }
 * @param {string} designId — one of the keys in SHARE_CARD_DESIGNS
 */
export function renderShareCard(ctx, width, height, poem, designId = 'diwan') {
  const renderer = RENDERERS[designId] || RENDERERS.diwan;
  renderer(ctx, width, height, poem);
}

/**
 * Generate a share card as a Blob (PNG).
 * Returns a Promise<Blob>.
 */
export async function generateShareCardBlob(poem, designId = 'diwan') {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, designId);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Generate a share card as a data URL (PNG).
 */
export function generateShareCardDataURL(poem, designId = 'diwan') {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, designId);
  return canvas.toDataURL('image/png');
}
