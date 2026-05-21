#!/usr/bin/env node
/**
 * Parse TiledPatternMaker XML catalog into JSON for the Islamic pattern generator.
 *
 * Handles two Placement formats:
 *   Inline: a,b,tx,c,d,ty  (2x3 affine matrix)
 *   Tagged: <scale>/<rot>/<tranX>/<tranY> sub-elements
 *
 * Feature types:
 *   regular  – regular n-gon (sides attribute)
 *   polygon  – explicit Point children (raw coords)
 *   edgepoly – same as polygon, just with Line wrappers
 *   Tile     – alternate element name (same sub-structure as Feature)
 */

const fs   = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────────────

// The worktree lives in .claude/worktrees/onboarding-sprint; docs/ is in main repo root.
const MAIN_REPO = '/Users/siraj.farageibm.com/Github/poetry-bil-araby';
const MEDIA = path.join(MAIN_REPO, 'docs/design/TiledPatternMaker/media');
const TILINGS_DIR     = path.join(MEDIA, 'tilings/original');
const GIRIH_DIR       = path.join(MEDIA, 'girih_shapes');
const TEMPLATES_DIR   = path.join(MEDIA, 'templates');
const OUT_JSON        = path.join(__dirname, 'catalog.json');

// ─── Tiny XML parser helpers ──────────────────────────────────────────────────

/**
 * Very lightweight XML tag extractor.
 * Returns the inner text of the first matching tag (non-greedy).
 */
function getTagText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m  = xml.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Returns an array of inner-html strings for every occurrence of <tag ...>...</tag>.
 */
function getAllTags(xml, tag) {
  const re = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    results.push({ attrs: m[1] || '', inner: m[2] });
  }
  return results;
}

/**
 * Get attribute value from an attrs string like ' type="regular" sides="6"'.
 */
function getAttr(attrs, name) {
  const re = new RegExp(`${name}="([^"]*)"`, 'i');
  const m  = attrs.match(re);
  return m ? m[1] : null;
}

/**
 * Parse a "x,y" string into [x, y] floats.
 */
function parseVec2(str) {
  const parts = str.trim().split(',');
  return [parseFloat(parts[0]), parseFloat(parts[1])];
}

// ─── Placement parsers ────────────────────────────────────────────────────────

/**
 * Parse either placement format into a normalized object:
 *   { a, b, tx, c, d, ty }  — inline matrix
 *   { scale, rot, tranX, tranY }  — or scale/rot form
 *
 * We keep both forms distinct so the renderer can choose.
 * We normalize to { type: 'matrix'|'srt', ... }.
 */
function parsePlacement(placementStr) {
  placementStr = placementStr.trim();

  // Tagged form: has child elements
  if (placementStr.includes('<scale>') || placementStr.includes('<rot>')) {
    const scale = getTagText(placementStr, 'scale');
    const rot   = getTagText(placementStr, 'rot');
    const tranX = getTagText(placementStr, 'tranX');
    const tranY = getTagText(placementStr, 'tranY');
    return {
      type : 'srt',
      scale: parseFloat(scale  ?? '1'),
      rot  : parseFloat(rot    ?? '0'),
      tranX: parseFloat(tranX  ?? '0'),
      tranY: parseFloat(tranY  ?? '0'),
    };
  }

  // Inline form: "a,b,tx,c,d,ty"  (6 comma-separated numbers)
  const nums = placementStr.split(',').map(parseFloat);
  if (nums.length === 6) {
    const [a, b, tx, c, d, ty] = nums;
    // Convert the 2x3 affine matrix to scale/rot/trans
    // Column 0 = [a, c] is the x-axis vector → scale = length, rot = atan2
    const scale = Math.sqrt(a * a + c * c);
    const rot   = Math.atan2(c, a) * (180 / Math.PI); // degrees
    return {
      type : 'matrix',
      a, b, tx, c, d, ty,
      // also pre-computed srt for convenience
      scale,
      rot,
      tranX: tx,
      tranY: ty,
    };
  }

  return null;
}

// ─── Point resolvers (for edgepoly / Line-based shapes) ──────────────────────

/**
 * Given the inner XML of a Feature/Poly that uses <Line><Point> format,
 * return an ordered array of [x,y] vertices.
 */
function resolveLinePoints(xml) {
  const points = {};
  const order  = [];

  // Collect all <Point id="N">x,y</Point>
  const idRe = /<Point\s+id="(\d+)">([^<]+)<\/Point>/gi;
  let m;
  while ((m = idRe.exec(xml)) !== null) {
    points[m[1]] = parseVec2(m[2]);
  }

  // Collect ordered references from <Line> elements
  const lineRe = /<Line>([\s\S]*?)<\/Line>/gi;
  while ((m = lineRe.exec(xml)) !== null) {
    const lineXml = m[1];
    // First point in line (either id or reference)
    const firstId  = lineXml.match(/<Point\s+id="(\d+)">/);
    const firstRef = lineXml.match(/<Point\s+reference="(\d+)"\s*\/>/);
    const firstKey = firstId ? firstId[1] : (firstRef ? firstRef[1] : null);
    if (firstKey && !order.includes(firstKey)) order.push(firstKey);

    // Second point (id or reference after first)
    const allIds  = [...lineXml.matchAll(/<Point\s+id="(\d+)">/g)].map(x => x[1]);
    const allRefs = [...lineXml.matchAll(/<Point\s+reference="(\d+)"\s*\/>/g)].map(x => x[1]);
    const all     = [allIds[0], allIds[1], allRefs[0], allRefs[1]].filter(Boolean);
    // Second distinct point
    const second = all.find(k => k !== firstKey);
    if (second && !order.includes(second)) order.push(second);
  }

  // If we didn't get all points via lines, add any remaining
  for (const k of Object.keys(points)) {
    if (!order.includes(k)) order.push(k);
  }

  return order.map(k => points[k]).filter(Boolean);
}

/**
 * For simple <Point>x,y</Point> elements (no id/reference), return array of [x,y].
 */
function parseRawPoints(xml) {
  const re = /<Point>([^<]+)<\/Point>/gi;
  const pts = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    pts.push(parseVec2(m[1]));
  }
  return pts;
}

// ─── Parsers for each file type ───────────────────────────────────────────────

/**
 * Parse a tiling XML and return a structured object.
 */
function parseTiling(xml, filename) {
  const name = getTagText(xml, 'Name') || path.basename(filename, '.xml');
  const t1   = parseVec2(getTagText(xml, 'T1') || '1,0');
  const t2   = parseVec2(getTagText(xml, 'T2') || '0,1');
  const desc = getTagText(xml, 'Desc') || '';
  const auth = getTagText(xml, 'Auth') || '';

  // Both <Feature> and <Tile> tags carry geometry
  const featureTags = [
    ...getAllTags(xml, 'Feature'),
    ...getAllTags(xml, 'Tile'),
  ];

  const features = [];

  for (const { attrs, inner } of featureTags) {
    const type  = getAttr(attrs, 'type') || 'polygon';
    const sides = parseInt(getAttr(attrs, 'sides') ?? '0', 10) || null;

    // Collect placements
    const placements = [];

    // Tagged placements (Placement with sub-elements)
    const taggedRe = /<Placement>([\s\S]*?)<\/Placement>/gi;
    let m;
    while ((m = taggedRe.exec(inner)) !== null) {
      const p = parsePlacement(m[1]);
      if (p) placements.push(p);
    }

    // Inline placements (Placement with just text)
    const inlineRe = /<Placement>([0-9eE.,+\- ]+)<\/Placement>/gi;
    while ((m = inlineRe.exec(inner)) !== null) {
      const p = parsePlacement(m[1]);
      if (p) {
        // Only add if not already added (avoid double-counting tagged ones)
        const alreadyAdded = placements.some(
          ep => ep.type === 'matrix' &&
                Math.abs(ep.tx - p.tx) < 1e-9 &&
                Math.abs(ep.ty - p.ty) < 1e-9
        );
        if (!alreadyAdded) placements.push(p);
      }
    }

    // Get polygon points (raw <Point>x,y</Point>)
    let points = parseRawPoints(inner);

    // If Line-based (edgepoly or has <Line> elements), resolve those
    if (inner.includes('<Line>') && points.length === 0) {
      points = resolveLinePoints(inner);
    }

    features.push({
      type    : type === 'edgepoly' ? 'polygon' : type,
      sides   : type === 'regular' ? (sides || 6) : null,
      points  : points.length > 0 ? points : null,
      placements,
    });
  }

  return { name, t1, t2, desc, auth, features };
}

/**
 * Parse a girih shape XML.
 */
function parseGirihShape(xml, filename) {
  // Root element: <Poly name="..." type="regular" sides="N">
  const nameMatch = xml.match(/<Poly[^>]+name="([^"]+)"/i);
  const typeMatch = xml.match(/<Poly[^>]+type="([^"]+)"/i);
  const sidesMatch= xml.match(/<Poly[^>]+sides="([^"]+)"/i);

  const name  = nameMatch  ? nameMatch[1]            : path.basename(filename, '.xml');
  const ptype = typeMatch  ? typeMatch[1]             : 'irregular';
  const sides = sidesMatch ? parseInt(sidesMatch[1])  : null;

  const tx    = parseFloat(getTagText(xml, 'tx')    ?? '0');
  const ty    = parseFloat(getTagText(xml, 'ty')    ?? '0');
  const scale = parseFloat(getTagText(xml, 'scale') ?? '1');
  const rot   = parseFloat(getTagText(xml, 'rot')   ?? '0'); // radians

  let points = null;
  if (ptype !== 'regular') {
    points = resolveLinePoints(xml);
    if (points.length === 0) {
      points = parseRawPoints(xml);
    }
  }

  return {
    name,
    type: ptype === 'regular' ? 'regular' : 'irregular',
    sides,
    points,
    tx, ty, scale,
    rot: rot * (180 / Math.PI), // store as degrees for consistency
  };
}

/**
 * Parse a template XML — just store the lines/circles for reference rendering.
 * Templates are construction guides, not tilings.
 */
function parseTemplate(xml, filename) {
  const name = path.basename(filename, '.xml');

  // Extract lines: each line is "x1,y1,x2,y2"
  const lines = [];
  const lineRe = /<line>([^<]+)<\/line>/gi;
  let m;
  while ((m = lineRe.exec(xml)) !== null) {
    const nums = m[1].trim().split(',').map(parseFloat);
    if (nums.length >= 4) {
      lines.push([nums[0], nums[1], nums[2], nums[3]]);
    }
  }

  // Extract circles: <circle radius="r" centreX="cx" centreY="cy" />
  const circles = [];
  const circleRe = /<circle[^>]+>/gi;
  while ((m = circleRe.exec(xml)) !== null) {
    const r  = parseFloat(m[0].match(/radius="([^"]+)"/)?.[1]  ?? '1');
    const cx = parseFloat(m[0].match(/centreX="([^"]+)"/)?.[1] ?? '0');
    const cy = parseFloat(m[0].match(/centreY="([^"]+)"/)?.[1] ?? '0');
    circles.push({ r, cx, cy });
  }

  // Infer group from filename
  let group = 'Other';
  const base = name.toLowerCase();
  if (base.includes('benyusuf') || base.includes('ben yusuf')) group = 'Ben Yusuf Madrasa';
  else if (base.includes('kharraqan'))                           group = 'Kharraqan';
  else if (base.includes('broug'))                              group = 'Broug';
  else if (base.includes('talai') || base.includes("al-salih")) group = "Mosque of al-Salih Tala'i";
  else if (base.includes('tomb') || base.includes('jalal'))     group = 'Tomb of Jalal al-Din';
  else if (base.includes('hank'))                               group = 'Hank';

  return { name, group, lines, circles };
}

// ─── Categorize tilings ───────────────────────────────────────────────────────

/**
 * Determine the category of a tiling based on the polygon types in its features.
 */
function categorizeTiling(tiling) {
  const sideSets = new Set();
  for (const f of tiling.features) {
    if (f.type === 'regular' && f.sides) {
      sideSets.add(f.sides);
    }
  }

  // Mixed if multiple regular polygon types
  if (sideSets.size > 1) {
    const maxSides = Math.max(...sideSets);
    if (maxSides >= 12)      return 'Dodecagonal+';
    if (maxSides >= 10)      return 'Decagonal';
    if (maxSides >= 8)       return 'Octagonal';
    if (maxSides >= 6)       return 'Hexagonal';
    if (maxSides >= 5)       return 'Pentagonal';
    return 'Mixed';
  }

  const [s] = [...sideSets];
  if (!s) {
    // irregular polygon only — guess from name / point count
    const name = tiling.name.toLowerCase();
    if (name.includes('penrose') || name.includes('girih'))  return 'Pentagonal';
    if (name.includes('square') || name.includes('4'))       return 'Square';
    return 'Irregular';
  }
  if (s === 3)  return 'Triangular';
  if (s === 4)  return 'Square';
  if (s === 5)  return 'Pentagonal';
  if (s === 6)  return 'Hexagonal';
  if (s === 8)  return 'Octagonal';
  if (s === 10) return 'Decagonal';
  if (s === 12) return 'Dodecagonal+';
  if (s >= 14)  return 'Dodecagonal+';
  return 'Mixed';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function readDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.xml'))
    .map(f => ({ file: f, xml: fs.readFileSync(path.join(dir, f), 'utf-8') }));
}

console.log('Parsing tilings…');
const tilings = readDir(TILINGS_DIR).map(({ file, xml }) => {
  try {
    const t = parseTiling(xml, file);
    t.category = categorizeTiling(t);
    return t;
  } catch (e) {
    console.warn(`  WARN: ${file}: ${e.message}`);
    return null;
  }
}).filter(Boolean);
console.log(`  ${tilings.length} tilings parsed`);

console.log('Parsing girih shapes…');
const girihShapes = readDir(GIRIH_DIR).map(({ file, xml }) => {
  try {
    return parseGirihShape(xml, file);
  } catch (e) {
    console.warn(`  WARN: ${file}: ${e.message}`);
    return null;
  }
}).filter(Boolean);
console.log(`  ${girihShapes.length} girih shapes parsed`);

console.log('Parsing templates…');
const templates = readDir(TEMPLATES_DIR).map(({ file, xml }) => {
  try {
    return parseTemplate(xml, file);
  } catch (e) {
    console.warn(`  WARN: ${file}: ${e.message}`);
    return null;
  }
}).filter(Boolean);
console.log(`  ${templates.length} templates parsed`);

// ─── Print category breakdown ─────────────────────────────────────────────────

const cats = {};
for (const t of tilings) {
  cats[t.category] = (cats[t.category] || 0) + 1;
}
console.log('\nTiling categories:');
for (const [cat, count] of Object.entries(cats).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

const tplGroups = {};
for (const t of templates) {
  tplGroups[t.group] = (tplGroups[t.group] || 0) + 1;
}
console.log('\nTemplate groups:');
for (const [g, count] of Object.entries(tplGroups).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${g}: ${count}`);
}

// ─── Write output ─────────────────────────────────────────────────────────────

const catalog = { tilings, girihShapes, templates };
fs.writeFileSync(OUT_JSON, JSON.stringify(catalog, null, 2));
console.log(`\nWrote ${OUT_JSON}`);
console.log(`  tilings: ${tilings.length}, girih: ${girihShapes.length}, templates: ${templates.length}`);
