#!/bin/bash
# Width-budget probe — see scripts/measure-width.mjs.
#   scripts/measure-width.sh 393x852
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
SIZE="${1:-393x852}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
"$B" viewport "$SIZE" >/dev/null
"$B" goto "http://localhost:8099/" >/dev/null
sleep 7
"$B" click '[data-testid="reader-read-full"]' >/dev/null 2>&1 || true
sleep 2
echo "### $SIZE"
"$B" js "$(cat "$DIR/scripts/measure-width.mjs")"
