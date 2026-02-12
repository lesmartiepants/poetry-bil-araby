#!/bin/bash
#
# Agent Browser Snapshot Script
# ==============================
# Captures a quick snapshot of the application UI state for AI debugging.
# Lighter weight than full debug script - just snapshot + screenshot.
#
# Usage: ./agent-browser-snapshot.sh <test-url> <output-file>
# Example: ./agent-browser-snapshot.sh "http://localhost:5173" "snapshot.json"
#

set -e

TEST_URL="${1:-http://localhost:5173}"
OUTPUT_FILE="${2:-snapshot.json}"

echo "📸 Capturing browser snapshot..."

# Ensure agent-browser is installed
npx agent-browser install > /dev/null 2>&1 || true

# Open browser and navigate
npx agent-browser open "$TEST_URL" --session snapshot-session --json > /dev/null

# Wait for page load
sleep 2

# Capture snapshot
echo "📋 Generating accessibility snapshot..."
npx agent-browser --session snapshot-session snapshot -i -c --json > "$OUTPUT_FILE"

# Also save human-readable version
READABLE_FILE="${OUTPUT_FILE%.json}.txt"
npx agent-browser --session snapshot-session snapshot -i -c > "$READABLE_FILE"

# Close browser
npx agent-browser --session snapshot-session close > /dev/null

echo "✅ Snapshot saved:"
echo "   JSON: $OUTPUT_FILE (for AI agents)"
echo "   Text: $READABLE_FILE (human-readable)"
