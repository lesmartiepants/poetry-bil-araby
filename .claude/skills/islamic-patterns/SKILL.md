---
name: islamic-patterns
description: Generate Islamic geometric patterns from the TiledPatternMaker library. Renders SVG/Canvas patterns, exports PNGs, creates full-screen HTML backgrounds.
user_invocable: true
---

# Islamic Patterns

Generate Islamic geometric patterns using the TiledPatternMaker library — parse tiling XMLs,
render SVG/Canvas patterns, export PNGs, or create full-screen HTML backgrounds for the app.

## Invocation

When the user runs `/islamic-patterns`, execute the following workflow.

## Phase 0: Ask What the User Wants

Present these options:

1. **Generate a specific pattern** — girih decagon, star-cross (4.8²), 3-8-12, 6-fold hex, Mexuar interlace, Ben Yusuf Madrasa, or any tiling by name
2. **Create a full-screen background HTML** — standalone HTML file for use in the onboarding flow
3. **Export a PNG** — render a pattern at specified resolution (1024 / 1920 / 2560 px)
4. **Browse available patterns** — list all tilings, designs, and templates from the library
5. **Parse a specific XML** — extract tiling data as JSON for custom use

Ask the user which option they want, then proceed.

## Library Location

All source data lives at `docs/design/TiledPatternMaker/media/` (relative to project root):

```
media/
  girih_shapes/       5 canonical girih tiles (gDecagon, gPentagon, gBowtie, gKite, gRhombus)
  tilings/original/   40+ tiling XMLs with T1/T2 translation vectors and Feature placements
  designs/original/   231 design XMLs with interlace/style data
  templates/          Named patterns from real buildings (Ben Yusuf Madrasa, Kharraqan, etc.)
  rendered/           Reference SVG outputs (Mexuar from Alhambra)
```

Scripts for parsing and generation live at `.claude/skills/islamic-patterns/scripts/`.

## App Color Palette

Always use these colors (never hardcode others without user request):

```
Background: #0d0d14
Gold:        #c5a059
Lapis:       #2a5a8c
Emerald:     #2d6b4a
Rust:        #8b4513
Text:        #e8dcc8
```

For background overlays use 3–8% opacity on lines/shapes so they don't overpower content.

## Phase 1: Browse / Catalog (Option 4)

Run the catalog script:

```bash
node .claude/skills/islamic-patterns/scripts/catalog.js
```

This scans all three media subdirectories and prints a formatted table of available patterns
with their polygon types and source files.

## Phase 2: Parse Tiling Data (Option 5 or as prep for rendering)

**Parse a tiling XML:**
```bash
node .claude/skills/islamic-patterns/scripts/parse-tiling.js \
  docs/design/TiledPatternMaker/media/tilings/original/4.8^2.xml
```

**Parse a girih shape XML:**
```bash
node .claude/skills/islamic-patterns/scripts/parse-girih.js \
  docs/design/TiledPatternMaker/media/girih_shapes/gDecagon.xml
```

Both output JSON to stdout. Pipe to a file if needed: `... > /tmp/tiling.json`

### TiledPatternMaker XML Formats

**Old tiling format** (flat placement matrix — 6 numbers: a,b,c,d,e,f → 2×3 affine):
```xml
<Tiling>
  <T1>2,0</T1>
  <T2>0.618,1.902</T2>
  <Feature type="regular" sides="10">
    <Placement>1,0,0,0,1,0</Placement>  <!-- identity: scale=1, rot=0, tx=0, ty=0 -->
  </Feature>
</Tiling>
```

**New tiling format** (version="6", named sub-elements):
```xml
<Tiling version="6">
  <T1>23.74,13.71</T1>
  <T2>0,27.41</T2>
  <Feature type="regular" sides="12" rotation="0" scale="1">
    <Placement>
      <scale>6.464</scale>
      <rot>-30</rot>        <!-- degrees -->
      <tranX>-7.91</tranX>
      <tranY>-13.71</tranY>
    </Placement>
  </Feature>
  <Feature type="edgepoly" ...>
    <Line><Point id="1">x,y</Point><Point id="2">x,y</Point></Line>
    ...
    <Placement>...</Placement>
  </Feature>
</Tiling>
```

**Girih shape format** (regular polygon):
```xml
<Poly name="gDecagon" type="regular" sides="10">
  <tx>0.514</tx><ty>0.727</ty><scale>1</scale><rot>-0.314</rot>  <!-- rot in radians -->
</Poly>
```

**Girih shape format** (irregular, explicit points):
```xml
<Poly name="gBowtie">
  <Line><Point id="1">x,y</Point><Point id="2">x,y</Point></Line>
  ...
  <tx>...</tx><ty>...</ty><scale>...</scale><rot>...</rot>
</Poly>
```

## Phase 3: Generate a Pattern (Options 1–3)

**Generate SVG or PNG:**
```bash
node .claude/skills/islamic-patterns/scripts/generate-pattern.js \
  --pattern star-cross \
  --size 1920 \
  --output design-review/onboarding/islamic-patterns/star-cross-1920.svg
```

**Show construction geometry** (polygon edges at low opacity, useful for debugging):
```bash
node .claude/skills/islamic-patterns/scripts/generate-pattern.js \
  --pattern hexagon-6 --show-construction --output /tmp/hex-debug.svg
```

**Override skip parameter** (controls star shape):
```bash
node .claude/skills/islamic-patterns/scripts/generate-pattern.js \
  --pattern star-cross --d 3 --output /tmp/star-d3.svg
```

Available built-in pattern names:
- `girih-decagon` — 10-fold decagon tiling
- `star-cross` — 4.8² octagon + square (Seal of Solomon source)
- `3-8-12` — triangles, octagons, dodecagons (Alcazar of Seville variant)
- `hexagon-6` — 6-fold hex
- `mexuar` — Mexuar interlace from Alhambra (use rendered/Mexuar1B.svg as reference)
- `ben-yusuf` — Ben Yusuf Madrasa pattern
- Any tiling name from the library (e.g. `10`, `12.18`, `4.6.12`)

**The existing interactive generator** (browser-based, 6 patterns):
```
design-review/onboarding/islamic-patterns/generate.html
```
Open in browser to preview patterns interactively and download PNGs.

## Phase 4: Create Full-Screen Background HTML

When the user wants a full-screen background for the onboarding flow:

1. Parse the requested tiling to get T1, T2, and feature placements
2. Generate an HTML file with an inline `<canvas>` or `<svg>` that tiles the pattern
3. Use the app palette at 5% opacity for lines on the dark background (`#0d0d14`)
4. Output to `design-review/onboarding/islamic-patterns/<name>-bg.html`

The pattern should:
- Fill 100vw × 100vh
- Animate subtly (optional: slow rotation or scale pulse at 0.02% per frame)
- Export well to PNG at 1920px

## Pattern Rendering Algorithm

Polygons are **construction geometry** (invisible guide lines). The visible Islamic star pattern
comes entirely from the midpoint-connection algorithm. This matches TiledPatternMaker's pipeline
in `src/model/motifs/star.cpp` and `src/model/motifs/radial_motif.h`.

### TiledPatternMaker Pipeline

```
Tiling XML → Feature placements → Midpoints → d-skip rays → Ray intersections → Star segments → Style/color
```

### Step-by-Step

1. **Parse tiling XML**: extract T1, T2 translation vectors and all Feature placements.
2. **Compute polygon vertices**: for each `Feature type="regular"` with N sides:
   ```
   vertex[k] = (cos(2πk/N + rot), sin(2πk/N + rot)) * scale + (tx, ty)
   ```
   For `edgepoly`/`polygon` features: use explicit `<Point>` coordinates.
   Apply placement transform: scale → rotate by rot° → translate by (tranX, tranY).
3. **Edge midpoints**: for each polygon, compute the midpoint of every edge:
   ```
   midpoint[i] = (vertex[i] + vertex[(i+1) % N]) / 2
   ```
4. **d-skip rays**: for each midpoint[i], draw a ray toward midpoint[(i+d) % N].
   Extend the ray 3× past the target to guarantee intersections with crossing rays.
   The `d` (skip) parameter controls star shape — see table below.
5. **Ray intersections**: for each ray i, find its nearest intersection with any
   non-adjacent ray j (skip j == i, j == i±1). Use the parametric line formula:
   ```
   solve: p1 + t*(p2−p1) = p3 + u*(p4−p3)
   denom = (p2x−p1x)*(p4y−p3y) − (p2y−p1y)*(p4x−p3x)
   t = ((p3x−p1x)*(p4y−p3y) − (p3y−p1y)*(p4x−p3x)) / denom
   u = ((p3x−p1x)*(p2y−p1y) − (p3y−p1y)*(p2x−p1x)) / denom
   valid when 0 ≤ t ≤ 1 AND 0 ≤ u ≤ 1
   ```
6. **Visible segments**: each star arm is `midpoint[i] → nearest_intersection`.
   These are emitted as SVG `<line>` elements (not `<path>` polygons).
7. **Tile**: repeat the unit cell at integer multiples of T1 and T2 across the viewport.
   Clip to canvas bounds + one-cell margin.
8. **Construction lines** (optional, `--show-construction`): polygon edges rendered at
   0.08 opacity for debugging. Never shown in production output.

### The `d` Skip Parameter

| Polygon (N sides) | d | Result              |
|-------------------|---|---------------------|
| 4 (square)        | 1 | cross / plus        |
| 5 (pentagon)      | 2 | 5-pointed star      |
| 6 (hexagon)       | 2 | Star of David       |
| 8 (octagon)       | 2 | 8-pointed star      |
| 10 (decagon)      | 3 | 10-pointed star     |
| 12 (dodecagon)    | 4 | 12-pointed star     |
| N > 12            | ⌊N/4⌋ | generalised star |
| N ≤ 12, others    | ⌊N/3⌋ | generalised star |

Override with `--d <value>` to experiment. For example `--d 3` on an octagon gives
a tighter 8-pointed star with more angular arms.

### Parse Script Output and Construction Geometry

`parse-tiling.js` and `parse-girih.js` output **construction geometry** — the raw polygon
placements from the XML. These are inputs to the rendering algorithm, not the final visual.
The parsed `features` array contains:
- `type: "regular"` — polygon side count and placement; used to compute vertices → midpoints → star
- `type: "edgepoly"` / `type: "polygon"` — explicit point coordinates; construction-only filler tiles

Do not draw feature outlines as the final pattern. Run them through the midpoint-connection
algorithm (steps 3–6 above) to produce the correct Islamic star motif.

## Output Location

Default output: `design-review/onboarding/islamic-patterns/`
User can specify any path as `--output`.

## Key Notes

- The `canvas` npm package is optional — scripts default to SVG output (plain Node.js, no deps)
- The `parse-tiling.js` and `parse-girih.js` scripts have zero npm dependencies
- `generate-pattern.js` outputs SVG by default; PNG requires `canvas` (`npm install canvas`)
- The flat 6-number Placement format (`a,b,c,d,e,f`) is the older schema;
  the named `<scale>/<rot>/<tranX>/<tranY>` format is version 6+
- Rotation in girih shape XMLs is in **radians**; in tiling version-6 XMLs it is in **degrees**
- `--show-construction` renders polygon edges at 0.08 opacity — useful for debugging but
  never used in production; the polygon outlines are construction guides, not the final pattern
- `--d <skip>` overrides the star skip parameter; auto-defaults are set per polygon type
  (see the d parameter table in the Rendering Algorithm section)
- The `edgepoly` and `polygon` feature types are filler tiles (construction only) —
  they do not generate star motifs, only `regular` polygons do
