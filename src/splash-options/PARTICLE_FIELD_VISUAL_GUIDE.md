# Particle Field Visual Guide

## Design Overview

The Particle Field splash screen is a generative art piece where 800 tiny particles form stylized Arabic calligraphy representing "شعر" (poetry). The particles exhibit organic swarm behavior and respond interactively to mouse/touch input.

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│                                            [Theme]      │
│                                                          │
│                                                          │
│         ·  ··   ···                                     │
│       ·  ·· ··· ··  ·  ·                                │
│      · ·· ·········· · ·                                │
│     ·· ··············  ·                                │
│      · ·················· ·                             │
│       ···················· ··                           │
│        ··········· ··········                           │
│          ··········  ·········· poetry بالعربي          │
│           ········    ··········                        │
│            ········    ···········                      │
│             ········   ············                     │
│              ·······    ············                    │
│               ······     ···········                    │
│                ·····      ··········                    │
│                                                          │
│                Generative Arabic Verse                  │
│                                                          │
│                     [ Enter ]                           │
│                                                          │
│                 Move to interact                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Particle Formation

The 800 particles are distributed across 3 calligraphic curves:

### Curve 1: Right Stroke (ش)
- Center: (70%, 40%)
- Radius: 15%
- Density: 35%
- Represents the main vertical stroke

### Curve 2: Middle Connection (ع)
- Center: (50%, 50%)
- Radius: 12%
- Density: 30%
- Represents the connecting curve

### Curve 3: Left Stroke (ر)
- Center: (30%, 45%)
- Radius: 18%
- Density: 35%
- Represents the ending flourish

## Visual States

### Default State
```
Particles gently drift in organic patterns
Subtle noise-based movement
Overall shape remains recognizable
```

### Mouse Interaction
```
   ···················
  ················· ···
 ············    ········    ← Mouse cursor
  ·············  ·········
   ·······················

Particles within 15% radius repel from cursor
Creates "opening" effect in formation
Particles flow back when mouse moves away
```

### Animation Characteristics
- **Movement Speed:** Very slow drift (0.0002 base velocity)
- **Noise Influence:** 0.00005 per frame
- **Pull Strength:** 0.001 back to origin
- **Damping:** 0.98 (gentle deceleration)

## Color Specifications

### Dark Mode (Default)
```
Background: Pure Black (#000000)
Particles: White (#FFFFFF)
Opacity Range: 0.3 - 0.7
Theme Toggle: Stone-700 border
Text: White / Stone-400
```

### Light Mode
```
Background: Pure White (#FFFFFF)
Particles: Black (#000000)
Opacity Range: 0.3 - 0.7
Theme Toggle: Stone-300 border
Text: Black / Stone-600
```

## Typography

### Logo (Center)
```
بالعربي    poetry
─────────────────────
Reem Kufi  Forum
Bold       Light
6xl-7xl    7xl-8xl
```

### Subtitle
```
GENERATIVE ARABIC VERSE
──────────────────────
Font: Forum (brand-en)
Size: 0.75rem (sm)
Tracking: 0.3em
Transform: uppercase
```

### CTA Button
```
┌───────────────┐
│     ENTER     │
└───────────────┘
Font: Forum
Size: 0.875rem (sm)
Border: 1px solid
Hover: Inverted colors
```

### Hint
```
Move to interact
────────────────
Font: Forum
Size: 0.75rem (xs)
Opacity: 0.3-0.4
Position: Bottom center
```

## Particle Properties

### Size Distribution
```
Small:  0.5px radius (30%)  ·
Medium: 1.0px radius (50%)  ··
Large:  2.0px radius (20%)  ···
```

### Opacity Layers
```
Dim:      0.3 opacity (20%) ░
Medium:   0.5 opacity (50%) ▒
Bright:   0.7 opacity (30%) ▓
```

Creates depth through layering.

## Animation Timeline

### Initial Load (0-2s)
```
0.0s: Particles at origin positions
0.1s: Animation loop begins
0.5s: Noise influence becomes visible
1.0s: Full swarm behavior active
2.0s: Content fades in (logo, CTA)
```

### Continuous Loop
```
Every Frame (60fps):
├─ Calculate noise offset
├─ Check mouse distance
├─ Apply forces (noise, mouse, origin pull)
├─ Update velocity
├─ Update position
├─ Apply damping
└─ Render to SVG
```

## Interaction Zones

### Mouse Repulsion Radius
```
     15% of viewport
    ╭─────────────╮
   ╱               ╲
  │     CURSOR      │  ← Particles repel
  │                 │
   ╲               ╱
    ╰─────────────╯
```

### Pull Back Force
```
Particle ─────────> Origin
         (0.1% per frame)

Gentle return to formation
Prevents drift-away
```

## Performance Characteristics

### Particle Count Trade-offs
```
400 particles: Light, mobile-friendly
600 particles: Balanced
800 particles: Rich, desktop-optimized  ← Current
1000 particles: Dense, modern devices only
```

### Frame Budget (60fps = 16.67ms)
```
Noise calculation:     ~2ms
Force calculations:    ~3ms
Position updates:      ~2ms
Velocity updates:      ~1ms
DOM rendering:         ~5ms
Total:                ~13ms ✓ (within budget)
```

## Responsive Behavior

### Desktop (1920x1080)
- Full 800 particles
- Large logo (7xl-8xl)
- Custom cursor visible
- Large interaction radius

### Tablet (768x1024)
- Full 800 particles
- Medium logo (6xl-7xl)
- Touch interaction
- Medium interaction radius

### Mobile (375x667)
- Full 800 particles (optimized)
- Small logo (6xl)
- Touch interaction
- Small interaction radius

## Browser Rendering

### SVG Viewbox
```
viewBox="0 0 1 1"
preserveAspectRatio="xMidYMid slice"

All coordinates normalized 0-1
Resolution independent
Scales perfectly to any screen size
```

### Particle Rendering
```html
<circle
  cx="0.7"        <!-- Normalized X (0-1) -->
  cy="0.4"        <!-- Normalized Y (0-1) -->
  r="0.001"       <!-- Radius (1px at 1000px width) -->
  fill="#fff"     <!-- Color based on theme -->
  opacity="0.5"   <!-- Depth layer -->
/>
```

## Design Inspiration

### Generative Art
- Processing/p5.js particle systems
- Nature of Code (Daniel Shiffman)
- Perlin noise landscapes

### Islamic Art
- Geometric patterns emerging from simple rules
- Unity through multiplicity
- Order from apparent chaos

### Arabic Calligraphy
- Flowing, organic letterforms
- Balance between structure and freedom
- Rhythmic composition

### Contemporary Design
- Tarek Atrissi's Arabic typography
- Khatt Foundation's modern approaches
- Monochrome minimalism

## Testing Checklist

Visual Verification:
- [ ] Particles form recognizable calligraphic shape
- [ ] Smooth 60fps animation (use browser DevTools)
- [ ] Mouse repulsion works (particles move away)
- [ ] Particles return to formation after disturbance
- [ ] Depth visible through opacity variation
- [ ] Theme toggle switches colors correctly
- [ ] Logo typography scales responsively
- [ ] CTA button hover effect works
- [ ] "Move to interact" hint visible
- [ ] Mobile touch interaction works

Performance Verification:
- [ ] No dropped frames in Chrome DevTools
- [ ] Memory stable (no leaks)
- [ ] CPU usage acceptable (<30%)
- [ ] Smooth on mobile devices
- [ ] No janky scrolling or input lag

## Accessibility Notes

- **Color Blind Safe:** Monochrome design works for all
- **Motion Sensitive:** Slow, gentle movement (could add prefers-reduced-motion)
- **Touch Targets:** CTA and theme toggle meet 44x44px minimum
- **Keyboard:** All interactions available via keyboard
- **Screen Readers:** Descriptive labels on interactive elements

## Files

Component: `src/splash-options/splash-particles.jsx`
Demo: `src/splash-options/demo-particles.html`
Docs: `src/splash-options/README.md`
