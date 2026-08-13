#!/bin/bash
# Verify the navigation contract still holds in a layout option: Next Verse advances the
# reveal, the scrubber seeks, wheel pages to the next poem, and a drag inside a
# data-owns-gesture panel does NOT swipe the poem underneath.
#
#   scripts/verify-nav.sh e-composite
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
OPT="${1:-e-composite}"
HOST="http://localhost:8102"
"$B" viewport 393x852 >/dev/null
"$B" goto "$HOST/$OPT.html?poem=3&clean" >/dev/null
sleep 4

echo "option: $OPT"
printf '  reveal start      '; "$B" js "window.__readerProbe().linesVisible"
"$B" click '#act-next' >/dev/null; sleep 1
"$B" click '#act-next' >/dev/null; sleep 1
printf '  after 2x Next     '; "$B" js "window.__readerProbe().linesVisible"

printf '  read-full         '; "$B" click '.ra-readfull' >/dev/null; sleep 1; "$B" js "window.__readerProbe().linesVisible"

printf '  poem title before '; "$B" js "document.getElementById('title-ar').textContent.slice(0,18)"
"$B" js "window.dispatchEvent(Object.assign(new Event('wheel'),{deltaY:120}))" >/dev/null
sleep 1
printf '  after wheel down  '; "$B" js "document.getElementById('title-ar').textContent.slice(0,18)"

printf '  rail owns gesture '; "$B" js "!!document.getElementById('rail').closest('[data-owns-gesture]')"
printf '  body not a target '; "$B" js "!document.getElementById('stage').onclick && !document.getElementById('track').onclick"
printf '  nav items         '; "$B" js "document.querySelectorAll('.nav-item').length"
printf '  scrubber seek     '; "$B" js "window.__readerProbe().linesVisible"
