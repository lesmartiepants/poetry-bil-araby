// Generates src/design-system/patterns.json from the canvas pattern library
// (design-review/design-refresh/canvas/Pat*.dc.html), so panels draw the same tiles.
// Each pattern keeps one body with its colours numbered (%0, %1, …) and every
// colourway as a list of colours plus the ground under the tile.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const canvas = new URL('../../design-review/design-refresh/canvas/', import.meta.url);
const out = new URL('../src/design-system/patterns.json', import.meta.url);

const PATTERN = /<pattern\b[^>]*>[\s\S]*?<\/pattern>/g;
const HEX = /#[0-9A-Fa-f]{6}/g;
const patterns = {};

for (const file of readdirSync(canvas).filter((f) => /^Pat[A-Z].*\.dc\.html$/.test(f) && f !== 'PatIntro.dc.html').sort()) {
  const name = file.slice(3, -8);
  const html = readFileSync(new URL(file, canvas), 'utf8');
  const all = html.match(PATTERN) ?? [];
  // The tile is the pattern a full-panel rect fills with; anything it references is a helper.
  const tiles = all.filter((p) => {
    const id = p.match(/id="([^"]+)"/)[1];
    return new RegExp(`<rect[^>]*fill="#[0-9A-Fa-f]{6}"[^>]*></rect><rect[^>]*fill="url\\(#${id}\\)"`).test(html);
  });
  if (!tiles.length) continue; // drawn as one picture, not a repeating tile
  const variants = {};
  let shape;
  for (const tile of tiles) {
    const id = tile.match(/id="([^"]+)"/)[1];
    const key = id.slice(id.indexOf(`Pat${name}`) + name.length + 3) || 'm';
    const helpers = [...tile.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    const defs = [...helpers.map((h) => all.find((p) => p.includes(`id="${h}"`)) ?? ''), tile].join('');
    const colours = [...new Set(defs.match(HEX) ?? [])];
    const ground = html.match(new RegExp(`<rect[^>]*fill="(#[0-9A-Fa-f]{6})"[^>]*></rect><rect[^>]*fill="url\\(#${id}\\)"`))[1];
    let body = defs.replace(HEX, (c) => `%${colours.indexOf(c)}`);
    [id, ...helpers].forEach((h, i) => { body = body.replaceAll(`"${h}"`, `"%id${i}"`).replaceAll(`#${h})`, `#%id${i})`); });
    if (!shape) {
      const [, w, h] = tile.match(/width="([\d.]+)" height="([\d.]+)"/);
      shape = { w: Number(w), h: Number(h), body };
    }
    if (body === shape.body) variants[key] = { ground, colours };
  }
  patterns[name.toLowerCase()] = { ...shape, variants };
}

// Pajarita (Tonight's hero) is drawn as loose paths, not a tile. Every path is one
// bow-tie on a 40 × 69.28 lattice (rows staggered by 20), so rebuild the tile from
// the first path, with copies on every side so nothing is clipped at the edges.
{
  const hero = readFileSync(new URL('NTonight.dc.html', canvas), 'utf8');
  const d = hero.match(/<path d="(M-?[\d.]+ -?[\d.]+ Q[^"]+)" fill="#3A7D69"/)[1];
  const [x0, y0] = d.match(/M(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
  const shift = (dx, dy) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${(Number(x) - x0 + dx).toFixed(2)} ${(Number(y) - y0 + dy).toFixed(2)}`);
  const W = 40, H = 69.28;
  const copies = [];
  for (const [rowX, rowY] of [[0, H / 2], [20, H]]) {
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) copies.push(`<path d="${shift(rowX + dx, rowY + dy)}" fill="%1"/>`);
  }
  patterns.pajarita = {
    w: W, h: H,
    body: `<pattern id="%id0" width="${W}" height="${H}" patternUnits="userSpaceOnUse">${copies.join('')}</pattern>`,
    variants: {
      m: { ground: '#2F6B5A', colours: ['#2F6B5A', '#3A7D69'] },
      pom: { ground: '#4A1620', colours: ['#4A1620', '#5A2230'] },
      cob: { ground: '#22406E', colours: ['#22406E', '#2D4E80'] },
      ind: { ground: '#141A33', colours: ['#141A33', '#1E2646'] },
    },
  };
}

writeFileSync(out, JSON.stringify(patterns));
console.log(`patterns.json: ${Object.keys(patterns).join(', ')}`);
