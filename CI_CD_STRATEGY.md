# CI/CD Strategy for Poetry Bil Araby

## Philosophy: Lightweight, Evolving, AI-Friendly

This project's CI/CD is designed to **grow with the codebase** and provide **rich feedback loops** for AI developers. It starts simple and expands progressively.

---

## Current Pipeline (Stage 1)

### ✅ What's Working Now
- **Build Verification**: Ensures Vite builds succeed
- **Artifact Storage**: Build artifacts saved for 7 days
- **PR Feedback Bot**: Automatic CI status comments on PRs
- **Preview Placeholders**: Structure ready for deployment

### 🎯 Design Principles
1. **Fail Fast**: Catch build errors immediately
2. **Visual Feedback**: Every PR gets a status comment
3. **No Blockers**: Tests use `continue-on-error` initially to avoid blocking flow
4. **Progressive Enhancement**: Add complexity as needed

---

## Evolution Roadmap

### Stage 2: Testing Foundation (Next)
```bash
# Add test scripts to package.json
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @vitest/ui @vitest/coverage-v8
```

**What to Add**:
- Component smoke tests (does it render?)
- Utility function tests
- Coverage reporting to Codecov
- Test coverage thresholds that increase over time

**For AI Contributors**:
- When adding features, add at least one test
- CI will track coverage delta (increases = 🎉, decreases = ⚠️)

### Stage 3: Visual Regression (Medium Priority)
```bash
# Add Playwright for E2E and visual testing
npm install -D @playwright/test
npx playwright install
```

**What to Add**:
- Snapshot tests for poem display
- Visual regression on typography/layout changes
- Cross-browser testing (optional)
- Screenshot uploads to PR comments

**For AI Contributors**:
- UI changes automatically trigger visual diffs
- Baseline screenshots committed to repo
- Failed visual tests show before/after images

### Stage 4: Preview Deployments (High Priority)
**Options**:
- **Vercel** (recommended for React/Vite)
- **Netlify** (alternative)
- **GitHub Pages** (free, but requires more setup)

**Integration Steps**:
1. Install Vercel GitHub app
2. Link repository
3. CI automatically deploys PR previews
4. Bot comments preview URL on every PR

**For AI Contributors**:
- See live preview of changes instantly
- Share preview links for feedback
- No manual deployment needed

### Stage 5: Advanced Feedback (Future)
- **Lighthouse CI**: Performance scoring on PRs
- **Bundle Size Tracking**: Alert on significant increases
- **Accessibility Checks**: Automated a11y testing
- **Security Scanning**: Dependabot + npm audit

---

## How AI Developers Use This

### 1. **Making Changes**
```bash
# AI makes a code change
# Pushes to branch
# Creates PR
```

### 2. **CI Feedback Loop**
Within 2-3 minutes:
- ✅ Build status
- 📊 Test coverage delta
- 🎨 Visual regression results
- 🔗 Preview deployment link
- 💬 AI-friendly summary comment

### 3. **Iterating Based on Feedback**
```
CI Comment: "⚠️ Test coverage decreased by 2%"
AI: "Let me add tests for the new feature"
AI: "Pushes new commit with tests"
CI: "✅ Coverage back to 85%!"
```

---

## Testing Strategy

### Test Pyramid (Target)
```
       /\
      /  \  E2E Tests (5%)
     /____\
    /      \  Integration Tests (15%)
   /________\
  /          \  Unit/Component Tests (80%)
 /__________\
```

### Test Categories

#### 1. **Smoke Tests** (Always Run)
- Does the app render?
- Do buttons exist?
- No console errors?

#### 2. **Component Tests** (Growing)
- Poem display with various inputs
- Audio player states
- Theme switcher
- Category filter

#### 3. **Visual Regression** (Future)
- Typography rendering
- RTL/LTR layout
- Dark/light mode
- Mobile responsive

#### 4. **E2E Tests** (Selective)
- Full poem browsing flow
- Audio playback (if testable)
- Category filtering

---

## Metrics to Track

### Current
- ✅ Build success rate
- ✅ Deploy frequency

### Stage 2 (With Tests)
- Test coverage %
- Coverage delta per PR
- Test execution time
- Flaky test detection

### Stage 3 (With Previews)
- Preview deployment time
- Lighthouse scores
- Bundle size trends

---

## Configuration Files to Add

### 1. `vitest.config.js` (When adding tests)
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/']
    }
  }
});
```

### 2. `playwright.config.js` (For visual tests)
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } }
  ]
});
```

### 3. `vercel.json` (For deployment)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "git": {
    "deploymentEnabled": {
      "main": true,
      "pull_requests": true
    }
  }
}
```

---

## Commands for AI Contributors

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests (when added)
npm test

# Run tests with coverage
npm run test:coverage

# Run visual regression tests (future)
npm run test:visual

# Preview production build
npm run preview

# Lint/format (future)
npm run lint
```

---

## Why This Approach Works for AI

1. **Clear Feedback**: CI tells AI exactly what broke
2. **Visual Confirmation**: Previews show UI changes immediately
3. **No Guesswork**: Coverage reports show what needs testing
4. **Self-Improving**: More code = more tests = better feedback
5. **Fast Iteration**: Lightweight CI = quick feedback loop

---

## Next Steps

1. ✅ Initialize git repo
2. ✅ Create CI/CD workflows
3. 🔄 Push to GitHub
4. 🔜 Connect Vercel for preview deployments
5. 🔜 Add Vitest and first component tests
6. 🔜 Set up Codecov for coverage tracking
7. 🔜 Add Playwright for visual regression

---

**Remember**: Start simple, add complexity as patterns emerge. Let the CI/CD grow with your codebase! 🚀
