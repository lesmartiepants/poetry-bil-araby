# Splash Kinetic - Option E: Typographic Dance

## Overview

A kinetic typography splash screen where individual Arabic and English letters perform a graceful physics-based ballet before settling into the words "poetry" (English) and "شعر" (Arabic).

## Design Philosophy

- **Kinetic Typography**: Individual letter forms floating and dancing
- **Physics-Based Animation**: Gravity, inertia, rotation, bounce
- **Device Interaction**: Responds to device gyroscope/orientation (if available)
- **Monochrome + Accent**: Primarily monochrome with indigo accent color
- **Playful Yet Elegant**: Sophisticated motion design
- **Mobile-First**: Optimized for all screen sizes

## Features

### Physics Engine
- **Gravity**: Letters fall naturally with configurable gravity constant
- **Friction**: Smooth deceleration for realistic motion
- **Bounce**: Letters bounce off screen boundaries
- **Attraction**: Letters gradually move toward target positions to form words
- **Rotation**: Letters rotate while floating, settle when near target

### Device Orientation Support
- Detects device gyroscope/accelerometer
- Letters respond to device tilt (mobile/tablet)
- Graceful fallback on desktop (no orientation sensors)
- iOS 13+ compatible (no permission request to avoid blocking)

### Animation Phases
1. **Initial Scatter**: Letters spawn at random positions
2. **Free Dance**: Letters float with physics simulation
3. **Convergence**: Letters gradually attracted to form "poetry" and "شعر"
4. **Settlement**: Letters reach target and rotation stabilizes
5. **Call-to-Action**: Enter button fades in after letters settle

## Usage

### Basic Integration

```javascript
import { SplashKinetic } from './splash-kinetic.jsx';

<SplashKinetic
  onGetStarted={handleGetStarted}
  darkMode={darkMode}
  onToggleTheme={toggleTheme}
/>
```

### URL Parameter

Access directly by navigating to:
```
/?mockupType=kinetic
```

### Props

- `onGetStarted`: Function - Callback when "Enter" button is clicked
- `darkMode`: Boolean - Theme mode (dark/light)
- `onToggleTheme`: Function - Callback for theme toggle button

## Technical Details

### Physics Constants

```javascript
const PHYSICS = {
  gravity: 0.15,              // Downward acceleration
  friction: 0.98,             // Velocity dampening
  bounce: 0.6,                // Energy retention on collision
  attractionStrength: 0.02,   // Pull toward target position
  rotationSpeed: 0.05,        // Angular velocity dampening
  gyroInfluence: 0.3          // Device tilt effect strength
};
```

### Letter Configuration

**English**: "poetry" (6 letters)
- Font: System UI, sans-serif
- Weight: 900 (ultra-bold)
- Size: `clamp(2.5rem, 7vw, 5rem)` - responsive

**Arabic**: "شعر" (3 letters)
- Font: Amiri serif
- Weight: 700 (bold)
- Size: `clamp(2rem, 6vw, 4rem)` - responsive

### Accent Color Pattern

Every 3rd letter (indices 0, 3, 6, ...) uses the accent color:
- Dark mode: `text-indigo-400`
- Light mode: `text-indigo-600`

This creates visual rhythm and draws attention to specific letters.

## Performance

- **RequestAnimationFrame**: Smooth 60fps animation loop per letter
- **Cleanup**: Proper unmounting prevents memory leaks
- **Will-Change**: GPU acceleration for transforms
- **Responsive**: Recalculates target positions on window resize

## Accessibility

- Theme toggle button with `aria-label`
- Minimum touch target size: 44x44px
- Keyboard accessible (button supports Enter key)
- Reduced motion: Consider adding `prefers-reduced-motion` media query

## Browser Support

- Modern browsers with ES6+ support
- Device Orientation API (optional, graceful fallback)
- RequestAnimationFrame (widely supported)
- CSS transforms and will-change

## Testing

To test the kinetic splash screen:

```bash
# Start dev server
npm run dev

# Navigate to
http://localhost:5173/?mockupType=kinetic

# On mobile device
# - Tilt device to see gyroscope effect
# - Letters respond to device orientation
```

## Customization Ideas

### Adjust Physics
```javascript
// More gravity (faster fall)
gravity: 0.25

// Less friction (more chaotic)
friction: 0.95

// Higher bounce (more energetic)
bounce: 0.8
```

### Change Colors
```javascript
// Use different accent
const accentColor = 'text-purple-500'

// Add gradient text
textShadow: '0 0 30px rgba(168, 85, 247, 0.5)'
```

### Add More Letters
```javascript
// Expand to full title
const englishLetters = ['p','o','e','t','r','y',' ','b','i','l',' ','a','r','a','b','y'];
```

### Adjust Timing
```javascript
// Faster convergence
attractionStrength: 0.04

// Slower rotation
rotationSpeed: 0.02
```

## Known Limitations

1. **iOS 13+ Permission**: Device orientation requires user permission. Component skips this to avoid blocking experience.
2. **Performance on Low-End Devices**: 9 animated elements may impact older mobile devices.
3. **Text Selection**: Pointer events disabled on letters to prevent selection.

## Future Enhancements

- [ ] Add `prefers-reduced-motion` support
- [ ] Implement letter trail effects
- [ ] Add sound effects on collision
- [ ] Create letter explosion animation on dismiss
- [ ] Support custom letter arrays as props
- [ ] Add color shift based on velocity
