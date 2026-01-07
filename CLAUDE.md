# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start Vite dev server on localhost:5173
npm run build            # Build production bundle to dist/
npm run preview          # Preview production build locally
```

### Testing
```bash
# Unit/Component tests (Vitest)
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open Vitest UI

# E2E tests (Playwright)
npm run test:e2e         # Run E2E tests (CI: Chrome only, Local: all browsers)
npm run test:e2e:ui      # Run only UI/UX tests
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:debug   # Debug mode with Playwright inspector
npm run test:e2e:report  # Open last test report
npm run test:e2e:full    # Run full browser matrix (all devices)
```

## Architecture

### Single-File Component Design
The entire application lives in `src/app.jsx` (~1500+ lines). This is intentional for simplicity but creates specific patterns you must understand:

**Feature Flags** (app.jsx:9-12)
```javascript
const FEATURES = {
  grounding: false,  // Gemini API grounding
  debug: true,       // Debug panel visibility
};
```
Toggle features here rather than conditionally importing code.

**Design System Constants** (app.jsx:14-68)
- `DESIGN`: Layout, typography, spacing tokens
- `THEME`: Dark/light mode color palettes
- Always use these constants rather than hardcoding Tailwind classes

**System Architecture**
```
┌─────────────────────────────────────────┐
│  DiwanApp (Main Component)              │
│  ├─ State Management (useState hooks)   │
│  ├─ Gemini API Integration              │
│  └─ Utility Components                  │
│     ├─ Pill, Chip (UI primitives)       │
│     ├─ Pane (Side panels)               │
│     └─ ControlBar (Navigation)          │
└─────────────────────────────────────────┘
```

### State Management Pattern
All state lives at the top level in `DiwanApp`:
- `poems` - Array of poem data
- `currentIndex` - Currently displayed poem
- `isPlaying` - Audio playback state
- `paneVisible` - Side panel visibility
- `theme` - Dark/light mode toggle

No external state management library. Use React hooks (useState, useEffect, useRef, useMemo).

### Gemini API Integration
API key is injected via environment variable:
```javascript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
```

**Important:** When testing API features locally, the user must set `VITE_GEMINI_API_KEY` in their environment or in app.jsx. Never commit API keys.

API interactions follow this pattern:
1. User triggers action (e.g., "Seek Insight" button)
2. App sends prompt to Gemini API with `SYSTEM_PROMPT` context
3. Response parsed and displayed in side pane
4. Audio synthesis uses Gemini's multimodal capabilities

### Test Architecture

**Unit Tests** (`src/test/*.test.jsx`)
- Uses Vitest + React Testing Library + happy-dom
- Component tests for utilities and main App
- Run fast (aggressive timeouts in CI: 3s per test)

**E2E Tests** (`e2e/*.spec.js`)
- Uses Playwright
- Two suites:
  - `app.spec.js` - Core functionality tests
  - `ui-ux.spec.js` - Design quality and accessibility
- CI runs Chrome only for speed
- Locally runs full device matrix (6 browsers/devices)

**Performance Optimizations:**
- `vitest.config.js` - Aggressive timeouts, fail-fast in CI
- `playwright.config.js` - Reduced browser matrix in CI (2 vs 6)
- Both configs detect `process.env.CI` for conditional behavior

### CI/CD Pipeline
Four-stage pipeline in `.github/workflows/ci.yml`:
1. **Build** - Verify compilation, upload artifacts
2. **Unit Tests** - Run Vitest with coverage → Codecov
3. **E2E Tests** - Playwright on critical browsers
4. **UI/UX Tests** - Accessibility and design validation

**Key behaviors:**
- Runs on push to `main` and all PRs
- Fails fast on first error in CI
- Caches Playwright browsers for speed
- Uploads test reports and screenshots as artifacts

## Key Files

- `src/app.jsx` - Entire application (READ THIS FIRST)
- `src/main.jsx` - React entry point (minimal, just renders DiwanApp)
- `src/index.css` - Global styles and Tailwind directives
- `index.html` - HTML shell (includes Arabic fonts from Google Fonts)
- `vite.config.js` - Vite configuration (minimal)
- `vitest.config.js` - Test configuration with CI optimizations
- `playwright.config.js` - E2E test configuration with device matrix
- `tailwind.config.js` - Tailwind with custom font families (Amiri, Tajawal)

## Development Patterns

### Adding a Feature
1. Check if feature flag should control it
2. Add state to `DiwanApp` if needed
3. Use `DESIGN` and `THEME` constants for styling
4. For Gemini API features, update `SYSTEM_PROMPT` if needed
5. Add tests in `src/test/` for logic, `e2e/` for user flows

### Styling Guidelines
- Arabic text uses `font-amiri` or `font-tajawal` (from Tailwind config)
- Always use RTL (`dir="rtl"`) for Arabic content
- Reference `THEME[theme].*` for colors (supports dark/light mode)
- Use `DESIGN.*` for spacing, typography, and layout tokens

### Testing Guidelines
When writing tests:
- Unit tests: Fast, focused on logic and component behavior
- E2E tests: User-centric flows, verify visual output
- Use `test.describe()` blocks for grouping
- `beforeEach` should call `page.goto('/')` and wait for `domcontentloaded`
- Avoid waiting for `networkidle` (slow) - wait for specific elements instead

### Modifying CI Behavior
Both `vitest.config.js` and `playwright.config.js` detect `process.env.CI`:
```javascript
testTimeout: process.env.CI ? 3000 : 5000
```
This ensures fast feedback in CI while allowing more relaxed timeouts locally.

## Common Gotchas

1. **Single File Complexity**: Since everything is in `app.jsx`, search carefully for the section you need. The file is organized with comment headers like:
   ```javascript
   /* ============================================
      1. FEATURE FLAGS & DESIGN SYSTEM
      ============================================ */
   ```

2. **Arabic Typography**: Always test with actual Arabic text. The app uses specialized fonts (Amiri, Tajawal) that may render differently than Latin text.

3. **API Key Management**: The app expects `VITE_GEMINI_API_KEY` to be set. In development, this can be set in `.env.local` (gitignored). In production (Vercel), it's set in environment variables.

4. **Test Environment Differences**: CI runs with much more aggressive timeouts. If tests pass locally but fail in CI, check timeout values in config files.

5. **Playwright Browser Matrix**: Local development runs 6 browser configs. CI runs only 2 (Desktop Chrome + Mobile Chrome). Use `npm run test:e2e:full` locally to run the comprehensive suite.

6. **Theme State**: Theme is stored in component state only (not localStorage). Refreshing the page resets to dark mode. This is intentional for simplicity.
