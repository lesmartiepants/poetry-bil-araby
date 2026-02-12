#!/bin/bash
#
# Agent Browser Debug Script for E2E Tests
# =========================================
# This script captures browser state when E2E tests fail in CI.
# AI agents can use the artifacts to debug failures without re-running tests.
#
# Usage: ./agent-browser-debug.sh <test-url> <output-dir>
# Example: ./agent-browser-debug.sh "http://localhost:5173" "./debug-output"
#

set -e

TEST_URL="${1:-http://localhost:5173}"
OUTPUT_DIR="${2:-./agent-browser-debug}"

echo "🤖 Agent Browser Debug - Capturing browser state..."
echo "📍 URL: $TEST_URL"
echo "📂 Output: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if agent-browser is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Install Node.js first."
    exit 1
fi

# Install Chromium for agent-browser if not already installed
echo "📦 Ensuring browser is installed..."
npx agent-browser install --with-deps || true

# Start browser session and navigate to test URL
echo "🌐 Opening browser at $TEST_URL..."
npx agent-browser open "$TEST_URL" --session debug-session

# Wait for page to load
echo "⏳ Waiting for page to load..."
sleep 3

# Capture accessibility snapshot (best for AI agents)
echo "📸 Capturing accessibility snapshot..."
npx agent-browser --session debug-session snapshot -i -c > "$OUTPUT_DIR/accessibility-snapshot.txt"
npx agent-browser --session debug-session snapshot -i -c --json > "$OUTPUT_DIR/accessibility-snapshot.json"

# Capture full page screenshot
echo "📷 Taking full page screenshot..."
npx agent-browser --session debug-session screenshot "$OUTPUT_DIR/page-screenshot.png" --full

# Capture console logs
echo "📋 Capturing console logs..."
npx agent-browser --session debug-session console > "$OUTPUT_DIR/console-logs.txt" || echo "No console logs available"

# Capture JavaScript errors
echo "⚠️  Capturing JavaScript errors..."
npx agent-browser --session debug-session errors > "$OUTPUT_DIR/js-errors.txt" || echo "No errors detected"

# Get page title and URL
echo "📄 Capturing page metadata..."
npx agent-browser --session debug-session get title > "$OUTPUT_DIR/page-title.txt"
npx agent-browser --session debug-session get url > "$OUTPUT_DIR/page-url.txt"

# Capture viewport size
echo "📐 Capturing viewport info..."
echo "Viewport dimensions captured in snapshot metadata" > "$OUTPUT_DIR/viewport-info.txt"

# Close browser
echo "🔒 Closing browser..."
npx agent-browser --session debug-session close

# Create summary file for AI agents
cat > "$OUTPUT_DIR/AI-DEBUGGING-GUIDE.md" << 'EOF'
# AI Agent Debugging Guide

This directory contains browser state captured by agent-browser for debugging test failures.

## Files Available

1. **accessibility-snapshot.txt** - Human-readable accessibility tree with interactive elements
2. **accessibility-snapshot.json** - Machine-readable snapshot with element refs for automation
3. **page-screenshot.png** - Full page screenshot showing visual state
4. **console-logs.txt** - Browser console output (log, warn, error, info)
5. **js-errors.txt** - JavaScript errors and exceptions
6. **page-title.txt** - Current page title
7. **page-url.txt** - Current page URL

## How to Use These Artifacts

### For AI Agents (Copilot, Claude, etc.)

1. **Start with the accessibility snapshot** (`accessibility-snapshot.txt`)
   - Shows all interactive elements with refs (e.g., @e1, @e2)
   - Helps understand page structure and available actions
   - Use refs to identify elements for debugging

2. **Check JavaScript errors** (`js-errors.txt`)
   - Most test failures are caused by JavaScript errors
   - Look for stack traces and error messages
   - Common issues: undefined variables, API failures, missing DOM elements

3. **Review console logs** (`console-logs.txt`)
   - Application logging and warnings
   - API request/response logs
   - React warnings and errors

4. **Examine the screenshot** (`page-screenshot.png`)
   - Verify visual rendering
   - Check for missing elements or layout issues
   - Confirm Arabic text rendering and RTL layout

### Common Debugging Patterns

**Pattern 1: Element Not Found**
```
Error: Element not found: button[name="Submit"]

Debug steps:
1. Check accessibility-snapshot.txt for available buttons
2. Look for the button by text or role
3. Verify element ref (e.g., @e5) is correct
4. Check if element is rendered (visible in screenshot)
```

**Pattern 2: JavaScript Error**
```
Error: Cannot read property 'data' of undefined

Debug steps:
1. Check js-errors.txt for full stack trace
2. Review console-logs.txt for API call failures
3. Look for async timing issues (data not loaded yet)
4. Check if error occurs during initial render or user interaction
```

**Pattern 3: Visual Regression**
```
Error: Expected element to be visible

Debug steps:
1. Compare screenshot with expected design
2. Check accessibility snapshot for element presence
3. Verify CSS classes and styling in snapshot
4. Look for z-index, opacity, or display:none issues
```

## Using agent-browser Locally

If you need to reproduce the failure locally:

```bash
# Navigate to the app
npx agent-browser open http://localhost:5173

# Get interactive snapshot
npx agent-browser snapshot -i -c

# Click elements using refs from snapshot
npx agent-browser click @e1

# Fill form fields
npx agent-browser fill @e3 "test input"

# Take screenshots
npx agent-browser screenshot debug.png

# Check console and errors
npx agent-browser console
npx agent-browser errors
```

## CI-Specific Notes

- This capture was taken in a CI environment (headless browser)
- Viewport: 1280x720 (CI default)
- Browser: Chromium (latest from agent-browser)
- Network: May have different timing than local development
- No API keys available in CI (mock data used for tests)
EOF

echo "✅ Debug artifacts captured successfully!"
echo ""
echo "📦 Artifacts saved to: $OUTPUT_DIR"
echo ""
echo "🤖 AI Agents: Read AI-DEBUGGING-GUIDE.md for instructions"
echo ""
ls -lh "$OUTPUT_DIR"
