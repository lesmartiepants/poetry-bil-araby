// Tile patterns from the canvas pattern library (patterns.json, built by
// scripts/build-patterns.mjs). One pattern per panel; the panel sets the size.
import { useId } from 'react';
import tiles from './patterns.json';

export type PatternName = keyof typeof tiles;
export type Tone = 'pom' | 'cob' | 'ver' | 'ind' | 'm';

type Variant = { ground: string; colours: string[] };
type Tile = { w: number; h: number; body: string; variants: Record<string, Variant> };

// Each colourway is a family: ground, its light tone and its deep tone.
const FAMILY: Record<Exclude<Tone, 'm'>, string[]> = {
  pom: ['#4A1620', '#C98A8A', '#2A0C12'],
  cob: ['#22406E', '#8FA7D6', '#142848'],
  ver: ['#2F6B5A', '#7FB8A4', '#1B4639'],
  ind: ['#141A33', '#8F9AD0', '#0B0F22'],
};

/** The pattern's own colourway for a tone, or its main one moved into that family. */
function colourway(tile: Tile, tone: Tone): Variant {
  const main = tile.variants.m ?? Object.values(tile.variants)[0];
  if (tone === 'm') return main;
  if (tile.variants[tone]) return tile.variants[tone];
  const from = Object.values(FAMILY).find((f) => f.includes(main.ground));
  if (!from) return main;
  const move = (c: string) => (from.includes(c) ? FAMILY[tone][from.indexOf(c)] : c);
  return { ground: move(main.ground), colours: main.colours.map(move) };
}

export const isPatternName = (n: string | undefined): n is PatternName => !!n && n in tiles;

export function patternGround(name: PatternName, tone: Tone = 'm') {
  return colourway(tiles[name] as Tile, tone).ground;
}

/**
 * Fills its positioned parent. `scale` sizes the tile as the mocks do (cards 0.7,
 * heroes 0.9–1). `scrim` keeps text readable: 'fade' darkens toward the bottom,
 * a number lays the ground over the tile at that opacity.
 */
export function Pattern({ name, tone = 'm', scale = 1, scrim }: { name: PatternName; tone?: Tone; scale?: number; scrim?: 'fade' | number }) {
  const uid = useId().replace(/:/g, '');
  const tile = tiles[name] as Tile;
  const { ground, colours } = colourway(tile, tone);
  const defs = tile.body.replace(/%id(\d+)/g, `${uid}p$1`).replace(/%(\d+)/g, (_, i) => colours[Number(i)]);
  return (
    <svg aria-hidden="true" className="pattern" width="100%" height="100%">
      <defs dangerouslySetInnerHTML={{ __html: defs }} />
      <rect width="100%" height="100%" fill={ground} />
      <g transform={`scale(${scale})`}>
        <rect width={`${100 / scale}%`} height={`${100 / scale}%`} fill={`url(#${uid}p0)`} />
      </g>
      {scrim === 'fade' && (
        <>
          <defs>
            <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ground} stopOpacity="0.45" />
              <stop offset="1" stopColor={ground} stopOpacity="0.92" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${uid}s)`} />
        </>
      )}
      {typeof scrim === 'number' && <rect width="100%" height="100%" fill={ground} opacity={scrim} />}
    </svg>
  );
}
