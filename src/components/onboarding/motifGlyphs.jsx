/**
 * Line-art glyphs for the imagery step, one per motif key.
 *
 * The motif question asks which IMAGES stay with a reader, so the options have
 * to be images. Everything is a 24x24 stroke drawing on `currentColor` with no
 * fills, so a tile can light its glyph by changing colour alone — no second
 * asset, no raster, and it stays legible at 34px on a phone.
 *
 * ## The size budget, which is what most of these got wrong first
 *
 * At 34px with a 1.3px stroke the usable field is about 26x26. Anything with
 * more than ~5 distinct strokes, or any gap narrower than ~1.5 stroke widths,
 * fills in and becomes a blob. Three elements is the working ceiling. Every
 * glyph in here that had to be redrawn broke that rule: a five-petal ring became
 * a lollipop, an outline camel became a shoe, a symmetric teardrop became a leaf.
 *
 * Two collisions also had to be designed out rather than drawn better. A plain
 * droplet is the same shape as a flame, so `tears` gets an eyelid over it and
 * `fire-light` is a flame with a notched shoulder and a leaning tip. And
 * `night` and `moon-stars` were two crescents
 * two tiles apart in one grid, distinguished only by four-point sparkles — the
 * "AI magic" mark. There is now exactly one crescent in the set.
 *
 * Keyed by the taxonomy value key. A key with no drawing falls back to a plain
 * ring rather than breaking the grid, so a motif added to the taxonomy renders
 * (unornamented) instead of throwing.
 */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const G = {
  // The one crescent in the set, over a horizon.
  night: (
    <>
      <path {...S} d="M16.8 13.4A6.4 6.4 0 0 1 8.9 5.5a6.8 6.8 0 1 0 7.9 7.9Z" />
      <path {...S} d="M3 20h18" opacity="0.45" />
    </>
  ),
  // Full disc plus two stars, so it cannot be confused with `night`.
  'moon-stars': (
    <>
      <circle {...S} cx="10.5" cy="13" r="5.4" />
      <path {...S} d="m18 4 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z" />
      <path {...S} d="m19.4 13.6.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z" opacity="0.7" />
    </>
  ),
  // الأطلال: the cold hearth. Three stones on a dune line. Vertical stubs of
  // wall always read as letterforms at this size (the first attempt read as
  // "An"), and the ring of stones is the more precise trope anyway.
  'desert-ruins': (
    <>
      <ellipse {...S} cx="7.6" cy="12.6" rx="2.7" ry="2.1" />
      <ellipse {...S} cx="15.3" cy="11.4" rx="2.4" ry="1.9" opacity="0.9" />
      <ellipse {...S} cx="12" cy="15.9" rx="2.9" ry="2.2" />
      <path {...S} d="M2.5 19.8c3.6-1.4 6-1.4 9.5 0s5.8 1.4 9.5-.8" opacity="0.75" />
    </>
  ),
  'sea-water': (
    <>
      <path {...S} d="M3 9c2.2-1.6 3.8-1.6 6 0s3.8 1.6 6 0 3.8-1.6 6 0" />
      <path {...S} d="M3 14c2.2-1.6 3.8-1.6 6 0s3.8 1.6 6 0 3.8-1.6 6 0" opacity="0.75" />
      <path {...S} d="M3 19c2.2-1.6 3.8-1.6 6 0s3.8 1.6 6 0 3.8-1.6 6 0" opacity="0.5" />
    </>
  ),
  // Four petals with real gaps between them, one leaf on one side only. A tight
  // five-petal ring filled in solid at 34px.
  'garden-flowers': (
    <>
      <path {...S} d="M12 3.4c1.7 1.2 1.7 3.1 0 4.3-1.7-1.2-1.7-3.1 0-4.3Z" />
      <path {...S} d="M15.9 5.9c.4 2-.9 3.4-2.9 3.3.4-2 1.7-3.1 2.9-3.3Z" opacity="0.9" />
      <path {...S} d="M8.1 5.9c1.2.2 2.5 1.3 2.9 3.3-2 .1-3.3-1.3-2.9-3.3Z" opacity="0.9" />
      <path {...S} d="M12 14.2c-1.7-1.2-1.7-3.1 0-4.3 1.7 1.2 1.7 3.1 0 4.3Z" opacity="0.8" />
      <path {...S} d="M12 13.6V21" />
      <path {...S} d="M12 18.2c-2.6 0-4-1.2-4.4-3.1 2.3-.5 3.8.6 4.4 3.1Z" />
    </>
  ),
  'wine-cup': (
    <>
      <path
        {...S}
        d="M7.5 4h9c-.3 3.6-1.1 5.8-2.2 6.8a3.4 3.4 0 0 1-4.6 0C8.6 9.8 7.8 7.6 7.5 4Z"
      />
      <path {...S} d="M12 12.4V18M8.6 20h6.8" />
      <path {...S} d="M8 7h8" opacity="0.5" />
    </>
  ),
  // Upright, with a crossguard. A thin diagonal line is an arrow no matter what
  // is hung on it; the guard is the stroke that makes a sword a sword.
  'sword-battle': (
    <>
      <path {...S} d="M12 2.4 9.8 6.2v7.4h4.4V6.2Z" />
      <path {...S} d="M6.6 13.6h10.8" />
      <path {...S} d="M12 13.6V19M9.9 21h4.2" opacity="0.9" />
    </>
  ),
  // One bird with a body, and a smaller pair trailing on a diagonal. Two equal
  // gull marks side by side just spell a tilde.
  birds: (
    <>
      <path {...S} d="M3.4 6.6q2.7 4.6 5.2.6" />
      <path {...S} d="M14.6 6.6q-2.7 4.6-5.2.6" />
      <path {...S} d="M9.2 7.2v2.4" />
      <path {...S} d="M14.6 15q1.7 2.8 3.2.4 1.5 2.4 3.2-.4" opacity="0.65" />
    </>
  ),
  // النار والضوء: an actual flame. It was a lamp, which is an object that
  // happens to hold fire rather than the thing the motif names. The left
  // shoulder carries a notch and the tip leans, because a symmetric convex
  // silhouette is a droplet — which is exactly what `tears` is.
  'fire-light': (
    <>
      <path
        {...S}
        d="M12 3.2c3.1 3.1 4.9 5.4 4.9 8.5a4.9 4.9 0 0 1-9.8 0c0-1.8.7-3.1 1.8-4.3.2 1 .8 1.7 1.6 2 .1-2.5.6-4.4 1.5-6.2Z"
      />
      <path {...S} d="M12 12.4c1.4 1.2 2 2 2 3a2 2 0 0 1-4 0c0-1 .6-1.8 2-3Z" opacity="0.75" />
    </>
  ),
  // An eyelid turns a droplet into a tear. Both drops fall on one diagonal so
  // they read as a sequence rather than a pair of objects.
  tears: (
    <>
      <path {...S} d="M4 8.4c2.4-3 5.6-4.4 9.6-3.2" />
      <path
        {...S}
        d="M11.4 10.4c1.8 2.6 2.9 4.3 2.9 5.5a2.9 2.9 0 1 1-5.8 0c0-1.2 1.1-2.9 2.9-5.5Z"
      />
      <path
        {...S}
        d="M17.6 15.4c1.1 1.7 1.8 2.8 1.8 3.5a1.8 1.8 0 1 1-3.6 0c0-.7.7-1.8 1.8-3.5Z"
        opacity="0.65"
      />
    </>
  ),
  // الرحلة والراحلة names the MOUNT, not the road. An outline camel needs ~48px
  // and collapsed into a shoe, so this was three dunes on a rule — but landscape
  // at 34px is indistinguishable from `desert-ruins` two rows up. A horse's head
  // in profile is the one silhouette that survives this size, which is why the
  // chess piece is drawn that way.
  journey: (
    <>
      <path
        {...S}
        d="M9.6 20.6c-.3-2.9.5-4.6 2-6 .9-.9 1.4-1.6 1.4-2.5 0-.7-.4-1.1-1-1.1-.7 0-1.2.5-1.7 1.3l-1.7-1c1-2.3 2.6-3.8 4.7-4.5l.7-2.4 1.6 2c2.3.8 3.6 2.9 3.6 5.9 0 2.7-.6 5.1-.8 8.3Z"
      />
      <path {...S} d="M14.6 7.7c1.3 1.2 2 2.9 2 5.1" opacity="0.5" />
      <circle cx="13.5" cy="9.7" r="0.55" fill="currentColor" stroke="none" />
    </>
  ),
  dawn: (
    <>
      <path {...S} d="M7 16a5 5 0 0 1 10 0" />
      <path
        {...S}
        d="M3 19.5h18M12 3.5v2.2M4.9 7.4l1.6 1.6M19.1 7.4l-1.6 1.6M2.5 12.6h2.2M19.3 12.6h2.2"
        opacity="0.7"
      />
    </>
  ),
};

const MotifGlyph = ({ motifKey, size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {G[motifKey] || <circle {...S} cx="12" cy="12" r="7" />}
  </svg>
);

export default MotifGlyph;
