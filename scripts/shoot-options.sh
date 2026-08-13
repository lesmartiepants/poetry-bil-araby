#!/bin/bash
# Capture every reader-layout option on the SAME poem at the SAME viewport, and print
# each one's geometry probe so the screenshots and the numbers come from one run.
#
#   scripts/shoot-options.sh 393x852 2 all        # poem index 2 (12 lines), fully revealed
#   scripts/shoot-options.sh 393x852 2 partial    # as-landed
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
SIZE="${1:-393x852}"
POEM="${2:-2}"
REVEAL="${3:-all}"
HOST="http://localhost:8102"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/design-review/reader-layouts/shots"
mkdir -p "$OUT"

Q="poem=$POEM&clean"
[ "$REVEAL" = "all" ] && Q="$Q&reveal=all"

"$B" viewport "$SIZE" >/dev/null
for f in baseline a-recede b-flow c-focus d-frame e-composite; do
  "$B" goto "$HOST/$f.html?$Q" >/dev/null
  sleep 4
  "$B" screenshot "$OUT/$f-${SIZE}-${REVEAL}.png" --viewport >/dev/null
  printf '%-10s ' "$f"
  "$B" js "JSON.stringify(window.__readerProbe())"
done
