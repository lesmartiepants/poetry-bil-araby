/**
 * Share Card Designs — Canvas-based poem card renderers
 *
 * Five materially different designs, each named after a famous
 * Islamic / Arabic artist or visionary:
 *
 * 1. Dīwān (default)  — Classic gold-on-dark calligraphic style
 * 2. Ibn Muqla         — Proportioned Naskh calligraphy on parchment
 * 3. Sinan             — Ottoman architectural arches & geometry
 * 4. Zaha Hadid        — Bold, modern deconstructivist curves
 * 5. Hassan Fathy      — Earthy, warm desert tones with mashrabiya patterns
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
    description: 'Gold calligraphy on dark ground — the signature Poetry Bil-Araby look',
  },
  {
    id: 'ibnMuqla',
    name: 'Ibn Muqla',
    nameAr: 'ابن مقلة',
    artist: 'Abu Ali ibn Muqla (886–940 CE)',
    description:
      'Warm parchment with proportioned Naskh calligraphy — father of Arabic script rules',
  },
  {
    id: 'sinan',
    name: 'Sinan',
    nameAr: 'سنان',
    artist: 'Mimar Sinan (1489–1588 CE)',
    description: 'Ottoman arches & tile geometry — inspired by the greatest Islamic architect',
  },
  {
    id: 'zahaHadid',
    name: 'Zaha Hadid',
    nameAr: 'زها حديد',
    artist: 'Zaha Hadid (1950–2016 CE)',
    description:
      'Bold flowing curves & gradients — deconstructivist vision of an Iraqi-British genius',
  },
  {
    id: 'hassanFathy',
    name: 'Hassan Fathy',
    nameAr: 'حسن فتحي',
    artist: 'Hassan Fathy (1900–1989 CE)',
    description: 'Earthy desert tones with mashrabiya lattice — architect of the Egyptian people',
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

/** Draw the brand watermark "Poetry Bil-Araby | بالعربي" */
function drawBrand(ctx, x, y, color, fontSize = 16) {
  ctx.save();
  ctx.font = `${fontSize}px "Forum", "Reem Kufi", serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.7;
  ctx.fillText('Poetry Bil-Araby  |  بالعربي', x, y);
  ctx.restore();
}

// ── Design 1: Dīwān (Default) ──────────────────────────────────────────
function renderDiwan(ctx, w, h, poem) {
  // Background — deep near-black
  ctx.fillStyle = '#0c0c0e';
  ctx.fillRect(0, 0, w, h);

  // Subtle gold border inset
  const inset = 40;
  ctx.strokeStyle = 'rgba(197, 160, 89, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

  // Corner decorative dots
  const corners = [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ];
  ctx.fillStyle = 'rgba(197, 160, 89, 0.5)';
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gold gradient header line
  const grad = ctx.createLinearGradient(inset + 60, 0, w - inset - 60, 0);
  grad.addColorStop(0, 'rgba(197, 160, 89, 0)');
  grad.addColorStop(0.3, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(0.5, 'rgba(197, 160, 89, 0.7)');
  grad.addColorStop(0.7, 'rgba(197, 160, 89, 0.5)');
  grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(inset + 60, 130, w - inset * 2 - 120, 1);

  // Poet name (gold)
  ctx.fillStyle = '#c5a059';
  ctx.font = 'bold 36px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, 105);

  // Title (dimmer gold)
  ctx.fillStyle = 'rgba(197, 160, 89, 0.65)';
  ctx.font = '24px "Amiri", serif';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, 170);

  // Arabic verses
  const verses = prepareVerses(poem.arabic);
  ctx.fillStyle = '#e8e0d0';
  ctx.font = '42px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const versesStartY = 300;
  const verseSpacing = 80;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, w / 2, versesStartY + i * verseSpacing);
  });

  // Decorative separator
  const sepY = versesStartY + verses.length * verseSpacing + 30;
  ctx.fillStyle = 'rgba(197, 160, 89, 0.4)';
  ctx.font = '28px serif';
  ctx.fillText('✦', w / 2, sepY);

  // English translation
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  ctx.fillStyle = 'rgba(232, 224, 208, 0.5)';
  ctx.font = 'italic 22px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  const transStartY = sepY + 50;
  const transSpacing = 40;
  translation.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, w - 160);
    wrapped.forEach((wl, j) => {
      ctx.fillText(wl, w / 2, transStartY + i * transSpacing + j * 30);
    });
  });

  // Brand at bottom
  drawBrand(ctx, w / 2, h - 60, 'rgba(197, 160, 89, 0.5)', 18);
}

// ── Design 2: Ibn Muqla — Parchment & Naskh ────────────────────────────
function renderIbnMuqla(ctx, w, h, poem) {
  // Warm parchment background
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, w, h);

  // Aged paper texture (subtle noise)
  ctx.fillStyle = 'rgba(160, 120, 60, 0.04)';
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillRect(x, y, 2, 2);
  }

  // Brown ornamental frame
  const m = 50;
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 3;
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(m + 8, m + 8, w - m * 2 - 16, h - m * 2 - 16);

  // Calligraphic top ornament — bismillah-style flourish
  ctx.fillStyle = '#8B6914';
  ctx.font = '32px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.fillText('❁', w / 2, m + 40);

  // Poet name
  ctx.fillStyle = '#5C3A0A';
  ctx.font = 'bold 38px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, 160);

  // Title
  ctx.fillStyle = 'rgba(92, 58, 10, 0.6)';
  ctx.font = '26px "Amiri", serif';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, 210);

  // Horizontal flourish
  const lgr = ctx.createLinearGradient(m + 80, 0, w - m - 80, 0);
  lgr.addColorStop(0, 'rgba(139, 105, 20, 0)');
  lgr.addColorStop(0.5, 'rgba(139, 105, 20, 0.6)');
  lgr.addColorStop(1, 'rgba(139, 105, 20, 0)');
  ctx.fillStyle = lgr;
  ctx.fillRect(m + 80, 240, w - m * 2 - 160, 1);

  // Arabic verses in brown ink
  const verses = prepareVerses(poem.arabic);
  ctx.fillStyle = '#2C1A00';
  ctx.font = '44px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const vsy = 340;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, w / 2, vsy + i * 85);
  });

  // Separator
  const sepY = vsy + verses.length * 85 + 20;
  ctx.fillStyle = '#8B6914';
  ctx.font = '24px serif';
  ctx.fillText('◆', w / 2, sepY);

  // English in muted brown
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  ctx.fillStyle = 'rgba(44, 26, 0, 0.45)';
  ctx.font = 'italic 22px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  const tsy = sepY + 50;
  translation.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, w - 180);
    wrapped.forEach((wl, j) => {
      ctx.fillText(wl, w / 2, tsy + i * 38 + j * 28);
    });
  });

  // Brand watermark
  drawBrand(ctx, w / 2, h - 60, 'rgba(92, 58, 10, 0.35)', 17);
}

// ── Design 3: Sinan — Ottoman Arches & Iznik Tile ──────────────────────
function renderSinan(ctx, w, h, poem) {
  // Deep Ottoman blue
  ctx.fillStyle = '#0A1628';
  ctx.fillRect(0, 0, w, h);

  // Iznik-inspired top arch
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(100, 200);
  ctx.quadraticCurveTo(w / 2, 30, w - 100, 200);
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Second inner arch
  ctx.beginPath();
  ctx.moveTo(140, 200);
  ctx.quadraticCurveTo(w / 2, 60, w - 140, 200);
  ctx.strokeStyle = 'rgba(79, 166, 183, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Geometric corner ornaments (Iznik-style)
  const drawCornerPattern = (cx, cy, scale) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(79, 166, 183, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.rotate(Math.PI / 4);
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 30);
      ctx.stroke();
    }
    ctx.restore();
  };
  drawCornerPattern(80, 80, 1);
  drawCornerPattern(w - 80, 80, 1);
  drawCornerPattern(80, h - 80, 1);
  drawCornerPattern(w - 80, h - 80, 1);

  // Poet name in turquoise
  ctx.fillStyle = '#4FA6B7';
  ctx.font = 'bold 36px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, 150);

  // Title
  ctx.fillStyle = 'rgba(79, 166, 183, 0.55)';
  ctx.font = '24px "Amiri", serif';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, 230);

  // Arabic verses in white
  const verses = prepareVerses(poem.arabic);
  ctx.fillStyle = '#E8E4DC';
  ctx.font = '42px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const vsy = 360;
  const vsp = 80;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, w / 2, vsy + i * vsp);
  });

  // Crescent separator
  const sepY = vsy + verses.length * vsp + 30;
  ctx.fillStyle = 'rgba(79, 166, 183, 0.5)';
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('☽', w / 2, sepY);

  // English translation
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  ctx.fillStyle = 'rgba(232, 228, 220, 0.45)';
  ctx.font = 'italic 22px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  const tsy = sepY + 50;
  translation.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, w - 160);
    wrapped.forEach((wl, j) => {
      ctx.fillText(wl, w / 2, tsy + i * 38 + j * 28);
    });
  });

  // Brand
  drawBrand(ctx, w / 2, h - 55, 'rgba(79, 166, 183, 0.45)', 17);
}

// ── Design 4: Zaha Hadid — Bold Deconstructivist ────────────────────────
function renderZahaHadid(ctx, w, h, poem) {
  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0D0015');
  bg.addColorStop(0.5, '#1A0030');
  bg.addColorStop(1, '#0D0015');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Flowing curves — Zaha's parametric language
  ctx.save();
  ctx.strokeStyle = 'rgba(200, 100, 255, 0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-50, 200 + i * 220);
    ctx.bezierCurveTo(w * 0.3, 100 + i * 180, w * 0.7, 350 + i * 200, w + 50, 200 + i * 230);
    ctx.stroke();
  }
  ctx.restore();

  // Accent bar — asymmetric
  const accentGrad = ctx.createLinearGradient(0, 0, w, 0);
  accentGrad.addColorStop(0, 'rgba(200, 100, 255, 0)');
  accentGrad.addColorStop(0.2, 'rgba(200, 100, 255, 0.6)');
  accentGrad.addColorStop(0.8, 'rgba(100, 180, 255, 0.6)');
  accentGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 90, w, 3);

  // Poet name — bold modern
  ctx.fillStyle = '#C864FF';
  ctx.font = 'bold 40px "Amiri", serif';
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w - 80, 70);

  // Title — shifted left for asymmetry
  ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
  ctx.font = '22px "Amiri", serif';
  ctx.textAlign = 'left';
  ctx.direction = 'rtl';
  ctx.fillText(poem.titleArabic || poem.title || '', w - 80, 130);

  // Arabic verses — larger, left-aligned (RTL)
  const verses = prepareVerses(poem.arabic);
  ctx.fillStyle = '#F0E8FF';
  ctx.font = '44px "Amiri", serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  const vsy = 280;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, w - 80, vsy + i * 90);
  });

  // Angular separator line
  const sepY = vsy + verses.length * 90 + 30;
  const sepGrad = ctx.createLinearGradient(80, 0, w - 80, 0);
  sepGrad.addColorStop(0, 'rgba(200, 100, 255, 0.5)');
  sepGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
  ctx.fillStyle = sepGrad;
  ctx.fillRect(80, sepY, w - 160, 2);

  // English — aligned differently
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  ctx.fillStyle = 'rgba(240, 232, 255, 0.45)';
  ctx.font = 'italic 22px "Playfair Display", serif';
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  const tsy = sepY + 50;
  translation.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, w - 200);
    wrapped.forEach((wl, j) => {
      ctx.fillText(wl, 80, tsy + i * 38 + j * 28);
    });
  });

  // Brand — bottom-left for asymmetry
  ctx.save();
  ctx.font = '17px "Forum", "Reem Kufi", serif';
  ctx.fillStyle = 'rgba(200, 100, 255, 0.4)';
  ctx.textAlign = 'left';
  ctx.globalAlpha = 0.7;
  ctx.fillText('Poetry Bil-Araby  |  بالعربي', 80, h - 55);
  ctx.restore();
}

// ── Design 5: Hassan Fathy — Earthy Desert ──────────────────────────────
function renderHassanFathy(ctx, w, h, poem) {
  // Warm sand background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#F5E1C0');
  bg.addColorStop(1, '#E8CFA0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Mashrabiya lattice pattern — top band
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 80, 30, 0.15)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = 0; x < w; x += gridSize) {
    for (let y = 0; y < 120; y += gridSize) {
      // Diamond pattern
      ctx.beginPath();
      ctx.moveTo(x + gridSize / 2, y);
      ctx.lineTo(x + gridSize, y + gridSize / 2);
      ctx.lineTo(x + gridSize / 2, y + gridSize);
      ctx.lineTo(x, y + gridSize / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  // Also bottom band
  for (let x = 0; x < w; x += gridSize) {
    for (let y = h - 120; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + gridSize / 2, y);
      ctx.lineTo(x + gridSize, y + gridSize / 2);
      ctx.lineTo(x + gridSize / 2, y + gridSize);
      ctx.lineTo(x, y + gridSize / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Terracotta accent line
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(60, 140, w - 120, 2);
  ctx.fillRect(60, h - 140, w - 120, 2);

  // Poet name in deep brown
  ctx.fillStyle = '#4A2800';
  ctx.font = 'bold 38px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillText(poem.poetArabic || poem.poet || '', w / 2, 200);

  // Title in warm brown
  ctx.fillStyle = 'rgba(74, 40, 0, 0.55)';
  ctx.font = '25px "Amiri", serif';
  ctx.fillText(poem.titleArabic || poem.title || '', w / 2, 250);

  // Arabic verses in dark earth
  const verses = prepareVerses(poem.arabic);
  ctx.fillStyle = '#2A1500';
  ctx.font = '42px "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const vsy = 370;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, w / 2, vsy + i * 82);
  });

  // Sun/star separator
  const sepY = vsy + verses.length * 82 + 25;
  ctx.fillStyle = '#A0522D';
  ctx.font = '26px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✸', w / 2, sepY);

  // English translation
  const translation = prepareTranslation(poem.english || poem.cachedTranslation);
  ctx.fillStyle = 'rgba(42, 21, 0, 0.4)';
  ctx.font = 'italic 22px "Playfair Display", serif';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  const tsy = sepY + 50;
  translation.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, w - 180);
    wrapped.forEach((wl, j) => {
      ctx.fillText(wl, w / 2, tsy + i * 38 + j * 28);
    });
  });

  // Brand in terracotta
  drawBrand(ctx, w / 2, h - 70, 'rgba(160, 82, 45, 0.4)', 17);
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
