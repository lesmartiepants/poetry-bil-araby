# Constellation Poetry - Visual Design Guide

## Layout Overview

```
┌─────────────────────────────────────────────┐
│                                       [🌙]  │  ← Theme toggle (top-right)
│                                             │
│         ✦                                   │
│      ✦    ✦     ✦  ✦                       │  ← Constellation 1 (Al-Hubb)
│         ✦           ✦                       │     Stars: 5 connected
│                        ✦                    │
│                                             │
│              ✦  ✦                           │  ← Constellation 2 (Al-Shawq)
│                ✦   ✦                        │     Stars: 5 connected
│                   ✦                         │
│                                             │
│                                      ✦      │  ← Constellation 3 (Al-Qamar)
│                           🖋                │     Stars: 5 connected
│                                   ✦    ✦   │
│          [ بالعربي poetry ]                 │     + Moon phase nearby
│                                      ✦   ✦ │
│     Written in the Stars                   │
│     مكتوبة في النجوم                        │  ← Main content (center)
│                                             │
│  [Ancient Arabic astronomers mapped        │
│   the heavens with poetry...]              │
│                                             │
│           ✦  ✦                              │  ← Constellation 4 (Al-Shi'r)
│              ✦                              │     Stars: 5 connected
│                 ✦  ✦                        │
│                                             │
│                              ✦  ✦           │  ← Constellation 5 (Al-Najm)
│   ┌─────────────────────┐                  │     Stars: 5 connected
│   │   Begin Journey     │      ✦   ✦  ✦   │
│   │    ابدأ الرحلة       │                  │
│   └─────────────────────┘                  │  ← CTA Button (center-bottom)
│                                             │
│   Tap stars to reveal names                │  ← Hint text
└─────────────────────────────────────────────┘
```

## Color Palette

### Dark Mode (Primary)
```
Background Gradient:
┌──────────────────────┐
│ #0a0a1a (top)        │  Deep indigo-black
│                      │
│ #0f0f2a (middle)     │  Dark purple-navy
│                      │
│ #1a1a3a (bottom)     │  Rich navy-purple
└──────────────────────┘

Stars:        rgb(199, 210, 254)  (indigo-200)
Lines:        rgba(199, 210, 254, 0.3)
Text:         rgb(238, 242, 255)  (indigo-100)
Accents:      rgb(165, 180, 252)  (indigo-300)
Glow:         rgba(99, 102, 241, 0.15)  (soft indigo)
```

### Light Mode (Alternative)
```
Background:   #0f1729 → #1a2642 → #263857
Stars:        Same as dark mode (indigo-200)
Text:         indigo-50
Accents:      indigo-200
```

## Star Specifications

### Star Anatomy
```
    │         ← Sparkle cross (vertical)
─── ◉ ───     ← Sparkle cross (horizontal)
    │

◉ = Star core (2-3px radius)
──── = Sparkle line (strokeWidth: 0.5px)
🌟 = Glow halo (3x star size, 8% opacity)
```

### Star Variations
```
Type A: Bright Star
- Size: 2.5-3px
- Brightness: 0.9-1.0
- Use: Primary constellation points

Type B: Medium Star
- Size: 2-2.3px
- Brightness: 0.85-0.88
- Use: Secondary constellation points

Type C: Dim Star
- Size: 1.5-1.8px
- Brightness: 0.75-0.8
- Use: Supporting constellation points
```

## Constellation Map

### 1. Al-Hubb (الحُبّ) - Love
```
Position: Upper-left quadrant
Shape: Pentagonal formation

    s2 ────── s3
   ╱            ╲
  s1             s4
   ╲            ╱
    ────── s5 ──

Stars: 5
Lines: 5 (closed pentagon)
```

### 2. Al-Shawq (الشَوق) - Longing
```
Position: Upper-center
Shape: Star burst

        s7
       ╱ ╲
      s6  s10
     ╱ ╲ ╱
    s9  s8

Stars: 5
Lines: 4 (open star)
```

### 3. Al-Qamar (القَمَر) - The Moon
```
Position: Upper-right quadrant
Shape: Crescent-inspired

   s11 ─── s12
    │       │
   s15     s13
    ╲       ╱
      s14 ──

Stars: 5
Lines: 5 (closed pentagon)
```

### 4. Al-Shi'r (الشِّعر) - Poetry
```
Position: Lower-left quadrant
Shape: Flowing verse

   s17 ─── s18
   ╱         ╲
  s16        s19
   ╲          ╱
    ────s20───

Stars: 5
Lines: 4 (open flow)
```

### 5. Al-Najm (النَّجم) - The Star
```
Position: Lower-right quadrant
Shape: Classic star

   s21 ─── s22
    │       │
   s25     s23
    ╲       ╱
      s24 ──

Stars: 5
Lines: 5 (closed pentagon)
```

## Animation Timeline

### 0-0.5s (Initial Load)
```
▰▱▱▱▱▱▱▱▱▱  Background gradient fades in
```

### 0.5-2s (Stars Appear)
```
▰▰▰▱▱▱▱▱▱▱  Stars fade in sequentially
▰▰▰▰▱▱▱▱▱▱  Twinkle animation begins
▰▰▰▰▰▱▱▱▱▱  Sparkle crosses appear
```

### 2-3.5s (Lines Draw)
```
▰▰▰▰▰▰▱▱▱▱  Constellation lines start drawing
▰▰▰▰▰▰▰▱▱▱  Lines extend with stroke-dasharray
▰▰▰▰▰▰▰▰▱▱  All lines fully drawn
```

### 3.5-4.7s (Content Appears)
```
▰▰▰▰▰▰▰▰▰▱  Logo fades in
▰▰▰▰▰▰▰▰▰▰  Text fades up from below
▰▰▰▰▰▰▰▰▰▰  Button and hint text appear
```

### 4.7s+ (Continuous)
```
▰▰▰▰▰▰▰▰▰▰  Stars twinkle continuously
▰▰▰▰▰▰▰▰▰▰  Interactive state enabled
```

## Interactive States

### Default State
```
✦ Star (static position, twinkling)
─ Line (visible, 30% opacity)
□ Label (hidden)
```

### Hover/Touch State
```
✦ Star (brightens to indigo-200)
─ Line (same)
┌───────────┐
│ الحُبّ    │ ← Label appears (fade-in 0.3s)
└───────────┘
```

### Active State (Clicked/Touched)
```
✦ Star (remains bright)
─ Line (same)
┌───────────┐
│ الحُبّ    │ ← Label stays visible
└───────────┘
```

## Typography Scale

```
Logo (Arabic):    clamp(2.5rem, 6vw, 3.5rem)    → 40px-56px
Logo (English):   clamp(3rem, 8vw, 4.5rem)      → 48px-72px
Headline:         clamp(1.5rem, 4.5vw, 2.5rem)  → 24px-40px
Arabic Tagline:   clamp(1.25rem, 3.5vw, 2rem)   → 20px-32px
Body Text:        clamp(0.875rem, 2.5vw, 1.125rem) → 14px-18px
Button Text:      clamp(0.75rem, 2vw, 0.875rem) → 12px-14px
Hint Text:        10px (fixed)
Constellation Label: 4-5px (SVG text)
```

## Responsive Breakpoints

### Mobile (< 640px)
- Logo: 40-48px
- Stars: Full size (2.5-3px)
- Lines: Full visibility
- Content: Stacked vertical
- Touch targets: 44x44px minimum

### Tablet (640px - 1024px)
- Logo: 48-56px
- Stars: Full size
- Content: Slightly wider max-width
- Spacing: Increased padding

### Desktop (> 1024px)
- Logo: 56-72px
- Stars: Full size
- Content: Max-width 2xl (672px)
- Hover states: Enhanced

## Accessibility Features

```
┌─────────────────────────────────────┐
│ [Theme Toggle]                      │  ← 44x44px touch target
│   aria-label: "Switch to light mode"│     WCAG compliant
│                                     │
│          ✦  (Stars)                 │  ← High contrast (indigo-200)
│                                     │     Against dark background
│                                     │
│   [Begin Journey Button]            │  ← 44px min-height
│     ابدأ الرحلة                      │     Clear visual focus
│                                     │
│   Tap stars to reveal names         │  ← Clear instruction
└─────────────────────────────────────┘
```

## Performance Metrics

```
Render Tree:
├── Background gradient (CSS)
├── Milky Way overlay (radial gradient)
├── SVG Canvas (1 element)
│   ├── 25 stars (circles + sparkles)
│   ├── ~20 lines (constellation connections)
│   └── 5 label groups (hidden by default)
├── Content overlay (div)
│   ├── Logo
│   ├── Headings
│   ├── Body text
│   └── Button
└── Theme toggle

Total DOM nodes: ~80
Animation: 60fps (GPU-accelerated)
Bundle size: ~10KB
First paint: <100ms
```

## Code Structure

```javascript
SplashConstellation
├── CONSTELLATIONS (data)
│   ├── id, nameEn, nameAr, meaning
│   ├── stars[] (x, y, size, brightness)
│   └── connections[] (line pairs)
│
├── Star (component)
│   ├── Glow circle
│   ├── Core circle
│   └── Sparkle cross
│
├── ConstellationLine (component)
│   └── Animated stroke-dasharray
│
├── Constellation (component)
│   ├── Lines (rendered first)
│   ├── Stars (on top of lines)
│   └── Label (on touch)
│
└── SplashConstellation (main)
    ├── SVG canvas (full viewport)
    ├── Content overlay (center)
    └── Theme toggle (top-right)
```

## Design Tokens

```css
/* Spacing */
--space-unit: 8px
--space-xs:   8px    (1 unit)
--space-sm:   16px   (2 units)
--space-md:   24px   (3 units)
--space-lg:   32px   (4 units)
--space-xl:   48px   (6 units)

/* Star Sizes */
--star-xs:    1.5px
--star-sm:    2px
--star-md:    2.5px
--star-lg:    3px

/* Animation Durations */
--twinkle:    2-3s (random)
--line-draw:  1.5s
--fade-in:    0.3s
--entrance:   1.2s

/* Opacity Levels */
--star-glow:      0.08
--star-sparkle:   0.6
--line:           0.3
--text-muted:     0.7
--hint:           0.4
```

---

**Visual Reference**: To see this design in action, run `npm run dev` and navigate to `http://localhost:5173/?splash=constellation`
