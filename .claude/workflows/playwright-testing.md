# Playwright Testing Workflow for Agents

## Overview

This document explains how agents should handle Playwright E2E testing when making code changes to Poetry Bil-Araby.

## Quick Start

### 1. Before Running Tests

**Ensure Playwright browsers are installed:**
```bash
# Check current installation
npx playwright --version
ls ~/Library/Caches/ms-playwright/

# Install browsers (if needed)
npx playwright install chromium webkit firefox
```

**Expected output:**
```bash
~/Library/Caches/ms-playwright/
  chromium-1200/          # Required for project
  webkit-2182/
  firefox-1488/
```

### 2. Running Tests

**Start dev server first:**
```bash
# Terminal 1 or background
npm run dev
```

**Then run tests:**
```bash
# Run all E2E tests
npm run test:e2e

# Run only UI/UX tests (23 tests across 6 devices = 126 total)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/app.spec.js

# Run with UI mode (visual test runner)
npx playwright test --ui

# Run on specific browser
npx playwright test --project="Desktop Chrome"
```

### 3. Viewing Results

```bash
# Open HTML report (after tests complete)
npm run test:e2e:report

# Or manually
npx playwright show-report

# View specific trace file
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Common Issues & Solutions

### Issue 1: Browser Not Installed

**Symptom:**
```
Error: browserType.launch: Executable doesn't exist at
/Users/sfarage/Library/Caches/ms-playwright/chromium-1200/...
```

**Cause:** Playwright browsers not installed or wrong version

**Solution:**
```bash
npx playwright install chromium webkit firefox
```

### Issue 2: SSL Certificate Error

**Symptom:**
```
Error: unable to get local issuer certificate
UNABLE_TO_GET_ISSUER_CERT_LOCALLY
```

**Cause:** Corporate network, VPN, or firewall blocking Playwright CDN

**Solution A: Temporary Workaround** (use with caution)
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium webkit
```

**Solution B: Skip Local Tests** (recommended)
1. Push your changes to GitHub
2. Let CI run the tests (no SSL issues there)
3. Monitor CI results and fix any failures
4. Push additional commits if needed

**Why Solution B is better:**
- CI has no certificate issues
- CI runs full test matrix automatically
- Tests are required to pass before merge anyway
- Faster feedback loop once pushed

### Issue 3: Dev Server Not Running

**Symptom:**
```
Running 126 tests using 5 workers
✘ All tests failing in 1-4ms
```

**Cause:** Vite dev server not running when tests execute

**Solution:**
```bash
# Start dev server first (in background or separate terminal)
npm run dev

# Wait for "Local: http://localhost:5173/" message
# Then run tests
npm run test:e2e:ui
```

### Issue 4: Tests Pass Locally But Fail in CI

**Symptom:** Green checkmarks locally, red X in CI

**Common causes:**
- Timing differences (CI is slower)
- Different browser versions
- Missing environment variables
- Network timeouts

**Solution:**
```bash
# Run tests with CI-like settings
CI=true npm run test:e2e:ui

# Check playwright.config.js for CI-specific timeouts
# CI uses: 10s test timeout, 3s assertion timeout
# Local uses: 30s test timeout, 5s assertion timeout
```

## Agent Workflow: Making UI/UX Changes

### Recommended Flow

**1. Make Code Changes**
```javascript
// Example: Update DESIGN constants in src/app.jsx
const DESIGN = {
  mainLineHeight: 'leading-[2.2]',  // Changed from 2.4
  anim: 'transition-all duration-300',  // Changed from 700ms
  touchTarget: 'min-w-[44px] min-h-[44px]',  // Added for accessibility
};
```

**2. Try Local Testing (if browsers installed)**
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e:ui
```

**3. If Local Testing Fails (SSL/certificate issues)**
- ✅ Skip to step 4 (push to CI)
- ❌ Don't spend time debugging certificate issues
- ❌ Don't use `NODE_TLS_REJECT_UNAUTHORIZED=0` unless absolutely necessary

**4. Push to CI for Validation**
```bash
# Commit changes
git add src/app.jsx
git commit -m "feat(ui): improve touch target accessibility"

# Push to feature branch
git push -u origin feature/ui-improvements

# CI will automatically:
# - Install browsers (no SSL issues)
# - Run all 126 UI/UX tests
# - Report results on PR
```

**5. Monitor CI Results**
- Check GitHub Actions status
- Review test reports in artifacts
- If failures occur, examine screenshots/traces
- Fix issues and push updates

**6. Iterate Until Green**
```bash
# Fix failing tests
git add .
git commit -m "fix(ui): address contrast ratio in dark mode"
git push

# CI re-runs automatically
```

## Test Suites Breakdown

### UI/UX Tests (`e2e/ui-ux.spec.js`)

**126 total tests = 23 test cases × 6 device configurations**

**Test Categories:**
1. **Visual Design** (6 tests)
   - Responsive layouts (desktop/mobile)
   - Arabic typography (font-family, line-height)
   - Contrast ratios (WCAG AA: 4.5:1)
   - Smooth animations (CSS transitions)
   - Header prominence (font-size > 40px)

2. **Interaction Design** (5 tests)
   - Button hover states
   - Keyboard accessibility
   - Touch target sizing (≥44x44px)
   - Smooth scrolling behavior

3. **Content Readability** (4 tests)
   - Adequate spacing/padding
   - No horizontal overflow
   - Text selectability
   - Glass-morphism effects on controls

4. **Accessibility** (4 tests)
   - Viewport meta tag
   - Page title
   - Keyboard navigation
   - RTL/LTR text handling

5. **Visual Consistency** (4 tests)
   - Consistent color scheme
   - Consistent border radius (>10px)
   - Visual hierarchy (header 1.5× body text)

**Device Matrix:**
- Desktop Chrome (1920×1080)
- Desktop Firefox (1920×1080)
- Desktop Safari (1920×1080)
- Mobile Chrome (390×844 - iPhone 12)
- Mobile Safari (390×844 - iPhone 12)
- iPad (810×1080)

### Functional Tests (`e2e/app.spec.js`)

Focus on core application functionality:
- Navigation between poems
- Theme toggle (dark/light mode)
- Audio player controls
- Side panel interactions
- Debug panel visibility

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

**Pipeline Stages:**
1. **Build** - Verify compilation
2. **Unit Tests** - Vitest with coverage
3. **E2E Tests** - Core functionality (app.spec.js)
4. **UI/UX Tests** - Design quality (ui-ux.spec.js)

**Browser Matrix in CI:**
- Desktop Chrome (optimized for speed)
- Mobile Chrome (mobile validation)

**Artifacts Generated:**
- `ui-ux-report/` - HTML test report (14 days)
- `ui-ux-screenshots/` - Failure screenshots (14 days)
- `test-results/` - Traces and videos

### Downloading CI Artifacts

```bash
# List recent runs
gh run list --workflow="CI Pipeline" --limit 5

# View specific run
gh run view <run-id>

# Download test artifacts
gh run download <run-id> --name ui-ux-report
gh run download <run-id> --name ui-ux-screenshots

# View downloaded report
open ui-ux-report/index.html
```

## Best Practices for Agents

### DO:
✅ Start dev server before running tests
✅ Verify browser installation before testing
✅ Push to CI if local setup has issues
✅ Review test reports and screenshots on failures
✅ Fix failing tests before creating PR
✅ Run relevant test subset during development (`npm run test:e2e:ui`)

### DON'T:
❌ Run `npx playwright install` without checking first
❌ Spend time debugging SSL certificate issues
❌ Use `NODE_TLS_REJECT_UNAUTHORIZED=0` in scripts
❌ Skip tests because they're "probably fine"
❌ Create PR without CI tests passing
❌ Run full matrix locally (slow) - let CI do it

## Quick Reference

```bash
# Check browsers
ls ~/Library/Caches/ms-playwright/

# Install browsers (if needed)
npx playwright install chromium webkit

# Start dev server
npm run dev

# Run UI/UX tests
npm run test:e2e:ui

# View report
npm run test:e2e:report

# If SSL issues → push to CI
git push
```

## Related Documentation

- `.claude/agents/ui-ux-reviewer.md` - UI/UX agent responsibilities
- `.claude/agents/test-orchestrator.md` - Test coordination workflow
- `playwright.config.js` - Playwright configuration
- `e2e/ui-ux.spec.js` - UI/UX test source
- `CLAUDE.md` - Main project documentation
