#!/usr/bin/env node
/**
 * Builds generate.html by embedding the catalog JSON inline.
 */
const fs   = require('fs');
const path = require('path');

const DIR  = path.resolve(__dirname);
const catalogRaw = fs.readFileSync(path.join(DIR, 'catalog.min.json'), 'utf-8');

// Escape </script> occurrences in JSON (should not exist but be safe)
const catalogEscaped = catalogRaw.replace(/<\/script>/gi, '<\\/script>');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Islamic Pattern Generator — TiledPatternMaker Library</title>
<style>
  :root {
    --bg: #0d0d14;
    --surface: #13131e;
    --surface2: #1a1a2a;
    --gold: #c5a059;
    --gold-dim: rgba(197,160,89,0.35);
    --gold-bg: rgba(197,160,89,0.1);
    --lapis: #2a5a8c;
    --text: #e8dcc8;
    --muted: rgba(232,220,200,0.5);
    --border: rgba(197,160,89,0.18);
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    background: var(--bg); color: var(--text);
    font-family: system-ui,-apple-system,sans-serif;
    height: 100%; overflow: hidden;
  }

  /* ── LAYOUT ── */
  .app { display:flex; height:100vh; overflow:hidden; }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 260px; min-width: 220px; max-width: 300px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .sidebar-header {
    padding: 14px 16px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .sidebar-title {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gold); margin-bottom: 10px;
  }
  .tab-row {
    display: flex; gap: 4px;
  }
  .tab-btn {
    flex: 1; padding: 5px 4px; font-size: 10px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
    background: transparent; color: var(--muted);
    border: 1px solid var(--border); border-radius: 4px; cursor: pointer;
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: var(--gold-bg); color: var(--gold);
    border-color: var(--gold-dim);
  }
  .tab-btn:hover:not(.active) { color: var(--text); border-color: var(--gold-dim); }

  .sidebar-search {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .sidebar-search input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); padding: 6px 10px; border-radius: 4px; font-size: 12px;
    outline: none;
  }
  .sidebar-search input::placeholder { color: var(--muted); }
  .sidebar-search input:focus { border-color: var(--gold-dim); }

  .sidebar-list {
    flex: 1; overflow-y: auto; padding: 8px 0;
  }
  .sidebar-list::-webkit-scrollbar { width: 4px; }
  .sidebar-list::-webkit-scrollbar-track { background: transparent; }
  .sidebar-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .category-header {
    padding: 8px 16px 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--gold);
    opacity: 0.7;
  }
  .pattern-item {
    padding: 7px 16px;
    font-size: 12px; cursor: pointer;
    color: var(--muted);
    transition: background 0.1s, color 0.1s;
    display: flex; align-items: center; gap: 8px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pattern-item .badge {
    font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
    background: rgba(197,160,89,0.12); color: var(--gold);
    flex-shrink: 0; letter-spacing: 0.06em;
  }
  .pattern-item:hover { background: var(--gold-bg); color: var(--text); }
  .pattern-item.active { background: rgba(197,160,89,0.15); color: var(--gold); }
  .pattern-name { overflow: hidden; text-overflow: ellipsis; }

  /* ── MAIN PANEL ── */
  .main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

  /* ── TOOLBAR ── */
  .toolbar {
    padding: 10px 16px; border-bottom: 1px solid var(--border);
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    background: rgba(13,13,20,0.95); backdrop-filter: blur(16px);
    flex-shrink: 0;
  }
  .toolbar-info {
    flex: 1; min-width: 0;
  }
  .toolbar-name {
    font-size: 14px; font-weight: 600; color: var(--gold); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .toolbar-desc {
    font-size: 11px; color: var(--muted); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .toolbar-controls { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  select.size-sel {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    padding: 6px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;
  }
  .btn {
    padding: 7px 14px; border-radius: 5px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    background: var(--gold-bg); color: var(--gold);
    border: 1px solid var(--gold-dim);
  }
  .btn:hover { background: rgba(197,160,89,0.2); border-color: var(--gold); }

  /* ── CANVAS ── */
  .canvas-wrap {
    flex: 1; display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: relative; background: var(--bg);
  }
  #patternCanvas { display:block; }

  /* ── MOBILE ── */
  @media (max-width: 640px) {
    .app { flex-direction: column; }
    .sidebar { width: 100%; max-width: 100%; height: 48px; flex-direction: row; }
    .sidebar-header { border-right: 1px solid var(--border); border-bottom: none; }
    .tab-row { display:none; }
    .sidebar-search { display:none; }
    .sidebar-list { display:none; }
  }
</style>
</head>
<body>

<div class="app">

  <!-- ── SIDEBAR ── -->
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">Islamic Patterns</div>
      <div class="tab-row">
        <button class="tab-btn active" data-tab="tilings">Tilings</button>
        <button class="tab-btn" data-tab="girih">Girih</button>
        <button class="tab-btn" data-tab="templates">Templates</button>
      </div>
    </div>
    <div class="sidebar-search">
      <input type="text" id="searchInput" placeholder="Search patterns…" />
    </div>
    <div class="sidebar-list" id="sidebarList"></div>
  </nav>

  <!-- ── MAIN ── -->
  <div class="main">
    <div class="toolbar">
      <div class="toolbar-info">
        <div class="toolbar-name" id="patternName">Select a pattern</div>
        <div class="toolbar-desc" id="patternDesc"></div>
      </div>
      <div class="toolbar-controls">
        <select class="size-sel" id="sizeSelect">
          <option value="1024">1024px</option>
          <option value="1920" selected>1920px</option>
          <option value="2560">2560px</option>
        </select>
        <button class="btn" id="downloadBtn">Download PNG</button>
      </div>
    </div>
    <div class="canvas-wrap" id="canvasWrap">
      <canvas id="patternCanvas"></canvas>
    </div>
  </div>
</div>

<script>
// ────────────────────────────────────────────────────────────────────────────
// CATALOG DATA (inline)
// ────────────────────────────────────────────────────────────────────────────
const CATALOG = ${catalogEscaped};

// ────────────────────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────────────────────
let currentTab  = 'tilings';
let currentItem = null;   // { kind: 'tiling'|'girih'|'template', data: {...} }
let searchQuery = '';

// ────────────────────────────────────────────────────────────────────────────
// MATH HELPERS
// ────────────────────────────────────────────────────────────────────────────
const DEG = Math.PI / 180;

/**
 * Generate vertices of a regular n-gon centered at origin, radius=1,
 * with optional rotation offset in degrees.
 */
function regularPolygon(n, rotDeg = 0) {
  const verts = [];
  const rotRad = rotDeg * DEG;
  for (let k = 0; k < n; k++) {
    const angle = (2 * Math.PI * k / n) + rotRad;
    verts.push([Math.cos(angle), Math.sin(angle)]);
  }
  return verts;
}

/**
 * Apply a 2x3 affine transform to a single point.
 * Matrix: [[a,b],[c,d]] + translation [tx,ty]
 */
function applyMatrix(a, b, tx, c, d, ty, px, py) {
  return [a * px + b * py + tx, c * px + d * py + ty];
}

/**
 * Apply placement to an array of [x,y] points.
 * Handles both 'matrix' and 'srt' placement types.
 */
function applyPlacement(pts, placement) {
  if (placement.type === 'matrix') {
    const { a, b, tx, c, d, ty } = placement;
    return pts.map(([px, py]) => applyMatrix(a, b, tx, c, d, ty, px, py));
  }
  // 'srt': scale, then rotate, then translate
  const { scale, rot, tranX, tranY } = placement;
  const cosR = Math.cos(rot * DEG);
  const sinR = Math.sin(rot * DEG);
  return pts.map(([px, py]) => {
    const sx = px * scale;
    const sy = py * scale;
    return [
      cosR * sx - sinR * sy + tranX,
      sinR * sx + cosR * sy + tranY,
    ];
  });
}

/**
 * Compute bounding box of an array of [x,y] points.
 * Returns { minX, minY, maxX, maxY, w, h, cx, cy }.
 */
function bbox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY,
           cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// ────────────────────────────────────────────────────────────────────────────
// TILING GEOMETRY — build all polygon instances to fill the viewport
// ────────────────────────────────────────────────────────────────────────────

/**
 * For a tiling, generate all polygon vertex-lists that cover the canvas.
 * Returns an array of arrays of [x,y] (canvas coords).
 *
 * Algorithm:
 * 1. Build unit-cell polygons (all features × all placements)
 * 2. Find a natural scale so the unit cell covers ~canvasSize pixels
 * 3. Tile by T1/T2 vectors over a range that fills the canvas + padding
 * 4. Apply viewport centering transform
 */
function buildTilingPolygons(tiling, canvasW, canvasH) {
  const [t1x, t1y] = tiling.t1;
  const [t2x, t2y] = tiling.t2;

  // Build unit cell polygons in model coords
  const unitPolys = [];

  for (const feature of tiling.features) {
    let baseVerts;

    if (feature.type === 'regular' && feature.sides) {
      // Regular polygon, unit-circle radius
      baseVerts = regularPolygon(feature.sides, 0);
    } else if (feature.points && feature.points.length >= 3) {
      baseVerts = feature.points;
    } else {
      continue;
    }

    for (const placement of feature.placements) {
      const transformed = applyPlacement(baseVerts, placement);
      unitPolys.push(transformed);
    }
  }

  if (unitPolys.length === 0) return [];

  // Determine natural scale of the unit cell by measuring T1 vector length
  const t1Len = Math.sqrt(t1x * t1x + t1y * t1y);
  const t2Len = Math.sqrt(t2x * t2x + t2y * t2y);
  const cellSize = Math.max(t1Len, t2Len);

  // Target: fit ~4 unit cells across the smaller canvas dimension with some padding
  const targetFit = Math.min(canvasW, canvasH) * 0.9;
  const numCellsTarget = 3.5;
  const scale = (cellSize > 0) ? (targetFit / (cellSize * numCellsTarget)) : 1;

  // Tiling range: enough to fill canvas + margin
  const margin = 2;  // extra cells in each direction
  const rangeI = Math.ceil(canvasW / (t1Len * scale)) + margin;
  const rangeJ = Math.ceil(canvasH / (t2Len * scale)) + margin;

  // Collect all polygons across the tile grid
  const allPolys = [];
  for (let i = -rangeI; i <= rangeI; i++) {
    for (let j = -rangeJ; j <= rangeJ; j++) {
      const ox = i * t1x + j * t2x;
      const oy = i * t1y + j * t2y;
      for (const poly of unitPolys) {
        allPolys.push(poly.map(([px, py]) => [px + ox, py + oy]));
      }
    }
  }

  // Find bounding box of all model-space coords
  const allPts = allPolys.flat();
  const b = bbox(allPts);

  // Map to canvas: center + scale
  const sx = canvasW / (b.w || 1);
  const sy = canvasH / (b.h || 1);
  const finalScale = Math.min(sx, sy) * 0.98;
  const offX = canvasW / 2 - b.cx * finalScale;
  const offY = canvasH / 2 - b.cy * finalScale;

  return allPolys.map(poly =>
    poly.map(([px, py]) => [px * finalScale + offX, py * finalScale + offY])
  );
}

/**
 * Build polygons for a girih shape (single shape, centered).
 */
function buildGirihPolygons(shape, canvasW, canvasH) {
  let verts;

  if (shape.type === 'regular' && shape.sides) {
    // Regular polygon, apply shape's own transform
    const base = regularPolygon(shape.sides, 0);
    verts = base.map(([px, py]) => {
      const s   = shape.scale;
      const rRad = shape.rot * DEG; // already in degrees from parser
      const cosR = Math.cos(rRad), sinR = Math.sin(rRad);
      return [
        cosR * px * s - sinR * py * s + shape.tx,
        sinR * px * s + cosR * py * s + shape.ty,
      ];
    });
  } else if (shape.points && shape.points.length >= 3) {
    // Apply shape's own transform to the pre-defined points
    verts = shape.points.map(([px, py]) => {
      const s    = shape.scale;
      const rRad = shape.rot * DEG;
      const cosR = Math.cos(rRad), sinR = Math.sin(rRad);
      return [
        cosR * px * s - sinR * py * s + shape.tx,
        sinR * px * s + cosR * py * s + shape.ty,
      ];
    });
  } else {
    return [];
  }

  // Center and scale to canvas
  const b = bbox(verts);
  const dim  = Math.min(canvasW, canvasH) * 0.7;
  const scl  = dim / Math.max(b.w, b.h, 0.001);
  const offX = canvasW / 2 - b.cx * scl;
  const offY = canvasH / 2 - b.cy * scl;

  return [verts.map(([px, py]) => [px * scl + offX, py * scl + offY])];
}

/**
 * Build lines/circles for a template.
 */
function buildTemplateGeometry(template, canvasW, canvasH) {
  // Template coords are normalized (roughly -1..1)
  const dim  = Math.min(canvasW, canvasH) * 0.42;
  const offX = canvasW / 2;
  const offY = canvasH / 2;

  const lines = template.lines.map(([x1, y1, x2, y2]) => [
    x1 * dim + offX, y1 * dim + offY,
    x2 * dim + offX, y2 * dim + offY,
  ]);

  const circles = template.circles.map(({ r, cx, cy }) => ({
    x: cx * dim + offX, y: cy * dim + offY, r: r * dim,
  }));

  return { lines, circles };
}

// ────────────────────────────────────────────────────────────────────────────
// RENDERING
// ────────────────────────────────────────────────────────────────────────────
const GOLD   = '#c5a059';
const LAPIS  = '#2a5a8c';
const BG     = '#0d0d14';

function renderTiling(ctx, tiling, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const polys = buildTilingPolygons(tiling, w, h);
  if (polys.length === 0) return;

  // Draw fill for regular polygons and stroke for all
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = GOLD;
  for (const poly of polys) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(0.5, w / 2000);
  for (const poly of polys) {
    if (poly.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
}

function renderGirih(ctx, shape, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const polys = buildGirihPolygons(shape, w, h);
  if (polys.length === 0) return;

  ctx.globalAlpha = 0.15;
  ctx.fillStyle = LAPIS;
  for (const poly of polys) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(2, w / 600);
  for (const poly of polys) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }

  // Label vertices
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = GOLD;
  ctx.font = \`\${Math.max(10, w / 120)}px system-ui\`;
  ctx.textAlign = 'center';
  for (const poly of polys) {
    poly.forEach(([px, py], i) => {
      ctx.fillText(i + 1, px, py - 6);
    });
  }
}

function renderTemplate(ctx, template, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const { lines, circles } = buildTemplateGeometry(template, w, h);

  // Draw circles
  ctx.strokeStyle = LAPIS;
  ctx.lineWidth = Math.max(0.5, w / 2000);
  ctx.globalAlpha = 0.6;
  for (const { x, y, r } of circles) {
    ctx.beginPath();
    ctx.arc(x, y, Math.abs(r), 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Draw lines
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 1;
  ctx.lineWidth = Math.max(0.8, w / 1500);
  for (const [x1, y1, x2, y2] of lines) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function render() {
  if (!currentItem) return;

  const sizeVal = parseInt(document.getElementById('sizeSelect').value, 10);
  const canvas  = document.getElementById('patternCanvas');
  const wrap    = document.getElementById('canvasWrap');

  // Set canvas resolution
  canvas.width  = sizeVal;
  canvas.height = sizeVal;

  // Scale canvas to fit viewport
  const wrapW = wrap.clientWidth  - 32;
  const wrapH = wrap.clientHeight - 32;
  const fitScale = Math.min(wrapW / sizeVal, wrapH / sizeVal, 1);
  canvas.style.width  = Math.round(sizeVal * fitScale) + 'px';
  canvas.style.height = Math.round(sizeVal * fitScale) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = 1;

  const { kind, data } = currentItem;
  if (kind === 'tiling')   renderTiling(ctx, data, sizeVal, sizeVal);
  else if (kind === 'girih')    renderGirih(ctx, data, sizeVal, sizeVal);
  else if (kind === 'template') renderTemplate(ctx, data, sizeVal, sizeVal);
}

// ────────────────────────────────────────────────────────────────────────────
// SIDEBAR POPULATION
// ────────────────────────────────────────────────────────────────────────────

const TILING_CATEGORY_ORDER = [
  'Triangular','Square','Pentagonal','Hexagonal','Octagonal',
  'Decagonal','Dodecagonal+','Mixed','Irregular',
];

const TEMPLATE_GROUP_ORDER = [
  'Ben Yusuf Madrasa', 'Kharraqan', "Mosque of al-Salih Tala'i",
  'Tomb of Jalal al-Din', 'Broug', 'Hank', 'Other',
];

function buildSidebar() {
  const list = document.getElementById('sidebarList');
  list.innerHTML = '';

  const q = searchQuery.toLowerCase();

  if (currentTab === 'tilings') {
    // Group by category
    const grouped = {};
    for (const cat of TILING_CATEGORY_ORDER) grouped[cat] = [];

    for (const t of CATALOG.tilings) {
      const cat = t.category || 'Mixed';
      if (!grouped[cat]) grouped[cat] = [];
      if (q && !t.name.toLowerCase().includes(q)) continue;
      grouped[cat].push(t);
    }

    for (const cat of TILING_CATEGORY_ORDER) {
      const items = grouped[cat];
      if (!items || items.length === 0) continue;
      const hdr = document.createElement('div');
      hdr.className = 'category-header';
      hdr.textContent = cat;
      list.appendChild(hdr);

      for (const t of items) {
        const el = makeItem(t.name, t.category, () => selectItem('tiling', t));
        if (currentItem?.kind === 'tiling' && currentItem.data.name === t.name)
          el.classList.add('active');
        list.appendChild(el);
      }
    }

  } else if (currentTab === 'girih') {
    const hdr = document.createElement('div');
    hdr.className = 'category-header';
    hdr.textContent = 'Girih Shapes';
    list.appendChild(hdr);

    for (const g of CATALOG.girihShapes) {
      if (q && !g.name.toLowerCase().includes(q)) continue;
      const badge = g.type === 'regular' ? g.sides + '-gon' : 'irregular';
      const el = makeItem(g.name, badge, () => selectItem('girih', g));
      if (currentItem?.kind === 'girih' && currentItem.data.name === g.name)
        el.classList.add('active');
      list.appendChild(el);
    }

  } else if (currentTab === 'templates') {
    const grouped = {};
    for (const g of TEMPLATE_GROUP_ORDER) grouped[g] = [];

    for (const t of CATALOG.templates) {
      const g = t.group || 'Other';
      if (!grouped[g]) grouped[g] = [];
      if (q && !t.name.toLowerCase().includes(q)) continue;
      grouped[g].push(t);
    }

    for (const grp of TEMPLATE_GROUP_ORDER) {
      const items = grouped[grp];
      if (!items || items.length === 0) continue;
      const hdr = document.createElement('div');
      hdr.className = 'category-header';
      hdr.textContent = grp;
      list.appendChild(hdr);

      for (const t of items) {
        const el = makeItem(t.name, t.lines.length + 'L', () => selectItem('template', t));
        if (currentItem?.kind === 'template' && currentItem.data.name === t.name)
          el.classList.add('active');
        list.appendChild(el);
      }
    }
  }
}

function makeItem(name, badge, onClick) {
  const el = document.createElement('div');
  el.className = 'pattern-item';
  el.innerHTML =
    \`<span class="pattern-name">\${escapeHtml(name)}</span>\` +
    (badge ? \`<span class="badge">\${escapeHtml(String(badge))}</span>\` : '');
  el.addEventListener('click', onClick);
  return el;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ────────────────────────────────────────────────────────────────────────────
// ITEM SELECTION
// ────────────────────────────────────────────────────────────────────────────
function selectItem(kind, data) {
  currentItem = { kind, data };
  buildSidebar();

  const nameEl = document.getElementById('patternName');
  const descEl = document.getElementById('patternDesc');

  if (kind === 'tiling') {
    nameEl.textContent = data.name + ' — ' + (data.category || '');
    const parts = [];
    if (data.desc) parts.push(data.desc);
    if (data.auth) parts.push('by ' + data.auth);
    descEl.textContent = parts.join(' · ');
  } else if (kind === 'girih') {
    nameEl.textContent = data.name;
    descEl.textContent = data.type + (data.sides ? ', ' + data.sides + ' sides' : '');
  } else {
    nameEl.textContent = data.name;
    descEl.textContent = data.group + ' · ' + data.lines.length + ' lines, ' + data.circles.length + ' circles';
  }

  render();
}

// ────────────────────────────────────────────────────────────────────────────
// EVENTS
// ────────────────────────────────────────────────────────────────────────────

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildSidebar();
  });
});

// Search
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value;
  buildSidebar();
});

// Size select
document.getElementById('sizeSelect').addEventListener('change', render);

// Download
document.getElementById('downloadBtn').addEventListener('click', () => {
  const canvas = document.getElementById('patternCanvas');
  const name   = (currentItem?.data?.name || 'pattern').replace(/[^a-zA-Z0-9-_.]/g, '_');
  const link   = document.createElement('a');
  link.download = name + '.png';
  link.href     = canvas.toDataURL('image/png');
  link.click();
});

// Resize: re-render on window resize
window.addEventListener('resize', () => { if (currentItem) render(); });

// ────────────────────────────────────────────────────────────────────────────
// INITIAL RENDER
// ────────────────────────────────────────────────────────────────────────────
buildSidebar();
// Auto-select first tiling
const first = CATALOG.tilings.find(t => t.name === '6') || CATALOG.tilings[0];
if (first) selectItem('tiling', first);

</script>
</body>
</html>`;

fs.writeFileSync(path.join(DIR, 'generate.html'), html, 'utf-8');
console.log('Written generate.html (' + html.length + ' bytes = ' + Math.round(html.length/1024) + ' KB)');
