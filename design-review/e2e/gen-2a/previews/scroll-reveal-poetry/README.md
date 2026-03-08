# Scroll Reveal Poetry — Design Explorations

Three scroll-driven animation approaches for presenting Arabic poetry, inspired by [45r.jp/ja/indigo-hakusho/](https://45r.jp/ja/indigo-hakusho/).

## Designs

### V1 — Horizontal Scroll (`scroll-reveal-v1.html`)
Vertical scroll input converts to horizontal content movement. Poems reveal as you traverse a wide horizontal strip. Closest to the 45r.jp reference.

**Techniques:** Lerp scroll engine, multi-layer parallax (0.2x/0.5x/1.5x), line-by-line verse reveal, background color interpolation, nav dots with click-to-jump, keyboard navigation.

### V2 — Depth Layers + Clip-Path (`scroll-reveal-v2.html`)
Vertical scroll with geometric mask reveals. Each poem hides behind an expanding shape (8-pointed star, Islamic arch, circle) that grows as you scroll. Five parallax depth layers.

**Techniques:** CSS `clip-path` driven by scroll progress, IntersectionObserver, 5-layer z-depth parallax, CSS-only floating particles, color chapter transitions.

### V3 — Three.js 3D WebGL (`scroll-reveal-v3.html`)
Camera flies along an 18-point CatmullRom spline through geometric chambers. Each chamber contains a poem rendered on floating text planes with wireframe geometry and particle systems.

**Techniques:** Three.js r128, CatmullRomCurve3 camera path, CanvasTexture for Arabic text, wireframe tunnel geometry, 4 particle systems (930+ particles), dynamic fog color, post-processing overlays (vignette + film grain).

## Poems Featured

All three designs use the same classical Arabic poetry:

| Poet | Opening Line | Theme |
|------|-------------|-------|
| Al-Mutanabbi | على قدرِ أهلِ العزمِ تأتي العزائمُ | Ambition & resolve |
| Abu Tammam | السيفُ أصدقُ أنباءً من الكُتُبِ | Valor & truth |
| Imru' al-Qais | قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ | Nostalgia & memory |

## How to View

```bash
open design-review/e2e/gen-2a/previews/scroll-reveal-poetry/VISUAL-COMPARISON.html
# Or open any individual file directly in a browser
```

## Continuation Notes

### What's Ready
- All 3 variants are functional self-contained HTML files
- V2 has been through one round of UX fixes (scroll distance reduction, reveal threshold tuning)
- V1 had a direction fix (RTL layout conflict resolved)

### Next Steps
- **Pick a winner** — review all 3, choose primary direction
- **Add vertical controls** — port the VC strip (translation, transliteration, text size, settings) from the design system spec
- **Add horizontal action bar** — shuffle, save, listen, share controls
- **Connect to app** — adapt the chosen design into the main `app.jsx` as a new theme/mode
- **Refine animations** — tune scroll distances, parallax speeds, reveal timing based on user testing
- **Mobile optimization** — dedicated touch gesture handling, responsive breakpoints

### Agent for Future Work
Use `.claude/agents/scroll-animation-designer.md` — it documents all the scroll techniques, color palettes, and team workflow patterns used to create these designs.

## Inspiration & Reference

**Primary reference:** [45r.jp/ja/indigo-hakusho/](https://45r.jp/ja/indigo-hakusho/) — A Japanese brand storytelling site about indigo dye. Key techniques extracted from its source code:

- **Horizontal scroll from vertical input** via Lenis smooth scroll library + AlpineJS state management
- **Scene-based camera path system** — `data-cam-path` attributes map scroll ranges (e.g., `1000_1600`) to scene transitions
- **Multi-layer cloud parallax** — `data-parax` elements with configurable x/y offsets and delays, cloud images at varying speeds
- **Sticky text containers** (`.sentence-box`) with colored backgrounds that reveal as you scroll into them
- **Vertical Japanese typography** (`writing-mode: vertical-rl`) — we adapted this concept for RTL Arabic
- **3D perspective transforms** — `perspective: 1500px` + `rotateX(60deg)` for the bookcover opening effect
- **Wide section widths** (1000px-4000px per scene) creating a long horizontal journey
- **Text reveal animations** (`.c-text-anim`) triggered by scroll position thresholds

The site was fetched via `curl` and its HTML structure + CSS patterns were analyzed to extract these techniques, then adapted for Arabic poetry with our own aesthetic.

---

## Key Learnings for Scroll Animation Work

### Agent Workflow
- **One agent = one complete file.** Splitting HTML/CSS/JS across agents creates coordination failures. The file is the natural unit of work.
- **Give agents the complete spec** — exact colors (hex), content (full poem text), animation technique, output path. "Just build it" prevents analysis paralysis.
- **Simpler techniques complete faster.** Clip-path reveals (V2) completed on first try; custom scroll engines (V1) and Three.js (V3) needed respawns with clearer prompts.

### Scroll UX Defaults
- **Section heights: start at 150vh, not 300vh.** Agents default to too much scroll distance. Content should feel dense, not empty.
- **Reveals should be immediate.** Start clip-paths and text at 0-5% section progress, not 20%+.
- **Parallax layer opacity: 0.25 minimum.** Agents default to 0.10-0.15 which is invisible. Double it.
- **Test by actually scrolling.** The most common failure is "too much empty space between content."

### RTL + Scroll Layouts
- **Never use `dir="rtl"` on `<html>` for scroll-driven layouts.** It inverts `translateX` behavior. Keep layout in LTR (`direction: ltr` on viewport), apply `direction: rtl` only on text containers.
- `flex-direction: row-reverse` + `dir="rtl"` creates a double-reversal that breaks scroll math.

### Three.js Prototyping
- Define the complete camera path (all control points) upfront — agents can build geometry around it.
- Arabic text via `CanvasTexture` works well — set `ctx.direction = 'rtl'` and `ctx.textAlign = 'center'`.
- Fog color transitions create effective atmosphere changes between poem chambers.

## Technical Reference

| Technique | Key Pattern | Used In |
|-----------|------------|---------|
| Horizontal scroll | `wheel` → `translateX` with lerp | V1 |
| Clip-path reveals | `clip-path: polygon/circle/ellipse` driven by scroll % | V2 |
| 3D camera path | `CatmullRomCurve3.getPointAt(progress)` | V3 |
| Parallax | Layers at 0.1x-1.5x scroll speed | V1, V2 |
| Text reveal | Staggered `.is-visible` based on scroll threshold | All |
| Color chapters | RGB lerp between section palettes | All |
| Particles | CSS `@keyframes float` with randomized custom properties | V2 |
| Particles (3D) | `THREE.Points` with `BufferGeometry` | V3 |
