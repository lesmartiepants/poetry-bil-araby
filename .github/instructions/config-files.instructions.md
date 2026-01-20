---
applyTo: "*.config.js,*.config.json"
---

# Configuration Files

**Principle:** Keep minimal, document non-obvious settings, support CI (`process.env.CI`)

## Vite (`vite.config.js`)

React plugin, port 5173, output to `dist/`. Keep minimal.

## Vitest (`vitest.config.js`)

```javascript
testTimeout: process.env.CI ? 3000 : 5000  // CI: aggressive, Local: relaxed
```

Uses `happy-dom` for speed, `v8` coverage. **Don't change timeouts** unless necessary.

## Playwright (`playwright.config.js`)

**Two configs:** `playwright.config.js` (CI: 2 devices), `playwright.config.full.js` (Local: 6 devices)

**Devices:** Desktop (Chrome, Firefox, Safari), Mobile (Pixel 5, iPhone 12), Tablet (iPad Pro)

**CI optimizations:** `trace: 'on-first-retry'`, `video: 'retain-on-failure'`

## Tailwind (`tailwind.config.js`)

Custom fonts: `amiri` (Arabic poems), `tajawal` (UI)
**Adding utilities:** Only when existing Tailwind insufficient

## Package.json Scripts

**Naming:** `test:*`, `build:*`, `dev:*`
**Don't modify** existing scripts (used by CI/CD)

## Environment Variables

**Development:** `.env.local` (gitignored)
**Production:** Vercel/Render dashboard
**Security:** Never commit API keys, use `import.meta.env.VITE_*` for Vite

## CI/CD Detection

```javascript
const isCI = process.env.CI === 'true' || process.env.CI === true;
// Use for timeouts, bail behavior, parallelization
```
