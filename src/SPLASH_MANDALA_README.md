# Option J: Breathing Mandala - Splash Screen

## Overview

A meditative and spiritual splash screen featuring an Islamic mandala pattern that breathes and pulses with life.

## Design Features

### Sacred Geometry
- Complex SVG mandala pattern with nested geometric shapes
- 12-pointed outer ring (traditional Islamic geometry)
- 8-pointed middle star (sacred geometry)
- 6-fold inner rosette (symmetry in nature)
- Central point representing unity

### Animation System
The mandala uses synchronized breathing animations at different rates for a parallax effect:

1. **Outer Ring (slowest)**: 8s breathing cycle, 40s rotation
2. **Middle Layer (medium)**: 6s breathing cycle, 30s counter-rotation
3. **Inner Core (fastest)**: 4s breathing cycle
4. **Innermost Pulse**: 3s pulse cycle

All animations use `ease-in-out` timing for natural, meditative movement.

### Color Schemes

**Dark Mode:**
- Background: Pure black (#000000)
- Primary Pattern: Antique Gold (#C5A059)
- Accent: Indigo (#6366F1, #A78BFA)
- Creates a mystical, night-time meditation atmosphere

**Light Mode:**
- Background: Cream (#FDFCF8)
- Primary Pattern: Indigo (#4F46E5, #818CF8)
- Accent: Purple shades
- Creates a calming, daylight meditation atmosphere

### Mobile-First Design
- Responsive SVG sizing: `90vw/70vw/50vw/30vw` on mobile, fixed `px` on desktop
- Touch-friendly button (48x48px minimum)
- Scales gracefully on all screen sizes
- No horizontal scroll

## How to View

### In the Application
To view this splash screen, add a URL parameter:

```
http://localhost:5173/?mockup=mandala&skipSplash=false
```

Or set the `mockupType` variable in the app state.

### Integration Points

**File Location:** `/src/splash-options/splash-mandala.jsx`

**Import in app.jsx:**
```javascript
import { SplashMandala } from './splash-options/splash-mandala.jsx';
```

**Switch case in app.jsx:**
```javascript
case 'mandala':
  return <SplashMandala {...splashProps} />;
```

## Technical Details

### Animation Keyframes
- `breatheSlow`: 8s scale + opacity animation (slowest layer)
- `breatheMedium`: 6s scale + opacity animation (middle layer)
- `breatheFast`: 4s scale animation (inner layers + UI elements)
- `pulse`: 3s opacity + scale pulse (innermost accent)
- `rotateSlow`: 40s continuous rotation (outer layer)
- `rotateReverse`: 30s reverse rotation (middle layer)

### SVG Structure
Each layer is a separate SVG element with:
- Absolute positioning
- Centered at viewport center
- Independent animation timing
- Layered opacity for depth

### Meditation Text
The splash includes calming text in both English and Arabic:
- "Breathe in the wisdom of centuries"
- "تنفس حكمة القرون"

This reinforces the breathing/meditation theme and provides cultural context.

## Props

```typescript
interface SplashMandalaProps {
  onGetStarted: () => void;      // Callback when user clicks "Begin"
  darkMode: boolean;               // Theme state
  onToggleTheme: () => void;       // Theme toggle callback
}
```

## Design Philosophy

This design combines:
1. **Islamic Art**: Traditional mandala patterns and sacred geometry
2. **Meditation**: Synchronized breathing animations
3. **Spirituality**: Central focus point for contemplation
4. **Accessibility**: Clear contrast, large touch targets
5. **Performance**: Pure CSS animations, no heavy libraries

The breathing effect mimics breathing exercises used in meditation, creating a hypnotic and calming effect that prepares users for a contemplative poetry reading experience.

## Browser Compatibility

- Modern browsers with CSS animations support
- SVG rendering support required
- Tested on Chrome, Firefox, Safari
- Mobile Safari (iOS) compatible
- No external dependencies beyond React and Lucide icons
