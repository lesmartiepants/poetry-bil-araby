#!/bin/bash
# Measure the SHIPPING reader's geometry (not the prototypes) via tools/probe-app.mjs.
# Needs the app running: `npm run dev -- --port 8099`.
#
#   design-review/reader-layouts/tools/measure-app.sh 393x852 full
#
# 393x852 is iPhone 16. 393x750 approximates the same device with Safari's URL bar and
# bottom toolbar shown — the height `100vh` overstates.
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
SIZE="${1:-393x852}"
MODE="${2:-partial}"     # partial = as landed | full = after "Read full poem"
APP="${APP_URL:-http://localhost:8099}"
TOOLS="$(cd "$(dirname "$0")" && pwd)"

"$B" viewport "$SIZE" >/dev/null
"$B" goto "$APP/" >/dev/null
sleep 7
if [ "$MODE" = "full" ]; then
  "$B" click '[data-testid="reader-read-full"]' >/dev/null 2>&1 || true
  sleep 3
fi
echo "### shipping reader — $SIZE ($MODE)"
"$B" js "$(cat "$TOOLS/probe-app.mjs")" > "$TOOLS/.probe.json"
node "$TOOLS/report.mjs" "$TOOLS/.probe.json"
rm -f "$TOOLS/.probe.json"
