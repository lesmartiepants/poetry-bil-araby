#!/usr/bin/env node
/**
 * generate-pattern.js — Generate an Islamic geometric pattern as SVG (or PNG).
 *
 * Usage:
 *   node generate-pattern.js --pattern <name> [--size 1920] [--output <path>]
 *                            [--opacity 0.06] [--bg] [--png]
 *
 * Options:
 *   --pattern   Pattern name (see BUILT_IN_PATTERNS) or path to tiling XML
 *   --size      Canvas size in pixels, default 1920
 *   --output    Output file path (default: stdout for SVG)
 *   --opacity   Line opacity 0–1, default 0.06 (good for dark backgrounds)
 *   --bg        Full-page background mode (outputs standalone HTML)
 *   --png       Render as PNG (requires `canvas` npm package)
 *   --color     Override line color hex, default #c5a059 (gold)
 *
 * SVG output requires no npm packages.
 * PNG output requires: npm install canvas
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTiling } from './parse-tiling.js';

// ---------------------------------------------------------------------------
// App palette
// ---------------------------------------------------------------------------

export const PALETTE = {
  bg: '#0d0d14',
  gold: '#c5a059',
  lapis: '#2a5a8c',
  emerald: '#2d6b4a',
  rust: '#8b4513',
  text: '#e8dcc8',
};

// ---------------------------------------------------------------------------
// Built-in pattern definitions (no XML needed)
// Each is a minimal tiling spec identical to what parse-tiling.js produces.
// ---------------------------------------------------------------------------

export const BUILT_IN_PATTERNS = {
  'girih-decagon': {
    name: 'Girih Decagon',
    origin: 'Girih tile system — al-Kashi c.1400',
    math: '10-fold symmetry',
    t1: [2, 0],
    t2: [0.618033988749895, 1.902113032590307],
    features: [
      {
        type: 'regular', sides: 10, rotation: 0, scale: 1, points: null,
        placements: [{ scale: 1, rot: 0, tx: 0, ty: 0 }],
      },
      {
        type: 'polygon', sides: null, rotation: 0, scale: 1,
        points: [
          [1, 0.3249196962329063],
          [1.381966011250105, 0.8506508083520401],
          [2, 1.051462224238268],
          [1.618033988749895, 1.577193336357401],
          [1.23606797749979, 1.051462224238268],
          [0.6180339887498947, 0.8506508083520403],
        ],
        placements: [{ scale: 1, rot: 0, tx: 0, ty: 0 }],
      },
    ],
    desc: 'Tiling by regular decagons and hexagonal fillers — source of the most famous Islamic patterns.',
  },

  'star-cross': {
    name: 'Star-Cross 4.8²',
    origin: 'Archimedean tiling — Seal of Solomon / [8/3]² star',
    math: '8-fold symmetry, octagons + squares',
    t1: [0, 2],
    t2: [2, 0],
    features: [
      {
        type: 'regular', sides: 4, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 0.4142135623730951, rot: -45, tx: 1, ty: 1 },
        ],
      },
      {
        type: 'regular', sides: 8, rotation: 0, scale: 1, points: null,
        placements: [{ scale: 1, rot: 0, tx: 0, ty: 0 }],
      },
    ],
    desc: 'The classic Archimedean 4.8² tiling. Source of the Seal of Solomon [8/3]² star.',
  },

  '3-8-12': {
    name: '3-8-12 Tiling',
    origin: 'Alcazar of Seville variant — Pierre Baillargeon',
    math: '12-fold symmetry, triangles + octagons + dodecagons',
    t1: [23.74077407376281, 13.706742302257],
    t2: [-7.105427357601002e-15, 27.41348460451404],
    features: [
      {
        type: 'regular', sides: 12, rotation: 0, scale: 1, points: null,
        placements: [{ scale: 6.46410161513775, rot: -30, tx: -7.913591357920938, ty: -13.70674230225703 }],
      },
      {
        type: 'regular', sides: 3, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 1, rot: 0, tx: 0, ty: 0 },
          { scale: 1, rot: 60, tx: 7.913591357920951, ty: -13.70674230225702 },
        ],
      },
      {
        type: 'regular', sides: 8, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 4.181540550352055, rot: 15, tx: -2.59077027517603, ty: -4.487345747344079 },
          { scale: 4.181540550352048, rot: -15, tx: -13.23641244066585, ty: -4.487345747344056 },
          { scale: 4.181540550352044, rot: -30, tx: -13.23641244066584, ty: -22.92613885716995 },
          { scale: 4.181540550352059, rot: 0, tx: 2.732050807568892, ty: -13.70674230225702 },
          { scale: 4.181540550352055, rot: 0, tx: -18.55923352341076, ty: -13.706742302257 },
          { scale: 4.181540550352056, rot: -15, tx: -2.590770275176022, ty: -22.92613885716996 },
        ],
      },
    ],
    desc: 'Yet another variation of the Alcazar of Seville.',
  },

  'hexagon-6': {
    name: '6-fold Hexagon',
    origin: 'Regular hexagonal tiling',
    math: '6-fold symmetry',
    t1: [2, 0],
    t2: [1, 1.732050808],
    features: [
      {
        type: 'regular', sides: 6, rotation: 0, scale: 1, points: null,
        placements: [{ scale: 1, rot: 0, tx: 0, ty: 0 }],
      },
    ],
    desc: 'Classic hexagonal tiling — foundation of many Islamic star patterns.',
  },

  'mexuar': {
    name: 'Mexuar Interlace',
    origin: 'Alhambra, Mexuar Hall — Granada, 14th century',
    math: '8-fold interlace symmetry',
    t1: [0, 2],
    t2: [2, 0],
    features: [
      {
        type: 'regular', sides: 8, rotation: 0, scale: 1, points: null,
        placements: [{ scale: 1, rot: 22.5, tx: 0, ty: 0 }],
      },
      {
        type: 'regular', sides: 4, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 0.4142135623730951, rot: 0, tx: 1, ty: 1 },
        ],
      },
    ],
    desc: 'Interlace pattern from the Mexuar Hall, Alhambra.',
  },

  'ben-yusuf': {
    name: 'Ben Yusuf Madrasa',
    origin: 'Madrasa Ben Yusuf, Marrakech — c.1570',
    math: '12-fold star symmetry',
    t1: [4, 0],
    t2: [2, 3.464101615],
    features: [
      {
        type: 'regular', sides: 12, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 1, rot: 15, tx: 0, ty: 0 },
          { scale: 1, rot: 15, tx: 2, ty: 1.732050808 },
        ],
      },
      {
        type: 'regular', sides: 6, rotation: 0, scale: 1, points: null,
        placements: [
          { scale: 0.5, rot: 0, tx: 2, ty: 0 },
          { scale: 0.5, rot: 0, tx: 0, ty: 1.732050808 },
        ],
      },
    ],
    desc: 'Pattern from the Ben Yusuf Madrasa, Marrakech.',
  },
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const DEG2RAD = Math.PI / 180;

function regularPolygonVertices(n, scale, rotDeg, tx, ty) {
  const rotRad = rotDeg * DEG2RAD;
  const verts = [];
  for (let k = 0; k < n; k++) {
    const angle = (2 * Math.PI * k / n) + rotRad;
    verts.push([
      Math.cos(angle) * scale + tx,
      Math.sin(angle) * scale + ty,
    ]);
  }
  return verts;
}

function applyPlacement(points, placement) {
  const { scale, rot, tx, ty } = placement;
  const rotRad = rot * DEG2RAD;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  return points.map(([x, y]) => [
    (x * cosR - y * sinR) * scale + tx,
    (x * sinR + y * cosR) * scale + ty,
  ]);
}

function featureBasePoints(feature) {
  const { type, sides, rotation, scale, points } = feature;
  return type === 'regular'
    ? regularPolygonVertices(sides, scale, rotation || 0, 0, 0)
    : (points || []);
}

// ---------------------------------------------------------------------------
// Tiling engine — tile over canvas via T1/T2 lattice
// ---------------------------------------------------------------------------

export function tilePath(tiling, canvasSize) {
  const { t1, t2, features } = tiling;
  const S = canvasSize;

  // Find bounding box of one unit cell to estimate scale
  const allVerts = features.flatMap(f =>
    f.placements.flatMap(pl => applyPlacement(featureBasePoints(f), pl))
  );
  const xs = allVerts.map(v => v[0]);
  const ys = allVerts.map(v => v[1]);
  const cellW = (Math.max(...xs) - Math.min(...xs)) || 1;
  const cellH = (Math.max(...ys) - Math.min(...ys)) || 1;
  const cellDim = Math.max(cellW, cellH);

  // Aim for ~8 cells across the canvas
  const targetCellPx = Math.min(S / 8, 120);
  const scale = targetCellPx / cellDim;

  const t1len = Math.sqrt(t1[0] ** 2 + t1[1] ** 2) || 1;
  const t2len = Math.sqrt(t2[0] ** 2 + t2[1] ** 2) || 1;
  const nI = Math.ceil(S / (t1len * scale)) + 2;
  const nJ = Math.ceil(S / (t2len * scale)) + 2;

  // Centre the tiling on the canvas
  const cx = S / 2;
  const cy = S / 2;
  const margin = targetCellPx * 2;

  const paths = [];

  for (let i = -nI; i <= nI; i++) {
    for (let j = -nJ; j <= nJ; j++) {
      const offX = (i * t1[0] + j * t2[0]) * scale + cx;
      const offY = (i * t1[1] + j * t2[1]) * scale + cy;

      for (const feature of features) {
        const base = featureBasePoints(feature);

        for (const pl of feature.placements) {
          const placed = applyPlacement(base, pl);
          const sv = placed.map(([x, y]) => [x * scale + offX, y * scale + offY]);
          if (sv.length < 3) continue;

          // Skip fully out-of-view polygons
          if (!sv.some(([x, y]) =>
            x > -margin && x < S + margin && y > -margin && y < S + margin
          )) continue;

          const d = sv.map(([x, y], k) =>
            `${k === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`
          ).join(' ') + ' Z';
          paths.push(`    <path d="${d}"/>`);
        }
      }
    }
  }

  return paths.join('\n');
}

// ---------------------------------------------------------------------------
// SVG renderer
// ---------------------------------------------------------------------------

export function renderSVG(tiling, size, lineColor, opacity) {
  const paths = tilePath(tiling, size);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PALETTE.bg}"/>
  <g stroke="${lineColor}" stroke-width="1" fill="none" opacity="${opacity}">
${paths}
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// HTML background renderer
// ---------------------------------------------------------------------------

export function renderHTML(tiling, size, lineColor, opacity) {
  const paths = tilePath(tiling, size);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tiling.name} — Islamic Pattern Background</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: ${PALETTE.bg}; overflow: hidden; }
  .pattern-bg {
    position: fixed; inset: 0;
    pointer-events: none; z-index: 0;
  }
  .pattern-bg svg { width: 100%; height: 100%; }
  .content {
    position: relative; z-index: 1;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh;
    font-family: system-ui, sans-serif;
    color: ${PALETTE.text};
    text-align: center;
    padding: 2rem;
  }
</style>
</head>
<body>
<div class="pattern-bg">
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid slice">
    <g stroke="${lineColor}" stroke-width="1" fill="none" opacity="${opacity}">
${paths}
    </g>
  </svg>
</div>
<div class="content">
  <div>
    <div style="color:${PALETTE.gold};font-size:0.9rem;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.5em">${tiling.origin || tiling.name}</div>
    <div style="font-size:1.1rem;opacity:0.6">${tiling.math || ''}</div>
  </div>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PNG renderer (requires `canvas` package)
// ---------------------------------------------------------------------------

async function renderPNG(tiling, size, lineColor, opacity, outputPath) {
  let createCanvas;
  try {
    const mod = await import('canvas');
    createCanvas = mod.createCanvas;
  } catch (_) {
    throw new Error(
      'PNG output requires the `canvas` npm package. Install it with:\n  npm install canvas\n' +
      'Or omit --png to generate SVG output instead.'
    );
  }

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, size, size);

  const r = parseInt(lineColor.slice(1, 3), 16);
  const g = parseInt(lineColor.slice(3, 5), 16);
  const b = parseInt(lineColor.slice(5, 7), 16);
  ctx.strokeStyle = `rgba(${r},${g},${b},${opacity})`;
  ctx.lineWidth = 1;

  const { t1, t2, features } = tiling;
  const allVerts = features.flatMap(f =>
    f.placements.flatMap(pl => applyPlacement(featureBasePoints(f), pl))
  );
  const cellDim = Math.max(...allVerts.map(v => Math.abs(v[0])), ...allVerts.map(v => Math.abs(v[1])), 1);
  const targetCellPx = Math.min(size / 8, 120);
  const scale = targetCellPx / cellDim;
  const cx = size / 2;
  const cy = size / 2;
  const t1len = Math.sqrt(t1[0] ** 2 + t1[1] ** 2) || 1;
  const t2len = Math.sqrt(t2[0] ** 2 + t2[1] ** 2) || 1;
  const nI = Math.ceil(size / (t1len * scale)) + 2;
  const nJ = Math.ceil(size / (t2len * scale)) + 2;
  const margin = targetCellPx * 2;

  for (let i = -nI; i <= nI; i++) {
    for (let j = -nJ; j <= nJ; j++) {
      const offX = (i * t1[0] + j * t2[0]) * scale + cx;
      const offY = (i * t1[1] + j * t2[1]) * scale + cy;

      for (const feature of features) {
        const base = featureBasePoints(feature);
        for (const pl of feature.placements) {
          const placed = applyPlacement(base, pl);
          const verts = placed.map(([x, y]) => [x * scale + offX, y * scale + offY]);
          if (verts.length < 3) continue;
          if (!verts.some(([x, y]) => x > -margin && x < size + margin && y > -margin && y < size + margin)) continue;

          ctx.beginPath();
          ctx.moveTo(verts[0][0], verts[0][1]);
          for (let k = 1; k < verts.length; k++) ctx.lineTo(verts[k][0], verts[k][1]);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  console.error(`PNG saved to: ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Load tiling — built-in name or path to XML
// ---------------------------------------------------------------------------

async function loadTiling(patternArg) {
  if (BUILT_IN_PATTERNS[patternArg]) return BUILT_IN_PATTERNS[patternArg];

  const absPath = resolve(process.cwd(), patternArg);
  if (!existsSync(absPath)) {
    const names = Object.keys(BUILT_IN_PATTERNS).join(', ');
    throw new Error(
      `Pattern "${patternArg}" not found.\n` +
      `Built-in patterns: ${names}\n` +
      `Or provide a path to a TiledPatternMaker XML file.`
    );
  }

  return parseTiling(absPath);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));

  if (!args.pattern) {
    console.error(
      'Usage: node generate-pattern.js --pattern <name|xml-path> [options]\n\n' +
      'Built-in patterns: ' + Object.keys(BUILT_IN_PATTERNS).join(', ') + '\n\n' +
      'Options:\n' +
      '  --size <px>       Canvas size (default: 1920)\n' +
      '  --output <path>   Output file (default: stdout for SVG)\n' +
      '  --opacity <0-1>   Line opacity (default: 0.06)\n' +
      '  --color <hex>     Line color (default: #c5a059 gold)\n' +
      '  --bg              Output full-page HTML\n' +
      '  --png             Output PNG (requires npm install canvas)\n'
    );
    process.exit(1);
  }

  const size = parseInt(args.size || '1920');
  const opacity = parseFloat(args.opacity || '0.06');
  const lineColor = args.color || PALETTE.gold;
  const outputPath = args.output || null;
  const bgMode = !!args.bg;
  const pngMode = !!args.png;

  loadTiling(args.pattern).then(async tiling => {
    if (pngMode) {
      if (!outputPath) {
        console.error('--output <path> is required for PNG output');
        process.exit(1);
      }
      await renderPNG(tiling, size, lineColor, opacity, outputPath);
      return;
    }

    const output = bgMode
      ? renderHTML(tiling, size, lineColor, opacity)
      : renderSVG(tiling, size, lineColor, opacity);

    if (outputPath) {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, output, 'utf8');
      console.error(`${bgMode ? 'HTML' : 'SVG'} saved to: ${outputPath}`);
    } else {
      process.stdout.write(output);
    }
  }).catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
