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

writeFileSync(out, JSON.stringify(patterns));
console.log(`patterns.json: ${Object.keys(patterns).join(', ')}`);
