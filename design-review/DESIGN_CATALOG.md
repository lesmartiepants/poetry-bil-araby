# Design Catalog - Poetry Bil-Araby

Consolidated design explorations from PRs #11, #50, and #51 for review and iteration.

## Interactive Review

Open `review.html` in a browser for an interactive review experience with:
- Feature/Category dropdown navigation
- Component type switching (Splash / Walkthrough / Main App / Controls)
- Option selector within each component
- Keyboard shortcuts for quick navigation
- Side panel with feedback notes from Round 1

## Design Flow Architecture

```
[Splash Screen] ──> [Walkthrough] ──> [Main App]
     │                    │                │
     │   (4-step tour)    │   (reading     │
     │                    │    experience)  │
     └── Vertical Controls Bar ────────────┘
```

## Feature Matrix

| # | Feature | Splash | Walkthrough | Main App | Controls | Source |
|---|---------|--------|-------------|----------|----------|--------|
| 1 | Particle Field | 3 options | -- | -- | -- | PR #11 |
| 5 | Zen Minimalism | 2 options | -- | -- | -- | PR #11 |
| 7 | Ink Calligraphy | 1 option | -- | -- | -- | PR #11 |
| 8 | Ancient Manuscript | 3 options | -- | -- | -- | PR #11 |
| 9 | Light & Shadow | 2 options | -- | -- | -- | PR #11 |
| L | Celestial Lens | -- | -- | 1 option | -- | PR #51 |
| M | Calligraphic Minimal | -- | -- | 1 option | -- | PR #51 |
| N | Bento Atlas | -- | -- | 1 option | -- | PR #51 |
| O | Desert Horizon | -- | -- | 1 option | -- | PR #51 |
| P | Ink Mono | -- | -- | 1 option | -- | PR #51 |
| T | Mosaic Tiles | -- | -- | 1 option | -- | PR #51 |
| U | Scroll Story | -- | -- | 1 option | -- | PR #51 |
| -- | Vertical Controls | -- | -- | -- | 5 options | PR #50 |

**Total: 13 features, 22 design options across 3 component types + controls**

---

## Splash Screen Designs (PR #11)

### 1. Particle Field
Interactive particle system with fluid motion.

| Option | Name | Description | Preview |
|--------|------|-------------|---------|
| 1 | Refined Particles | Improved hierarchy with larger title and reduced particle density | `splash/particles/previews/option-1-refined-particles.html` |
| 2 | Gold Mystical | Rich gold palette with Arabic poetry heritage aesthetic | `splash/particles/previews/option-2-gold-mystical.html` |
| 3 | Minimal Constellation | Sparse, intentional design with connected particle patterns | `splash/particles/previews/option-3-minimal-constellation.html` |

**Feedback highlights:**
- Love the slow animation and button animation
- Missing brand logo/fonts from original
- Gold palette and glow button are favorites
- Minimal constellation enter button is cool

### 5. Zen Minimalism
Pure simplicity and calligraphic elegance.

| Option | Name | Description | Preview |
|--------|------|-------------|---------|
| 1 | Zen Refined | Pure minimalism with expressive calligraphy | `splash/zen/previews/option-1-refined.html` |
| 2 | Haiku Style | Poetic minimalism with haiku-inspired spacing | `splash/zen/previews/option-2-haiku.html` |

**Feedback highlights:**
- Add zen effect (smoke animation like light/dark theme)
- Bring back brand title exactly from particles original
- Both options liked but need original branding

### 7. Ink Calligraphy
Traditional ink brush and Arabic letterforms.

| Option | Name | Description | Preview |
|--------|------|-------------|---------|
| 3 | Live Calligraphy | Animated brush stroke revealing calligraphy in real-time | `splash/ink/previews/option-3-live-calligraphy.html` |

**Feedback highlights:**
- Arabic rendering needs fixing
- Letter-by-letter highlight effect is great
- Must happen right-to-left, feel continuous not chopped

### 8. Ancient Manuscript
Aged parchment with classical ornaments.

| Option | Name | Description | Preview |
|--------|------|-------------|---------|
| 1 | Ornate Islamic | Rich Islamic illumination with gold leaf details | `splash/manuscript/previews/option-1-ornate-islamic.html` |
| 2 | Codex Spine | Book spine perspective with leather-bound aesthetics | `splash/manuscript/previews/option-2-codex-spine.html` |
| 3 | Scroll & Seal | Unfurling scroll with wax seal authenticity | `splash/manuscript/previews/option-3-scroll-seal.html` |

**Feedback highlights:**
- Original unrolling concept was better - polish it
- Codex needs better copy, word choice, spacing
- Scroll needs to look like real paper, not digital

### 9. Light & Shadow
Dramatic interplay of light and depth.

| Option | Name | Description | Preview |
|--------|------|-------------|---------|
| 1 | Improved Chiaroscuro | Dramatic light-dark contrast with Renaissance influence | `splash/light/previews/option-1-improved-chiaroscuro.html` |
| 3 | Minimal Ray Tracing | Clean light rays with minimalist approach | `splash/light/previews/option-3-minimal-ray-tracing.html` |

**Feedback highlights:**
- Original fonts were better
- Slow continuous light animation, not looping
- Ethereal dust particles in dark areas
- Light movement should be very subtle

---

## Main App Desktop Views (PR #51)

These are desktop-first main reading experience designs. Mobile views will be created as a next step.

### L. Celestial Lens
Cosmic orbits, lens-style poem focus, floating controls.
- Preview: `main-app/celestial-lens/option-l-celestial-lens.html`
- Screenshot: `main-app/celestial-lens/option-l-celestial-lens.png`

### M. Calligraphic Minimal
Parchment, ink strokes, large calligraphy + quiet controls.
- Preview: `main-app/calligraphic-minimal/option-m-calligraphic-minimal.html`
- Screenshot: `main-app/calligraphic-minimal/option-m-calligraphic-minimal.png`

### N. Bento Atlas
Bento grid intro, modular cards, atlas side-pane reading.
- Preview: `main-app/bento-atlas/option-n-bento-atlas.html`
- Screenshot: `main-app/bento-atlas/option-n-bento-atlas.png`

### O. Desert Horizon
Warm sunrise gradients, stamps, airy poem card.
- Preview: `main-app/desert-horizon/option-o-desert-horizon.html`
- Screenshot: `main-app/desert-horizon/option-o-desert-horizon.png`

### P. Ink Mono
Monochrome editorial, dot grid, typewriter-style controls.
- Preview: `main-app/ink-mono/option-p-ink-mono.html`
- Screenshot: `main-app/ink-mono/option-p-ink-mono.png`

### T. Mosaic Tiles
Geometric tile navigation, pattern framing for poems.
- Preview: `main-app/mosaic-tiles/option-t-mosaic-tiles.html`
- Screenshot: `main-app/mosaic-tiles/option-t-mosaic-tiles.png`

### U. Scroll Story
Chapter timeline, story arcs, sticky navigation controls.
- Preview: `main-app/scroll-story/option-u-scroll-story.html`
- Screenshot: `main-app/scroll-story/option-u-scroll-story.png`

---

## Vertical Control Bar (PR #50)

Features: Save/Heart, Text Zoom, Transliteration Toggle

| Option | Style | Placement | Philosophy |
|--------|-------|-----------|------------|
| 1 | Minimalist | Right | Jony Ive - Maximum restraint, glass morphism |
| 3 | Notion/Linear | Right | Clean functionality, compact 40px controls |
| 4 | Brutalist Terminal | Left | Retro CRT, monochrome green, full-height sidebar |
| 6 | Neumorphic | Left | Soft shadows, tactile states, light background |
| 9 | Scandinavian | Right | Circular buttons, Nordic simplicity |

**Recommended paths:**
- **Conservative (Production):** Options 1, 3, or 9
- **Bold Statement:** Option 4 (experimental/theme variations)
- **Light Theme:** Options 6 or 9

---

## Next Steps

### Phase 1: Review & Selection (Current)
- [ ] Review all designs in the interactive review page
- [ ] Select preferred splash themes and options
- [ ] Select preferred main app directions
- [ ] Select control bar style

### Phase 2: Mobile Views
- [ ] Create mobile responsive versions of all main-app designs (L, M, N, O, P, T, U)
- [ ] Ensure touch targets meet 44px minimum
- [ ] Test Arabic typography rendering on mobile viewports

### Phase 3: Walkthrough Designs
- [ ] Build walkthrough flows for each selected splash theme
- [ ] 4-step guided tour matching each theme's visual language
- [ ] Bilingual content (Arabic primary, English secondary)

### Phase 4: E2E Design Options
- [ ] Combine selected splash + walkthrough + main app into complete flows
- [ ] Create 3-5 complete E2E design options
- [ ] UX-UI agent review for mobile smoothness and animation quality

### Phase 5: Feature Design Integration
- [ ] Integrate vertical controls into selected main app designs
- [ ] Test cross-platform consistency
- [ ] Final design system documentation

---

## Directory Structure

```
design-review/
├── README.md
├── DESIGN_CATALOG.md                    # This file
├── review.html                          # Interactive review page
├── splash/                              # Splash screen designs (PR #11)
│   ├── current-state/                   # Baseline screenshots
│   ├── particles/                       # Cat 1: Particle Field
│   │   ├── current-state/
│   │   ├── previews/                    # Interactive HTML previews
│   │   └── visual-comparison.html
│   ├── zen/                             # Cat 5: Zen Minimalism
│   │   ├── current-state/
│   │   ├── mockups/                     # Static PNG screenshots
│   │   └── previews/
│   ├── ink/                             # Cat 7: Ink Calligraphy
│   ├── manuscript/                      # Cat 8: Ancient Manuscript
│   └── light/                           # Cat 9: Light & Shadow
├── main-app/                            # Main app designs (PR #51)
│   ├── celestial-lens/                  # Option L
│   ├── calligraphic-minimal/            # Option M
│   ├── bento-atlas/                     # Option N
│   ├── desert-horizon/                  # Option O
│   ├── ink-mono/                        # Option P
│   ├── mosaic-tiles/                    # Option T
│   └── scroll-story/                    # Option U
├── controls/                            # Vertical control bar (PR #50)
│   ├── minimalist/                      # Option 1
│   ├── notion/                          # Option 3
│   ├── brutalist/                       # Option 4
│   ├── neumorphic/                      # Option 6
│   └── scandinavian/                    # Option 9
├── walkthrough/                         # Placeholder for walkthrough designs
│   └── README.md
└── feedback/                            # Review feedback data
    ├── round-1-splash-feedback.json     # Round 1 selections & notes
    ├── round-1-review-manifest.json     # Theme configuration
    ├── round-1-design-review.md         # Design analysis
    └── original-streamlined-review.html # Original PR #11 review page
```
