import { useRef, useEffect, useState, memo } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// Squoctogon tiling data — "Octogons hidden as squares" by Pierre Baillargeon
// Extracted verbatim from design-review/islamic-patterns/generate.html catalog
// Category: Irregular
// ────────────────────────────────────────────────────────────────────────────
const SQUOCTOGON = {
  t1: [2.732050807568887, 4.732050807568871],
  t2: [5.464101615137751, -1.554312234475219e-14],
  features: [
    {
      type: 'polygon',
      points: [
        [1.110223024625157e-16, 0.9999999999999999],
        [-0.9999999999999998, 1],
        [-1, 1.110223024625157e-16],
        [-1, -0.9999999999999998],
        [-2.775557561562891e-16, -1],
        [0.9999999999999996, -1],
        [0.9999999999999998, -1.110223024625157e-16],
        [0.9999999999999999, 0.9999999999999998],
      ],
      placements: [
        {
          type: 'matrix',
          a: -0.8660254037844387,
          b: 0.500000000000001,
          tx: 2.250127018922189,
          c: -0.500000000000001,
          d: -0.8660254037844387,
          ty: -0.466025403784446,
        },
        {
          type: 'matrix',
          a: 1,
          b: 2.275957200481571e-15,
          tx: -1.847949192431124,
          c: -2.275957200481571e-15,
          d: 1,
          ty: 1.899999999999999,
        },
        {
          type: 'matrix',
          a: -0.8660254037844388,
          b: -0.5000000000000001,
          tx: -0.4819237886466903,
          c: 0.5000000000000001,
          d: -0.8660254037844388,
          ty: -0.4660254037844442,
        },
      ],
    },
    {
      type: 'polygon',
      points: [
        [3.152050807568878, 4.032050807568876],
        [2.652050807568878, 3.166025403784438],
        [3.152050807568877, 2.877350269189625],
        [3.652050807568878, 3.166025403784437],
      ],
      placements: [
        {
          type: 'matrix',
          a: 1.732050807568879,
          b: -8.881784197001252e-16,
          tx: -4.575410531610058,
          c: 8.881784197001252e-16,
          d: 1.732050807568879,
          ty: -5.083716857408429,
        },
        {
          type: 'matrix',
          a: -0.8660254037844404,
          b: 1.5,
          tx: -2.43421852284165,
          c: -1.5,
          d: -0.8660254037844404,
          ty: 10.11993464005752,
        },
        {
          type: 'matrix',
          a: 1.000000000000001,
          b: -8.881784197001252e-16,
          tx: -2.267949192431128,
          c: 8.881784197001252e-16,
          d: 1.000000000000001,
          ty: -4.13205080756889,
        },
        {
          type: 'matrix',
          a: 0.8660254037844376,
          b: -1.500000000000003,
          tx: 4.202421753117172,
          c: 1.500000000000003,
          d: 0.8660254037844376,
          ty: -6.319934640057536,
        },
        {
          type: 'matrix',
          a: -1.732050807568877,
          b: -2.886579864025407e-15,
          tx: 6.343613761885571,
          c: 2.886579864025407e-15,
          d: -1.732050807568877,
          ty: 8.883716857408398,
        },
        {
          type: 'matrix',
          a: -0.4999999999999992,
          b: 0.8660254037844406,
          tx: -0.0317314097820276,
          c: -0.8660254037844406,
          d: -0.4999999999999992,
          ty: 2.913730669589458,
        },
        {
          type: 'matrix',
          a: 0.5000000000000024,
          b: -0.8660254037844383,
          tx: -0.9321161675113676,
          c: 0.8660254037844383,
          d: 0.5000000000000024,
          ty: -3.845781477158349,
        },
        {
          type: 'matrix',
          a: 0.8660254037844387,
          b: 1.500000000000001,
          tx: -7.89373066958947,
          c: -1.500000000000001,
          d: 0.8660254037844387,
          ty: 3.136217782649108,
        },
        {
          type: 'matrix',
          a: -1.000000000000001,
          b: 7.771561172376096e-16,
          tx: 1.304101615137748,
          c: -7.771561172376096e-16,
          d: -1.000000000000001,
          ty: 3.199999999999999,
        },
        {
          type: 'matrix',
          a: -0.5000000000000003,
          b: -0.866025403784439,
          tx: 4.951985447626398,
          c: 0.866025403784439,
          d: -0.5000000000000003,
          ty: -2.545781477158349,
        },
        {
          type: 'matrix',
          a: -0.8660254037844347,
          b: -1.500000000000001,
          tx: 9.661933899864962,
          c: 1.500000000000001,
          d: -0.8660254037844347,
          ty: 0.6637822173508621,
        },
        {
          type: 'matrix',
          a: 0.4999999999999993,
          b: 0.86602540378444,
          tx: -5.915833024919777,
          c: -0.86602540378444,
          d: 0.4999999999999993,
          ty: 1.613730669589469,
        },
      ],
    },
  ],
};

// ── Math helpers (ported from generate.html) ─────────────────────────────────

function applyMatrix(a, b, tx, c, d, ty, px, py) {
  return [a * px + b * py + tx, c * px + d * py + ty];
}

function applyPlacement(pts, p) {
  const { a, b, tx, c, d, ty } = p;
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

function buildTilingPolygons(tiling, canvasW, canvasH, zoom = 1) {
  const [t1x, t1y] = tiling.t1;
  const [t2x, t2y] = tiling.t2;

  const unitPolys = [];
  for (const feature of tiling.features) {
    const baseVerts = feature.points;
    if (!baseVerts || baseVerts.length < 3) continue;
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
  const rangeI = Math.ceil(Math.max(canvasW, canvasH) / (t1Len * scale)) + margin;
  const rangeJ = Math.ceil(Math.max(canvasW, canvasH) / (t2Len * scale)) + margin;

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
function computeSvgPath(w, h) {
  const polys = buildTilingPolygons(SQUOCTOGON, w, h, 1);
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

const SquoctogonBackground = memo(function SquoctogonBackground({
  darkMode,
  scrollY = 0,
  opacityScale = 1,
  colorOverride = '',
  parallaxFactor = 0.05,
}) {
  const svgRef = useRef(null);
  const [pathData, setPathData] = useState('');
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    const compute = () => {
      const parent = svgRef.current?.parentElement;
      const w = parent?.offsetWidth || window.innerWidth || 800;
      const h = parent?.offsetHeight || window.innerHeight || 600;
      if (w > 0 && h > 0) {
        // Generate pattern for a taller canvas so parallax never reveals a blank edge
        const tallH = h * (1 + PARALLAX_BUFFER_MULTIPLIER);
        setPathData(computeSvgPath(w, tallH));
        setSvgHeight(tallH);
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
  }, []);

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
