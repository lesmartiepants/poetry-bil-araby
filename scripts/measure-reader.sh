#!/bin/bash
# Run the reader-geometry probe (scripts/measure-reader.mjs) in the browse daemon
# against a PINNED poem so numbers are comparable across viewports.
#
#   scripts/measure-reader.sh 393x852 full 89425
#
# 393x852 is iPhone 16. 393x750 approximates the same device with Safari's URL bar
# and bottom toolbar shown, which is the height `100vh` overstates.
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
SIZE="${1:-393x852}"
MODE="${2:-partial}"
POEM="${3:-89425}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
"$B" viewport "$SIZE" >/dev/null
"$B" goto "http://localhost:8099/poem/$POEM" >/dev/null
sleep 7
if [ "$MODE" = "full" ]; then
  "$B" click '[data-testid="reader-read-full"]' >/dev/null 2>&1 || true
  sleep 3
fi
echo "### $SIZE mode=$MODE poem=$POEM"
"$B" js "$(cat "$DIR/scripts/measure-reader.mjs")" > "$DIR/.measure.json"
node "$DIR/scripts/report-measure.mjs" "$DIR/.measure.json"
rm -f "$DIR/.measure.json"
