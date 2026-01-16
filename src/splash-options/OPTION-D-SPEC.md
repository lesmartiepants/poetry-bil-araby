# Option D: Light & Shadow - Visual Specification

**Status:** Complete ✓
**Component:** `splash-light.jsx` (394 lines)
**Demo:** `demo-light.html`
**Documentation:** `README.md` (Option D section)

---

## Design Direction

**Concept:** Dramatic chiaroscuro lighting effect inspired by Caravaggio's paintings and mosque lighting through mashrabiya screens.

**Mood:** Cinematic, dramatic, contemplative, mysterious

**Visual Style:** High contrast, light simulation, pure SVG graphics (no explicit imagery)

---

## Visual Elements

### 1. Background Layers (from back to front)

```
Layer 1: Solid Background
├─ Dark Mode: #0a0a0a (deep black)
└─ Light Mode: #2a2520 (rich brown)

Layer 2: Shadow Base
├─ Radial gradient (darker at edges)
└─ Creates vignette effect

Layer 3: Lattice Shadow Pattern
├─ SVG mask with mashrabiya geometry
├─ Octagonal openings (8x8 grid)
└─ Opacity: 85% (dark), 40% (light)

Layer 4: Animated Light Rays
├─ 5 individual rays with transforms
├─ Radial gradient light source
├─ Blend mode: screen (dark), multiply (light)
└─ Filter: blur(3-40px)

Layer 5: Dappled Light Pools
├─ 4 elliptical pools on ground
├─ Sine wave movement
└─ Filter: blur(8px)

Layer 6: Ambient Occlusion
├─ Radial gradient in corners
└─ Creates depth perception
```

### 2. Content Layout (center-aligned, z-index 10)

```
Theme Toggle (top-right corner)
├─ Size: 44x44px (touch target)
├─ Icon: Sun/Moon (18px)
└─ Backdrop blur

Logo
├─ "بالعربي" (Arabic): clamp(3rem, 8vw, 5rem)
├─ "poetry" (English): clamp(2.5rem, 7vw, 4.5rem)
├─ Text shadow: golden glow
└─ Spacing: 16px gap

Poetry Quote (Arabic)
├─ Text: "النور يكشف ما أخفته الظلال"
├─ Translation: "Light reveals what shadows have concealed"
├─ Font: Amiri (Arabic), Forum (English)
├─ Size: clamp(1.5rem, 4vw, 2.5rem)
└─ Spacing: 16px vertical gap

Subheadline
├─ Text: "Step through the lattice of time..."
├─ Max width: 512px
├─ Size: clamp(0.875rem, 2vw, 1.125rem)
└─ Opacity: 70%

Call-to-Action Button
├─ Text: "Step Into Light" / "ادخل إلى النور"
├─ Padding: 40px horizontal, 16px vertical
├─ Border: 2px solid (stone-600/400)
├─ Min size: 44x44px
├─ Backdrop blur
└─ Hover: Light sweep animation

Metadata Footer
├─ Text: "A Journey Through Chiaroscuro"
├─ Size: 12px
├─ Opacity: 30%
└─ Letter spacing: 0.2em
```

---

## Animation Specifications

### Primary Animation Loop (8 seconds continuous)

```javascript
Phase 0.0 (0s):
├─ Light source position: X=20%, Y=-10%
├─ Ray angles: -20° to -5°
└─ Pool positions: Starting positions

Phase 0.25 (2s):
├─ Light source position: X=35%, Y=-2.5%
├─ Ray angles: -12.5° to 1.25°
└─ Pool positions: Sine wave offset +25%

Phase 0.5 (4s):
├─ Light source position: X=50%, Y=5%
├─ Ray angles: -5° to 7.5°
└─ Pool positions: Sine wave offset +50%

Phase 0.75 (6s):
├─ Light source position: X=65%, Y=12.5%
├─ Ray angles: 2.5° to 13.75°
└─ Pool positions: Sine wave offset +75%

Phase 1.0 (8s):
├─ Light source position: X=80%, Y=20%
├─ Ray angles: 10° to 20°
└─ Pool positions: End positions (loops back)
```

### Secondary Animations

**Text Reveal (0-2s, once):**
```
0ms: opacity=0, translateY=20px
600ms: (trigger)
2600ms: opacity=1, translateY=0
Easing: ease-out
```

**Button Light Sweep (on hover, 2s loop):**
```
0%: translateX(-100%)
50%: translateX(100%)
100%: translateX(100%) (hold)
```

---

## Color Palette

### Dark Mode
```css
Background:       #0a0a0a
Light (bright):   rgba(255, 235, 180, 0.9)  /* Warm amber */
Light (mid):      rgba(255, 220, 150, 0.7)
Light (dim):      rgba(255, 200, 120, 0.4)
Text (primary):   rgb(231, 229, 228)         /* stone-200 */
Text (accent):    rgb(253, 230, 138)         /* amber-200 */
Shadow (deep):    rgba(0, 0, 0, 0.85)
Border:           rgb(87, 83, 78)            /* stone-600 */
```

### Light Mode
```css
Background:       #2a2520                    /* Rich brown */
Light (bright):   rgba(255, 240, 200, 0.8)  /* Golden */
Light (mid):      rgba(255, 230, 180, 0.6)
Light (dim):      rgba(255, 220, 160, 0.3)
Text (primary):   rgb(245, 245, 244)         /* stone-100 */
Text (accent):    rgb(254, 243, 199)         /* amber-100 */
Shadow (mid):     rgba(0, 0, 0, 0.4)
Border:           rgb(168, 162, 158)         /* stone-400 */
```

---

## SVG Pattern Details

### Mashrabiya Lattice Pattern

**Grid:** 80x80px repeating pattern

**Elements:**
1. **Center Octagon** (opening for light)
   - Path: `M25 15 L35 15 L40 20 L40 30 L35 35 L25 35 L20 30 L20 20 Z`
   - Fill: black (transparent to light)

2. **Connecting Lines** (wood structure, casts shadows)
   - Horizontal bars: y=22, height=6
   - Vertical bars: x=22, width=6
   - Fill: white @ 30% opacity

3. **Decorative Circles** (traditional detail at intersections)
   - Positions: (10,25), (50,25), (25,10), (25,50)
   - Radius: 4px
   - Fill: black

### Gradient Definitions

**Light Ray Gradient (linear, top to bottom):**
```svg
<linearGradient id="light-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
  <stop offset="0%" stopColor="rgba(255, 235, 180, 0.9)" />
  <stop offset="30%" stopColor="rgba(255, 220, 150, 0.7)" />
  <stop offset="60%" stopColor="rgba(255, 200, 120, 0.4)" />
  <stop offset="100%" stopColor="rgba(255, 180, 100, 0)" />
</linearGradient>
```

**Light Source (radial, from center outward):**
```svg
<radialGradient id="light-source" cx="50%" cy="0%" r="70%">
  <stop offset="0%" stopColor="rgba(255, 240, 200, 0.8)" />
  <stop offset="40%" stopColor="rgba(255, 220, 150, 0.5)" />
  <stop offset="70%" stopColor="rgba(255, 200, 120, 0.2)" />
  <stop offset="100%" stopColor="rgba(255, 180, 100, 0)" />
</radialGradient>
```

---

## Technical Implementation

### Component Structure

```jsx
SplashLight
├─ MashrabiyaPattern (SVG defs)
│  ├─ Lattice pattern
│  ├─ Light gradients
│  └─ SVG mask
│
├─ ShadowLayer
│  ├─ Base shadow gradient
│  ├─ Lattice shadow overlay
│  └─ Ambient occlusion
│
├─ LightRays
│  ├─ Radial light source
│  ├─ 5 individual rays (mapped)
│  └─ 4 dappled pools (mapped)
│
├─ Theme Toggle Button
│
└─ Content Container
   ├─ Logo
   ├─ Poetry quote
   ├─ Subheadline
   ├─ CTA button
   └─ Metadata
```

### State Management

```javascript
useState hooks:
├─ animationPhase (0 to 1, updated via RAF)
└─ textVisible (boolean, triggers at 600ms)

useEffect cleanup:
├─ cancelAnimationFrame(animationFrame)
└─ clearTimeout(textTimer)
```

### Performance Optimizations

1. **GPU Acceleration:**
   - All transforms use `translateX`, `rotate`, `scale`, `skewX`
   - No layout-affecting properties animated

2. **RAF Loop Efficiency:**
   - Single state value (`animationPhase`)
   - All calculations derived from phase
   - No unnecessary re-renders

3. **SVG over Canvas:**
   - Better for static patterns
   - Native browser optimization
   - Easier to style and maintain

4. **Blur Filters:**
   - Applied only to light elements (not text)
   - Range: 3px (rays) to 40px (light source)

---

## Content Copy

### Arabic Text
**Main Quote:** النور يكشف ما أخفته الظلال
**Transliteration:** An-Nur yakshif ma akhfathu adh-dhilal
**Translation:** Light reveals what shadows have concealed

**Button (Arabic):** ادخل إلى النور
**Transliteration:** Udkhul ila an-nur
**Translation:** Step into the light

### English Text
**Headline:** poetry بالعربي
**Subheadline:** Step through the lattice of time. Experience Arabic poetry as it was meant to be felt—in the interplay of light and shadow, revelation and mystery.
**Button:** Step Into Light
**Metadata:** A Journey Through Chiaroscuro

---

## Accessibility Features

### WCAG Compliance

**Touch Targets:**
- Theme toggle: 44x44px ✓
- CTA button: 44px min height ✓

**Color Contrast:**
- Dark mode text: Stone-200 on #0a0a0a = 16:1 ✓
- Light mode text: Stone-100 on #2a2520 = 12:1 ✓
- Button borders: Sufficient contrast in both modes ✓

**ARIA Labels:**
```jsx
aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
```

**Keyboard Navigation:**
- Theme toggle: focusable, keyboard operable ✓
- CTA button: focusable, keyboard operable ✓

**Animation Considerations:**
- Essential content not conveyed through animation alone ✓
- Text remains readable regardless of light position ✓
- Future enhancement: respect `prefers-reduced-motion`

---

## File Locations

```
Component:
└─ /src/splash-options/splash-light.jsx (394 lines)

Demo:
└─ /demo-light.html (standalone preview)

Documentation:
├─ /src/splash-options/README.md (integrated docs)
└─ /src/splash-options/OPTION-D-SPEC.md (this file)
```

---

## Usage Instructions

### Local Development

```bash
# Start dev server
npm run dev

# Open demo in browser
# Navigate to: http://localhost:5173/demo-light.html
```

### Integration

```jsx
// In app.jsx
import { SplashLight } from './splash-options/splash-light.jsx';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  if (!showSplash) {
    return <MainApp />;
  }

  return (
    <SplashLight
      onGetStarted={() => setShowSplash(false)}
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode(!darkMode)}
    />
  );
}
```

---

## Design Inspiration Sources

### Art History
- **Caravaggio** (1571-1610): Pioneered chiaroscuro technique in Baroque painting
  - "The Calling of Saint Matthew" (1599-1600)
  - "David with the Head of Goliath" (1609-1610)

### Architecture
- **Mashrabiya Windows**: Traditional Islamic architectural element
  - Found in Cairo, Damascus, Aleppo historic districts
  - Geometric lattice allows light while maintaining privacy
  - Creates dappled light patterns indoors

### Film Noir
- **Cinematography Techniques** (1940s-1950s):
  - High contrast lighting (hard light sources)
  - Shadow patterns for dramatic effect
  - Venetian blind lighting motifs

### Natural Phenomena
- **Golden Hour Sunlight**: Warm, directional light through trees/lattice
- **Mosque Interiors**: Geometric screen windows casting patterns
- **Desert Light**: High contrast between light and shadow

---

## Future Enhancement Ideas

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable time-based animation */
  /* Static light position */
}
```

### Sound Design
- Subtle ambient sound (optional)
- Light "whoosh" when rays move
- Gentle chime on button press

### Interaction
- Mobile: Tilt device to shift light angle
- Desktop: Mouse movement influences light direction
- Touch: Swipe to accelerate/reverse light cycle

### Variations
- Multiple mashrabiya pattern options
- Color temperature adjustment (cool vs warm light)
- Light intensity slider
- Time of day themes (dawn, noon, dusk)

---

## Performance Benchmarks

**Target Metrics:**
- Initial render: <100ms
- Animation frame rate: 60fps
- Memory usage: <5MB
- Bundle size: ~15KB (component only)

**Tested On:**
- Desktop: Chrome 120+, Firefox 120+, Safari 17+
- Mobile: iOS 16+ Safari, Android Chrome 120+
- Viewport: 375px (iPhone SE) to 2560px (4K)

---

## Credits

**Design & Implementation:** Poetry Bil Araby Team
**Inspired By:** Caravaggio, Islamic architecture, film noir
**Typography:** Reem Kufi (Arabic brand), Forum (English), Amiri (Arabic text)
**Tools:** React, SVG, Tailwind CSS, Lucide Icons

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
**Status:** Production Ready ✓
