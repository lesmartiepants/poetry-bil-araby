# 5e Cinematic Splash Screen - Implementation Plan

## Vision: The Poetry Professor Meets Magazine Design

**Aesthetic**: Film noir meets classical scholarship. Center-weighted, dramatic, intimate. Like opening an ancient manuscript in a darkened cinema.

---

## Phase 1: Copy Strategy (Arabic Poetry Professor Voice)

### Headline (English Primary)
**"Where Words Transcend Time"**
- Evocative, not descriptive
- Suggests immortality and transformation
- Active verb (transcend) creates movement

### Subheadline (Arabic Complementary)
**"حيث تتجاوز الكلمات الزمن"**
- Direct translation preserving gravitas
- Shorter, more poetic in Arabic

### Body Copy (Magazine Editorial)
**"Journey through centuries of Arabic verse—from the golden age of the Mu'allaqat to the modern masters. Each poem a portal, each line a bridge between souls across time."**

### Call to Action
**"Enter the Collection"** (not "Begin" - more cinematic)
**"ادخل المجموعة"** (Arabic)

---

## Phase 2: Visual Design Specifications

### Layout Hierarchy (Mobile-First)
```
┌─────────────────────────┐
│  [Corner Frame TL]      │  ← Film aspect ratio markers
│                         │
│    ⚘ PenTool Icon      │  ← Center-weighted
│                         │
│    poetry بالعربي      │  ← Logo (indigo brand)
│                         │
│  "Where Words          │  ← Headline (large serif)
│   Transcend Time"      │
│                         │
│  حيث تتجاوز الكلمات    │  ← Arabic complement
│  الزمن                 │
│                         │
│  [Body copy]           │  ← 2-3 sentences, narrow column
│                         │
│  [Enter Collection]    │  ← Minimal button, outlined
│                         │
│      [Corner Frame BR]  │
└─────────────────────────┘
```

### Typography Scale (Mobile-First, Fluid)
- **Logo "poetry"**: clamp(3rem, 8vw, 4.5rem)
- **Logo "بالعربي"**: clamp(2.5rem, 6vw, 3.5rem)
- **Headline**: clamp(2rem, 5vw, 4rem) - Playfair Display
- **Arabic sub**: clamp(1.5rem, 4vw, 2.5rem) - Amiri
- **Body**: clamp(0.875rem, 2.5vw, 1.125rem)
- **CTA**: clamp(0.75rem, 2vw, 0.875rem)

### Color Palette
**Dark Mode** (primary):
- Background: `#000000` (pure black, cinematic)
- Text: `#f5f5f4` (stone-100, warm white)
- Accent: `#a5b4fc` (indigo-300, brand)
- Frame: `#525252` (stone-600, 40% opacity)

**Light Mode**:
- Background: `#fafaf9` (stone-50, off-white)
- Text: `#1c1917` (stone-900)
- Accent: `#4f46e5` (indigo-600, brand)
- Frame: `#a8a29e` (stone-400, 40% opacity)

---

## Phase 3: Islamic Geometric SVG Patterns

### Pattern 1: 8-Pointed Star (Khatim)
```
Mathematical: 8 points, 45° rotation, nested circles
Usage: Background texture (2% opacity)
Size: 100×100px tile
```

### Pattern 2: Interlocking Octagons
```
Mathematical: Regular octagon grid with squares in gaps
Usage: Corner frame embellishment
Size: 60×60px elements
```

### SVG Specifications
- Stroke-width: 1.5px
- No fills (line work only)
- Color: currentColor (inherits from parent)
- ViewBox: Precise mathematical coordinates
- Performance: Static SVGs, no animations

---

## Phase 4: Component Architecture

### File: `src/splash-cinematic.jsx`
```jsx
export const SplashCinematic = ({
  onGetStarted,
  darkMode,
  onToggleTheme
}) => {
  // Mobile-first responsive component
  // Film grain effect
  // Corner frames with SVG patterns
  // Fluid typography
  // Touch-optimized button
}
```

### Responsive Breakpoints
- **Mobile**: 320px - 768px (primary focus)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Interactions
- Theme toggle: Top-right, minimal circle button
- CTA button: Subtle border, no fill, hover: fill
- Smooth fade-in: 800ms ease-out
- Film grain: Static texture, no animation

---

## Phase 5: Integration Strategy

### Replace Default Splash
**File**: `src/app.jsx`

**Change**:
```jsx
// OLD (line ~788):
default:
  return <SplashScreen onGetStarted={handleGetStarted} darkMode={darkMode} />;

// NEW:
default:
  return <SplashCinematic {...splashProps} />;
```

**Import**:
```jsx
import { SplashCinematic } from './splash-cinematic.jsx';
```

### Preserve Mockup System
- Keep all 22 mockup variations accessible via `?mockup=X`
- 5e becomes default (no parameter)
- Update documentation

---

## Phase 6: Testing & Preview Checklist

### Mobile Testing (Priority)
- [ ] iPhone SE (375×667) - smallest target
- [ ] iPhone 12/13 (390×844) - common size
- [ ] iPhone 14 Pro Max (430×932) - large
- [ ] Android (360×800) - common Android

### Desktop Testing
- [ ] 1280×720 - small desktop
- [ ] 1920×1080 - standard HD
- [ ] 2560×1440 - 2K

### Functional Testing
- [ ] Theme toggle works
- [ ] "Enter Collection" → dismisses splash
- [ ] Typography scales smoothly
- [ ] SVG patterns render correctly
- [ ] Accessibility: keyboard navigation
- [ ] Touch targets ≥44×44px (WCAG)

### Preview Method
```bash
npm run dev
# Visit http://localhost:5173
# Default splash is now 5e Cinematic
```

---

## Success Criteria

✅ **Copy**: Scholarly, evocative, magazine-quality
✅ **Visual**: Dramatic, center-weighted, film aesthetic
✅ **Mobile**: Exceptional on mobile, scales to desktop
✅ **SVG**: Mathematical precision in Islamic patterns
✅ **Integration**: Default splash, mockup system intact
✅ **Polish**: UI designer refinement pass complete

---

## Estimated Execution Time

- Phase 1-2 (Design/Copy): 15 min
- Phase 3 (SVG Patterns): 15 min
- Phase 4 (Component): 30 min
- Phase 5 (Integration): 10 min
- Phase 6 (Testing): 15 min

**Total**: ~85 minutes

---

## Next Steps

1. Create `src/splash-cinematic.jsx` with all specifications
2. Generate mathematical SVG patterns
3. Integrate as default
4. Test and preview
5. Document changes
