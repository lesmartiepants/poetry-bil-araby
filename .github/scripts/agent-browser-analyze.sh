#!/bin/bash
#
# Agent Browser Failure Analysis Script
# ======================================
# Analyzes test failures using agent-browser and generates AI-friendly reports.
# This script is designed to run after Playwright test failures.
#
# Usage: ./agent-browser-analyze.sh <playwright-report-dir> <output-dir>
# Example: ./agent-browser-analyze.sh "./test-results" "./analysis"
#

set -e

REPORT_DIR="${1:-./test-results}"
OUTPUT_DIR="${2:-./agent-browser-analysis}"

echo "🔍 Agent Browser Failure Analysis"
echo "📂 Report Dir: $REPORT_DIR"
echo "📂 Output Dir: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# Check if Playwright report exists
if [ ! -d "$REPORT_DIR" ]; then
    echo "⚠️  No test results found at $REPORT_DIR"
    echo "ℹ️  This script should run after Playwright tests fail"
    exit 0
fi

# Count failures
FAILURE_COUNT=$(find "$REPORT_DIR" -name "*.png" -o -name "*.webm" | wc -l)
echo "📊 Found $FAILURE_COUNT failure artifacts"

if [ "$FAILURE_COUNT" -eq 0 ]; then
    echo "✅ No test failures detected - analysis not needed"
    exit 0
fi

# Create summary report
cat > "$OUTPUT_DIR/FAILURE-SUMMARY.md" << EOF
# Test Failure Analysis

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Failure Artifacts:** $FAILURE_COUNT

## Failure Details

EOF

# List all failure screenshots
echo "## Screenshots" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
echo "" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"

find "$REPORT_DIR" -name "*.png" | while read -r screenshot; do
    TEST_NAME=$(basename "$(dirname "$screenshot")")
    echo "- **$TEST_NAME**" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
    echo "  - Screenshot: \`$(basename "$screenshot")\`" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
    
    # Copy screenshot to analysis dir with descriptive name
    cp "$screenshot" "$OUTPUT_DIR/${TEST_NAME}-failure.png"
done

# List all failure videos
echo "" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
echo "## Videos" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
echo "" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"

find "$REPORT_DIR" -name "*.webm" | while read -r video; do
    TEST_NAME=$(basename "$(dirname "$video")")
    echo "- **$TEST_NAME**" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
    echo "  - Video: \`$(basename "$video")\`" >> "$OUTPUT_DIR/FAILURE-SUMMARY.md"
done

# Create AI debugging instructions
cat >> "$OUTPUT_DIR/FAILURE-SUMMARY.md" << 'EOF'

## AI Agent Instructions

### Quick Debugging Steps

1. **Review screenshots** in this directory
   - Each screenshot shows the UI state when the test failed
   - File naming: `{test-name}-failure.png`

2. **Check Playwright HTML report** (uploaded as artifact)
   - Contains detailed test traces
   - Shows step-by-step execution
   - Includes console logs and network activity

3. **Common failure patterns:**

   **Pattern: "Element not found"**
   - Element may not be rendered yet (timing issue)
   - Element selector may be incorrect
   - Element may be hidden or outside viewport
   - Fix: Add `waitFor` or check element visibility

   **Pattern: "Expected text not visible"**
   - Text may not have loaded yet (API delay)
   - Text may be in wrong language (Arabic vs English)
   - Fix: Wait for text or check API response

   **Pattern: "Timeout exceeded"**
   - Operation took longer than 30s (CI timeout)
   - Network request may be slow or failing
   - Fix: Optimize performance or increase timeout

   **Pattern: "JavaScript error"**
   - Check browser console in Playwright trace
   - Look for uncaught exceptions
   - Fix: Add error boundaries or fix the error

### Using agent-browser to Reproduce

If you need to investigate interactively:

```bash
# Start the app (if not already running)
npm run dev

# Open agent-browser
npx agent-browser open http://localhost:5173

# Get current UI state
npx agent-browser snapshot -i -c

# Check for errors
npx agent-browser errors
npx agent-browser console

# Take a comparison screenshot
npx agent-browser screenshot current-state.png --full
```

### Fixing the Issue

1. Identify the root cause from artifacts
2. Reproduce locally if needed
3. Fix the code
4. Run tests locally to verify: `npm run test:e2e`
5. Push changes and monitor CI

EOF

echo ""
echo "✅ Analysis complete!"
echo ""
echo "📄 Summary: $OUTPUT_DIR/FAILURE-SUMMARY.md"
echo "📸 Screenshots: $OUTPUT_DIR/*-failure.png"
echo ""
