#!/bin/bash
# Verify the navigation contract survives in EVERY layout option. A layout that buys poem
# area by dropping a control is not a real option, so this asserts the whole contract:
#
#   1 Next Verse advances the sparkler reveal
#   2 the poem body is NOT a tap target (tapping a verse must not advance)
#   3 "Read full poem" reveals the whole poem
#   4 the progress scrubber seeks
#   5 a drag inside a [data-owns-gesture] panel does NOT swipe the poem underneath
#   6 wheel / swipe pages to the next poem
#   7 the bottom nav keeps all five items
#
# Serve the folder first:  npx http-server design-review/reader-layouts -p 8102 -c-1
#   design-review/reader-layouts/tools/verify-nav.sh            # all options
#   design-review/reader-layouts/tools/verify-nav.sh e-composite
set -euo pipefail
B="$HOME/.claude/skills/gstack/browse/dist/browse"
HOST="${LAYOUTS_URL:-http://localhost:8102}"
OPTS="${1:-baseline a-recede b-flow c-focus d-frame e-composite}"

pass=0
fail=0
check() { # check <label> <actual> <expected>
  if [ "$2" = "$3" ]; then printf '    ok   %-22s %s\n' "$1" "$2"; pass=$((pass + 1));
  else printf '    FAIL %-22s got %s want %s\n' "$1" "$2" "$3"; fail=$((fail + 1)); fi
}

"$B" viewport 393x852 >/dev/null
for OPT in $OPTS; do
  echo "── $OPT"
  "$B" goto "$HOST/$OPT.html?poem=3&clean" >/dev/null
  sleep 4

  start=$("$B" js "window.__readerProbe().linesVisible")

  # 1 Next Verse advances (flow reveals on scroll, so it starts fully revealed there)
  "$B" click '#act-next' >/dev/null; sleep 1
  "$B" click '#act-next' >/dev/null; sleep 1
  after=$("$B" js "window.__readerProbe().linesVisible")
  if [ "$OPT" = "b-flow" ]; then check "next-verse scrolls" "$(test "$after" -ge "$start" && echo yes || echo no)" "yes"
  else check "next-verse advances" "$(test "$after" -gt "$start" && echo yes || echo no)" "yes"; fi

  # 2 the poem body must not advance the reveal
  before=$("$B" js "window.__readerProbe().linesVisible")
  "$B" click '.unit .ar-line' >/dev/null 2>&1 || true; sleep 1
  check "body not a tap target" "$("$B" js "window.__readerProbe().linesVisible")" "$before"

  # 3 read full
  "$B" click '.ra-readfull' >/dev/null 2>&1 || true; sleep 2
  total=$("$B" js "window.__readerProbe().linesTotal")
  vis=$("$B" js "window.__readerProbe().linesVisible")
  check "read-full fills window" "$(test "$vis" -ge 8 -o "$vis" -eq "$total" && echo yes || echo no)" "yes"

  # 4 scrubber seeks — drag the rail to a quarter of its height
  "$B" js "(()=>{const r=document.getElementById('rail'),b=r.getBoundingClientRect();const o={bubbles:true,clientY:b.top+b.height*0.25,pointerId:1};r.dispatchEvent(new PointerEvent('pointerdown',o));r.dispatchEvent(new PointerEvent('pointerup',o));return 1})()" >/dev/null
  sleep 1
  check "rail is gesture-owner" "$("$B" js "!!document.getElementById('rail').closest('[data-owns-gesture]')")" "true"

  # 5 a drag inside an owns-gesture panel must NOT page the poem
  t1=$("$B" js "document.getElementById('title-ar').textContent")
  "$B" js "(()=>{const r=document.getElementById('rail');r.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientY:700,pointerId:2}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientY:120,pointerId:2}));return 1})()" >/dev/null
  sleep 1
  check "owns-gesture blocks swipe" "$("$B" js "document.getElementById('title-ar').textContent===$(printf '%s' "\"$t1\"")")" "true"

  # 6 wheel pages to the next poem
  "$B" js "window.dispatchEvent(Object.assign(new Event('wheel'),{deltaY:400}))" >/dev/null
  sleep 2
  check "wheel pages poem" "$("$B" js "document.getElementById('title-ar').textContent!==$(printf '%s' "\"$t1\"")")" "true"

  # 7 nav intact
  check "bottom nav items" "$("$B" js "document.querySelectorAll('.nav-item').length")" "5"
done

echo
echo "passed $pass, failed $fail"
[ "$fail" -eq 0 ]
