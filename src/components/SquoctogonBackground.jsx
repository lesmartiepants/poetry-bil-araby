import { useRef, useEffect, useState, memo } from 'react';
import { ISLAMIC_PATTERNS } from '../constants/islamicPatterns.js';

// Maximum total polygon count before capping the tiling grid range.
// Dense aperiodic tilings (e.g. Girih Inflation) have 200+ polygons per unit cell;
// tiling them across a full viewport grid would produce 90K+ polygons and crash the browser.
const MAX_TILING_POLYS = 30000;

// ── Math helpers (ported from generate.html) ─────────────────────────────────

function applyMatrix(a, b, tx, c, d, ty, px, py) {
  return [a * px + b * py + tx, c * px + d * py + ty];
}

function applyPlacement(pts, p) {
  let a, b, tx, c, d, ty;
  if (p.type === 'srt') {
    // SRT format: {scale, rot (degrees), tranX, tranY}
    const rotRad = (p.rot * Math.PI) / 180;
    const s = p.scale;
    a = s * Math.cos(rotRad);
    b = -s * Math.sin(rotRad);
    c = s * Math.sin(rotRad);
    d = s * Math.cos(rotRad);
    tx = p.tranX;
    ty = p.tranY;
  } else {
    // Matrix format: {a, b, tx, c, d, ty}
    ({ a, b, tx, c, d, ty } = p);
  }
  return pts.map(([px, py]) => applyMatrix(a, b, tx, c, d, ty, px, py));
}

function bbox(pts) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

function defaultD(n) {
  if (n <= 4) return 1;
  if (n <= 8) return 2;
  if (n <= 10) return 3;
  return Math.floor(n / 4);
}

function starMotifsFromPoly(verts) {
  const n = verts.length;
  if (n < 3) return [];

  const mids = verts.map((v, i) => {
    const next = verts[(i + 1) % n];
    return [(v[0] + next[0]) / 2, (v[1] + next[1]) / 2];
  });

  if (n === 3) {
    const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
    const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
    return [
      [mids[0][0], mids[0][1], cx, cy],
      [mids[1][0], mids[1][1], cx, cy],
      [mids[2][0], mids[2][1], cx, cy],
    ];
  }

  if (n === 4) {
    const [m0x, m0y] = mids[0];
    const [m1x, m1y] = mids[1];
    const [m2x, m2y] = mids[2];
    const [m3x, m3y] = mids[3];
    const center = lineIntersect(m0x, m0y, m2x, m2y, m1x, m1y, m3x, m3y);
    if (center) {
      const [cx, cy] = center;
      return [
        [m0x, m0y, cx, cy],
        [m2x, m2y, cx, cy],
        [m1x, m1y, cx, cy],
        [m3x, m3y, cx, cy],
      ];
    }
    return [
      [m0x, m0y, m2x, m2y],
      [m1x, m1y, m3x, m3y],
    ];
  }

  const d = defaultD(n);
  const segments = [];
  const FAR = 20;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [mx0, my0] = mids[i];
    const [ax0, ay0] = mids[(i + d) % n];
    const fwdFarX = ax0 + (ax0 - mx0) * FAR;
    const fwdFarY = ay0 + (ay0 - my0) * FAR;
    const [mx1, my1] = mids[j];
    const [bx1, by1] = mids[(j - d + n) % n];
    const bwdFarX = bx1 + (bx1 - mx1) * FAR;
    const bwdFarY = by1 + (by1 - my1) * FAR;
    const pt = lineIntersect(mx0, my0, fwdFarX, fwdFarY, mx1, my1, bwdFarX, bwdFarY);
    if (pt) {
      segments.push([mx0, my0, pt[0], pt[1]]);
      segments.push([mx1, my1, pt[0], pt[1]]);
    }
  }

  return segments;
}

// Generate vertices for a regular n-gon with unit circumradius, optionally rotated
function regularPolygon(n, rotDeg = 0) {
  const verts = [];
  const rotRad = (rotDeg * Math.PI) / 180;
  for (let k = 0; k < n; k++) {
    const angle = (2 * Math.PI * k) / n + rotRad;
    verts.push([Math.cos(angle), Math.sin(angle)]);
  }
  return verts;
}

function buildTilingPolygons(tiling, canvasW, canvasH, zoom = 1) {
  const [t1x, t1y] = tiling.t1;
  const [t2x, t2y] = tiling.t2;

  const unitPolys = [];
  for (const feature of tiling.features) {
    let baseVerts;
    if (feature.sides) {
      baseVerts = regularPolygon(feature.sides, 0);
    } else if (feature.points && feature.points.length >= 3) {
      baseVerts = feature.points;
    } else {
      continue;
    }
    for (const placement of feature.placements) {
      unitPolys.push(applyPlacement(baseVerts, placement));
    }
  }
  if (unitPolys.length === 0) return [];

  const t1Len = Math.sqrt(t1x * t1x + t1y * t1y);
  const t2Len = Math.sqrt(t2x * t2x + t2y * t2y);
  const cellSize = Math.max(t1Len, t2Len);
  const targetFit = Math.min(canvasW, canvasH) * 0.9;
  const numCellsTarget = 3.5 / zoom;
  const scale = cellSize > 0 ? targetFit / (cellSize * numCellsTarget) : zoom;

  const margin = 3;
  // Cap total polygons to prevent crashes on dense aperiodic tilings (e.g. Girih Inflation)
  let rangeI = Math.ceil(Math.max(canvasW, canvasH) / (t1Len * scale)) + margin;
  let rangeJ = Math.ceil(Math.max(canvasW, canvasH) / (t2Len * scale)) + margin;
  const cells = (2 * rangeI + 1) * (2 * rangeJ + 1);
  if (cells * unitPolys.length > MAX_TILING_POLYS) {
    const maxCells = Math.max(1, Math.floor(MAX_TILING_POLYS / unitPolys.length));
    const rangeMax = Math.max(0, Math.floor((Math.sqrt(maxCells) - 1) / 2));
    rangeI = Math.min(rangeI, rangeMax);
    rangeJ = Math.min(rangeJ, rangeMax);
  }

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

  const allPts = allPolys.flat();
  const b = bbox(allPts);
  const offX = canvasW / 2 - b.cx * scale;
  const offY = canvasH / 2 - b.cy * scale;

  return allPolys.map((poly) => poly.map(([px, py]) => [px * scale + offX, py * scale + offY]));
}

// Build a single SVG <path> `d` string containing every star-motif segment
function computeSvgPath(tiling, w, h) {
  const polys = buildTilingPolygons(tiling, w, h, 1);
  if (polys.length === 0) return '';

  const areas = polys.map((poly) => {
    let a = 0;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % n];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  });
  const maxArea = areas.reduce((m, a) => Math.max(m, a), 0);
  const distinctSides = new Set(polys.map((p) => p.length)).size;
  const areaThreshold = maxArea > 1 && distinctSides >= 3 ? maxArea * 0.15 : 0;

  const parts = [];
  for (let pi = 0; pi < polys.length; pi++) {
    if (areas[pi] < areaThreshold) continue;
    const segs = starMotifsFromPoly(polys[pi]);
    for (const [x1, y1, x2, y2] of segs) {
      parts.push(`M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`);
    }
  }
  return parts.join(' ');
}

// Extra pattern height generated below the viewport so the tiling never
// disappears as the SVG is translated upward during parallax scrolling.
// Buffer = 2× viewport height → covers up to scrollY ≈ 6.7× viewport before
// the pattern edge would ever be reached.
const PARALLAX_BUFFER_MULTIPLIER = 2;

// When topThirdOnly is true, the SVG only covers the top 30% of the viewport
// (the ~33% visible band plus fade buffer) and fades out via a CSS mask gradient.
const TOP_THIRD_HEIGHT_FACTOR = 0.3; // generate pattern up to 30% of vh

const DEFAULT_PATTERN = '8.5';

const SquoctogonBackground = memo(function SquoctogonBackground({
  darkMode,
  scrollY = 0,
  opacityScale = 1,
  colorOverride = '',
  parallaxFactor = 0.05,
  patternName = DEFAULT_PATTERN,
  topThirdOnly = false,
}) {
  const svgRef = useRef(null);
  const [pathData, setPathData] = useState('');
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    const tiling = ISLAMIC_PATTERNS[patternName] || ISLAMIC_PATTERNS[DEFAULT_PATTERN];
    const compute = () => {
      const parent = svgRef.current?.parentElement;
      const w = parent?.offsetWidth || window.innerWidth || 800;
      const h = parent?.offsetHeight || window.innerHeight || 600;
      if (w > 0 && h > 0) {
        if (topThirdOnly) {
          // Only render the top portion; gradient mask handles the fade
          const partialH = h * TOP_THIRD_HEIGHT_FACTOR;
          setPathData(computeSvgPath(tiling, w, partialH));
          setSvgHeight(partialH);
        } else {
          // Generate pattern for a taller canvas so parallax never reveals a blank edge
          const tallH = h * (1 + PARALLAX_BUFFER_MULTIPLIER);
          setPathData(computeSvgPath(tiling, w, tallH));
          setSvgHeight(tallH);
        }
      }
    };

    compute();

    let ro;
    const parent = svgRef.current?.parentElement;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(compute);
      if (parent) ro.observe(parent);
    }
    window.addEventListener('resize', compute);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [patternName, topThirdOnly]);

  const baseStrokeColor = darkMode ? '#4a7cc9' : '#2e5090';
  const baseStrokeOpacity = darkMode ? 0.154 : 0.105;
  const strokeColor = colorOverride || baseStrokeColor;
  const strokeOpacity = Math.min(1, Math.max(0, baseStrokeOpacity * opacityScale));
  const parallaxY = -(scrollY * parallaxFactor);

  return (
    <svg
      ref={svgRef}
      className="absolute pointer-events-none"
      aria-hidden="true"
      style={{
        zIndex: 0,
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: svgHeight > 0 ? svgHeight : '100%',
        transform: `translateY(${parallaxY.toFixed(1)}px)`,
        willChange: 'transform',
        // Fade the pattern to transparent at the bottom edge (top-third mode)
        maskImage: topThirdOnly
          ? 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)'
          : undefined,
        WebkitMaskImage: topThirdOnly
          ? 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)'
          : undefined,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeOpacity={strokeOpacity}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
});

export default SquoctogonBackground;
