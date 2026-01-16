# Integration Example: Light & Shadow Splash + Walkthrough

## How to Use the Enhanced Components

### 1. Import the Components

In your main app file (e.g., `app.jsx` or mockup gallery):

```javascript
import { SplashLight, WalkthroughLight } from './splash-options/splash-light';
```

### 2. Add State Management

```javascript
const [showSplash, setShowSplash] = useState(true);
const [showWalkthrough, setShowWalkthrough] = useState(false);
const [walkthroughStep, setWalkthroughStep] = useState(0);
const [darkMode, setDarkMode] = useState(true);
```

### 3. Render the Flow

```javascript
export default function App() {
  // ... state declarations above

  return (
    <>
      {/* Splash Screen - First View */}
      {showSplash && (
        <SplashLight
          onGetStarted={() => {
            setShowSplash(false);
            setShowWalkthrough(true);
            setWalkthroughStep(0); // Reset to first step
          }}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
        />
      )}

      {/* Walkthrough Guide - After Splash */}
      {showWalkthrough && (
        <WalkthroughLight
          onClose={() => {
            setShowWalkthrough(false);
            // App proceeds to main content
          }}
          darkMode={darkMode}
          currentStep={walkthroughStep}
          onStepChange={setWalkthroughStep}
        />
      )}

      {/* Main App Content - After Walkthrough */}
      {!showSplash && !showWalkthrough && (
        <div className="main-app">
          {/* Your poetry app content */}
        </div>
      )}
    </>
  );
}
```

## Complete User Flow

### Step-by-Step Experience

1. **User lands on site**
   - `SplashLight` renders
   - Animated light rays move across mashrabiya pattern
   - User reads: "Between light and shadow, wisdom reveals itself"
   - Professorial description about poetry's layered meanings
   - Dark/light mode toggle available

2. **User clicks "Step Into Light" button**
   - Splash fades out
   - `WalkthroughLight` fades in
   - Walkthrough step 0 shows first

3. **Walkthrough Step 1: "The Hidden Depths"**
   - Layered squares icon (excavation metaphor)
   - Copy about poetry being "excavated" not just read
   - Light rays shift position (tied to step progress)
   - Parallax activates on mouse movement
   - User sees floating light particles

4. **Walkthrough Step 2: "Navigate Between Worlds"**
   - Flowing arrow icon with motion trail
   - Copy about moving through time like light through space
   - Light rays adjust to step 2 position
   - User can click "Previous" to go back or "Next" to continue

5. **Walkthrough Step 3: "Hear the Ancient Voice"**
   - Concentric sound waves icon
   - Copy about oral tradition and recitation
   - Light rays continue shifting
   - Parallax depth becomes more apparent

6. **Walkthrough Step 4: "Illumination Through Contrast"**
   - Sun with radiating beams icon
   - Copy about understanding through light/dark interplay
   - Final step - button changes to "Begin Journey"
   - Light rays reach final position

7. **User clicks "Begin Journey"**
   - Walkthrough fades out
   - Main app content fades in
   - User is now in the poetry reading experience

## Advanced: Skip Options

### Skip Splash for Testing

```javascript
const [showSplash, setShowSplash] = useState(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return !params.has('skipSplash');
  }
  return true;
});
```

**Usage:** `http://localhost:5173/?skipSplash=true`

### Skip Walkthrough for Testing

```javascript
const [showWalkthrough, setShowWalkthrough] = useState(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return !params.has('skipWalkthrough') && !params.has('skipSplash');
  }
  return false;
});
```

**Usage:** `http://localhost:5173/?skipWalkthrough=true`

### Skip Both (Direct to App)

```javascript
// In your state initialization
const skipOnboarding = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('skipOnboarding');

const [showSplash, setShowSplash] = useState(!skipOnboarding);
const [showWalkthrough, setShowWalkthrough] = useState(false);
```

**Usage:** `http://localhost:5173/?skipOnboarding=true`

## Customization Options

### Adjust Parallax Intensity

In `WalkthroughLight`, modify the divisor:

```javascript
// Stronger parallax (more dramatic)
const offsetX = (e.clientX - centerX) / 20; // was 30

// Weaker parallax (more subtle)
const offsetX = (e.clientX - centerX) / 50; // was 30
```

### Reduce Motion for Accessibility

Add this to your component:

```javascript
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  setPrefersReducedMotion(mediaQuery.matches);

  const handler = (e) => setPrefersReducedMotion(e.matches);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}, []);

// Then conditionally disable parallax
useEffect(() => {
  if (prefersReducedMotion) return; // Skip parallax setup
  // ... rest of parallax code
}, [prefersReducedMotion]);
```

### Change Animation Speed

Modify the `animationPhase` calculation:

```javascript
// Faster light movement (more dynamic)
<LightRays darkMode={darkMode} animationPhase={(currentStep + 1) / 2} />

// Slower light movement (more contemplative)
<LightRays darkMode={darkMode} animationPhase={(currentStep + 1) / 8} />
```

### Customize Step Content

Replace the `steps` array in `WalkthroughLight`:

```javascript
const steps = [
  {
    title: "Your Custom Title",
    titleAr: "العنوان المخصص",
    description: "Your custom description here...",
    descriptionAr: "وصفك المخصص هنا"
  },
  // ... more steps
];
```

## Testing Checklist

Before deploying, verify:

### Visual Tests
- [ ] Splash displays with correct copy in both modes (dark/light)
- [ ] Light rays animate smoothly across mashrabiya pattern
- [ ] Theme toggle works on splash screen
- [ ] Walkthrough opens when "Step Into Light" clicked
- [ ] All 4 walkthrough steps display correctly
- [ ] Step-specific icons render properly
- [ ] Parallax effect works on mouse movement
- [ ] Floating particles are visible and animating
- [ ] Step indicators (light beams) animate on step change
- [ ] Navigation buttons work (Previous/Next/Begin Journey)
- [ ] Glass morphism backdrop appears correctly
- [ ] Corner flourishes render in all 4 corners

### Interaction Tests
- [ ] Splash "Step Into Light" button is clickable
- [ ] Walkthrough close (X) button dismisses walkthrough
- [ ] Step dots are clickable and jump to correct step
- [ ] Previous button appears only on steps 2-4
- [ ] Next button changes to "Begin Journey" on step 4
- [ ] Light sweep animates on button hover
- [ ] Parallax responds to mouse movement
- [ ] Touch interactions work on mobile

### Accessibility Tests
- [ ] All buttons have proper `aria-label` attributes
- [ ] Tab navigation works through all interactive elements
- [ ] Keyboard users can close walkthrough (Escape key)
- [ ] Text contrast meets WCAG AA standards
- [ ] Reduced motion preference disables parallax
- [ ] Screen reader announces step changes

### Performance Tests
- [ ] Parallax runs at 60fps on desktop
- [ ] No jank on mobile devices
- [ ] Build size impact is acceptable (<10kb added)
- [ ] No memory leaks when opening/closing repeatedly

### Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Troubleshooting

### Parallax Not Working

**Issue:** Mouse movement doesn't trigger parallax effect.

**Solution:** Ensure `mousemove` event listener is attached to `window`, not a specific element.

```javascript
useEffect(() => {
  const handleMouseMove = (e) => {
    // ... parallax logic
  };

  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, []);
```

### Light Rays Not Animating

**Issue:** Light rays are static, not moving with steps.

**Solution:** Verify `animationPhase` prop is being passed correctly:

```javascript
<LightRays darkMode={darkMode} animationPhase={(currentStep + 1) / 4} />
```

### Corner Flourishes Not Visible

**Issue:** Corner decorations are cut off or invisible.

**Solution:** Ensure parent container doesn't have `overflow: hidden`:

```javascript
<div className="relative max-w-3xl mx-6 z-10">
  {/* flourishes use absolute positioning with negative values */}
</div>
```

### Performance Issues on Mobile

**Issue:** Parallax causes lag on mobile devices.

**Solution:** Disable parallax on small screens:

```javascript
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  if (isMobile) return; // Skip parallax on mobile
  // ... parallax code
}, [isMobile]);
```

## Best Practices

1. **Preload Assets:** If using custom fonts, ensure they're loaded before showing splash
2. **Smooth Transitions:** Use `opacity` and `transform` for animations (GPU-accelerated)
3. **Memory Management:** Clean up event listeners in `useEffect` return functions
4. **Loading States:** Show fallback content while splash/walkthrough are loading
5. **Analytics:** Track which step users drop off at in the walkthrough
6. **Localization:** Support RTL languages if targeting Arabic-speaking audiences
7. **Offline Support:** Cache splash assets for offline-first experience

## Example: Analytics Integration

```javascript
const WalkthroughLight = ({ onClose, darkMode, currentStep, onStepChange }) => {
  // Track step views
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'walkthrough_step_view', {
        step_number: currentStep,
        step_name: steps[currentStep].title
      });
    }
  }, [currentStep]);

  // Track completion
  const handleClose = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'walkthrough_complete', {
        final_step: currentStep
      });
    }
    onClose();
  };

  // ... rest of component
};
```

## Support

For questions or issues with this implementation:

1. Check the main documentation: `LIGHT-SHADOW-ENHANCEMENT.md`
2. Review the source code: `src/splash-options/splash-light.jsx`
3. Run visual tests: `npm run dev` and navigate to splash
4. Check build output: `npm run build` for any errors
