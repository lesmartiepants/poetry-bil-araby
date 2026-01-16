# Integration Guide: Zen Minimalism Splash Screen

This guide walks you through integrating the **Zen Minimalism** splash screen into the main Poetry Bil Araby application.

## Quick Start (5 minutes)

### Step 1: Import Component

In `/src/app.jsx`, add the import at the top of the file:

```jsx
// Add this to existing imports (around line 3-8)
import { SplashZen } from './splash-options/splash-zen.jsx';
```

### Step 2: Replace Splash Screen

Find the existing splash screen rendering (search for `{showSplash &&`) and replace with:

```jsx
{showSplash && (
  <SplashZen
    onGetStarted={() => setShowSplash(false)}
    darkMode={darkMode}
    theme={theme}
    onToggleTheme={() => setDarkMode(!darkMode)}
  />
)}
```

### Step 3: Test Locally

```bash
# Start dev server
npm run dev

# Open browser
# Navigate to http://localhost:5173

# Test:
# 1. Watch calligraphy draw (2s animation)
# 2. Observe breathing animation
# 3. Toggle theme (top-right button)
# 4. Tap anywhere to dismiss
```

### Step 4: Verify Skip Parameter

Ensure the skip parameter works for E2E tests:

```jsx
// In app.jsx initialization
const [showSplash, setShowSplash] = useState(
  !window.location.search.includes('skipSplash=true')
);
```

## Complete Integration

### Full Code Example

```jsx
// src/app.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { /* ... existing imports ... */ } from 'lucide-react';
import { SplashZen } from './splash-options/splash-zen.jsx';  // NEW

const FEATURES = {
  grounding: false,
  debug: true,
};

const DESIGN = { /* ... existing design constants ... */ };

const THEME = {
  dark: { /* ... existing dark theme ... */ },
  light: { /* ... existing light theme ... */ }
};

export default function DiwanApp() {
  // State management
  const [darkMode, setDarkMode] = useState(true);
  const [showSplash, setShowSplash] = useState(
    !window.location.search.includes('skipSplash=true')
  );

  // ... rest of app state ...

  const theme = darkMode ? THEME.dark : THEME.light;

  // Render
  return (
    <>
      {/* Zen Minimalism Splash Screen */}
      {showSplash && (
        <SplashZen
          onGetStarted={() => setShowSplash(false)}
          darkMode={darkMode}
          theme={theme}
          onToggleTheme={() => setDarkMode(!darkMode)}
        />
      )}

      {/* Main App Content */}
      {!showSplash && (
        <div className={`min-h-screen ${theme.bg}`}>
          {/* ... existing app content ... */}
        </div>
      )}
    </>
  );
}
```

## Testing Checklist

### Manual Testing

- [ ] **Load Animation**: All 5 stroke elements draw in sequence (2s)
- [ ] **Breathing Animation**: SVG scales subtly after drawing completes
- [ ] **Theme Toggle**: Button in top-right switches dark/light mode
- [ ] **Tap Dismissal**: Clicking anywhere triggers fade-out (400ms)
- [ ] **Skip Parameter**: `?skipSplash=true` bypasses splash entirely
- [ ] **Mobile Responsive**: SVG scales to 240px on mobile (<640px)
- [ ] **Touch Devices**: Breathing animation speeds up to 3.5s
- [ ] **Dark Mode**: Pure black (#000) with white strokes
- [ ] **Light Mode**: Pure white (#FFF) with black strokes
- [ ] **Hover Hint**: "tap to enter" appears on desktop hover

### Automated Testing

Create a test file: `/e2e/splash-zen.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Zen Splash Screen', () => {
  test('should display and animate correctly', async ({ page }) => {
    // Navigate without skip parameter
    await page.goto('/');

    // Verify splash is visible
    const splash = page.locator('div[class*="fixed inset-0"]');
    await expect(splash).toBeVisible();

    // Wait for drawing animation to complete
    await page.waitForTimeout(2500);

    // Verify SVG is present
    const svg = page.locator('svg');
    await expect(svg).toBeVisible();

    // Test theme toggle
    const themeButton = page.locator('button[aria-label="Toggle theme"]');
    await themeButton.click();
    await page.waitForTimeout(300);

    // Dismiss splash
    await page.locator('div[class*="cursor-pointer"]').click();
    await page.waitForTimeout(500);

    // Verify splash is gone
    await expect(splash).not.toBeVisible();
  });

  test('should skip with parameter', async ({ page }) => {
    await page.goto('/?skipSplash=true');

    // Splash should not be present
    const splash = page.locator('div[class*="fixed inset-0"]');
    await expect(splash).not.toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify SVG scales down
    const svg = page.locator('svg');
    const box = await svg.boundingBox();
    expect(box.width).toBeLessThanOrEqual(240);
  });
});
```

Run tests:

```bash
npx playwright test splash-zen.spec.js
```

## Performance Validation

### Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit (with splash)
lighthouse http://localhost:5173 --view

# Expected scores:
# Performance: 95+
# Accessibility: 100
# Best Practices: 95+
# SEO: 90+
```

### Bundle Size Check

```bash
# Build production
npm run build

# Check bundle size
ls -lh dist/assets/*.js

# Zen splash should add <7KB to main bundle
```

### Animation Performance

Open Chrome DevTools:
1. Navigate to Performance tab
2. Record page load
3. Verify:
   - First Paint: <100ms
   - FPS: Solid 60fps during animations
   - CPU: <20% on desktop, <40% on mobile
   - Memory: <5MB increase

## Troubleshooting

### Issue: Splash doesn't dismiss on tap

**Solution:**
Check that `onGetStarted` prop is properly connected:

```jsx
<SplashZen
  onGetStarted={() => setShowSplash(false)}  // Must update state
  // ... other props
/>
```

### Issue: Strokes don't draw

**Solution:**
Ensure SVG `stroke-dasharray` and `stroke-dashoffset` are not being overridden by global CSS. Check `/src/index.css` for conflicting styles.

### Issue: Theme toggle doesn't work

**Solution:**
Verify `darkMode` state and `onToggleTheme` callback:

```jsx
const [darkMode, setDarkMode] = useState(true);

<SplashZen
  darkMode={darkMode}
  onToggleTheme={() => setDarkMode(!darkMode)}
  // ... other props
/>
```

### Issue: Breathing animation stutters

**Solution:**
Check if browser is hardware-accelerating CSS transforms:

```css
/* Add to SVG style if needed */
will-change: transform;
transform: translateZ(0);
```

### Issue: Skip parameter not working

**Solution:**
Ensure state initialization checks URL params:

```jsx
const [showSplash, setShowSplash] = useState(
  !window.location.search.includes('skipSplash=true')
);
```

### Issue: Mobile performance issues

**Solution:**
Verify media query is working:

```css
/* In splash-zen.jsx style block */
@media (max-width: 640px) {
  svg {
    width: 240px;
    height: 240px;
  }
}
```

## Advanced Configuration

### Custom Animation Duration

Modify animation timings in `/src/splash-options/splash-zen.jsx`:

```jsx
// Line 159: Change breathing speed
.animate-breathing {
  animation: breathing 4s ease-in-out infinite;  // Change 4s to desired duration
}

// Line 166: Change stroke drawing speed
animation: drawStroke 2s ease-out forwards;  // Change 2s to desired duration
```

### Add Skip Button

If users request ability to skip immediately:

```jsx
export const SplashZen = ({ onGetStarted, darkMode, theme, onToggleTheme }) => {
  const [touched, setTouched] = React.useState(false);

  const handleInteraction = () => {
    setTouched(true);
    setTimeout(() => onGetStarted(), 400);
  };

  return (
    <div /* ... existing props ... */>
      {/* Add skip button */}
      <button
        onClick={onGetStarted}
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 text-xs uppercase tracking-widest ${
          darkMode ? 'text-white/40 hover:text-white/70' : 'text-black/40 hover:text-black/70'
        } transition-colors`}
      >
        Skip
      </button>

      {/* ... rest of component ... */}
    </div>
  );
};
```

### Remember User Preference

Store splash preference in localStorage:

```jsx
// In app.jsx
const [showSplash, setShowSplash] = useState(() => {
  // Check URL param first
  if (window.location.search.includes('skipSplash=true')) return false;

  // Check localStorage
  const saved = localStorage.getItem('showSplash');
  return saved !== 'false';  // Default true if not set
});

const handleSplashDismiss = () => {
  setShowSplash(false);
  localStorage.setItem('showSplash', 'false');
};

<SplashZen
  onGetStarted={handleSplashDismiss}
  // ... other props
/>
```

### Add Sound Effect

Install sound library:

```bash
npm install use-sound
```

Add sound to tap interaction:

```jsx
import useSound from 'use-sound';

export const SplashZen = ({ onGetStarted, darkMode, theme, onToggleTheme }) => {
  const [play] = useSound('/sounds/zen-chime.mp3', { volume: 0.3 });

  const handleInteraction = () => {
    play();  // Play sound on tap
    setTouched(true);
    setTimeout(() => onGetStarted(), 400);
  };

  // ... rest of component
};
```

## Deployment

### Pre-deployment Checklist

- [ ] All manual tests pass
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Lighthouse scores meet targets (Performance 95+)
- [ ] Bundle size increase is acceptable (<10KB)
- [ ] Works on production build (`npm run build && npm run preview`)
- [ ] Tested on multiple devices (iOS, Android, Desktop)
- [ ] Accessibility audit passes (WCAG AAA)

### Environment Variables

No environment variables needed for Zen splash (pure CSS + SVG).

### CDN Optimization

If using CDN for assets:

```jsx
// No external assets needed - everything is inline!
// Zen splash is completely self-contained
```

### Cache Headers

Recommend cache headers in production:

```
# In server config (e.g., Vercel vercel.json)
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Rollback Plan

If issues arise in production:

### Quick Rollback

```jsx
// In app.jsx, temporarily disable splash
const [showSplash, setShowSplash] = useState(false);  // Force disable

// Or revert to previous splash component
import { SplashScreen } from './splash-mockups.jsx';  // Old version
```

### Feature Flag

Add feature flag to FEATURES constant:

```jsx
const FEATURES = {
  grounding: false,
  debug: true,
  zenSplash: true,  // Toggle to disable
};

// In render
{showSplash && FEATURES.zenSplash && (
  <SplashZen /* ... */ />
)}
```

## Support

### Questions?

- Check `/src/splash-options/OPTION-A-ZEN.md` for full design specs
- Review `/src/splash-options/COMPARISON.md` for alternatives
- Run preview: Add route to `/preview-zen` in app.jsx

### Bug Reports

If you encounter issues:

1. Check browser console for errors
2. Verify React version (18+ required)
3. Test in multiple browsers (Chrome, Safari, Firefox)
4. Check for conflicting CSS in global styles
5. Report issue with:
   - Browser version
   - Device type
   - Steps to reproduce
   - Screenshot/video

---

**Guide Version:** 1.0
**Last Updated:** 2026-01-12
**Component Version:** splash-zen.jsx v1.0
