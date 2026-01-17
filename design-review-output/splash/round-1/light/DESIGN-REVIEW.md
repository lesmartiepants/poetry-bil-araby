# Light & Shadow Splash Screen - Design Review

**Component:** SplashLight - Chiaroscuro lighting with mashrabiya screens
**Date:** 2026-01-17
**Status:** Needs Redesign - Shadow quality and depth effects

---

## Current State Analysis

### Design Philosophy (from code)
- **Inspiration:** Caravaggio + mosque lighting + dappled sunlight through lattice
- **Technique:** SVG gradients, masks, and time-based animation
- **Animation:** 8-second light cycle with continuous movement
- **Effects:** Mashrabiya lattice pattern creates shadow overlay

### Identified Issues

1. **Shadow Quality: Too Muddy**
   - Multiple overlapping shadow layers create muddiness
   - Base shadow gradient (line 159-165) conflicts with lattice overlay (168-177)
   - Ambient occlusion (179-187) adds third shadow layer = visual mud
   - Result: Depth feels artificial, not organic

2. **Light Rays: Over-engineered**
   - 5 separate light rays (line 101-124) with individual transforms
   - Dappled light pools (126-147) compete with rays for attention
   - Too many blur filters slow rendering
   - Animation feels mechanical, not natural

3. **Lattice Pattern: Static and Generic**
   - SVG pattern (22-42) is fixed octagonal grid
   - No variation in shadow density or organic irregularity
   - Doesn't respond to light position (should be dynamic)
   - Feels like a Photoshop filter, not real architectural shadow

4. **Performance Issues**
   - Multiple SVG elements with blur filters cause jank
   - requestAnimationFrame updates 8 values per frame
   - Excessive DOM manipulation for visual effect

5. **Design Coherence**
   - Text shadows (265-266, 296-298) don't match light source position
   - Button glow (344-345) is static, doesn't breathe with animation
   - Light "source" and actual shadows don't correlate visually

---

## Design Direction: Three Alternatives

### Option 1: Improved Chiaroscuro (Same Direction, Fixed)
**Philosophy:** Keep dramatic lighting concept, simplify execution
**Key Changes:**
- Single unified shadow layer (remove ambient occlusion + base layer)
- Dynamic lattice mask that responds to light position
- 3 hero light rays (not 5) with better contrast
- Text shadows follow light source mathematically
- Performance: Use CSS gradients instead of blur filters where possible

### Option 2: Soft Depth with Layered Shadows
**Philosophy:** Subtle stratification instead of dramatic contrast
**Inspiration:** Japanese shoji screens + morning fog
**Approach:**
- 3 distinct shadow layers with clear separation (foreground, midground, background)
- No lattice pattern - pure gradient stratification
- Gentle light source that "lifts" shadows progressively
- Frosted glass aesthetic with depth through opacity shifts
- Softer animation (12-second breathing cycle)

### Option 3: Minimal Ray Tracing
**Philosophy:** Single perfect light ray through architectural opening
**Inspiration:** Pantheon oculus + Gothic cathedral windows
**Approach:**
- ONE dominant light ray (vertical or diagonal)
- High contrast: deep shadows vs brilliant highlight
- No pattern overlay - pure volumetric lighting simulation
- Text emerges from complete darkness into light
- Ultra-simple: 3 DOM elements total (background, ray, content)

---

## Technical Requirements

All options must:
- ✅ Maintain 8-second animation cycle for consistency with codebase
- ✅ Support dark/light theme toggle
- ✅ Preserve RTL Arabic text layout
- ✅ Meet WCAG AA contrast requirements (4.5:1 for text)
- ✅ Perform at 60fps on mobile devices
- ✅ Use design system constants (if integrated with main app)

---

## Next Steps

1. Review mockup screenshots in `current-state/` folder
2. Open preview HTML files in `previews/` folder to see interactive alternatives
3. Choose preferred direction: Option 1, 2, or 3
4. Implement selected design in `src/splash-options/splash-light.jsx`
