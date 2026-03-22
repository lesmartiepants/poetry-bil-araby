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
    name: 'Classic Dīwān',
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

/** Wrap long text to fit a max pixel width */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draw the brand mark "بالعربي poetry" in the bottom-right corner.
 * Matches the app header style: Arabic "بالعربي" in Reem Kufi + English "poetry" in Forum.
 * The brand font is NOT changed, but color/opacity/effects vary by design.
 */
function drawBrandBottomRight(ctx, w, h, arabicColor, englishColor, opts = {}) {
  const { glowColor, glowBlur = 0, opacity = 0.6, size = 22 } = opts;
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

  // Arabic: بالعربي (Reem Kufi style)
  ctx.font = `bold ${size}px "Reem Kufi", sans-serif`;
  ctx.fillStyle = arabicColor;
  ctx.fillText('بالعربي', bx, by - size * 0.5);

  // English: poetry (Forum style)
  ctx.shadowBlur = 0;
  ctx.font = `${Math.round(size * 0.7)}px "Forum", serif`;
  ctx.fillStyle = englishColor;
  ctx.fillText('poetry', bx, by + size * 0.4);

  ctx.restore();
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

  // Gold border — double rule
  const inset = 48;
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.12)';
  ctx.strokeRect(inset + 10, inset + 10, w - (inset + 10) * 2, h - (inset + 10) * 2);

  // Corner ornaments
  const dotSize = 8;
  ctx.fillStyle = 'rgba(197, 160, 89, 0.5)';
  for (const [cx, cy] of [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Header: poet & title ──
  const headerY = 120;
  // Poet name — Arabic (large gold)
  ctx.fillStyle = '#c5a059';
  ctx.font = 'bold 48px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, headerY);

  // Poet name — English (smaller, muted)
  ctx.fillStyle = 'rgba(197, 160, 89, 0.5)';
  ctx.font = '22px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.poet || '', w / 2, headerY + 40);

  // Title — Arabic
  ctx.fillStyle = 'rgba(197, 160, 89, 0.6)';
  ctx.font = '26px "Amiri", serif';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, headerY + 90);

  // Title — English
  ctx.fillStyle = 'rgba(197, 160, 89, 0.35)';
  ctx.font = 'italic 18px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.title || '', w / 2, headerY + 120);

  // Gold gradient separator
  const sepLineY = headerY + 150;
  const grad = ctx.createLinearGradient(100, 0, w - 100, 0);
  grad.addColorStop(0, 'rgba(197, 160, 89, 0)');
  grad.addColorStop(0.3, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(0.5, 'rgba(197, 160, 89, 0.8)');
  grad.addColorStop(0.7, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(100, sepLineY, w - 200, 1);

  // ── Interleaved verses + translations ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = sepLineY + 70;
  const pairSpacing = 140; // Space between each Arabic+English pair

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    // Arabic verse — LARGE
    ctx.fillStyle = '#e8e0d0';
    ctx.font = '52px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    // English translation below — elegant italic
    if (translation[i]) {
      ctx.fillStyle = 'rgba(197, 160, 89, 0.45)';
      ctx.font = 'italic 22px "Playfair Display", serif';
      ctx.direction = 'ltr';
      const wrapped = wrapText(ctx, translation[i], w - 200);
      wrapped.forEach((wl, j) => {
        ctx.fillText(wl, w / 2, y + 45 + j * 28);
      });
    }
  });

  // Brand — bottom-right
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.6)', 'rgba(197, 160, 89, 0.4)', {
    glowColor: 'rgba(197, 160, 89, 0.3)',
    glowBlur: 20,
    opacity: 0.7,
    size: 24,
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

  // Ornate outer frame — triple rule
  const m = 44;
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 3;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 8, m + 8, w - (m + 8) * 2, h - (m + 8) * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.2)';
  ctx.strokeRect(m + 14, m + 14, w - (m + 14) * 2, h - (m + 14) * 2);

  // Calligraphic top ornament
  ctx.fillStyle = '#8B6914';
  ctx.font = '36px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.fillText('❁', w / 2, m + 45);

  // ── Header ──
  const headerY = 140;
  ctx.fillStyle = '#4A2800';
  ctx.font = 'bold 50px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, headerY);

  ctx.fillStyle = 'rgba(92, 58, 10, 0.5)';
  ctx.font = '22px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.poet || '', w / 2, headerY + 38);

  ctx.fillStyle = 'rgba(74, 40, 0, 0.6)';
  ctx.font = '26px "Amiri", serif';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, headerY + 85);

  ctx.fillStyle = 'rgba(92, 58, 10, 0.35)';
  ctx.font = 'italic 18px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.title || '', w / 2, headerY + 115);

  // Horizontal flourish
  const fl = ctx.createLinearGradient(m + 60, 0, w - m - 60, 0);
  fl.addColorStop(0, 'rgba(139, 105, 20, 0)');
  fl.addColorStop(0.5, 'rgba(139, 105, 20, 0.7)');
  fl.addColorStop(1, 'rgba(139, 105, 20, 0)');
  ctx.fillStyle = fl;
  ctx.fillRect(m + 60, headerY + 140, w - m * 2 - 120, 1.5);

  // ── Interleaved verses ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerY + 195;
  const pairSpacing = 140;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#2C1A00';
    ctx.font = '50px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.4)';
      ctx.font = 'italic 20px "Playfair Display", serif';
      ctx.direction = 'ltr';
      const wrapped = wrapText(ctx, translation[i], w - 200);
      wrapped.forEach((wl, j) => {
        ctx.fillText(wl, w / 2, y + 42 + j * 26);
      });
    }
  });

  // Brand — bottom-right
  drawBrandBottomRight(ctx, w, h, 'rgba(139, 105, 20, 0.5)', 'rgba(92, 58, 10, 0.35)', {
    opacity: 0.6,
    size: 22,
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

  // Iznik-inspired pointed arch — top frame
  ctx.save();
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.4)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.quadraticCurveTo(w / 2, 20, w - 80, 240);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
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
  drawStar(80, h - 80, 20, 8, 'rgba(197, 160, 89, 0.15)');
  drawStar(w - 80, h - 80, 20, 8, 'rgba(197, 160, 89, 0.15)');
  drawStar(80, 80, 16, 6, 'rgba(79, 166, 183, 0.15)');
  drawStar(w - 80, 80, 16, 6, 'rgba(79, 166, 183, 0.15)');

  // Side vertical accent lines
  ctx.fillStyle = 'rgba(79, 166, 183, 0.12)';
  ctx.fillRect(48, 100, 1.5, h - 200);
  ctx.fillRect(w - 49.5, 100, 1.5, h - 200);

  // ── Header ──
  const headerY = 140;
  ctx.fillStyle = '#c5a059';
  ctx.font = 'bold 48px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, headerY);

  ctx.fillStyle = 'rgba(79, 166, 183, 0.55)';
  ctx.font = '22px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.poet || '', w / 2, headerY + 38);

  ctx.fillStyle = 'rgba(197, 160, 89, 0.5)';
  ctx.font = '24px "Amiri", serif';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, headerY + 85);

  ctx.fillStyle = 'rgba(79, 166, 183, 0.4)';
  ctx.font = 'italic 18px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.title || '', w / 2, headerY + 112);

  // Crescent separator
  ctx.fillStyle = 'rgba(197, 160, 89, 0.4)';
  ctx.font = '22px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☽', w / 2, headerY + 150);

  // ── Interleaved verses ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerY + 210;
  const pairSpacing = 145;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#E8E4DC';
    ctx.font = '50px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(79, 166, 183, 0.45)';
      ctx.font = 'italic 20px "Playfair Display", serif';
      ctx.direction = 'ltr';
      const wrapped = wrapText(ctx, translation[i], w - 200);
      wrapped.forEach((wl, j) => {
        ctx.fillText(wl, w / 2, y + 42 + j * 26);
      });
    }
  });

  // Brand — bottom-right
  drawBrandBottomRight(ctx, w, h, 'rgba(197, 160, 89, 0.5)', 'rgba(79, 166, 183, 0.4)', {
    glowColor: 'rgba(79, 166, 183, 0.2)',
    glowBlur: 15,
    opacity: 0.6,
    size: 22,
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
  ctx.fillRect(60, 30, w - 120, 180);

  // ── Header — asymmetric, right-aligned for RTL ──
  const headerY = 70;
  ctx.fillStyle = '#C864FF';
  ctx.font = 'bold 50px "Amiri", serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w - 80, headerY);

  ctx.fillStyle = 'rgba(100, 180, 255, 0.55)';
  ctx.font = '22px "Playfair Display", serif';
  ctx.textAlign = 'right';
  ctx.direction = 'ltr';
  ctx.fillText(poem.poet || '', w - 80, headerY + 38);

  ctx.fillStyle = 'rgba(200, 100, 255, 0.5)';
  ctx.font = '24px "Amiri", serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w - 80, headerY + 85);

  ctx.fillStyle = 'rgba(100, 180, 255, 0.4)';
  ctx.font = 'italic 18px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.title || '', w - 80, headerY + 112);

  // ── Interleaved verses — right-aligned ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = 290;
  const pairSpacing = 150;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#F0E8FF';
    ctx.font = '50px "Amiri", serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w - 80, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(150, 180, 255, 0.45)';
      ctx.font = 'italic 20px "Playfair Display", serif';
      ctx.textAlign = 'right';
      ctx.direction = 'ltr';
      const wrapped = wrapText(ctx, translation[i], w - 200);
      wrapped.forEach((wl, j) => {
        ctx.fillText(wl, w - 80, y + 42 + j * 26);
      });
    }
  });

  // Bottom accent line
  const btmGrad = ctx.createLinearGradient(0, 0, w, 0);
  btmGrad.addColorStop(0, 'rgba(80, 180, 255, 0)');
  btmGrad.addColorStop(0.5, 'rgba(150, 120, 255, 0.5)');
  btmGrad.addColorStop(1, 'rgba(200, 100, 255, 0)');
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, h - 100, w, 2);

  // Brand — bottom-right with neon glow
  drawBrandBottomRight(ctx, w, h, 'rgba(200, 100, 255, 0.55)', 'rgba(100, 180, 255, 0.4)', {
    glowColor: 'rgba(200, 100, 255, 0.4)',
    glowBlur: 25,
    opacity: 0.7,
    size: 22,
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

  // Mashrabiya lattice — top band
  ctx.save();
  ctx.strokeStyle = 'rgba(160, 82, 45, 0.12)';
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
  ctx.fillRect(55, 105, w - 110, 2);
  ctx.fillRect(55, h - 105, w - 110, 2);

  // ── Header ──
  const headerY = 160;
  ctx.fillStyle = '#3D1F00';
  ctx.font = 'bold 48px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, headerY);

  ctx.fillStyle = 'rgba(74, 40, 0, 0.45)';
  ctx.font = '22px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.poet || '', w / 2, headerY + 38);

  ctx.fillStyle = 'rgba(61, 31, 0, 0.55)';
  ctx.font = '24px "Amiri", serif';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, headerY + 82);

  ctx.fillStyle = 'rgba(74, 40, 0, 0.35)';
  ctx.font = 'italic 18px "Playfair Display", serif';
  ctx.direction = 'ltr';
  ctx.fillText(poem.title || '', w / 2, headerY + 110);

  // Sun separator
  ctx.fillStyle = 'rgba(160, 82, 45, 0.5)';
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✸', w / 2, headerY + 148);

  // ── Interleaved verses ──
  const verses = prepareVerses(poem.arabic);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  const contentStartY = headerY + 205;
  const pairSpacing = 140;

  verses.forEach((verse, i) => {
    const y = contentStartY + i * pairSpacing;

    ctx.fillStyle = '#2A1500';
    ctx.font = '48px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(verse, w / 2, y);

    if (translation[i]) {
      ctx.fillStyle = 'rgba(74, 40, 0, 0.38)';
      ctx.font = 'italic 20px "Playfair Display", serif';
      ctx.direction = 'ltr';
      const wrapped = wrapText(ctx, translation[i], w - 200);
      wrapped.forEach((wl, j) => {
        ctx.fillText(wl, w / 2, y + 40 + j * 26);
      });
    }
  });

  // Brand — bottom-right in terracotta
  drawBrandBottomRight(ctx, w, h, 'rgba(160, 82, 45, 0.45)', 'rgba(74, 40, 0, 0.3)', {
    opacity: 0.55,
    size: 22,
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
