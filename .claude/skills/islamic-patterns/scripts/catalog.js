#!/usr/bin/env node
/**
 * catalog.js — List all available tilings, designs, and templates from the
 * TiledPatternMaker library.
 *
 * Usage:
 *   node catalog.js [--json] [--root <path-to-TiledPatternMaker>]
 *
 * Options:
 *   --json    Output raw JSON instead of formatted table
 *   --root    Override the library root path
 *             (default: docs/design/TiledPatternMaker relative to cwd)
 *
 * No npm dependencies — uses Node.js built-ins only.
 *
 * Output sections:
 *   1. Tilings (media/tilings/original/)  — T1/T2 lattice + polygon types
 *   2. Designs (media/designs/original/)  — interlace/style data
 *   3. Templates (media/templates/)       — real-building named patterns
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, basename } from 'path';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') a.json = true;
    else if (argv[i] === '--root' && argv[i + 1]) { a.root = argv[++i]; }
  }
  return a;
}

// ---------------------------------------------------------------------------
// Lightweight XML attribute extractor (no full parse needed for catalog)
// ---------------------------------------------------------------------------

function extractAttr(xml, attr) {
  const m = new RegExp(`<${attr}[^>]*>([^<]*)</${attr}>`).exec(xml);
  return m ? m[1].trim() : null;
}

function extractFeatureTypes(xml) {
  const types = new Set();
  const sideNums = new Set();
  const re = /<Feature[^>]*type="([^"]*)"(?:[^>]*sides="(\d+)")?/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    types.add(m[1]);
    if (m[2]) sideNums.add(parseInt(m[2]));
  }
  return {
    types: [...types],
    sides: [...sideNums].sort((a, b) => a - b),
  };
}

// ---------------------------------------------------------------------------
// Scan a directory for XML files and extract basic info
// ---------------------------------------------------------------------------

function scanDirectory(dirPath, type) {
  if (!existsSync(dirPath)) return [];

  const xmlFiles = readdirSync(dirPath)
    .filter(f => f.endsWith('.xml'))
    .sort();

  return xmlFiles.map(file => {
    const filePath = join(dirPath, file);
    let xml = '';
    try {
      xml = readFileSync(filePath, 'utf8');
    } catch (_) {
      return { file, name: file, type, error: 'unreadable' };
    }

    const name = extractAttr(xml, 'Name') || basename(file, '.xml');
    const auth = extractAttr(xml, 'Auth');
    const rawDesc = extractAttr(xml, 'Desc');
    const desc = rawDesc
      ? (rawDesc.length > 80 ? rawDesc.slice(0, 77) + '...' : rawDesc)
      : null;
    const { types: featureTypes, sides } = extractFeatureTypes(xml);

    const entry = { file, name, type, featureTypes, polygonSides: sides };
    if (auth) entry.author = auth;
    if (desc) entry.desc = desc;

    return entry;
  });
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

function pad(str, len) {
  str = String(str || '');
  if (str.length > len) str = str.slice(0, len - 1) + '\u2026';
  return str.padEnd(len);
}

function printSection(title, entries) {
  const divider = '\u2500'.repeat(100);
  console.log('\n' + divider);
  console.log(`  ${title}  (${entries.length} files)`);
  console.log(divider);
  console.log(
    pad('File', 35) + '  ' +
    pad('Name', 28) + '  ' +
    pad('Polygon sides', 20) + '  ' +
    pad('Author', 20)
  );
  console.log('\u2500'.repeat(100));
  for (const e of entries) {
    const polyStr = e.polygonSides && e.polygonSides.length > 0
      ? e.polygonSides.map(s => `${s}-gon`).join(', ')
      : (e.featureTypes || []).join(', ') || '\u2014';
    console.log(
      pad(e.file, 35) + '  ' +
      pad(e.name, 28) + '  ' +
      pad(polyStr, 20) + '  ' +
      pad(e.author || '\u2014', 20)
    );
    if (e.desc) {
      console.log('  ' + ' '.repeat(35) + '  \u21b3 ' + e.desc);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

function summarize(tilings, designs, templates) {
  const allSides = new Set();
  for (const t of tilings) (t.polygonSides || []).forEach(s => allSides.add(s));

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Tilings:   ${tilings.length}`);
  console.log(`  Designs:   ${designs.length}`);
  console.log(`  Templates: ${templates.length}`);
  const sides = [...allSides].sort((a, b) => a - b).join(', ');
  console.log(`  Polygon types in tilings: ${sides}`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));

const defaultRoot = resolve(process.cwd(), 'docs/design/TiledPatternMaker');
const root = args.root ? resolve(process.cwd(), args.root) : defaultRoot;

if (!existsSync(root)) {
  console.error(
    `TiledPatternMaker library not found at: ${root}\n` +
    `Provide --root <path> or run from the project root.`
  );
  process.exit(1);
}

const tilings = scanDirectory(join(root, 'media/tilings/original'), 'tiling');
const designs = scanDirectory(join(root, 'media/designs/original'), 'design');
const templates = scanDirectory(join(root, 'media/templates'), 'template');

if (args.json) {
  console.log(JSON.stringify({ tilings, designs, templates }, null, 2));
} else {
  console.log('\nTiledPatternMaker Library Catalog');
  console.log('Root: ' + root);

  printSection('TILINGS  (media/tilings/original)', tilings);
  printSection('DESIGNS  (media/designs/original)', designs);
  printSection('TEMPLATES  (media/templates)', templates);

  summarize(tilings, designs, templates);

  console.log('\nTo parse a tiling XML:');
  console.log('  node .claude/skills/islamic-patterns/scripts/parse-tiling.js \\');
  console.log('    docs/design/TiledPatternMaker/media/tilings/original/<name>.xml\n');

  console.log('To generate a pattern SVG:');
  console.log('  node .claude/skills/islamic-patterns/scripts/generate-pattern.js \\');
  console.log('    --pattern star-cross --size 1920 --output out.svg\n');
}
