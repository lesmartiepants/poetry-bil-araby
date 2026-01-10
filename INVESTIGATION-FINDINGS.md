# CI Test Failures - Investigation Findings

## Investigation Method
Ran custom Playwright script with headed browser to capture screenshots and log console output at each step.

## Key Findings

### ✅ CONFIRMED ISSUES

#### #15 - Theme Toggle (HTML class is null)
**Status:** CONFIRMED → FIXED ✅
- HTML element has NO class attribute (returns `null`)
- Theme state changes in React but NOT applied to HTML element
- App uses dark mode by default but doesn't set class on HTML
**Solution:** Added `useEffect` to sync theme state to HTML element class (src/app.jsx:397-402)

#### #16 - Copy Button Disabled
**Status:** CONFIRMED → FIXED ✅
**Root Cause:** Test selector issue, not application bug
- Investigation selected wrong button (nth(4) from all buttons included debug panel)
- Debug panel has buttons that were counted before footer buttons
- Test was actually selecting Next navigation button (disabled with 1 poem)
**Solution:** Updated test to scope selector to footer: `page.locator('footer button')` (e2e/app.spec.js:120)

#### #12 - Unit Test 'beta' Duplicate
**Status:** CONFIRMED → FIXED ✅
- Simple fix: `getByText` → `getAllByText`
**Solution:** Applied getAllByText pattern to beta element (src/test/App.test.jsx:23-26)

#### #20 - Line Height Boundary
**Status:** CONFIRMED → FIXED ✅
- Line height is exactly 28px (20 * 1.4)
- Test expects `> 28` but should accept `>= 28`
**Solution:** Changed test from `toBeGreaterThan` to `toBeGreaterThanOrEqual` (e2e/ui-ux.spec.js:57)

### ❌ FALSE POSITIVES / WRONG DIAGNOSIS

#### #19 - Overlay Blocking
**Status:** FALSE POSITIVE
- **NO blocking overlays found** (0 z-50 elements)
- **NO walkthrough showing**
- skipSplash is working correctly
**Action:** Close or update issue #19 - not the root cause

#### #17 - Audio Button Not Visible
**Status:** CONFIRMED → FIXED ✅
**Root Cause:** Test selector issue, not application bug
- Play button IS visible and enabled
- Test used wrong selector (nth(2) from all buttons)
- Same issue as #16 - debug panel buttons affected count
**Solution:** Updated tests to use specific selector: `page.locator('footer button.rounded-full').first()` (e2e/app.spec.js:143, 149)

### ❓ NEEDS MORE INVESTIGATION

#### #18 - Insight Loading State
- Not tested in investigation script
- Need to trigger "Seek Insight" button and check loading state

## Solution Priority

### ✅ COMPLETED
1. **#12** - Unit test 'beta' fix (FIXED)
2. **#20** - Line height test fix (FIXED)
3. **#15** - Add theme to HTML element (FIXED)
4. **#16** - Copy button test selector (FIXED)
5. **#17** - Audio button test selector (FIXED)

### REMAINING TASKS
6. **#19** - Close or update (false positive - no blocking overlays)
7. **#18** - Needs investigation (insight loading state)

## Proposed Implementation Order

1. Fix #12 (unit test 'beta')
2. Fix #20 (line height test)
3. Fix #15 (theme HTML element)
4. Debug and fix #16 (copy button)
5. Update/close #19 (false positive)
6. Investigate #17 (test selector)
7. Test #18 manually

## Code Changes Applied

### ✅ Fix #12 - src/test/App.test.jsx:23-26
```javascript
// Changed from getByText to getAllByText for duplicate elements
const betaElements = screen.getAllByText('beta')
expect(betaElements.length).toBeGreaterThan(0)
```

### ✅ Fix #20 - e2e/ui-ux.spec.js:57
```javascript
// Changed to accept exact boundary value
expect(lineHeightNum).toBeGreaterThanOrEqual(fontSize * 1.4);
```

### ✅ Fix #15 - src/app.jsx:397-402
```javascript
// Added useEffect to sync theme to HTML element
useEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.className = darkMode ? 'dark' : 'light';
  }
}, [darkMode]);
```

### ✅ Fix #16 - e2e/app.spec.js:120
```javascript
// Fixed selector to scope to footer buttons only
const copyButton = page.locator('footer button').filter({
  has: page.locator('svg')
}).nth(4);
```

### ✅ Fix #17 - e2e/app.spec.js:143, 149
```javascript
// Updated to use specific rounded button selector
const playButton = page.locator('footer button.rounded-full').first();
```

## Key Learning

**Root Cause Analysis:** Issues #16 and #17 were NOT application bugs but test selector problems. The debug panel (FEATURES.debug = true) renders buttons at the top of the page, which affected the button index counting in tests. Scoping selectors to `footer` or using more specific class selectors (`.rounded-full`) resolved both issues.
