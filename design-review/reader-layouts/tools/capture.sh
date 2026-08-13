#!/bin/bash
# Capture every layout option on the SAME poem at the SAME viewport, and print each one's
# geometry probe, so the screenshots and the numbers come from a single run.
#
# Serve this folder first:
#   npx http-server design-review/reader-layouts -p 8102 -c-1
#
#   design-review/reader-layouts/tools/capture.sh 393x852 3 all
#     $1 viewport   393x852 (iPhone 16) | 375x812 | 1280x900
#     $2 poem index 0 epigram(4) 1 short(8) 2 medium(12) 3 qasida(22)
#     $3 reveal     all = steady state | partial = as landed
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
SIZE="${1:-393x852}"
POEM="${2:-3}"
REVEAL="${3:-all}"
HOST="${LAYOUTS_URL:-http://localhost:8102}"
LAYOUTS="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$LAYOUTS/shots"
mkdir -p "$OUT"

#     $4 lang       bi (default, what ships) | ar (no translation) | translit (3 rows)
LANG="${4:-bi}"
Q="poem=$POEM&clean&lang=$LANG"
[ "$REVEAL" = "all" ] && Q="$Q&reveal=all"
SUFFIX=""
[ "$LANG" != "bi" ] && SUFFIX="-$LANG"

"$B" viewport "$SIZE" >/dev/null
for f in baseline a-recede b-flow c-focus d-frame e-composite; do
  "$B" goto "$HOST/$f.html?$Q" >/dev/null
  sleep 4
  "$B" screenshot "$OUT/$f-${SIZE}-${REVEAL}${SUFFIX}.png" --viewport >/dev/null
  printf '%-12s ' "$f"
  "$B" js "JSON.stringify(window.__readerProbe())"
done
