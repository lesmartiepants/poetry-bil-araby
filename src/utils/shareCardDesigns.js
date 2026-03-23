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
function isArabicText(str) {
  if (!str) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

/**
 * Resolve poet/title for bilingual display.
 * When DB doesn't have English columns, poet and poetArabic are both Arabic.
 * This helper detects that and returns { english, arabic } correctly.
 */
function resolveBilingual(englishField, arabicField) {
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
 * Draw the brand mark "poetry بالعربي" on a SINGLE line in the bottom-right corner.
 * Matches the app header style: English "poetry" in Forum + Arabic "بالعربي" in Reem Kufi.
 * The brand font is NOT changed, but color/opacity/effects vary by design.
 */
function drawBrandBottomRight(ctx, w, h, brandColor, opts = {}) {
  const { glowColor, glowBlur = 0, opacity = 0.65, size = 24 } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const bx = w - 55;
  const by = h - 55;

  // Optional glow
  if (glowColor && glowBlur > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
  }

  // Single line: "poetry بالعربي"
  // Measure "بالعربي" first (drawn rightmost), then "poetry " to its left
  ctx.fillStyle = brandColor;
  ctx.font = `bold ${size}px "Reem Kufi", sans-serif`;
  const arText = 'بالعربي';
  const arWidth = ctx.measureText(arText).width;
  ctx.fillText(arText, bx, by);

  // "poetry" to the left of Arabic text, with a small gap
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(size * 0.85)}px "Forum", serif`;
  ctx.fillText('poetry ', bx - arWidth - 4, by);

  ctx.restore();
}

/**
 * Draw the bilingual header: English poet name + Arabic poet name + English title.
 * Automatically detects when both fields are Arabic (DB has no English column)
 * and renders a single large Arabic-only name instead of duplicating.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas width
 * @param {number} headerY - top Y position of header
 * @param {Object} poem - poem data
 * @param {Object} colors - { poet, poetAr, title }
 * @param {Object} opts - { align: 'center'|'right', xPos: number }
 * @returns {number} the Y position after the header (for separator placement)
 */
function drawBilingualHeader(ctx, w, headerY, poem, colors, opts = {}) {
  const align = opts.align || 'center';
  const xPos = opts.xPos || w / 2;
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);
  let curY = headerY;

  ctx.textAlign = align;

  if (resolvedPoet.english) {
    // Has distinct English name — show English first, then Arabic
    ctx.fillStyle = colors.poet;
    ctx.font = 'bold 48px "Playfair Display", serif';
    ctx.direction = 'ltr';
    ctx.fillText(resolvedPoet.english, xPos, curY);
    curY += 55;

    if (resolvedPoet.arabic) {
      ctx.fillStyle = colors.poetAr;
      ctx.font = 'bold 46px "Amiri", serif';
      ctx.direction = 'rtl';
      ctx.fillText(resolvedPoet.arabic, xPos, curY);
      curY += 55;
    }
  } else {
    // Only Arabic available — show single large Arabic name
    ctx.fillStyle = colors.poet;
    ctx.font = 'bold 52px "Amiri", serif';
    ctx.direction = 'rtl';
    ctx.fillText(resolvedPoet.arabic, xPos, curY);
    curY += 60;
  }

  // Title
  if (resolvedTitle.english) {
    ctx.fillStyle = colors.title;
    ctx.font = 'italic 28px "Playfair Display", serif';
    ctx.direction = 'ltr';
    ctx.fillText(resolvedTitle.english, xPos, curY);
  } else if (resolvedTitle.arabic) {
    ctx.fillStyle = colors.title;
    ctx.font = 'italic 28px "Amiri", serif';
    ctx.direction = 'rtl';
    ctx.fillText(resolvedTitle.arabic, xPos, curY);
  }
  curY += 35;

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

  // Gold border — double rule with corner ornaments
  const inset = 40;
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 12, inset + 12, w - (inset + 12) * 2, h - (inset + 12) * 2);

  // Corner ornaments — diamond shapes
  const cs = 10;
  ctx.fillStyle = 'rgba(197, 160, 89, 0.6)';
  for (const [cx, cy] of [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - cs);
    ctx.lineTo(cx + cs, cy);
    ctx.lineTo(cx, cy + cs);
    ctx.lineTo(cx - cs, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Top center ornament — editorial flourish
  ctx.fillStyle = 'rgba(197, 160, 89, 0.4)';
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦', w / 2, inset + 30);

  // Inner gold accent lines along top and bottom
  ctx.fillStyle = 'rgba(197, 160, 89, 0.12)';
  ctx.fillRect(inset + 30, inset + 40, w - (inset + 30) * 2, 0.5);
  ctx.fillRect(inset + 30, h - inset - 40, w - (inset + 30) * 2, 0.5);

  // ── Header: bilingual poet & title ──
  const headerBottom = drawBilingualHeader(ctx, w, 110, poem, {
    poet: '#c5a059',
    poetAr: 'rgba(197, 160, 89, 0.65)',
    title: 'rgba(197, 160, 89, 0.55)',
  });

  // Gold gradient separator
  const sepLineY = headerBottom + 5;
  const grad = ctx.createLinearGradient(80, 0, w - 80, 0);
  grad.addColorStop(0, 'rgba(197, 160, 89, 0)');
  grad.addColorStop(0.3, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(0.5, 'rgba(197, 160, 89, 0.8)');
  grad.addColorStop(0.7, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(80, sepLineY, w - 160, 1.5);

  // ── Interleaved verses + translations (line by line) ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = sepLineY + 65;
  const pairSpacing = 170;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    // Arabic verse — LARGE
    ctx.fillStyle = '#e8e0d0';
    ctx.font = '64px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    // English translation below — line by line
    if (translation[i]) {
      ctx.fillStyle = 'rgba(197, 160, 89, 0.5)';
      ctx.font = 'italic 28px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 55);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.6)', {
    glowColor: 'rgba(197, 160, 89, 0.3)',
    glowBlur: 20,
    opacity: 0.7,
    size: 26,
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

  // Aged paper texture
  ctx.fillStyle = 'rgba(160, 120, 60, 0.03)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, Math.random() * 3 + 1, Math.random() * 3 + 1);
  }

  // Ornate outer frame — bold triple rule
  const m = 36;
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m + 10, m + 10, w - (m + 10) * 2, h - (m + 10) * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 18, m + 18, w - (m + 18) * 2, h - (m + 18) * 2);

  // Calligraphic top ornament
  ctx.fillStyle = '#8B6914';
  ctx.font = '40px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.fillText('❁', w / 2, m + 50);

  // Side floral accents
  ctx.fillStyle = 'rgba(139, 105, 20, 0.15)';
  ctx.font = '28px serif';
  ctx.fillText('✿', m + 30, h / 2);
  ctx.fillText('✿', w - m - 30, h / 2);

  // Inner decorative line between frame rules
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.12)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(m + 14, m + 14, w - (m + 14) * 2, h - (m + 14) * 2);
  ctx.setLineDash([]);

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(ctx, w, 135, poem, {
    poet: '#4A2800',
    poetAr: 'rgba(74, 40, 0, 0.65)',
    title: 'rgba(92, 58, 10, 0.5)',
  });

  // Horizontal flourish
  const fl = ctx.createLinearGradient(m + 60, 0, w - m - 60, 0);
  fl.addColorStop(0, 'rgba(139, 105, 20, 0)');
  fl.addColorStop(0.5, 'rgba(139, 105, 20, 0.7)');
  fl.addColorStop(1, 'rgba(139, 105, 20, 0)');
  ctx.fillStyle = fl;
  ctx.fillRect(m + 60, headerBottom + 5, w - m * 2 - 120, 1.5);

  // ── Interleaved verses (line by line) ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerBottom + 60;
  const pairSpacing = 170;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#2C1A00';
    ctx.font = '64px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.45)';
      ctx.font = 'italic 28px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 55);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(139, 105, 20, 0.5)', {
    opacity: 0.6,
    size: 24,
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

  // Bold outer frame — turquoise & gold
  const m = 38;
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 10, m + 10, w - (m + 10) * 2, h - (m + 10) * 2);

  // Iznik-inspired pointed arch — top frame
  ctx.save();
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.quadraticCurveTo(w / 2, 20, w - 80, 240);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(197, 160, 89, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(110, 240);
  ctx.quadraticCurveTo(w / 2, 50, w - 110, 240);
  ctx.stroke();
  ctx.restore();

  // Geometric star ornaments in corners
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
  drawStar(80, h - 80, 22, 8, 'rgba(197, 160, 89, 0.18)');
  drawStar(w - 80, h - 80, 22, 8, 'rgba(197, 160, 89, 0.18)');
  drawStar(80, 80, 18, 6, 'rgba(79, 166, 183, 0.18)');
  drawStar(w - 80, 80, 18, 6, 'rgba(79, 166, 183, 0.18)');

  // Side vertical accent lines
  ctx.fillStyle = 'rgba(79, 166, 183, 0.15)';
  ctx.fillRect(m + 1, 100, 2, h - 200);
  ctx.fillRect(w - m - 3, 100, 2, h - 200);

  // Scattered small stars for celestial atmosphere
  drawStar(w / 2, m + 25, 12, 6, 'rgba(197, 160, 89, 0.22)');
  drawStar(160, h - 60, 10, 6, 'rgba(79, 166, 183, 0.12)');
  drawStar(w - 160, h - 60, 10, 6, 'rgba(79, 166, 183, 0.12)');
  drawStar(m + 25, h / 2, 8, 5, 'rgba(197, 160, 89, 0.1)');
  drawStar(w - m - 25, h / 2, 8, 5, 'rgba(197, 160, 89, 0.1)');

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(ctx, w, 130, poem, {
    poet: '#c5a059',
    poetAr: 'rgba(197, 160, 89, 0.6)',
    title: 'rgba(79, 166, 183, 0.55)',
  });

  // Crescent separator
  ctx.fillStyle = 'rgba(197, 160, 89, 0.45)';
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☽', w / 2, headerBottom + 10);

  // ── Interleaved verses (line by line) ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerBottom + 60;
  const pairSpacing = 170;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#E8E4DC';
    ctx.font = '64px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(79, 166, 183, 0.5)';
      ctx.font = 'italic 28px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 55);
    }
  });

  // Brand — bottom-right, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.5)', {
    glowColor: 'rgba(79, 166, 183, 0.2)',
    glowBlur: 15,
    opacity: 0.6,
    size: 24,
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

  // Flowing parametric curves — Zaha's language
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, `rgba(200, 100, 255, ${0.06 + i * 0.02})`);
    gradient.addColorStop(1, `rgba(80, 160, 255, ${0.06 + i * 0.01})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-50, 150 + i * 200);
    ctx.bezierCurveTo(w * 0.25, 50 + i * 160, w * 0.75, 300 + i * 180, w + 50, 180 + i * 210);
    ctx.stroke();
  }
  ctx.restore();

  // Angular neon frame
  const m = 38;
  ctx.strokeStyle = 'rgba(200, 100, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 8, m + 8, w - (m + 8) * 2, h - (m + 8) * 2);

  // Accent bar — vivid neon gradient
  const accentGrad = ctx.createLinearGradient(0, 0, w, 0);
  accentGrad.addColorStop(0, 'rgba(200, 100, 255, 0)');
  accentGrad.addColorStop(0.15, 'rgba(200, 100, 255, 0.7)');
  accentGrad.addColorStop(0.5, 'rgba(150, 120, 255, 0.8)');
  accentGrad.addColorStop(0.85, 'rgba(80, 180, 255, 0.7)');
  accentGrad.addColorStop(1, 'rgba(80, 180, 255, 0)');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 100, w, 3);

  // Glass panel behind header
  ctx.fillStyle = 'rgba(200, 100, 255, 0.04)';
  ctx.fillRect(60, 30, w - 120, 190);

  // Additional floating glass panels — parametric design accent
  ctx.fillStyle = 'rgba(80, 160, 255, 0.03)';
  ctx.fillRect(100, h - 180, w - 200, 80);
  ctx.fillStyle = 'rgba(200, 100, 255, 0.02)';
  ctx.fillRect(m, h * 0.4, 80, h * 0.2);

  // Neon dot accents along frame
  ctx.fillStyle = 'rgba(200, 100, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(m + 4, m + 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80, 180, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(w - m - 4, h - m - 4, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── Header — bilingual, right-aligned for drama ──
  const headerBottom = drawBilingualHeader(
    ctx,
    w,
    70,
    poem,
    {
      poet: '#C864FF',
      poetAr: 'rgba(200, 100, 255, 0.6)',
      title: 'rgba(100, 180, 255, 0.5)',
    },
    { align: 'right', xPos: w - 80 }
  );

  // ── Interleaved verses — right-aligned, line by line ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = 290;
  const pairSpacing = 175;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#F0E8FF';
    ctx.font = '64px "Amiri", serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w - 80, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(150, 180, 255, 0.5)';
      ctx.font = 'italic 28px "Playfair Display", serif';
      ctx.textAlign = 'right';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w - 80, y + 55);
    }
  });

  // Bottom accent line
  const btmGrad = ctx.createLinearGradient(0, 0, w, 0);
  btmGrad.addColorStop(0, 'rgba(80, 180, 255, 0)');
  btmGrad.addColorStop(0.5, 'rgba(150, 120, 255, 0.5)');
  btmGrad.addColorStop(1, 'rgba(200, 100, 255, 0)');
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, h - 100, w, 2);

  // Brand — bottom-right with neon glow, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(200, 100, 255, 0.55)', {
    glowColor: 'rgba(200, 100, 255, 0.4)',
    glowBlur: 25,
    opacity: 0.7,
    size: 24,
  });
}

// ──────────────────────────────────────────────────────────────────────
//  Design 5: HASSAN FATHY — Warm Earthcraft
//  Sunlit clay, woven lattice, organic warmth, handmade texture
// ──────────────────────────────────────────────────────────────────────
function renderHassanFathy(ctx, w, h, poem) {
  // Warm sand-to-clay gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#F8EDD8');
  bg.addColorStop(0.5, '#F0DFC0');
  bg.addColorStop(1, '#E5CFA5');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Handmade paper texture
  ctx.fillStyle = 'rgba(160, 120, 60, 0.03)';
  for (let i = 0; i < 500; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
  }

  // Bold terracotta frame
  const m = 38;
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 10, m + 10, w - (m + 10) * 2, h - (m + 10) * 2);

  // Mashrabiya lattice — top band
  ctx.save();
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.14)';
  ctx.lineWidth = 1;
  const gs = 28;
  for (let x = 0; x < w; x += gs) {
    for (let y = 0; y < 90; y += gs) {
      ctx.beginPath();
      ctx.moveTo(x + gs / 2, y);
      ctx.lineTo(x + gs, y + gs / 2);
      ctx.lineTo(x + gs / 2, y + gs);
      ctx.lineTo(x, y + gs / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  // Bottom band
  for (let x = 0; x < w; x += gs) {
    for (let y = h - 90; y < h; y += gs) {
      ctx.beginPath();
      ctx.moveTo(x + gs / 2, y);
      ctx.lineTo(x + gs, y + gs / 2);
      ctx.lineTo(x + gs / 2, y + gs);
      ctx.lineTo(x, y + gs / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Terracotta accent lines
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(55, 105, w - 110, 2.5);
  ctx.fillRect(55, h - 105, w - 110, 2.5);

  // Side mashrabiya panels — vertical lattice stripes
  ctx.save();
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.08)';
  ctx.lineWidth = 0.5;
  const sgs = 20;
  for (let y = 120; y < h - 120; y += sgs) {
    // Left side
    ctx.beginPath();
    ctx.moveTo(m + 5, y);
    ctx.lineTo(m + 20, y + sgs / 2);
    ctx.lineTo(m + 5, y + sgs);
    ctx.stroke();
    // Right side
    ctx.beginPath();
    ctx.moveTo(w - m - 5, y);
    ctx.lineTo(w - m - 20, y + sgs / 2);
    ctx.lineTo(w - m - 5, y + sgs);
    ctx.stroke();
  }
  ctx.restore();

  // ── Header — bilingual ──
  const headerBottom = drawBilingualHeader(ctx, w, 155, poem, {
    poet: '#3D1F00',
    poetAr: 'rgba(61, 31, 0, 0.6)',
    title: 'rgba(74, 40, 0, 0.45)',
  });

  // Sun separator
  ctx.fillStyle = 'rgba(160, 82, 45, 0.55)';
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✸', w / 2, headerBottom + 10);

  // ── Interleaved verses (line by line) ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerBottom + 60;
  const pairSpacing = 170;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#2A1500';
    ctx.font = '64px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.42)';
      ctx.font = 'italic 28px "Playfair Display", serif';
      ctx.direction = 'ltr';
      ctx.fillText(translation[i], w / 2, y + 55);
    }
  });

  // Brand — bottom-right in terracotta, single line
  drawBrandBottomRight(ctx, w, h, 'rgba(160, 82, 45, 0.45)', {
    opacity: 0.55,
    size: 24,
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
