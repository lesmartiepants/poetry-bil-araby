# E2E Test Optimization Plan

**Current Status:** E2E tests taking 10+ minutes (UNACCEPTABLE)

**Target:** Reduce to 3-5 minutes

---

## Root Cause Analysis

### Problem 1: Test Matrix Multiplication
**Current Configuration:**
- 6 viewport/browser configurations (Desktop Chrome/Firefox/Safari, Mobile Chrome/Safari, iPad)
- ~10-13 tests in app.spec.js
- Every test runs on ALL 6 configurations
- **Total test executions:** 10-13 tests × 6 configs = **60-78 test runs**

### Problem 2: Slow Wait Strategies
**Issues Found:**
```javascript
// In every beforeEach:
await page.waitForLoadState('networkidle');  // Waits for ALL network to stop

// In tests:
await page.waitForTimeout(500);  // Fixed 500ms waits
```

**Impact:**
- `networkidle` waits for Google Fonts, images, everything
- Can take 2-5 seconds per test just waiting
- Multiplied across 60-78 test runs = 2-5 minutes just waiting

### Problem 3: Inefficient Browser Context Management
- Starting fresh page context for each test
- Loading fonts repeatedly (Amiri font from Google)
- No asset caching between tests

### Problem 4: CI Worker Configuration
**Current:**
```javascript
workers: process.env.CI ? '50%' : undefined
```

On GitHub Actions (2-core VM):
- 50% = 1 worker
- Running tests sequentially!

---

## Immediate Optimizations (15 min work, 60% improvement)

### 1. Reduce Test Matrix - Split by Device Type

**Current:** All tests run on 6 configs
**New:** Split tests into device-specific suites

```javascript
// playwright.config.js
export default defineConfig({
  projects: [
    // CI: Only run critical browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
    // Local: Run all browsers
    ...(process.env.CI ? [] : [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'android',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'tablet',
        use: { ...devices['iPad Pro'] },
      },
    ]),
  ],
});
```

**Impact:** Reduce test matrix from 6 → 2 configs on CI = **67% fewer test runs**

### 2. Replace networkidle with domcontentloaded

```javascript
// Before (SLOW):
await page.waitForLoadState('networkidle');  // Waits for ALL network

// After (FAST):
await page.waitForLoadState('domcontentloaded');  // Just wait for DOM
await page.waitForSelector('[dir="rtl"]', { state: 'visible' });  // Wait for content
```

**Impact:** Save 2-3 seconds per test × 60 tests = **2-3 minutes saved**

### 3. Remove Fixed Timeouts

```javascript
// Before (BAD):
await page.waitForTimeout(500);  // Always waits 500ms

// After (GOOD):
await expect(page.locator('.font-amiri').first()).toBeVisible({ timeout: 2000 });
// Waits only as long as needed, max 2s
```

**Impact:** Save up to 500ms per occurrence × many tests = **30-60 seconds**

### 4. Increase CI Workers

```javascript
// Before:
workers: process.env.CI ? '50%' : undefined,  // = 1 worker

// After:
workers: process.env.CI ? 2 : undefined,  // Force 2 workers
```

**Impact:** **2x parallelization = 50% time reduction**

---

## Medium Optimizations (1 hour work, 80% improvement)

### 5. Implement Test Sharding

Split test execution across multiple CI jobs:

```yaml
# .github/workflows/ci.yml
e2e-tests:
  strategy:
    matrix:
      shard: [1/3, 2/3, 3/3]
  steps:
    - run: npx playwright test --shard=${{ matrix.shard }}
```

**Impact:** 3 parallel jobs = **3x faster (10 min → 3-4 min)**

### 6. Tag Tests by Priority

```javascript
// Critical path tests (fast, essential)
test('should load application @critical', async ({ page }) => {
  // ...
});

// Nice-to-have tests (run less frequently)
test('should copy poem text @extended', async ({ page }) => {
  // ...
});
```

Run only @critical on PRs, @extended nightly.

### 7. Preload Fonts

```javascript
// playwright.config.js
use: {
  // Preload Google Fonts
  extraHTTPHeaders: {
    'Link': '<https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap>; rel=preload; as=style'
  },
}
```

---

## Advanced Optimizations (Future)

### 8. Visual Regression Only on Changed Files
- Use git diff to detect UI changes
- Skip UI/UX tests if no UI files changed

### 9. Parallel Browser Installation
- Cache browsers in separate step
- Reuse across jobs

### 10. Smart Test Selection
- Only run tests for changed components
- Track test-to-component mapping

---

## Expected Performance

### Current (Baseline):
- E2E Tests: 10+ minutes
- UI/UX Tests: 4-5 minutes
- Total: 14-15 minutes

### After Immediate Optimizations:
- E2E Tests: 3-4 minutes (70% faster)
- UI/UX Tests: 2-3 minutes (40% faster)
- Total: 5-7 minutes

### After Medium Optimizations:
- E2E Tests: 2-3 minutes (with sharding)
- UI/UX Tests: 1-2 minutes
- Total: 3-5 minutes ✅ **TARGET MET**

---

## Implementation Priority

**P0 (Do Now - 15 min):**
1. ✅ Reduce test matrix to 2 browsers on CI
2. ✅ Replace networkidle with domcontentloaded
3. ✅ Remove fixed timeouts
4. ✅ Set workers to 2

**P1 (This Week - 1 hour):**
5. Implement test sharding (3 shards)
6. Tag tests by priority
7. Add font preloading

**P2 (Future):**
8. Smart test selection
9. Visual regression optimization

---

## Quick Fix Script

Apply immediate optimizations:

```bash
# 1. Update playwright.config.js
# 2. Update e2e tests to remove networkidle
# 3. Commit and push
# 4. Verify timing improvement
```

---

**Estimated Total Time Saved:** 7-10 minutes per CI run
**Developer Experience:** 3x faster feedback loop
**CI Cost Savings:** 60-70% reduction in GitHub Actions minutes

---

**Next Step:** Implement P0 optimizations NOW and re-run CI to measure improvements.
