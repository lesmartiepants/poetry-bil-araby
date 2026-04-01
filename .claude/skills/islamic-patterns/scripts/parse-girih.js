#!/usr/bin/env node
/**
 * parse-girih.js — Parse a TiledPatternMaker girih shape XML and output JSON.
 *
 * Usage:
 *   node parse-girih.js <path-to-girih-shape.xml>
 *
 * No npm dependencies — uses Node.js built-ins only.
 *
 * Output JSON shape:
 * {
 *   name: string,
 *   type: "regular" | "irregular",
 *   sides: number | null,   // only for regular polygons
 *   tx: number,             // global translation X
 *   ty: number,             // global translation Y
 *   scale: number,
 *   rot: number,            // radians (girih XMLs use radians, not degrees)
 *   rotDeg: number,         // same rotation in degrees for convenience
 *   vertices: [[x,y], ...], // computed vertex coordinates
 *   rawPoints: [[x,y], ...] // for irregular: the explicit polygon outline points
 * }
 *
 * For regular polygons the vertices are generated from the formula:
 *   vertex[k] = ( cos(2πk/n + rot) * scale + tx,
 *                 sin(2πk/n + rot) * scale + ty )
 *
 * For irregular polygons (gBowtie, gKite, gRhombus) the rawPoints are taken
 * from the <Line><Point> elements and the global tx/ty/scale/rot transform is
 * also extracted. The vertices array returns the transformed points.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { fileURLToPath } from 'url';
import { parseXML, findTag, textOf } from './parse-tiling.js';

// ---------------------------------------------------------------------------
// Regular polygon vertex generator
// ---------------------------------------------------------------------------

export function regularPolygonVertices(n, scale, rotRad, tx, ty) {
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

// ---------------------------------------------------------------------------
// Apply transform to a set of points: scale → rotate → translate
// ---------------------------------------------------------------------------

export function transformPoints(points, scale, rotRad, tx, ty) {
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  return points.map(([x, y]) => [
    (x * cosR - y * sinR) * scale + tx,
    (x * sinR + y * cosR) * scale + ty,
  ]);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseGirih(xmlPath) {
  const src = readFileSync(xmlPath, 'utf8');
  const nodes = parseXML(src);

  const root = nodes.find(n => n.tag === 'Poly');
  if (!root) throw new Error('No <Poly> root element found in ' + xmlPath);

  const name = root.attrs && root.attrs.name || basename(xmlPath, '.xml');
  const type = root.attrs && root.attrs.type || 'irregular';
  const sides = root.attrs && root.attrs.sides ? parseInt(root.attrs.sides) : null;

  const tx = parseFloat(textOf(findTag(root, 'tx')) || '0');
  const ty = parseFloat(textOf(findTag(root, 'ty')) || '0');
  const scale = parseFloat(textOf(findTag(root, 'scale')) || '1');
  const rot = parseFloat(textOf(findTag(root, 'rot')) || '0'); // radians
  const rotDeg = rot * 180 / Math.PI;

  let rawPoints = [];
  let vertices = [];

  if (type === 'regular' && sides) {
    vertices = regularPolygonVertices(sides, scale, rot, tx, ty);
  } else {
    // Irregular: collect explicit Point coordinates from <Line> elements
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
    collectPoints(root);

    rawPoints = Object.keys(pointMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(id => pointMap[id]);

    vertices = transformPoints(rawPoints, scale, rot, tx, ty);
  }

  return {
    name,
    type: type === 'regular' ? 'regular' : 'irregular',
    sides,
    tx, ty, scale,
    rot,      // radians
    rotDeg,   // degrees (convenience)
    vertices,
    rawPoints: type !== 'regular' ? rawPoints : null,
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
    console.error('Usage: node parse-girih.js <path-to-girih-shape.xml>');
    process.exit(1);
  }
  const absPath = resolve(process.cwd(), xmlPath);
  if (!existsSync(absPath)) {
    console.error('File not found: ' + absPath);
    process.exit(1);
  }
  try {
    const result = parseGirih(absPath);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Parse error:', e.message);
    process.exit(1);
  }
}
