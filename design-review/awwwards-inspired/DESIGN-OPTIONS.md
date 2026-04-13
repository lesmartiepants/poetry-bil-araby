# 🏆 Awwwards-Inspired Onboarding Design Variations

> 10 onboarding flow designs for Poetry بالعربي that leverage the **tag system** (62 tags, 6 types).
> Inspired by [meetsansara.com](https://www.meetsansara.com), [neednap.net](https://neednap.net/en/), and [AntoineW/AW-2025-Portfolio](https://github.com/AntoineW/AW-2025-Portfolio).

## Tag System Reference

The onboarding flow drives poem discovery via **3 pickers** mapped to the tag taxonomy:

| Picker | Tag Types | Count | Purpose |
|--------|-----------|-------|---------|
| **Mood** | `emotion` | 9 | فرح، كآبة، غضب، أمل، يأس، دهشة، فخر، وحدة، حنين |
| **Era** | `period` | 8 | الجاهلية → المعاصر (classical + modern portals) |
| **Topics** | `theme` | 12 | الحب، الشوق، الحزن، الطبيعة، الوطن، الروحانية، الحكمة، الحرية، الحرب، البحر، الخمر، المديح |

**Flow**: Splash → Arabic Reveal → English Reveal → Mood → Era → Topics → Tagged Poem

---

## Design 1: "Folio" ✅ BUILT

**Inspiration:** AW-2025-Portfolio typographic approach — clip-path reveals, split-text, editorial precision.

**Key Features:**
- Clip-path curtain reveals for each letter of "شِعر" in splash
- Film-grain Canvas noise overlay
- Magazine-editorial 3×3 mood grid with ink blot selection particles
- Timeline era picker with golden-rule vertical connectors
- Constellation-style topic map with SVG connection lines
- Tag-filtered poem result with "لأنك تحب" match indicator

**Libraries:** GSAP 3.12, Vanilla Canvas (film grain + particles)

**Specs:**
- Deep ink (#0a0a0f) + gold foil (#C5A059) palette
- Amiri for Arabic poetry, Reem Kufi for brand, Inter for labels
- Clip-path `inset()` transitions between phases
- 5-phase flow with bottom progress dots
- Skip button ("تخطى") persistent on all phases

---

## Design 2: "Luminara"

**Inspiration:** meetsansara.com — editorial luxury, generous whitespace, slow elegant transitions.

**Key Features:**
- Animated Canvas starfield splash with nebula glow blobs
- Islamic 8-pointed star SVG intro that expands and fades
- Soft 1.4s `ease-luxe` phase transitions (custom cubic-bezier)
- Elegant list-style pickers — each tag is a full-width row with Arabic label, English subtitle, and color dot
- Mood tags show as floating orbs with gentle parallax
- Era tags displayed as a horizontal scroll timeline with soft gradients
- Topics shown as editorial cards with large Arabic type

**Libraries:** GSAP 3.12, Canvas 2D (starfield), CSS custom easing

**Specs:**
- Near-black (#08080c) with warm cream (#F5F0E8) text, gold accents
- Slow transitions: 1.2–1.8s for every phase change
- Full-width list items (no grid) — one tag per row, generous padding
- Star SVG morphs between 8-pointed star and circle

---

## Design 3: "Surge"

**Inspiration:** neednap.net — kinetic energy, electric motion, blueprint aesthetic.

**Key Features:**
- Blueprint CSS grid background with electric lapis (#4F7CAC) scanning line
- Spring-bounce tag cell reveals staggered at 30–55ms intervals
- Streak-dot progress bar that pulses between phases
- Neon lapis glow on selected mood/topic states
- Mood tags as bouncing capsules with spring physics
- Era tags as horizontal cards with timeline ruler behind
- Topics as hexagonal grid cells with electric selection pulse

**Libraries:** GSAP 3.12 (spring ease, stagger), CSS Grid

**Specs:**
- Dark blueprint (#0d1117) with electric lapis (#4F7CAC) and gold sparks
- Fast transitions: 0.4–0.6s with spring overshoot
- Mono-weight Inter for all labels, Amiri for Arabic
- Blueprint grid lines visible behind all phases

---

## Design 4: "Desert Mirage"

**Inspiration:** Parallax desert journey — each tag category is a layer in the landscape.

**Key Features:**
- Multi-layer parallax dune splash (6 layers of sand + stars)
- Mood picker: emotions float as heat-shimmer distortions above sand
- Era picker: eras embedded in rock strata layers (geological timeline)
- Topic picker: oasis nodes scattered across desert map
- Day/night gradient shifts per phase (deep blue → sunset → sand)
- Sand particle Canvas that responds to user interaction

**Libraries:** GSAP 3.12 (ScrollTrigger parallax), Canvas 2D (sand + stars)

**Specs:**
- Gradient palette: #0B1120 (night) → #FF6B35 (sunset) → #E8D5B7 (sand)
- Amiri for floating desert text, Tajawal for waypoint labels
- Each phase is a "waypoint" in the desert journey
- Vertical scroll drives horizontal parallax

---

## Design 5: "Ink Bloom"

**Inspiration:** Japanese ink-wash minimalism meets Arabic calligraphy.

**Key Features:**
- Click-to-bloom ink drop selection mechanic
- Each mood/topic is a calligraphic form that bleeds when selected
- Era picker as horizontal ink scroll that unrolls progressively
- Minimalist white canvas that fills with selected tag ink marks
- Final poem appears from the accumulated ink pattern
- No borders, no cards — pure typography on white

**Libraries:** Canvas 2D (ink simulation), GSAP 3.12

**Specs:**
- Pure white (#FFFFFF) with deep sumi ink (#000000)
- Gold (#C5A059) only for the "Continue" action
- Amiri at calligraphic weight (700) for all Arabic
- Selection state = ink opacity (0.3 → 1.0)

---

## Design 6: "Constellation"

**Inspiration:** Star chart navigation — tags are celestial bodies.

**Key Features:**
- Three.js or Canvas star field background for all phases
- Mood picker: 9 emotion stars in a constellation pattern
- Connecting SVG lines form between selected moods
- Era picker: eras as planets along an orbital timeline
- Topic picker: 12 topic stars with magnitude (brightness) indicating popularity
- Selected tags form a unique "taste constellation" shown on result screen

**Libraries:** Three.js r160 or Canvas 2D, GSAP 3.12

**Specs:**
- Deep space (#050510) with warm starlight (#FFE5B4)
- Gold (#C5A059) for active constellation lines
- Each tag has a visual "magnitude" (size/brightness)
- Mouse parallax on star field, gyroscope on mobile

---

## Design 7: "Bauhaus Grid"

**Inspiration:** Swiss/Bauhaus design — pure geometric precision with Arabic soul.

**Key Features:**
- Strict 12-column grid for all picker layouts
- Color-block mood cells (each emotion gets its color from tag data)
- Timeline era picker using grid rows with typographic numbering
- Topic tiles as colored rectangles with monospace indices
- Geometric transitions: rotate/skew between phases
- No rounded corners — all sharp 90° angles

**Libraries:** GSAP 3.12 (Flip), CSS Grid + subgrid

**Specs:**
- Black (#000000) + red (#FF0000) + gold (#FFD700)
- Noto Kufi Arabic for geometric sans headers
- 8px grid baseline, mathematical spacing
- Each tag cell is exactly color-coded from tag taxonomy

---

## Design 8: "Breath"

**Inspiration:** meetsansara.com's meditative pacing — poetry needs silence.

**Key Features:**
- Breathing rhythm: elements appear/fade with 4-second inhale/exhale cycle
- One tag revealed at a time (swipe/tap to advance)
- Mood picker: each emotion fills the full viewport, one at a time
- Era picker: subtle timeline that grows from center
- Topic picker: words appear letter-by-letter with breathing cadence
- Ambient tonal shift per tag selection (CSS hue-rotate on background)

**Libraries:** GSAP 3.12 (stagger), CSS animation-delay chains

**Specs:**
- Warm dark (#0F0F0F) with cream text (#F5F0E8)
- Single tag per viewport for mood/era, grid for topics
- Haptic feedback on mobile (Vibration API)
- Transitions: 1.5s fade with ease-in-out-sine

---

## Design 9: "Mosaic"

**Inspiration:** Islamic geometric patterns — tags as tessellation tiles.

**Key Features:**
- Islamic tessellation layout fills viewport with tag tiles
- Each mood/topic is an octagonal or hexagonal tile
- Selection: tile glows and rotates slightly inward
- Era picker: tiles arranged chronologically along a horizontal band
- Connected tiles share edges (related tags = adjacent tiles)
- Final pattern formed by selected tags becomes a unique geometric composition

**Libraries:** GSAP 3.12 (Flip), CSS clip-path polygon, SVG tessellation

**Specs:**
- Islamic blue (#1B4B73) + gold (#C5A059) + ivory (#FFFFF0)
- Octagonal tiles with 4px gold stroke on selection
- Responsive: fewer tiles on mobile, same visual density
- CSS clip-path: polygon() for tile masks

---

## Design 10: "Cinema"

**Inspiration:** Full-screen vertical film reel — tags as cinematic credits.

**Key Features:**
- Cinematic letterboxing (16:9 bars top/bottom)
- Each mood appears as a full-screen title card with dramatic typography
- Era picker: dates scroll like film credits
- Topic picker: words fly in from edges with motion blur
- Film grain Canvas overlay on all phases
- Dramatic pause/snap points between tag categories

**Libraries:** GSAP 3.12 (snap, ScrollTrigger), Canvas 2D (film grain)

**Specs:**
- Cinematic black (#000000) with warm spotlight (#FFE5B4)
- Amiri at 8vw scale (massive, cinematic)
- 16:9 gold (#C5A059) letterbox bars
- Snap points every 100vh for dramatic pacing

---

## Comparison Matrix

| # | Design | Visual Style | Tag Integration | Motion | Mobile | Build Effort |
|---|--------|-------------|----------------|--------|--------|-------------|
| 1 | Folio | Editorial/typographic | ★★★★★ | ★★★★☆ | ★★★★☆ | Medium |
| 2 | Luminara | Luxury/minimal | ★★★★★ | ★★★☆☆ | ★★★★★ | Medium |
| 3 | Surge | Electric/kinetic | ★★★★★ | ★★★★★ | ★★★★☆ | Medium |
| 4 | Desert Mirage | Parallax/landscape | ★★★★☆ | ★★★★☆ | ★★★☆☆ | High |
| 5 | Ink Bloom | Calligraphic/zen | ★★★★☆ | ★★★★☆ | ★★★☆☆ | High |
| 6 | Constellation | Celestial/space | ★★★★★ | ★★★★★ | ★★★☆☆ | High |
| 7 | Bauhaus Grid | Geometric/Swiss | ★★★★★ | ★★★☆☆ | ★★★★★ | Low |
| 8 | Breath | Meditative/slow | ★★★★☆ | ★★★☆☆ | ★★★★★ | Low |
| 9 | Mosaic | Islamic/geometric | ★★★★★ | ★★★★☆ | ★★★★☆ | High |
| 10 | Cinema | Film/dramatic | ★★★★☆ | ★★★★★ | ★★★★★ | Medium |

---

## Recommended Build Order

1. **Folio** ← built (editorial typography, core patterns)
2. **Surge** (kinetic energy, reuses GSAP patterns)
3. **Luminara** (luxury feel, slow transitions)
4. **Bauhaus Grid** (CSS Grid showcase, fastest build)
5. **Cinema** (dramatic, shares GSAP+Canvas stack)
