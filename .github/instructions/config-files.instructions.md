---
applyTo: "*.config.js,*.config.json"
---

# Configuration File Instructions

## General Principles

- Keep configurations minimal and focused
- Document non-obvious settings with comments
- Support CI/CD environments (detect `process.env.CI`)
- Maintain consistency across config files

## Vite Configuration (`vite.config.js`)

- React plugin already configured
- Port 5173 is default (don't change without reason)
- Build output to `dist/` directory
- Keep minimal - avoid over-configuration

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Minimal config preferred
});
```

## Vitest Configuration (`vitest.config.js`)

- Uses `happy-dom` environment for speed
- Coverage via `v8` provider
- **CI-specific settings:**
  - Shorter timeouts (3s vs 5s)
  - Fail-fast enabled
  - Coverage thresholds enforced

```javascript
testTimeout: process.env.CI ? 3000 : 5000
```

**Don't modify timeouts** unless necessary - they're tuned for CI performance.

## Playwright Configuration (`playwright.config.js`)

- Two configs: `playwright.config.js` (CI) and `playwright.config.full.js` (local)
- **CI config:** Chrome Desktop + Mobile only (2 devices)
- **Full config:** 6 devices (Chrome, Firefox, Safari, mobile, tablet)

### CI Optimizations
```javascript
use: {
  trace: 'on-first-retry',  // Saves storage
  video: 'retain-on-failure', // Only save failures
  screenshot: 'only-on-failure',
}
```

### Browser Matrix
- Desktop: Chrome, Firefox, Safari (webkit)
- Mobile: Pixel 5, iPhone 12  
- Tablet: iPad Pro

**Don't add more devices** without considering CI time impact.

## Tailwind Configuration (`tailwind.config.js`)

- Custom fonts: `amiri` and `tajawal` (Google Fonts)
- Content paths: `index.html`, `src/**/*.{js,jsx}`
- Minimal theme extension

```javascript
theme: {
  extend: {
    fontFamily: {
      amiri: ['Amiri', 'serif'],      // Arabic poetry
      tajawal: ['Tajawal', 'sans-serif'], // UI text
    },
  },
}
```

**Adding utilities:** Only extend when necessary - use existing Tailwind classes first.

## PostCSS Configuration (`postcss.config.js`)

- Tailwind CSS plugin
- Autoprefixer for browser compatibility
- Minimal - don't add plugins without reason

## Package.json Scripts

### Development Scripts
```json
"dev": "vite",
"build": "vite build",
"preview": "vite preview"
```

### Test Scripts
```json
"test": "vitest",               // Watch mode
"test:run": "vitest run",       // CI mode
"test:coverage": "vitest run --coverage",
"test:e2e": "playwright test",  // E2E tests
```

**Don't modify** existing scripts - they're used by CI/CD.

### Adding New Scripts
- Follow naming convention: `test:*`, `build:*`
- Document purpose in comments
- Consider CI impact

## Environment Variables

### Development (`.env.local`)
```bash
VITE_GEMINI_API_KEY=your-api-key-here
```

### Production (Vercel)
- Set in Vercel dashboard
- Apply to: Production, Preview, Development

**Security:**
- Never commit `.env.local` (gitignored)
- Never hardcode API keys in config files
- Use `import.meta.env.VITE_*` for Vite env vars

## Vercel Configuration (`vercel.json`)

- Framework: Auto-detected (Vite)
- Build: `npm run build`
- Output: `dist/`
- Minimal config - let Vercel auto-detect when possible

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## CI/CD Detection

All config files should respect `process.env.CI`:

```javascript
// Example pattern
const isCI = process.env.CI === 'true' || process.env.CI === true;

export default {
  timeout: isCI ? 3000 : 5000,
  bail: isCI ? 1 : 0, // Fail-fast in CI
}
```

## Performance Considerations

### Timeouts
- **CI:** Aggressive (3s unit tests, 30s E2E)
- **Local:** Relaxed (5s unit tests, 30s E2E)
- Only increase when absolutely necessary

### Parallelization
- Vitest: Parallel by default
- Playwright: Parallel by default (3 workers in CI)

### Caching
- CI caches: `node_modules`, Playwright browsers
- Don't disable caching without good reason

## Common Pitfalls

1. **Don't over-configure:** Start minimal, add only when needed
2. **CI compatibility:** Always test config changes in CI
3. **Performance impact:** New settings may slow CI - monitor pipeline
4. **Breaking changes:** Config changes can break existing workflows
5. **Documentation:** Comment non-obvious settings
