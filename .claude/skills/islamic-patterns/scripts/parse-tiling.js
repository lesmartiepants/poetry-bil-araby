#!/usr/bin/env node
/**
 * parse-tiling.js — Parse a TiledPatternMaker tiling XML and output JSON.
 *
 * Usage:
 *   node parse-tiling.js <path-to-tiling.xml>
 *
 * No npm dependencies required — uses Node.js built-ins only.
 *
 * Output JSON shape:
 * {
 *   name: string,
 *   t1: [x, y],
 *   t2: [x, y],
 *   features: [
 *     {
 *       type: "regular" | "polygon" | "edgepoly",
 *       sides: number | null,         // only for regular
 *       rotation: number,             // degrees (0 if not specified)
 *       scale: number,                // 1 if not specified
 *       points: [[x,y], ...] | null,  // for polygon/edgepoly
 *       placements: [
 *         { scale: number, rot: number, tx: number, ty: number }
 *         // OR matrix: [a,b,c,d,e,f] for old flat format
 *       ]
 *     }
 *   ],
 *   desc: string | null,
 *   auth: string | null,
 *   version: number | null
 * }
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Minimal XML parser (no dependencies)
// ---------------------------------------------------------------------------

/**
 * Very small recursive-descent XML parser sufficient for TiledPatternMaker files.
 * Returns a tree of { tag, attrs, children, text } nodes.
 */
export function parseXML(src) {
  let pos = 0;

  function skipWS() {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  }

  function parseComment() {
    const end = src.indexOf('-->', pos);
    if (end === -1) pos = src.length;
    else pos = end + 3;
  }

  function parsePI() {
    const end = src.indexOf('?>', pos);
    if (end === -1) pos = src.length;
    else pos = end + 2;
  }

  function parseAttrValue() {
    const quote = src[pos++];
    let val = '';
    while (pos < src.length && src[pos] !== quote) val += src[pos++];
    pos++; // closing quote
    return val
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
  }

  function parseName() {
    let name = '';
    while (pos < src.length && /[^\s=/><!]/.test(src[pos])) name += src[pos++];
    return name;
  }

  function parseAttrs() {
    const attrs = {};
    skipWS();
    while (pos < src.length && src[pos] !== '>' && src[pos] !== '/') {
      if (src[pos] === '?') break;
      const name = parseName();
      if (!name) { pos++; continue; }
      skipWS();
      if (src[pos] === '=') {
        pos++;
        skipWS();
        attrs[name] = parseAttrValue();
      } else {
        attrs[name] = true;
      }
      skipWS();
    }
    return attrs;
  }

  function parseNode() {
    skipWS();
    if (pos >= src.length) return null;

    if (src[pos] !== '<') {
      let text = '';
      while (pos < src.length && src[pos] !== '<') text += src[pos++];
      return text.trim() || null;
    }

    pos++; // consume '<'

    if (src.startsWith('!--', pos)) { pos += 3; parseComment(); return null; }
    if (src.startsWith('!', pos)) {
      while (pos < src.length && src[pos] !== '>') pos++;
      pos++;
      return null;
    }
    if (src[pos] === '?') { parsePI(); return null; }
    if (src[pos] === '/') return 'CLOSE';

    const tag = parseName();
    const attrs = parseAttrs();
    skipWS();

    if (src[pos] === '/') { pos += 2; return { tag, attrs, children: [], text: '' }; }
    if (src[pos] === '>') pos++;

    const children = [];
    let text = '';
    while (pos < src.length) {
      const child = parseNode();
      if (child === 'CLOSE') {
        while (pos < src.length && src[pos] !== '>') pos++;
        pos++;
        break;
      }
      if (child === null) continue;
      if (typeof child === 'string') text += child;
      else children.push(child);
    }

    return { tag, attrs, children, text: text.trim() };
  }

  skipWS();
  const nodes = [];
  while (pos < src.length) {
    const n = parseNode();
    if (n && n !== 'CLOSE') nodes.push(n);
  }
  return nodes.filter(n => n && typeof n === 'object');
}

export function findTag(node, tag) {
  if (!node || !node.children) return null;
  return node.children.find(c => c && c.tag === tag) || null;
}

export function findAllTags(node, tag) {
  if (!node || !node.children) return [];
  return node.children.filter(c => c && c.tag === tag);
}

export function textOf(node) {
  return node ? node.text || '' : '';
}

// ---------------------------------------------------------------------------
// Placement parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse old flat 6-number affine matrix "a,b,c,d,e,f"
 * The matrix maps [x,y] -> [a*x + b*y + c, d*x + e*y + f]
 */
function parseFlatPlacement(str) {
  const nums = str.trim().split(',').map(Number);
  if (nums.length !== 6) return null;
  const [a, b, c, d, e, f] = nums;
  const scale = Math.sqrt(a * a + d * d);
  const rot = Math.atan2(d, a) * 180 / Math.PI;
  return { scale, rot, tx: c, ty: f, matrix: nums };
}

/**
 * Parse new structured Placement element with <scale>, <rot>, <tranX>, <tranY>
 */
function parseStructuredPlacement(placementNode) {
  const scale = parseFloat(textOf(findTag(placementNode, 'scale')) || '1');
  const rot = parseFloat(textOf(findTag(placementNode, 'rot')) || '0');
  const tx = parseFloat(textOf(findTag(placementNode, 'tranX')) || '0');
  const ty = parseFloat(textOf(findTag(placementNode, 'tranY')) || '0');
  return { scale, rot, tx, ty };
}

function parsePlacement(placementNode) {
  if (!placementNode) return null;
  const text = placementNode.text && placementNode.text.trim();
  if (text && text.includes(',')) {
    return parseFlatPlacement(text);
  }
  return parseStructuredPlacement(placementNode);
}

// ---------------------------------------------------------------------------
// Point / edge parsing for edgepoly features
// ---------------------------------------------------------------------------

function parsePoints(featureNode) {
  const pointMap = {};

  function collectPoints(node) {
    if (!node || !node.children) return;
    for (const child of node.children) {
      if (child.tag === 'Point') {
        const id = child.attrs && child.attrs.id;
        if (id && child.text) {
          const [x, y] = child.text.split(',').map(Number);
          pointMap[id] = [x, y];
        }
      } else {
        collectPoints(child);
      }
    }
  }

  collectPoints(featureNode);
  return Object.keys(pointMap)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(id => pointMap[id]);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseTiling(xmlPath) {
  const src = readFileSync(xmlPath, 'utf8');
  const nodes = parseXML(src);

  const root = nodes.find(n => n.tag === 'Tiling');
  if (!root) throw new Error('No <Tiling> root element found in ' + xmlPath);

  const version = root.attrs && root.attrs.version ? parseInt(root.attrs.version) : null;

  const nameNode = findTag(root, 'Name');
  const t1Node = findTag(root, 'T1');
  const t2Node = findTag(root, 'T2');
  const descNode = findTag(root, 'Desc');
  const authNode = findTag(root, 'Auth');

  const parseVec = (node) => {
    if (!node || !node.text) return null;
    return node.text.split(',').map(Number);
  };

  const features = findAllTags(root, 'Feature').map(feat => {
    const type = feat.attrs && feat.attrs.type || 'unknown';
    const sides = feat.attrs && feat.attrs.sides ? parseInt(feat.attrs.sides) : null;
    const featureRot = feat.attrs && feat.attrs.rotation ? parseFloat(feat.attrs.rotation) : 0;
    const featureScale = feat.attrs && feat.attrs.scale ? parseFloat(feat.attrs.scale) : 1;

    let points = null;
    if (type === 'polygon' || type === 'edgepoly') {
      const rawPoints = findAllTags(feat, 'Point');
      if (rawPoints.length > 0) {
        points = rawPoints
          .filter(p => p.attrs && p.attrs.id && p.text)
          .map(p => p.text.split(',').map(Number));
      } else {
        points = parsePoints(feat);
      }
    }

    const placements = findAllTags(feat, 'Placement').map(parsePlacement).filter(Boolean);

    return { type, sides, rotation: featureRot, scale: featureScale, points, placements };
  });

  return {
    name: textOf(nameNode) || basename(xmlPath, '.xml'),
    t1: parseVec(t1Node),
    t2: parseVec(t2Node),
    features,
    desc: textOf(descNode) || null,
    auth: textOf(authNode) || null,
    version,
    sourceFile: xmlPath,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const xmlPath = process.argv[2];
  if (!xmlPath) {
    console.error('Usage: node parse-tiling.js <path-to-tiling.xml>');
    process.exit(1);
  }
  const absPath = resolve(process.cwd(), xmlPath);
  if (!existsSync(absPath)) {
    console.error('File not found: ' + absPath);
    process.exit(1);
  }
  try {
    const result = parseTiling(absPath);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Parse error:', e.message);
    process.exit(1);
  }
}
