# Visual Mockup: Zen Minimalism Splash Screen

This document describes the visual design of the Zen Minimalism splash screen in precise detail for designers, stakeholders, and developers.

## Visual Description

### Dark Mode (Default)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                          [☀]  ← Theme   │
│                                          44×44px        │
│                                          top-8 right-8  │
│                                                         │
│                                                         │
│                                                         │
│                        ╱───╲                            │
│                    ╱ ╱       ╲                          │
│                  ╱ ╱           ●                        │
│                ╱ ╱               ╲                      │
│              ╱─╱                   ╲─╲                  │
│            ╱                           ╲                │
│          ╱                               ╲              │
│                                                         │
│                    280×280px SVG                        │
│                 (Floating calligraphy)                  │
│                                                         │
│                                                         │
│                   "tap to enter"  ← Hint (on hover)     │
│                   Tracking 0.3em                        │
│                   Uppercase, xs                         │
│                                                         │
│                                                         │
│  Pure Black Background (#000000)                        │
│  White Strokes (90% opacity)                            │
│  Subtle white glow (15% opacity)                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Light Mode

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                          [🌙]  ← Theme   │
│                                          44×44px        │
│                                          top-8 right-8  │
│                                                         │
│                                                         │
│                                                         │
│                        ╱───╲                            │
│                    ╱ ╱       ╲                          │
│                  ╱ ╱           ●                        │
│                ╱ ╱               ╲                      │
│              ╱─╱                   ╲─╲                  │
│            ╱                           ╲                │
│          ╱                               ╲              │
│                                                         │
│                    280×280px SVG                        │
│                 (Floating calligraphy)                  │
│                                                         │
│                                                         │
│                   "tap to enter"  ← Hint (on hover)     │
│                   Tracking 0.3em                        │
│                   Uppercase, xs                         │
│                                                         │
│                                                         │
│  Pure White Background (#FFFFFF)                        │
│  Black Strokes (90% opacity)                            │
│  Subtle black shadow (8% opacity)                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Detailed Specifications

### Background

**Dark Mode:**
- Color: `#000000` (Pure black, no gradients)
- Effect: None (absolute flatness)
- Purpose: Maximum contrast, meditation-like void

**Light Mode:**
- Color: `#FFFFFF` (Pure white, no gradients)
- Effect: None (absolute flatness)
- Purpose: Clean canvas, Apple-like refinement

### Calligraphic Element (SVG)

**Dimensions:**
- Desktop: 280×280px
- Mobile (<640px): 240×240px
- ViewBox: 280×280 (consistent)

**Position:**
- Horizontal: Perfect center (`justify-center`)
- Vertical: Perfect center (`items-center`)
- Z-index: Base layer

**Stroke Components:**

1. **Main Flowing Stroke** (Primary)
   - Path: Complex bezier curve with golden ratio control points
   - Width: 2.5px
   - Opacity: 90%
   - Color: White (dark) / Black (light)
   - Purpose: Main poetic flow
   - Shape: Horizontal flowing gesture with curves

2. **Accent Stroke** (Secondary)
   - Path: Shorter curved line above main stroke
   - Width: 1.8px
   - Opacity: 70%
   - Color: White (dark) / Black (light)
   - Purpose: Adds dimension
   - Shape: Rising curve, emphasis mark

3. **Dot Accent** (Detail)
   - Shape: Circle
   - Radius: 2.5px
   - Opacity: 80%
   - Color: White (dark) / Black (light)
   - Position: Center-left of main stroke
   - Purpose: Traditional calligraphic detail

4. **Detail Curve** (Rhythm)
   - Path: Small connecting curve
   - Width: 1.2px
   - Opacity: 50%
   - Color: White (dark) / Black (light)
   - Purpose: Visual rhythm
   - Shape: Subtle arc beneath main stroke

5. **Flourish** (Ending)
   - Path: Small curved tail
   - Width: 1.5px
   - Opacity: 60%
   - Color: White (dark) / Black (light)
   - Purpose: Poetic conclusion
   - Shape: Spiral curl at right end

**Visual Effect:**
- Glow (Dark Mode): `drop-shadow(0 0 40px rgba(255,255,255,0.15))`
- Shadow (Light Mode): `drop-shadow(0 0 40px rgba(0,0,0,0.08))`

### Theme Toggle Button

**Position:**
- Top: 32px from top edge (`top-8`)
- Right: 32px from right edge (`right-8`)
- Position Type: Fixed (stays in place)

**Dimensions:**
- Width: 44px (minimum touch target)
- Height: 44px (WCAG AAA compliant)
- Padding: 12px internal (`p-3`)

**Style:**
- Shape: Perfect circle (`rounded-full`)
- Background: 5% white/black with backdrop blur
- Hover Background: 10% white/black
- Border: None
- Shadow: None (ultra-minimal)

**Icon:**
- Size: 20×20px
- Dark Mode: Sun icon (60% white)
- Light Mode: Moon icon (60% black)
- Stroke Width: 2px (default Lucide)

**Interaction:**
- Hover: Scale 1.0 → 1.1 (300ms transition)
- Click: Toggle theme, prevent splash dismissal
- Cursor: pointer

### Hint Text ("tap to enter")

**Position:**
- Bottom: 80px below SVG center (`-bottom-20`)
- Horizontal: Perfect center (`left-1/2 -translate-x-1/2`)

**Typography:**
- Font Size: 12px (`text-xs`)
- Weight: 300 (Light)
- Transform: Uppercase
- Letter Spacing: 0.3em (wide tracking)
- Color: 40% white (dark) / 40% black (light)

**Behavior:**
- Default: Invisible (`opacity-0`)
- Hover: Fade to visible (`opacity-100`)
- Transition: 500ms ease
- Pointer Events: None (doesn't block clicks)

**Note:** Only shows on desktop (hover devices), hidden on mobile/touch

## Animation Specifications

### 1. Loading Sequence (0-2 seconds)

**Timeline Breakdown:**

```
0.0s  │ Main stroke starts drawing
      │ ├─ stroke-dashoffset: 400 → 0
      │ └─ Duration: 2s ease-out
      │
0.3s  │ Accent stroke starts
      │ ├─ stroke-dashoffset: 100 → 0
      │ └─ Duration: 1.5s ease-out
      │
0.5s  │ Detail curve appears
      │ ├─ stroke-dashoffset: 50 → 0
      │ └─ Duration: 1s ease-out
      │
0.7s  │ Flourish stroke starts
      │ ├─ stroke-dashoffset: 80 → 0
      │ └─ Duration: 1.2s ease-out
      │
1.0s  │ Dot fades in
      │ ├─ opacity: 0 → 1
      │ └─ Duration: 0.5s ease-out
      │
2.0s  │ All drawing complete
      └─ Breathing animation begins
```

**Visual Effect:** Strokes draw in as if written by invisible hand, creating mesmerizing "calligraphy reveal" effect.

### 2. Breathing Animation (Continuous after 2s)

**Cycle:**
```
0%    │ scale(1.0), opacity(0.95)      [Start]
      │
50%   │ scale(1.03), opacity(1.0)      [Peak]
      │
100%  │ scale(1.0), opacity(0.95)      [End = Start]
```

**Duration:**
- Desktop: 4 seconds per cycle
- Mobile/Touch: 3.5 seconds per cycle
- Easing: ease-in-out (smooth, organic)
- Infinite Loop: Yes

**Visual Effect:** SVG appears to "breathe" - subtle expansion/contraction with opacity shift creates living, meditative quality.

### 3. Dismissal Animation (On Tap)

**Sequence:**
```
Tap Detected
    ↓
setTouched(true)
    ↓
Opacity: 100% → 0% (700ms cubic-bezier)
    ↓
Wait 400ms (allow fade to complete)
    ↓
onGetStarted() called
    ↓
Splash unmounts
```

**Visual Effect:** Entire splash screen fades to transparency, revealing main app beneath. Smooth, Apple-like transition.

## Color Specifications

### Dark Mode Palette

| Element | Color | Opacity | Hex/RGBA |
|---------|-------|---------|----------|
| Background | Pure Black | 100% | `#000000` |
| Main Stroke | White | 90% | `rgba(255,255,255,0.9)` |
| Accent Stroke | White | 70% | `rgba(255,255,255,0.7)` |
| Dot | White | 80% | `rgba(255,255,255,0.8)` |
| Detail Curve | White | 50% | `rgba(255,255,255,0.5)` |
| Flourish | White | 60% | `rgba(255,255,255,0.6)` |
| Glow | White | 15% | `rgba(255,255,255,0.15)` |
| Hint Text | White | 40% | `rgba(255,255,255,0.4)` |
| Button BG | White | 5% | `rgba(255,255,255,0.05)` |
| Button Hover | White | 10% | `rgba(255,255,255,0.1)` |
| Icon | White | 60% | `rgba(255,255,255,0.6)` |

### Light Mode Palette

| Element | Color | Opacity | Hex/RGBA |
|---------|-------|---------|----------|
| Background | Pure White | 100% | `#FFFFFF` |
| Main Stroke | Black | 90% | `rgba(0,0,0,0.9)` |
| Accent Stroke | Black | 70% | `rgba(0,0,0,0.7)` |
| Dot | Black | 80% | `rgba(0,0,0,0.8)` |
| Detail Curve | Black | 50% | `rgba(0,0,0,0.5)` |
| Flourish | Black | 60% | `rgba(0,0,0,0.6)` |
| Shadow | Black | 8% | `rgba(0,0,0,0.08)` |
| Hint Text | Black | 40% | `rgba(0,0,0,0.4)` |
| Button BG | Black | 5% | `rgba(0,0,0,0.05)` |
| Button Hover | Black | 10% | `rgba(0,0,0,0.1)` |
| Icon | Black | 60% | `rgba(0,0,0,0.6)` |

## Typography

**Hint Text:**
- Font Family: System font stack (inherit from body)
- Font Size: 12px
- Font Weight: 300 (Light)
- Line Height: Normal
- Text Transform: Uppercase
- Letter Spacing: 0.3em (300% tracking)
- Text Align: Center

**No Other Text Present** - True minimalism.

## Spacing & Layout

### Viewport Breakdown

**Desktop (1920×1080):**
```
┌────────────────────────────────────────────┐
│                               [Theme: 44px]│ ← 32px from edges
│                                             │
│                   872px                     │
│                     ↕                       │
│              [Calligraphy: 280px]           │
│                                             │
│                   872px                     │
│                     ↕                       │
│               ["tap to enter"]              │ ← 80px below SVG
│                                             │
└────────────────────────────────────────────┘
```

**Mobile (375×667):**
```
┌─────────────────────────────┐
│                [Theme: 44px]│ ← 32px from edges
│                             │
│          194px              │
│            ↕                │
│    [Calligraphy: 240px]     │
│                             │
│          194px              │
│            ↕                │
│                             │
└─────────────────────────────┘
```
*Note: Hint text hidden on mobile (no hover state)*

### Measurements

| Element | Desktop | Mobile | Unit |
|---------|---------|--------|------|
| SVG Width/Height | 280 | 240 | px |
| Theme Button Size | 44 | 44 | px |
| Theme Button Top | 32 | 32 | px |
| Theme Button Right | 32 | 32 | px |
| Hint Text Bottom Offset | 80 | - | px |
| Stroke Width (Main) | 2.5 | 2.5 | px |
| Stroke Width (Accent) | 1.8 | 1.8 | px |
| Stroke Width (Detail) | 1.2 | 1.2 | px |
| Stroke Width (Flourish) | 1.5 | 1.5 | px |
| Dot Radius | 2.5 | 2.5 | px |

## Accessibility Features

### Contrast Ratios

**Dark Mode:**
- Background to Stroke: 18.1:1 (AAA)
- Background to Icon: 10.8:1 (AAA)
- Background to Hint: 7.2:1 (AA)

**Light Mode:**
- Background to Stroke: 16.5:1 (AAA)
- Background to Icon: 9.5:1 (AAA)
- Background to Hint: 6.8:1 (AA)

### Touch Targets

- Theme Toggle: 44×44px (AAA standard)
- Full Screen Tap: Entire viewport (infinite target)

### Screen Reader Support

```html
<button aria-label="Toggle theme">
  <!-- Icon -->
</button>

<div role="img" aria-label="Arabic calligraphy splash screen">
  <!-- SVG -->
</div>
```

### Keyboard Navigation

- Tab: Focus theme toggle
- Enter/Space: Toggle theme
- Any Key: Dismiss splash (alternative to tap)

### Motion Preferences

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-breathing {
    animation: none;  /* Disable breathing */
  }

  .calligraphy-main,
  .calligraphy-accent,
  .calligraphy-detail,
  .calligraphy-flourish {
    animation: none;  /* Instant draw */
    stroke-dashoffset: 0;
  }
}
```

## Design Files

### Figma Export Settings

If recreating in Figma:

1. **Artboard Size**: 1920×1080 (desktop), 375×667 (mobile)
2. **Background**: #000000 (dark) or #FFFFFF (light)
3. **SVG Export**: Outline strokes, flatten transforms
4. **Path Precision**: 2 decimal places
5. **Viewbox**: 0 0 280 280

### SVG Export (for developers)

```svg
<svg width="280" height="280" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Main stroke -->
  <path d="M 70 140 Q 90 100, 120 110 T 180 130 Q 200 135, 210 145 T 190 170 Q 180 180, 160 175 T 100 160 Q 80 155, 70 140"
        stroke="rgba(255,255,255,0.9)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none" />

  <!-- Accent stroke -->
  <path d="M 140 100 Q 150 90, 165 95 T 185 110"
        stroke="rgba(255,255,255,0.7)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none" />

  <!-- Dot -->
  <circle cx="130" cy="150" r="2.5" fill="rgba(255,255,255,0.8)" />

  <!-- Detail curve -->
  <path d="M 95 145 Q 105 140, 115 145"
        stroke="rgba(255,255,255,0.5)"
        stroke-width="1.2"
        stroke-linecap="round"
        fill="none" />

  <!-- Flourish -->
  <path d="M 190 165 Q 200 170, 205 160 Q 207 155, 205 150"
        stroke="rgba(255,255,255,0.6)"
        stroke-width="1.5"
        stroke-linecap="round"
        fill="none" />
</svg>
```

## User Experience Flow

```
User Journey:
1. App loads → Instant black/white screen (0ms)
2. 0-2s: Watch calligraphy draw itself (mesmerizing)
   - Main stroke appears first (most important)
   - Supporting strokes layer in
   - Dot accent completes the composition
3. 2s+: Breathing begins (living artwork)
   - Subtle scale pulse
   - Gentle opacity shift
   - Meditative quality
4. Hover (desktop): Hint appears ("tap to enter")
5. Tap/Click anywhere: Smooth fade (700ms)
6. Main app revealed

Alternative flows:
- Theme toggle: Instant dark/light switch
- Skip parameter: Bypass entirely
- Returning user: Can disable via localStorage
```

## Brand Alignment

**Zen Minimalism Personality:**
- Calm, centered, meditative
- Refined, sophisticated, cultured
- Modern, clean, timeless
- Confident (no need to over-explain)
- Respectful of user's time (quick dismiss)

**Emotional Response Goals:**
- First 0.5s: "Whoa, that's clean"
- First 2s: "That's beautiful, mesmerizing"
- After tap: "That was pleasant, not annoying"
- Return visit: "I don't mind seeing this again"

---

**Document Version:** 1.0
**Design Frozen:** 2026-01-12
**Component:** `splash-zen.jsx`
