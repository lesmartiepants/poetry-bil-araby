# Agent Browser for CI Debugging

**Tool:** `agent-browser` - Headless browser automation CLI for AI agents
**Purpose:** Debug test failures in CI by accessing browser state snapshots
**Scope:** E2E tests, UI/UX tests, visual regressions

## Overview

The `agent-browser` tool is integrated into the CI pipeline to help AI agents (GitHub Copilot, Claude) debug test failures without needing to run tests locally. When Playwright tests fail, agent-browser automatically captures:

1. **Accessibility Snapshot** - Interactive element tree with refs
2. **Full Page Screenshot** - Visual state at failure time
3. **Console Logs** - All browser console output
4. **JavaScript Errors** - Stack traces and exceptions
5. **Page Metadata** - URL, title, viewport info

## When Agent Browser Runs

Agent browser captures are triggered **only on test failures**:

- **E2E Tests Fail**: Creates `agent-browser-debug-e2e` and `agent-browser-analysis-e2e` artifacts
- **UI/UX Tests Fail**: Creates `agent-browser-debug-ui-ux` and `agent-browser-analysis-ui-ux` artifacts

## Artifact Contents

### agent-browser-debug-* Artifacts

```
agent-browser-debug/
├── AI-DEBUGGING-GUIDE.md          # Step-by-step debugging instructions
├── accessibility-snapshot.txt      # Human-readable element tree
├── accessibility-snapshot.json     # Machine-readable snapshot with refs
├── page-screenshot.png            # Full page visual state
├── console-logs.txt               # Browser console output
├── js-errors.txt                  # JavaScript errors and stack traces
├── page-title.txt                 # Page title
└── page-url.txt                   # Current URL
```

### agent-browser-analysis-* Artifacts

```
agent-browser-analysis/
├── FAILURE-SUMMARY.md             # Overview of all failures
├── {test-name}-failure.png        # Screenshots from failed tests
└── ...                            # Additional failure artifacts
```

## Using Agent Browser Artifacts

### Step 1: Download Artifacts

When a PR comment shows test failures with agent-browser artifacts:

1. Click on the workflow run link
2. Scroll to "Artifacts" section
3. Download relevant artifacts:
   - `agent-browser-debug-e2e` or `agent-browser-debug-ui-ux`
   - `agent-browser-analysis-e2e` or `agent-browser-analysis-ui-ux`

### Step 2: Read AI-DEBUGGING-GUIDE.md

This is your starting point. It contains:
- List of all captured files
- Common debugging patterns
- Step-by-step debugging workflow
- Examples of using agent-browser locally

### Step 3: Analyze the Failure

**For JavaScript Errors:**
```bash
# Check js-errors.txt first
cat agent-browser-debug/js-errors.txt

# Look for:
- Uncaught exceptions
- Type errors (undefined, null)
- API call failures
- Missing dependencies
```

**For Element Not Found:**
```bash
# Check accessibility-snapshot.txt
cat agent-browser-debug/accessibility-snapshot.txt

# Look for:
- Available interactive elements
- Element refs (@e1, @e2, etc.)
- Button/input names
- Link text
```

**For Visual Issues:**
```bash
# View the screenshot
open agent-browser-debug/page-screenshot.png

# Check for:
- Missing elements
- Layout problems
- Arabic text rendering issues
- RTL (right-to-left) layout
```

**For Console Warnings:**
```bash
# Check console-logs.txt
cat agent-browser-debug/console-logs.txt

# Look for:
- React warnings
- API request logs
- Performance warnings
- Deprecation notices
```

## Common Debugging Patterns

### Pattern 1: Element Not Found Error

**Error:** `Element not found: button[name="Submit"]`

**Debug Steps:**
1. Open `accessibility-snapshot.txt`
2. Search for "button" or "Submit"
3. Check if element exists with different name
4. Verify element is visible (not hidden)
5. Check screenshot to confirm visual state

**Fix:**
- Update selector to match actual element
- Add `waitFor` if element loads asynchronously
- Check if element is in a different viewport

### Pattern 2: JavaScript Error

**Error:** `Cannot read property 'data' of undefined`

**Debug Steps:**
1. Open `js-errors.txt` for full stack trace
2. Open `console-logs.txt` for API call logs
3. Identify which API call failed
4. Check if error occurs on initial render or interaction

**Fix:**
- Add null checks in code
- Add loading states
- Handle API errors gracefully
- Add error boundaries

### Pattern 3: Timeout Exceeded

**Error:** `Test timeout of 30000ms exceeded`

**Debug Steps:**
1. Check `console-logs.txt` for slow operations
2. Review `accessibility-snapshot.txt` for page state
3. Check `page-screenshot.png` for loading indicators
4. Look for network requests in Playwright trace

**Fix:**
- Optimize slow operations
- Increase timeout for specific test
- Add loading indicators
- Mock slow API calls in tests

### Pattern 4: Visual Regression

**Error:** `Expected element to be visible`

**Debug Steps:**
1. Open `page-screenshot.png`
2. Compare with expected design
3. Check `accessibility-snapshot.txt` for element presence
4. Review CSS classes and styling

**Fix:**
- Update CSS styles
- Fix z-index or opacity issues
- Ensure responsive design works
- Check Arabic font rendering

## Using Agent Browser Locally

You can reproduce CI failures locally using agent-browser:

### Installation

```bash
# Already installed as devDependency
npm install

# Install Chromium browser
npx agent-browser install --with-deps
```

### Basic Usage

```bash
# Start your app
npm run dev

# Open agent-browser session
npx agent-browser open http://localhost:5173

# Get accessibility snapshot
npx agent-browser snapshot -i -c

# Take screenshot
npx agent-browser screenshot debug.png --full

# Check console and errors
npx agent-browser console
npx agent-browser errors

# Close browser
npx agent-browser close
```

### Interactive Debugging

```bash
# Navigate to page
npx agent-browser open http://localhost:5173

# Get snapshot to see available elements
npx agent-browser snapshot -i -c

# Click elements using refs from snapshot
npx agent-browser click @e1
npx agent-browser click @e2

# Fill form fields
npx agent-browser fill @e3 "test input"

# Check results
npx agent-browser snapshot -i -c
npx agent-browser screenshot result.png
```

### Using Sessions

```bash
# Create isolated session
npx agent-browser --session debug open http://localhost:5173
npx agent-browser --session debug click @e1
npx agent-browser --session debug snapshot -i -c
npx agent-browser --session debug close
```

## Snapshot References (@ref)

Agent browser uses `@ref` notation for deterministic element selection:

### Reading Snapshot

```
- heading "Poetry Bil-Araby" [ref=e1] [level=1]
- button "🐇 Discover New Poem" [ref=e2]
- button "▶️ Play" [ref=e3]
- textbox "Search..." [ref=e4]
- link "About" [ref=e5]
```

### Using Refs

```bash
# Click the discover button
npx agent-browser click @e2

# Fill the search box
npx agent-browser fill @e4 "نزار قباني"

# Get text from heading
npx agent-browser get text @e1

# Check if button is visible
npx agent-browser is visible @e3
```

## Helper Scripts

The CI uses these helper scripts (available in `.github/scripts/`):

### agent-browser-debug.sh

Captures full browser state for debugging.

```bash
# Usage
./.github/scripts/agent-browser-debug.sh <url> <output-dir>

# Example
./.github/scripts/agent-browser-debug.sh http://localhost:5173 ./debug-output
```

### agent-browser-snapshot.sh

Quick snapshot capture (lighter than full debug).

```bash
# Usage
./.github/scripts/agent-browser-snapshot.sh <url> <output-file>

# Example
./.github/scripts/agent-browser-snapshot.sh http://localhost:5173 snapshot.json
```

### agent-browser-analyze.sh

Analyzes Playwright test failures and creates AI-friendly reports.

```bash
# Usage
./.github/scripts/agent-browser-analyze.sh <test-results-dir> <output-dir>

# Example
./.github/scripts/agent-browser-analyze.sh ./test-results ./analysis
```

## CI Workflow Integration

### E2E Tests

```yaml
- name: Run Playwright E2E tests
  run: npm run test:e2e
  continue-on-error: true
  id: e2e-tests-run

- name: Install agent-browser for failure analysis
  if: always() && steps.e2e-tests-run.outcome == 'failure'
  run: npx agent-browser install --with-deps

- name: Capture browser state with agent-browser
  if: always() && steps.e2e-tests-run.outcome == 'failure'
  run: .github/scripts/agent-browser-debug.sh "http://localhost:5173" "./agent-browser-debug"
```

### UI/UX Tests

Same pattern but with UI-specific output directories.

## Best Practices for AI Agents

1. **Start with AI-DEBUGGING-GUIDE.md** - Always read this first
2. **Check js-errors.txt** - Most failures are JavaScript errors
3. **Review accessibility-snapshot.txt** - Understand page structure
4. **Compare screenshot** - Visual verification of issue
5. **Reproduce locally** - Use agent-browser locally if needed
6. **Fix and verify** - Run tests locally before pushing

## Troubleshooting

### Issue: Agent browser not capturing

**Cause:** Dev server didn't start or crashed

**Fix:**
1. Check CI logs for dev server errors
2. Verify app builds successfully
3. Check for port conflicts

### Issue: Empty snapshots

**Cause:** Page didn't load in time

**Fix:**
1. Increase wait time in scripts
2. Check for JavaScript errors blocking render
3. Verify network connectivity in CI

### Issue: Artifacts not uploaded

**Cause:** `continue-on-error: true` prevented upload

**Fix:**
- Artifacts are uploaded with `if: always()`
- Check workflow file for correct conditions

## Advanced Features

### JSON Output (Machine-Readable)

```bash
# Get JSON snapshot for parsing
npx agent-browser snapshot -i -c --json > snapshot.json

# Parse with jq
cat snapshot.json | jq '.data.refs'
```

### Custom Viewport

```bash
# Set specific viewport size
npx agent-browser set viewport 1920 1080
npx agent-browser screenshot desktop.png

npx agent-browser set viewport 375 667
npx agent-browser screenshot mobile.png
```

### Multiple Sessions

```bash
# Run multiple isolated sessions
npx agent-browser --session test1 open http://localhost:5173
npx agent-browser --session test2 open http://localhost:3000

npx agent-browser --session test1 snapshot
npx agent-browser --session test2 snapshot
```

## Resources

- **Agent Browser Docs**: https://github.com/vercel-labs/agent-browser
- **CI Workflow**: `.github/workflows/ci.yml`
- **Helper Scripts**: `.github/scripts/`
- **Playwright Docs**: https://playwright.dev/

## Example Workflow

Complete example of debugging a test failure:

```bash
# 1. Download artifacts from failed CI run
# 2. Extract and read the guide
cd agent-browser-debug-e2e
cat AI-DEBUGGING-GUIDE.md

# 3. Check for JavaScript errors
cat js-errors.txt
# Output: "TypeError: Cannot read property 'poems' of undefined"

# 4. Check console logs for context
cat console-logs.txt
# Output: "API call to /api/poems/random failed: 404"

# 5. View screenshot to understand UI state
open page-screenshot.png
# Shows loading spinner stuck

# 6. Check accessibility snapshot
cat accessibility-snapshot.txt
# Confirms no poem content, only loading state

# 7. Identify root cause
# API endpoint returning 404, causing poems to be undefined

# 8. Fix the issue
# Update API endpoint or add error handling

# 9. Verify locally
npm run test:e2e

# 10. Push fix and monitor CI
git push
```

This systematic approach helps AI agents quickly identify and fix test failures.
