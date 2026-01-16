# Kinetic Splash Screen - Quick Start Guide

## Overview

**Option E: Typographic Dance** - A physics-based kinetic typography splash screen where individual letters perform a graceful ballet before forming the words "poetry" and "شعر".

## How to View

### Method 1: Dev Server (Recommended)

```bash
# Start development server
npm run dev

# Navigate to:
http://localhost:5173/?mockupType=kinetic
```

### Method 2: Production Build

```bash
# Build and preview
npm run build
npm run preview

# Navigate to:
http://localhost:4173/?mockupType=kinetic
```

## Features Demonstrated

### Visual Design
- ✅ Monochrome color scheme with indigo accent
- ✅ Physics-based letter animation (gravity, friction, bounce)
- ✅ Individual letters forming "poetry" and "شعر"
- ✅ Smooth convergence animation
- ✅ Dark/light theme support

### Interactions
- ✅ Theme toggle button (top-right)
- ✅ "Enter" call-to-action button
- ✅ Device orientation support (mobile/tablet)
- ✅ Responsive layout (mobile-first)

### Technical
- ✅ RequestAnimationFrame for smooth 60fps
- ✅ Physics simulation per letter
- ✅ Gyroscope/accelerometer support
- ✅ Proper cleanup on unmount
- ✅ Window resize handling

## Testing Checklist

### Desktop Testing
- [ ] Open `http://localhost:5173/?mockupType=kinetic`
- [ ] Verify letters spawn randomly and float
- [ ] Verify letters gradually move toward center
- [ ] Verify letters form "poetry" (top) and "شعر" (bottom)
- [ ] Verify letters bounce off screen edges
- [ ] Click theme toggle - verify dark/light mode works
- [ ] Verify "Enter" button appears after ~2.5 seconds
- [ ] Click "Enter" - verify splash dismisses and app loads

### Mobile Testing
- [ ] Open on mobile device or use Chrome DevTools device emulation
- [ ] Verify responsive text sizing
- [ ] Verify touch targets are at least 44x44px
- [ ] **Tilt device** - verify letters respond to orientation
- [ ] Verify smooth animation on mobile
- [ ] Test both portrait and landscape orientations

### Accessibility Testing
- [ ] Verify theme toggle has aria-label
- [ ] Tab to "Enter" button and press Enter key
- [ ] Verify color contrast in both themes
- [ ] Test with reduced motion preference (future enhancement)

## Animation Timeline

| Time    | Event                                    |
|---------|------------------------------------------|
| 0s      | Letters spawn at random positions        |
| 0.3s    | Animation starts (hasStarted = true)     |
| 0-2s    | Letters float with physics simulation    |
| 1-3s    | Letters converge toward target positions |
| 2-4s    | Letters settle into "poetry" and "شعر"   |
| 2.5s    | "Enter" button fades in                  |
| User    | Click "Enter" to dismiss splash          |

## Physics Parameters

You can tweak these in `/src/splash-kinetic.jsx`:

```javascript
const PHYSICS = {
  gravity: 0.15,              // ↑ Faster fall | ↓ Slower fall
  friction: 0.98,             // ↑ Slower | ↓ Faster
  bounce: 0.6,                // ↑ More bouncy | ↓ Less bouncy
  attractionStrength: 0.02,   // ↑ Faster convergence | ↓ Slower
  rotationSpeed: 0.05,        // ↑ Less rotation | ↓ More rotation
  gyroInfluence: 0.3          // ↑ More tilt effect | ↓ Less tilt
};
```

## File Locations

- **Component**: `/src/splash-kinetic.jsx`
- **Documentation**: `/src/splash-kinetic.md`
- **Integration**: `/src/app.jsx` (lines 12, 1089-1090)
- **This Guide**: `/KINETIC_SPLASH_GUIDE.md`

## Troubleshooting

### Letters don't appear
- Check console for errors
- Verify React is hydrated (wait 1-2 seconds)
- Ensure `?mockupType=kinetic` is in URL

### Animation is choppy
- Check if browser is throttling (DevTools open?)
- Test in production build (`npm run build && npm run preview`)
- Verify no other heavy processes running

### Device orientation not working
- Only works on mobile devices with gyroscope
- iOS 13+ requires permission (not requested by default)
- Test on physical device, not simulator

### Letters off-screen
- Refresh page (resize event may have missed)
- Check browser window is standard size
- Verify viewport meta tag in index.html

## Integration into Main App

The kinetic splash is already integrated. To make it the default splash:

```javascript
// In src/app.jsx, change line 1092:
default:
  return <SplashKinetic {...splashProps} />;  // Changed from SplashCinematic
```

Or set URL parameter as default:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const mockupType = urlParams.get('mockupType') || 'kinetic';  // Changed from default
```

## Next Steps

1. **Visual Review**: Capture screenshots for documentation
2. **E2E Tests**: Create Playwright tests following `cinematic-splash.spec.js` pattern
3. **Performance**: Profile on low-end devices
4. **Accessibility**: Add prefers-reduced-motion support
5. **Enhancement**: Consider adding letter trail effects

## Questions or Issues?

- See `/src/splash-kinetic.md` for detailed technical documentation
- Check existing splash tests in `/e2e/cinematic-splash.spec.js` for reference
- Review design philosophy in component header comments

---

**Created**: 2026-01-12
**Component**: SplashKinetic (Option E: Typographic Dance)
**Status**: Implemented ✅
