#!/bin/bash
# Screenshot helper for the reader-layout exploration.
#   scripts/shoot.sh <url> <WxH> <outfile> [full]
# `full` clicks "Read full poem" (real app) or #readfull (prototypes) first.
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
URL="$1"; SIZE="$2"; OUT="$3"; MODE="${4:-partial}"
"$B" viewport "$SIZE" >/dev/null
"$B" goto "$URL" >/dev/null
sleep 6
if [ "$MODE" = "full" ]; then
  "$B" click '[data-testid="reader-read-full"]' >/dev/null 2>&1 || \
  "$B" click '.ra-readfull' >/dev/null 2>&1 || true
  sleep 3
fi
"$B" screenshot "$OUT" --viewport
