# Islamic Patterns — Foundation Branch

## What's here

### Generator
- `design-review/onboarding/islamic-patterns/generate.html`
  Interactive HTML tool for generating Islamic geometric patterns.
  Built during the onboarding-sprint to produce background textures.

### Poem-View Background Prototypes
- `design-review/onboarding/bg-option-3.html` — dark bg option 3
- `design-review/onboarding/bg-option-4.html` — dark bg option 4
- `design-review/onboarding/archive/backgrounds/bg-option-1.html` — original option 1
- `design-review/onboarding/archive/backgrounds/bg-option-2.html` — original option 2

### Reference Material
- `docs/design/TiledPatternMaker/` — TiledPatternMaker repo (open-source Islamic tiling tool)
- `docs/design/Islamic_Art_and_Geometric_Design_Activities_for_Learning.pdf` — geometric reference

## Refactor Plan

The bg-option prototypes were designed with approximate/placeholder geometric patterns. Now that the Islamic patterns generator (`generate.html`) is working and produces geometrically correct tessellations, the backgrounds need to be **rebuilt using outputs from the generator**.

### Next steps
1. Use `generate.html` to produce the target tessellation (8-pointed star preferred — matches sacred palette philosophy)
2. Export the SVG/CSS pattern
3. Rebuild each bg-option using the correct geometry at 3-5% opacity over `#0E0D10`
4. Test on mobile (pattern must be "felt before seen" — from sacred palette design philosophy)

## Related
- Sacred Palette design philosophy: `docs/design/sacred-palette-philosophy.html`
- Gold shimmer reference: `docs/design/shimmer-title-reference.html`
- PR#441 (onboarding-sprint) — original source of bg prototypes and generator
