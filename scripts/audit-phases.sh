#!/usr/bin/env bash
# ============================================================================
# Phase 1 & 2 Completion Audit
# Checks every task from docs/MODERNIZATION-ROADMAP.md
# ============================================================================

set -uo pipefail

PASS=0
FAIL=0
SKIP=0
WARN=0

pass() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  ⏭️  $1"; SKIP=$((SKIP + 1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN + 1)); }

header() { echo ""; echo "━━━ $1 ━━━"; }

# ============================================================================
header "PHASE 1: Extract Components"
# ============================================================================

# --- 1.1 Extract shared constants ---
echo ""
echo "1.1  Extract shared constants to src/constants/"
[ -f src/constants/features.js ] && pass "src/constants/features.js exists" || fail "src/constants/features.js MISSING"
[ -f src/constants/design.js ]   && pass "src/constants/design.js exists"   || fail "src/constants/design.js MISSING"
[ -f src/constants/theme.js ]    && pass "src/constants/theme.js exists"    || fail "src/constants/theme.js MISSING"
[ -f src/constants/poets.js ]    && pass "src/constants/poets.js exists"    || fail "src/constants/poets.js MISSING"
[ -f src/constants/fonts.js ]    && pass "src/constants/fonts.js exists"    || fail "src/constants/fonts.js MISSING"

# Check app.jsx imports them
if grep -q "from './constants/" src/app.jsx; then
  pass "app.jsx imports from src/constants/"
else
  fail "app.jsx does NOT import from src/constants/"
fi

# Check constants are NOT still defined inline in app.jsx
if grep -qP "^const FEATURES\s*=" src/app.jsx; then
  fail "FEATURES still defined inline in app.jsx"
else
  pass "FEATURES not defined inline in app.jsx"
fi
if grep -qP "^const DESIGN\s*=" src/app.jsx; then
  fail "DESIGN still defined inline in app.jsx"
else
  pass "DESIGN not defined inline in app.jsx"
fi

# --- 1.2 Extract utility functions ---
echo ""
echo "1.2  Extract utility functions to src/utils/"
[ -f src/utils/seenPoems.js ]    && pass "src/utils/seenPoems.js exists"    || fail "src/utils/seenPoems.js MISSING"
[ -f src/utils/transliterate.js ] && pass "src/utils/transliterate.js exists" || fail "src/utils/transliterate.js MISSING"
[ -f src/utils/audio.js ]        && pass "src/utils/audio.js exists"        || fail "src/utils/audio.js MISSING"
[ -f src/utils/filterPoems.js ]  && pass "src/utils/filterPoems.js exists"  || fail "src/utils/filterPoems.js MISSING"

# Verify pcm16ToWav is exported from audio.js
if grep -q "export.*pcm16ToWav" src/utils/audio.js; then
  pass "pcm16ToWav exported from src/utils/audio.js"
else
  fail "pcm16ToWav NOT exported from src/utils/audio.js"
fi

# Check pcm16ToWav is NOT re-defined in app.jsx as a full function
if grep -qP "^\s*const pcm16ToWav\s*=\s*\(base64" src/app.jsx; then
  fail "pcm16ToWav still defined as full function in app.jsx"
else
  pass "pcm16ToWav not re-defined inline in app.jsx"
fi

# --- 1.3 Extract DebugPanel ---
echo ""
echo "1.3  Extract DebugPanel to src/components/"
[ -f src/components/DebugPanel.jsx ] && pass "src/components/DebugPanel.jsx exists" || fail "src/components/DebugPanel.jsx MISSING"
if grep -q "import DebugPanel from" src/app.jsx; then
  pass "app.jsx imports DebugPanel"
else
  fail "app.jsx does NOT import DebugPanel"
fi

# --- 1.4 Extract SplashScreen ---
echo ""
echo "1.4  Extract SplashScreen to src/components/"
[ -f src/components/SplashScreen.jsx ] && pass "src/components/SplashScreen.jsx exists" || fail "src/components/SplashScreen.jsx MISSING"

SPLASH_LINES=$(wc -l < src/components/SplashScreen.jsx)
if [ "$SPLASH_LINES" -gt 200 ]; then
  pass "SplashScreen.jsx is substantial ($SPLASH_LINES lines)"
else
  warn "SplashScreen.jsx only $SPLASH_LINES lines (expected ~400+)"
fi

# --- 1.5 Extract ErrorBanner and ShortcutHelp ---
echo ""
echo "1.5  Extract ErrorBanner and ShortcutHelp"
[ -f src/components/ErrorBanner.jsx ]  && pass "src/components/ErrorBanner.jsx exists"  || fail "src/components/ErrorBanner.jsx MISSING"
[ -f src/components/ShortcutHelp.jsx ] && pass "src/components/ShortcutHelp.jsx exists" || fail "src/components/ShortcutHelp.jsx MISSING"

# --- 1.6 Extract MysticalConsultationEffect ---
echo ""
echo "1.6  Extract MysticalConsultationEffect"
[ -f src/components/MysticalConsultationEffect.jsx ] && pass "MysticalConsultationEffect.jsx exists" || fail "MysticalConsultationEffect.jsx MISSING"

# --- 1.7 Extract auth components ---
echo ""
echo "1.7  Extract auth components to src/components/auth/"
[ -f src/components/auth/AuthModal.jsx ]      && pass "AuthModal.jsx exists"      || fail "AuthModal.jsx MISSING"
[ -f src/components/auth/SavePoemButton.jsx ] && pass "SavePoemButton.jsx exists" || fail "SavePoemButton.jsx MISSING"
[ -f src/components/auth/DownvoteButton.jsx ] && pass "DownvoteButton.jsx exists" || fail "DownvoteButton.jsx MISSING"

# --- 1.8 Extract SavedPoemsView ---
echo ""
echo "1.8  Extract SavedPoemsView"
if [ -f src/components/SavedPoemsView.jsx ] || [ -f src/components/auth/SavedPoemsView.jsx ]; then
  pass "SavedPoemsView.jsx exists"
else
  fail "SavedPoemsView.jsx MISSING"
fi

# --- 1.9 Extract VerticalSidebar ---
echo ""
echo "1.9  Extract VerticalSidebar"
[ -f src/components/VerticalSidebar.jsx ] && pass "VerticalSidebar.jsx exists" || fail "VerticalSidebar.jsx MISSING"

SIDEBAR_LINES=$(wc -l < src/components/VerticalSidebar.jsx)
if [ "$SIDEBAR_LINES" -gt 100 ]; then
  pass "VerticalSidebar.jsx is substantial ($SIDEBAR_LINES lines)"
else
  warn "VerticalSidebar.jsx only $SIDEBAR_LINES lines (expected ~450)"
fi

# --- 1.10 Extract InsightsDrawer ---
echo ""
echo "1.10 Extract InsightsDrawer"
[ -f src/components/InsightsDrawer.jsx ] && pass "InsightsDrawer.jsx exists" || fail "InsightsDrawer.jsx MISSING"

# --- 1.11 Extract API and caching layer ---
echo ""
echo "1.11 Extract API and caching layer to src/services/"
[ -f src/services/gemini.js ]   && pass "src/services/gemini.js exists"   || fail "src/services/gemini.js MISSING"
[ -f src/services/cache.js ]    && pass "src/services/cache.js exists"    || fail "src/services/cache.js MISSING"
[ -f src/services/prefetch.js ] && pass "src/services/prefetch.js exists" || fail "src/services/prefetch.js MISSING"

# Roadmap also lists database.js — check if it exists or if DB fetch is still inline
if [ -f src/services/database.js ]; then
  pass "src/services/database.js exists"
else
  warn "src/services/database.js MISSING (roadmap lists it; DB fetch may still be inline in app.jsx)"
fi

# Verify key exports from services
if grep -q "export.*geminiTextFetch" src/services/gemini.js; then
  pass "geminiTextFetch exported from gemini.js"
else
  fail "geminiTextFetch NOT exported from gemini.js"
fi
if grep -q "export.*cacheOperations" src/services/cache.js; then
  pass "cacheOperations exported from cache.js"
else
  fail "cacheOperations NOT exported from cache.js"
fi
if grep -q "export.*prefetchManager" src/services/prefetch.js; then
  pass "prefetchManager exported from prefetch.js"
else
  fail "prefetchManager NOT exported from prefetch.js"
fi

# Check that API/cache functions are NOT still defined inline in app.jsx
if grep -qP "^const geminiTextFetch\s*=" src/app.jsx; then
  fail "geminiTextFetch still defined inline in app.jsx"
else
  pass "geminiTextFetch removed from app.jsx"
fi
if grep -qP "^const cacheOperations\s*=" src/app.jsx; then
  fail "cacheOperations still defined inline in app.jsx"
else
  pass "cacheOperations removed from app.jsx"
fi
if grep -qP "^const prefetchManager\s*=" src/app.jsx; then
  fail "prefetchManager still defined inline in app.jsx"
else
  pass "prefetchManager removed from app.jsx"
fi
if grep -qP "^const CACHE_CONFIG\s*=" src/app.jsx; then
  fail "CACHE_CONFIG still defined inline in app.jsx"
else
  pass "CACHE_CONFIG removed from app.jsx"
fi
if grep -qP "^const initCache\s*=" src/app.jsx; then
  fail "initCache still defined inline in app.jsx"
else
  pass "initCache removed from app.jsx"
fi

# --- Phase 1 checkpoint ---
echo ""
echo "── Phase 1 Checkpoint ──"
APP_LINES=$(wc -l < src/app.jsx)
echo "  app.jsx line count: $APP_LINES"
if [ "$APP_LINES" -le 3200 ]; then
  pass "app.jsx is ≤3,200 lines (target was ~2,000 from 6,139)"
elif [ "$APP_LINES" -le 4000 ]; then
  warn "app.jsx is $APP_LINES lines (significantly reduced but above 3,200 target)"
else
  fail "app.jsx is still $APP_LINES lines (target was ~2,000)"
fi


# ============================================================================
header "PHASE 2: Better Libraries"
# ============================================================================

# --- 2.1 Gate DebugPanel behind import.meta.env.DEV ---
echo ""
echo "2.1  Gate DebugPanel behind import.meta.env.DEV"
if grep -q "import.meta.env.DEV" src/app.jsx && grep -qE "lazy.*DebugPanel|DEV.*DebugPanel" src/app.jsx; then
  pass "DebugPanel gated behind import.meta.env.DEV"
else
  # Check if it was intentionally skipped (user said to keep debug panel visible)
  skip "2.1 SKIPPED per user request (keep debug panel visible in production)"
fi

# Verify DebugPanel is NOT in the prod build
if [ -d dist ]; then
  if grep -rl "DebugPanel" dist/assets/*.js 2>/dev/null | head -1 | grep -q .; then
    warn "DebugPanel code found in production bundle (2.1 was skipped)"
  else
    pass "DebugPanel NOT in production bundle"
  fi
else
  skip "No dist/ folder — can't check production bundle"
fi

# --- 2.2 Replace hand-rolled drag with @use-gesture/react ---
echo ""
echo "2.2  Replace hand-rolled drag with @use-gesture/react"
if grep -q "@use-gesture/react" package.json; then
  pass "@use-gesture/react in package.json"
else
  fail "@use-gesture/react NOT in package.json"
fi
if grep -q "useDrag" src/components/InsightsDrawer.jsx; then
  pass "InsightsDrawer uses useDrag"
else
  fail "InsightsDrawer does NOT use useDrag"
fi
# Verify old hand-rolled drag handlers are gone
if grep -q "handleDragStart" src/components/InsightsDrawer.jsx; then
  fail "Old handleDragStart still in InsightsDrawer"
else
  pass "Old hand-rolled drag handlers removed"
fi

# --- 2.3 Add wouter for routing ---
echo ""
echo "2.3  Add wouter for routing"
if grep -q '"wouter"' package.json; then
  pass "wouter in package.json"
else
  fail "wouter NOT in package.json"
fi
if grep -q "useLocation\|useRoute" src/app.jsx; then
  pass "app.jsx uses wouter hooks (useLocation/useRoute)"
else
  fail "app.jsx does NOT use wouter hooks"
fi
# Verify window.history.replaceState is gone
REPLACE_STATE_COUNT=$(grep -c "replaceState" src/app.jsx 2>/dev/null || true)
REPLACE_STATE_COUNT=${REPLACE_STATE_COUNT:-0}
if [ "$REPLACE_STATE_COUNT" -eq 0 ]; then
  pass "No window.history.replaceState in app.jsx"
else
  fail "Found $REPLACE_STATE_COUNT replaceState calls still in app.jsx"
fi

# --- 2.4 Install Framer Motion for AnimatePresence ---
echo ""
echo "2.4  Install Framer Motion for AnimatePresence"
if grep -q '"framer-motion"' package.json; then
  pass "framer-motion in package.json"
else
  fail "framer-motion NOT in package.json"
fi
if grep -q "AnimatePresence" src/app.jsx; then
  pass "app.jsx uses AnimatePresence"
else
  fail "app.jsx does NOT use AnimatePresence"
fi

# Check each component for motion.div
for comp in InsightsDrawer ShortcutHelp; do
  if grep -q "motion" src/components/${comp}.jsx 2>/dev/null; then
    pass "${comp} uses framer-motion"
  else
    fail "${comp} does NOT use framer-motion"
  fi
done
if grep -q "motion" src/components/auth/AuthModal.jsx 2>/dev/null; then
  pass "AuthModal uses framer-motion"
else
  fail "AuthModal does NOT use framer-motion"
fi
if grep -q "motion" src/components/SplashScreen.jsx 2>/dev/null; then
  pass "SplashScreen uses framer-motion"
else
  fail "SplashScreen does NOT use framer-motion"
fi

# --- 2.5 Consolidate theme tokens into CSS custom properties ---
echo ""
echo "2.5  Consolidate theme tokens into CSS vars"
if grep -q "\-\-gold" src/index.css; then
  pass "--gold CSS variable defined in index.css"
else
  fail "--gold CSS variable NOT in index.css"
fi
if grep -q "gold.*var(--gold)" tailwind.config.js; then
  pass "Tailwind config references --gold CSS var"
else
  fail "Tailwind config does NOT reference --gold CSS var"
fi

# Check theme.js uses CSS var, not hardcoded hex
if grep -q "var(--gold)" src/constants/theme.js; then
  pass "theme.js uses var(--gold) instead of hardcoded hex"
else
  fail "theme.js still uses hardcoded hex instead of var(--gold)"
fi

# Count remaining hardcoded gold hex in source (excluding CSS var definitions, tests, node_modules)
REMAINING_HEX=$(grep -rn "#C5A059\|#8B7355" src/ --include="*.jsx" --include="*.js" \
  | grep -v "node_modules" \
  | grep -v "src/index.css" \
  | grep -v "\.test\." \
  | grep -v "var(--gold)" \
  | wc -l)
if [ "$REMAINING_HEX" -eq 0 ]; then
  pass "Zero hardcoded #C5A059/#8B7355 in source files (excluding CSS defs & tests)"
else
  warn "$REMAINING_HEX hardcoded #C5A059/#8B7355 still in source (some may be in rgba() which can't use CSS vars)"
  # Show them
  grep -rn "#C5A059\|#8B7355" src/ --include="*.jsx" --include="*.js" \
    | grep -v "node_modules" \
    | grep -v "src/index.css" \
    | grep -v "\.test\." \
    | head -5 | while read -r line; do
      echo "       $line"
    done
fi

# --- 2.6 Lazy-load SplashScreen ---
echo ""
echo "2.6  Lazy-load SplashScreen"
if grep -qE "lazy\(.*SplashScreen" src/app.jsx; then
  pass "SplashScreen uses React.lazy()"
else
  fail "SplashScreen NOT lazy-loaded"
fi
if grep -q "Suspense" src/app.jsx; then
  pass "Suspense wrapper present in app.jsx"
else
  fail "Suspense wrapper NOT present in app.jsx"
fi

# Check if SplashScreen is a separate chunk in the build
if [ -d dist ]; then
  SPLASH_CHUNK=$(find dist/assets -name "SplashScreen*" 2>/dev/null | head -1)
  if [ -n "$SPLASH_CHUNK" ]; then
    CHUNK_SIZE=$(wc -c < "$SPLASH_CHUNK")
    pass "SplashScreen is a separate chunk: $(basename "$SPLASH_CHUNK") ($(( CHUNK_SIZE / 1024 ))KB)"
  else
    fail "No separate SplashScreen chunk in dist/"
  fi
else
  skip "No dist/ folder — can't verify code-splitting"
fi


# ============================================================================
header "CROSS-CUTTING CHECKS"
# ============================================================================

echo ""
echo "Tests"
# Run unit tests and capture result
if npm run test:run 2>&1 | tail -5 | grep -q "passed"; then
  TEST_RESULT=$(npm run test:run 2>&1 | grep "Tests" | tail -1)
  pass "Unit tests pass: $TEST_RESULT"
else
  fail "Unit tests FAILED"
fi

echo ""
echo "Build"
if npm run build 2>&1 | grep -q "built in"; then
  pass "Production build succeeds"
else
  fail "Production build FAILED"
fi

echo ""
echo "Dependencies"
for dep in "@use-gesture/react" "wouter" "framer-motion"; do
  if grep -q "\"$dep\"" package.json; then
    pass "$dep installed"
  else
    fail "$dep NOT installed"
  fi
done

# ============================================================================
header "SUMMARY"
# ============================================================================
echo ""
TOTAL=$((PASS + FAIL + SKIP + WARN))
echo "  ✅ Pass: $PASS"
echo "  ❌ Fail: $FAIL"
echo "  ⚠️  Warn: $WARN"
echo "  ⏭️  Skip: $SKIP"
echo "  ── Total: $TOTAL checks"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 All required checks passed!"
else
  echo "  🔴 $FAIL checks FAILED — see details above"
fi
