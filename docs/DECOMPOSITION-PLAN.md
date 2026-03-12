# Decomposition Plan: Break Up Monolithic Files

## Context

`src/app.jsx` is **5,816 lines** and `server.js` is **1,598 lines**. Both are hard to modify and maintain. This plan breaks the frontend into focused modules while preserving all 136+ unit tests and 193+ E2E tests. The backend gets a minimal split (design-review routes only).

### Skills

| Skill | Source | Purpose |
|---|---|---|
| `vercel-react-best-practices` | Already installed | 58 React performance rules |
| `vercel-composition-patterns` | `npx skills add vercel-labs/agent-skills --skill composition-patterns -y` | Component architecture, state decoupling, compound components |

**Search results:** Exhaustively searched `npx skills find` (25+ queries) and cloned vercel-labs/agent-skills + ComposioHQ/awesome-claude-skills. No other relevant skills exist for React refactoring or Express architecture.

---

## Target File Structure

```
src/
  app.jsx                        (~500 lines: DiwanApp orchestration + JSX + cross-cutting effects)
  LogContext.jsx                 (~30 lines: logging context provider + useLogger hook)
  constants/
    features.js                  (FEATURES)
    design.js                    (DESIGN, GOLD, TEXT_SIZES)
    theme.js                     (THEME dark/light)
    categories.js                (CATEGORIES)
    fonts.js                     (FONTS)
  services/
    api.js                       (getApiUrl(), API_MODELS, discoverTextModels, geminiTextFetch, fetchWithRetry, TTS_CONFIG)
    cache.js                     (CACHE_CONFIG, initCache, cacheOperations)
    prefetch.js                  (prefetchManager)
  utils/
    insightParser.js             (exists)
    jsonRepair.js                (exists)
    transliterate.js             (ARABIC_TRANSLIT_MAP, transliterate())
    audio.js                     (pcm16ToWav -- deduplicated from 2 copies)
  hooks/
    useAuth.js                   (exists, 472 lines)
    useAudio.js                  (~300 lines)
    useInsights.js               (~250 lines)
    useDiscovery.js              (~200 lines)
    useDailyPoem.js              (~60 lines)
    useKeyboardShortcuts.js      (~50 lines)
    useOverflowDetect.js         (~60 lines)
  components/
    SplashScreen.jsx             (~770 lines, self-contained)
    VerticalSidebar.jsx          (~300 lines)
    DebugPanel.jsx               (~130 lines)
    SettingsView.jsx             (~150 lines)
    SavedPoemsView.jsx           (~120 lines)
    AuthButton.jsx               (~120 lines)
    AuthModal.jsx                (~70 lines)
    CategoryPill.jsx             (~60 lines)
    ThemeDropdown.jsx            (~60 lines)

server.js                        (keep as-is, ~1,075 lines after design-review extraction)
server/
  routes/
    designReview.js              (~525 lines: 12+ endpoints -- only route file extracted)
```

**No barrel files.** Direct imports only.

**Small components stay inline** in `app.jsx`: DatabaseToggle (28 lines), ErrorBanner (40 lines), MysticalEffect (30 lines), ShortcutHelp (60 lines), SavePoemButton (50 lines), DownvoteButton (40 lines), PulseGlowBars (35 lines), Header (~40 lines). Extracting tiny components adds indirection without benefit.

---

## Key Architectural Decisions

1. **React Context for logging only.** `LogContext` provides `{ logs, addLog, clearLogs }` to the entire tree. This is the one cross-cutting concern that every hook and service touches (~80+ call sites). Everything else stays as prop drilling.

2. **One custom hook per subsystem**, called from DiwanApp. Hooks are NOT independent -- they share `current` via DiwanApp threading. The plan acknowledges this.

3. **`current` (derived poem)** lives in `useDiscovery` and is returned to DiwanApp, which passes it into `useAudio({ current })` and `useInsights({ current })`.

4. **Orchestration effects stay in DiwanApp.** These cross-cutting effects touch state from multiple hooks and MUST NOT be moved into any single hook:
   - **autoExplain effect** (lines 3351-3359): ties `isFetching` (discovery) to `handleAnalyze` (insights)
   - **poem-change cleanup** (lines 4819-4857): stops audio, clears interpretation, revokes blob URLs, resets UI state across audio/insights/display
   - **keep-alive ping** (lines 4886-4905): depends on `useDatabase` (discovery) + fetch
   - **scroll-progress** and **header-opacity** effects: pure UI orchestration

5. **`apiUrl` as a lazy getter** (`getApiUrl()`) to prevent test environment footgun. No module may call `fetch` at import time.

6. **`GOLD` exported from `constants/design.js`** alongside `DESIGN`. Both are used pervasively (~80+ JSX references).

7. **Server: extract only design-review routes.** The remaining `server.js` is ~1,075 lines -- manageable. Full server decomposition into 9 files is premature and would require restructuring `server.test.js` (883 lines).

---

## Task Tracking

Create these milestone tasks at the start. Mark `in_progress` when starting, `completed` when done. Clean up stale tasks continuously.

| Task | Subject | activeForm | Blocked By |
|---|---|---|---|
| T1 | Create branch and archive plan | Creating branch and archiving plan | -- |
| T2 | Install composition-patterns skill | Installing composition-patterns skill | -- |
| T3 | Phase 0: Extract LogContext | Extracting LogContext for logging | T1 |
| T4 | Phase 1: Extract constants and utilities (7 files) | Extracting constants and utilities | T3 |
| T5 | Phase 2: Extract services (3 files) | Extracting API, cache, and prefetch services | T4 |
| T6 | Phase 3: Extract hooks (6 hooks, serial) | Extracting custom hooks from DiwanApp | T5 |
| T7 | Phase 4: Extract components (9 files) | Extracting React components | T6 |
| T8 | Phase 5: Extract design-review routes | Extracting design-review server routes | T1 |
| T9 | Phase 6: Final verification and docs | Running final verification and updating docs | T7, T8 |

**Rules:**
- Update task status immediately when starting/completing work
- If a task is blocked by a failing test, keep it `in_progress` and note the blocker
- Delete tasks that become unnecessary (e.g. if we skip a phase)
- Add sub-tasks for Phase 3 hooks as they're extracted (3a-3f)

---

## Pre-Step: Branch Setup & Archive Plan

Before any code changes, create the feature branch and archive this plan in the repo:

```bash
git checkout -b refactor/decompose-monolith
cp ~/.claude/plans/compiled-jumping-candle.md docs/DECOMPOSITION-PLAN.md
git add docs/DECOMPOSITION-PLAN.md
git commit -m "docs: add decomposition plan for monolith breakup"
```

This ensures the plan is discoverable in the repo history alongside the refactoring commits.

---

## Phase 0: Extract Logging Context (Prerequisite)

Create `src/LogContext.jsx` with a `LogProvider` and `useLogger` hook. This unblocks all subsequent hook extractions by eliminating the `addLog` parameter-threading problem.

```javascript
// src/LogContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
const LogContext = createContext();
export function LogProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const addLog = useCallback((label, msg, type = 'info') => { ... }, []);
  const clearLogs = useCallback(() => setLogs([]), []);
  return <LogContext.Provider value={{ logs, addLog, clearLogs }}>{children}</LogContext.Provider>;
}
export function useLogger() { return useContext(LogContext); }
```

Wrap `<DiwanApp />` in `<LogProvider>` in `main.jsx`. All hooks call `useLogger()` instead of receiving `addLog` as a parameter.

**Test impact:** `App.test.jsx` renders `<DiwanApp />` -- it will need `<LogProvider>` wrapping. Update the test render helper once.

**Commit:** `refactor(logging): extract LogContext for cross-cutting log access`

---

## Phase 1: Extract Constants & Pure Utilities (Zero Risk)

| New File | What Moves |
|---|---|
| `src/constants/features.js` | `FEATURES` |
| `src/constants/design.js` | `DESIGN`, `GOLD`, `TEXT_SIZES` |
| `src/constants/theme.js` | `THEME` |
| `src/constants/categories.js` | `CATEGORIES` |
| `src/constants/fonts.js` | `FONTS` |
| `src/utils/transliterate.js` | `ARABIC_TRANSLIT_MAP`, `transliterate()` |
| `src/utils/audio.js` | `pcm16ToWav()` (deduplicate 2 copies at lines 661 & 3516) |

**Rule: No side effects at import time.** Every file exports pure data or pure functions.

**Test impact:** None.

**Commit:** `refactor(constants): extract feature flags, design tokens, and pure utilities (7 files)`

---

## Phase 2: Extract Services (Low Risk)

| New File | What Moves | Key Dependency |
|---|---|---|
| `src/services/api.js` | `getApiUrl()`, `API_MODELS`, `discoverTextModels()`, `geminiTextFetch()`, `fetchWithRetry()`, `TTS_CONFIG` | `import.meta.env` via getter |
| `src/services/cache.js` | `CACHE_CONFIG`, `initCache()`, `cacheOperations` | `FEATURES` from constants |
| `src/services/prefetch.js` | `prefetchManager` | api.js, cache.js, prompts.js |

**Important:** `apiUrl` becomes `getApiUrl()` -- a function, not a top-level const. This prevents module-evaluation-order footguns in tests. `_discoveredTextModels` stays as module-level `let` in `api.js` (do NOT move to cache service).

**Test impact:** None. Tests mock `global.fetch`, which still intercepts.

**Commit:** `refactor(services): extract API client, cache, and prefetch manager (3 files)`

---

## Phase 3: Extract Custom Hooks (Medium-High Risk -- Core Restructuring)

**Strictly sequential.** One hook at a time. Each extraction modifies DiwanApp and must be tested before proceeding.

**Order (low-to-high coupling):**

1. **`useKeyboardShortcuts`** -- pure useEffect, receives handler callbacks. Simplest.
2. **`useOverflowDetect`** -- useEffect + ref for controlBar overflow. Self-contained.
3. **`useDailyPoem`** -- isolated: cache + fetch. Uses `useLogger()`.
4. **`useDiscovery`** -- **CRITICAL**: owns `poems`, `currentIndex`, `selectedCategory`, `useDatabase`, `isFetching`. Returns `current` and `filtered` as derived state.
5. **`useInsights`** -- depends on `current` from DiwanApp (which gets it from useDiscovery).
6. **`useAudio`** -- depends on `current` from DiwanApp. Includes PulseGlowBars component.

**DiwanApp after Phase 3:**

```javascript
export default function DiwanApp() {
  // LogContext provides addLog to all hooks via useLogger()

  // Domain hooks
  const discovery = useDiscovery();
  const { current, filtered, handleFetch, isFetching } = discovery;
  const audio = useAudio({ current });
  const insights = useInsights({ current, isFetching });
  const daily = useDailyPoem({ useDatabase: discovery.useDatabase });
  const overflow = useOverflowDetect();
  useKeyboardShortcuts({ togglePlay: audio.togglePlay, handleFetch, ... });

  // Auth hooks (already extracted)
  const { user } = useAuth();

  // UI state that stays here (pure display concerns)
  const [darkMode, setDarkMode] = useState(true);
  const [currentFont, setCurrentFont] = useState('Amiri');
  const [showTranslation, setShowTranslation] = useState(true);
  // ... modals, copy feedback, etc.

  // ORCHESTRATION EFFECTS (cross-cutting, stay here)
  useEffect(() => { /* autoExplain: ties discovery.isFetching -> insights.handleAnalyze */ }, [...]);
  useEffect(() => { /* poem-change cleanup: stops audio, clears insights, resets UI */ }, [current?.id]);
  useEffect(() => { /* keep-alive ping */ }, [discovery.useDatabase]);

  // JSX render (still 200+ lines of layout)
  return ( ... );
}
```

**6 commits:**
```
refactor(hooks): extract useKeyboardShortcuts
refactor(hooks): extract useOverflowDetect
refactor(hooks): extract useDailyPoem
refactor(hooks): extract useDiscovery (poems, currentIndex, filtering, fetch)
refactor(hooks): extract useInsights (streaming analysis, caching)
refactor(hooks): extract useAudio (TTS, playback, volume detection)
```

**After Phase 3: invoke `test-orchestrator` for comprehensive validation.**

---

## Phase 4: Extract Components (Low-Medium Risk)

Extract only components **over ~60 lines** that have their own state or are logically self-contained. Small stateless components (DatabaseToggle, ErrorBanner, MysticalEffect, PulseGlowBars, etc.) stay inline.

**9 components to extract:**

| Component | Lines | Why Extract |
|---|---|---|
| `SplashScreen.jsx` | ~770 | Massive, fully self-contained with 3-phase internal state |
| `VerticalSidebar.jsx` | ~300 | Large, mobile-specific with own state |
| `DebugPanel.jsx` | ~130 | Has own state (collapse, bug report form) |
| `SettingsView.jsx` | ~150 | Modal with own state |
| `SavedPoemsView.jsx` | ~120 | Modal with own state |
| `AuthButton.jsx` | ~120 | Has dropdown state, user menu |
| `AuthModal.jsx` | ~70 | Modal with own presentation |
| `CategoryPill.jsx` | ~60 | Has dropdown open/close state |
| `ThemeDropdown.jsx` | ~60 | Has dropdown open/close state |

**CSS handling:** Components with inline `<style>` tags or template-literal CSS (`${GOLD.gold}`) keep their styles inline. The main `<style>` block in DiwanApp (lines 4925-5057, ~130 lines of keyframes/animations) stays in DiwanApp since it defines global animations used across components.

**2 commits:**
```
refactor(components): extract large components (SplashScreen, VerticalSidebar, DebugPanel, SettingsView, SavedPoemsView)
refactor(components): extract medium components (AuthButton, AuthModal, CategoryPill, ThemeDropdown)
```

---

## Phase 5: Extract Design Review Routes (Low Risk)

Extract ONLY the design-review API routes from `server.js` into `server/routes/designReview.js`. This is the largest self-contained domain (12+ endpoints, ~525 lines) with no shared state except `pool` and `requireApiKey`.

Leave all other routes in `server.js`. 1,075 lines is manageable.

```javascript
// server/routes/designReview.js
import { Router } from 'express';
export default function designReviewRoutes(pool, requireApiKey) {
  const router = Router();
  // ... 12+ endpoints
  return router;
}

// server.js (updated)
import designReviewRoutes from './server/routes/designReview.js';
app.use('/api/design-review', designReviewRoutes(pool, requireApiKey));
```

**Critical:** `server.js` keeps `export { app, pool }` for `server.test.js` compatibility.

**1 commit:** `refactor(server): extract design-review routes to server/routes/designReview.js`

---

## Phase 6: Documentation & Final Verification

1. Update CLAUDE.md: new file structure, remove stale line numbers, update "Architecture" section
2. Invoke `test-coverage-reviewer` for before/after metrics
3. Invoke `ci-test-guardian` to validate CI compatibility

**1 commit:** `docs: update CLAUDE.md and README with new file structure`

---

## Incremental Verification Strategy

### Per-Commit (fast feedback)
```bash
npm run test:run    # Unit tests (catches import errors, logic regressions)
npm run build       # Production build (catches tree-shaking, import.meta.env issues)
```

### Per-Phase (thorough)
```bash
npm run test:e2e    # E2E smoke tests (catches user-facing regressions)
```

### After Phase 3 and final push (comprehensive)
```bash
npm run test:e2e:full     # All 6 browser configs
npm run test:coverage     # Coverage report for comparison
```

**If ANY test fails: STOP. Fix before proceeding. Do NOT accumulate broken state.**

### Testing Agents

| Agent | When | Purpose |
|---|---|---|
| `test-orchestrator` | After Phase 3 (hooks) | Coordinates full test pyramid, auto-creates issues for failures |
| `test-suite-maintainer` | After Phase 0 (LogContext) | Updates `App.test.jsx` render helper to include `<LogProvider>` |
| `ci-test-guardian` | Before final push | Validates CI pipeline compatibility (timeouts, path filtering) |
| `test-coverage-reviewer` | Phase 6 | Before/after coverage comparison |

### Manual Smoke Test (between phases)

Start `npm run dev` and verify:
- [ ] App loads with poem displayed
- [ ] "Discover" fetches new poem
- [ ] Audio play/pause works
- [ ] "Explain" generates insights
- [ ] Theme/font toggle works
- [ ] Category filter works
- [ ] Mobile layout works (resize)
- [ ] Keyboard shortcuts (Space, Right, E)

---

## Team Structure (4 Agents -- Lean)

The architect review determined that 7 agents is overkill. Since all phases modify `app.jsx`, work is inherently sequential. The real parallelism is limited.

| Agent | Hat | Scope |
|---|---|---|
| **refactor-lead** | Coordinator + batch-worker | Phase 0 (LogContext), Phase 1 (constants), Phase 2 (services), all `app.jsx` import updates, all commits, test verification |
| **hooks-architect** | Designer | Phase 3 only: 6 hook extractions (the hardest part, needs architectural judgment) |
| **component-extractor** | Batch-worker | Phase 4 only: 9 component extractions |
| **server-extractor** | Batch-worker | Phase 5 only: design-review route extraction |

**Why 4, not 7:**
- constants-extractor was removed: Phase 1 is trivial copy-paste, refactor-lead handles it
- services-extractor was removed: Phase 2 is 3 files tightly coupled, refactor-lead handles it
- quality-auditor was removed: each agent runs tests after their own commits, no bottleneck

**Only true parallelism:** Phase 1 (frontend) and Phase 5 (server) can run concurrently since they touch completely different files.

### Execution Flow

```
refactor-lead: Phase 0 (LogContext) -> Phase 1 (constants) -> Phase 2 (services)
                                                                    |
hooks-architect: ............................................Phase 3 (hooks, serial)
                                                                              |
component-extractor: .............................................Phase 4 (components)
                                                                              |
server-extractor: Phase 5 (can run in parallel with Phase 1-2) ...............
                                                                              |
refactor-lead: Phase 6 (docs + final verification) ...........................
```

### Commit Plan (11 commits total)

```
refactor(logging): extract LogContext for cross-cutting log access
refactor(constants): extract feature flags, design tokens, and pure utilities (7 files)
refactor(services): extract API client, cache, and prefetch manager (3 files)
refactor(hooks): extract useKeyboardShortcuts
refactor(hooks): extract useOverflowDetect
refactor(hooks): extract useDailyPoem
refactor(hooks): extract useDiscovery (poems, currentIndex, filtering, fetch)
refactor(hooks): extract useInsights (streaming analysis, caching)
refactor(hooks): extract useAudio (TTS, playback, volume detection)
refactor(components): extract large + medium components (9 files)
refactor(server): extract design-review routes
docs: update CLAUDE.md with new file structure
```

### Safety Rules

1. **No side effects at module import time.** All initialization via explicit function calls.
2. **No barrel files.** Every import is a direct path.
3. **`_discoveredTextModels` stays in `services/api.js`** as module-level cache. Do NOT move to cache service.
4. **Every commit leaves all tests green.** No exceptions.
5. **Orchestration effects stay in DiwanApp.** Do not try to move autoExplain, poem-change cleanup, or keep-alive into hooks.

---

## Before vs. After: Visual Breakdown

### BEFORE -- app.jsx (5,816 lines, 1 file)

```
┌──────────────────────────────────────────────────────────────────┐
│ src/app.jsx  (5,816 lines)                                       │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ FEATURE FLAGS & DESIGN SYSTEM         lines 57-199   (143)  │ │
│ │   FEATURES, DESIGN, THEME, GOLD, CATEGORIES, FONTS          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ API PROMPTS & CONFIGURATION           lines 201-354  (154)  │ │
│ │   apiUrl, API_MODELS, discoverTextModels, geminiTextFetch,   │ │
│ │   fetchWithRetry, TTS_CONFIG                                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ CACHE & INDEXEDDB                     lines 356-554  (199)  │ │
│ │   CACHE_CONFIG, initCache, cacheOperations                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ PREFETCH MANAGER                      lines 556-848  (293)  │ │
│ │   prefetchManager (audio, insights, discover)                │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ TRANSLITERATION                       lines 851-938  (88)   │ │
│ │   ARABIC_TRANSLIT_MAP, transliterate()                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ UTILITY COMPONENTS                    lines 940-1312 (373)  │ │
│ │   MysticalEffect, DebugPanel, CategoryPill, ThemeDropdown,   │ │
│ │   ErrorBanner, DatabaseToggle                                │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ SHORTCUT HELP                         lines 1314-1375 (62)  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ SPLASH / ONBOARDING                   lines 1377-2151 (774) │ │
│ │   SplashScreen (3-phase kinetic walkthrough)                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ AUTH COMPONENTS                       lines 2153-2713 (561) │ │
│ │   AuthModal, AuthButton, SavePoemButton, DownvoteButton,     │ │
│ │   SavedPoemsView, SettingsView                               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ VERTICAL SIDEBAR                      lines 2714-3012 (299) │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ MAIN APPLICATION (DiwanApp)           lines 3014-5816(2803) │ │
│ │   30+ useState, 15+ useEffect, 12+ useRef                   │ │
│ │   handleFetch, handleAnalyze, togglePlay, handleCopy, ...    │ │
│ │   pcm16ToWav (duplicate), PulseGlowBars                     │ │
│ │   <style> keyframes (130 lines)                              │ │
│ │   Full JSX render (~500 lines)                               │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### AFTER -- 27 files across focused modules

```
src/
├── LogContext.jsx ·······  30 lines  [Phase 0]  NEW: logging provider
├── app.jsx ··············  ~500 lines           SHRUNK from 5,816
│   ├── UI state (darkMode, font, modals, copy feedback)
│   ├── Hook orchestration (discovery, audio, insights, daily, overflow, keyboard)
│   ├── Cross-cutting effects (autoExplain, poem-change cleanup, keep-alive)
│   ├── Small inline components (DatabaseToggle, ErrorBanner, MysticalEffect,
│   │   ShortcutHelp, SavePoemButton, DownvoteButton, PulseGlowBars, Header)
│   ├── <style> keyframes/animations (130 lines)
│   └── JSX layout (~200 lines)
│
├── constants/ ···········  [Phase 1]
│   ├── features.js ······  15 lines   FEATURES flags
│   ├── design.js ········  100 lines  DESIGN, GOLD, TEXT_SIZES
│   ├── theme.js ·········  80 lines   THEME dark/light palettes
│   ├── categories.js ····  15 lines   CATEGORIES array
│   └── fonts.js ·········  15 lines   FONTS array
│
├── services/ ············  [Phase 2]
│   ├── api.js ···········  120 lines  getApiUrl(), models, fetch helpers
│   ├── cache.js ·········  200 lines  IndexedDB CRUD with expiry
│   └── prefetch.js ······  280 lines  background audio/insights prefetch
│
├── utils/ ···············  [Phase 1]
│   ├── transliterate.js ·  90 lines   Arabic→Latin conversion
│   ├── audio.js ·········  35 lines   pcm16ToWav (deduplicated)
│   ├── insightParser.js ·  24 lines   (already exists)
│   └── jsonRepair.js ····  50 lines   (already exists)
│
├── hooks/ ···············  [Phase 3]
│   ├── useAuth.js ·······  472 lines  (already exists)
│   ├── useDiscovery.js ··  200 lines  poems, currentIndex, filtering, fetch
│   ├── useAudio.js ······  300 lines  TTS, playback, volume detection
│   ├── useInsights.js ···  250 lines  streaming analysis, caching
│   ├── useDailyPoem.js ··  60 lines   daily poem fetch + cache
│   ├── useKeyboardShortcuts.js  50 lines   keyboard handler registration
│   └── useOverflowDetect.js ··  60 lines   controlBar overflow detection
│
└── components/ ··········  [Phase 4]
    ├── SplashScreen.jsx ·  770 lines  3-phase kinetic walkthrough
    ├── VerticalSidebar.jsx  300 lines  mobile overflow sidebar
    ├── SettingsView.jsx ·  150 lines  user preferences modal
    ├── DebugPanel.jsx ···  130 lines  system logs + bug report
    ├── AuthButton.jsx ···  120 lines  user menu dropdown
    ├── SavedPoemsView.jsx  120 lines  saved poems collection
    ├── AuthModal.jsx ····  70 lines   OAuth sign-in modal
    ├── CategoryPill.jsx ·  60 lines   poet filter dropdown
    └── ThemeDropdown.jsx ·  60 lines   theme/font cycle

server.js ················  ~1,075 lines  (SHRUNK from 1,598)
server/routes/
└── designReview.js ······  525 lines  [Phase 5]  12+ design-review endpoints
```

### Size Comparison

```
BEFORE                              AFTER
────────────────────────            ────────────────────────
app.jsx          5,816 lines        app.jsx            ~500 lines  (-91%)
server.js        1,598 lines        server.js        ~1,075 lines  (-33%)
                                    + 25 focused files
────────────────────────            ────────────────────────
Total monolith:  7,414 lines        Largest file:       770 lines  (SplashScreen)
Max file:        5,816 lines        Median file:         80 lines
Files:               2              Files:               27
```

### Break-Safety: How Each Phase Stays Safe

```
Phase 0: LogContext                    Phase 1: Constants           Phase 2: Services
┌─────────────────────┐               ┌─────────────────────┐      ┌─────────────────────┐
│ Create LogContext.jsx│               │ Create 7 new files  │      │ Create 3 new files  │
│ Wrap in main.jsx    │               │ (pure data/funcs)   │      │ (pure logic)        │
│ Update test helper  │               │                     │      │                     │
├─────────────────────┤               ├─────────────────────┤      ├─────────────────────┤
│ VERIFY:             │               │ VERIFY:             │      │ VERIFY:             │
│ ✓ npm run test:run  │               │ ✓ npm run test:run  │      │ ✓ npm run test:run  │
│ ✓ npm run build     │               │ ✓ npm run build     │      │ ✓ npm run build     │
│ ✓ npm run test:e2e  │               │ ✓ npm run build     │      │ ✓ npm run test:e2e  │
├─────────────────────┤               ├─────────────────────┤      ├─────────────────────┤
│ WHY SAFE:           │               │ WHY SAFE:           │      │ WHY SAFE:           │
│ • Only adds Context │               │ • Pure copy-paste   │      │ • Tests mock fetch  │
│ • DiwanApp unchanged│               │ • No behavior change│      │   at global level   │
│ • 1 test file update│               │ • Tests don't import│      │ • No behavior change│
│                     │               │   these constants   │      │ • Module boundaries  │
│ ROLLBACK: revert 1  │               │ ROLLBACK: revert 1  │      │   don't affect mocks│
│ commit              │               │ commit              │      │ ROLLBACK: revert 1  │
└─────────────────────┘               └─────────────────────┘      └─────────────────────┘

Phase 3: Hooks (6 sub-steps, each a commit)
┌──────────────────────────────────────────────────────────────────┐
│ For EACH hook (1 at a time, strictly serial):                    │
│                                                                  │
│   1. Create src/hooks/useXxx.js                                  │
│   2. Move state + effects + handlers from DiwanApp into hook     │
│   3. Add hook call in DiwanApp                                   │
│   4. Thread return values to JSX                                 │
│   5. ✓ npm run test:run && npm run build                         │
│   6. COMMIT                                                      │
│   7. If tests fail → FIX before next hook (never skip)           │
│                                                                  │
│ After all 6 hooks:                                               │
│   ✓ npm run test:e2e        (Chrome)                             │
│   ✓ npm run test:e2e:full   (all 6 browser configs)              │
│   ✓ Invoke test-orchestrator                                     │
│   ✓ Manual smoke test in browser                                 │
│                                                                  │
│ WHY SAFE:                                                        │
│ • One hook at a time = smallest possible change per commit       │
│ • DiwanApp still renders same DOM (same test assertions)         │
│ • Each hook returns same state the code already had              │
│ • useAuth.js (472 lines, 5 hooks) proves this pattern works     │
│ • Cross-cutting effects stay in DiwanApp (documented above)      │
│                                                                  │
│ ROLLBACK: revert individual hook commit, DiwanApp goes back to   │
│ inline state for that subsystem                                  │
└──────────────────────────────────────────────────────────────────┘

Phase 4: Components                    Phase 5: Server
┌─────────────────────┐               ┌─────────────────────┐
│ Cut component func  │               │ Extract 12+ routes  │
│ from app.jsx →      │               │ to designReview.js  │
│ new .jsx file       │               │ Wire with Router    │
│ Add import in app   │               │                     │
├─────────────────────┤               ├─────────────────────┤
│ VERIFY:             │               │ VERIFY:             │
│ ✓ npm run test:run  │               │ ✓ npm run test:run  │
│ ✓ npm run build     │               │ ✓ npm run build     │
│ ✓ npm run test:e2e  │               │ ✓ server.test.js    │
├─────────────────────┤               ├─────────────────────┤
│ WHY SAFE:           │               │ WHY SAFE:           │
│ • components.test.  │               │ • Only design-review│
│   jsx uses own mocks│               │   routes extracted  │
│ • App.test.jsx still│               │ • server.js still   │
│   renders <DiwanApp>│               │   exports {app,pool}│
│ • Same DOM output   │               │ • Same endpoints,   │
│ • No state changes  │               │   same responses    │
│                     │               │                     │
│ ROLLBACK: revert    │               │ ROLLBACK: revert    │
│ batch commit, paste │               │ commit, routes back │
│ components back     │               │ inline              │
└─────────────────────┘               └─────────────────────┘
```

### Dependency Flow (No Cycles)

```
                    ┌─────────────┐
                    │ LogContext   │ (Phase 0)
                    │ useLogger() │
                    └──────┬──────┘
                           │ provides addLog to all hooks
                           ▼
┌───────────┐    ┌──────────────────┐    ┌───────────────┐
│ constants/│◄───│    hooks/         │───►│  services/    │
│ features  │    │ useDiscovery     │    │  api.js       │
│ design    │    │ useAudio         │    │  cache.js     │
│ theme     │    │ useInsights      │    │  prefetch.js  │
│ categories│    │ useDailyPoem     │    └───────┬───────┘
│ fonts     │    │ useKeyboard...   │            │
└─────┬─────┘    │ useOverflow...   │            │
      │          └────────┬─────────┘            │
      │                   │                      │
      │          ┌────────▼─────────┐            │
      └─────────►│   app.jsx        │◄───────────┘
                 │ (DiwanApp)       │
                 │ orchestration +  │
                 │ JSX layout       │
                 └────────┬─────────┘
                          │ renders
                 ┌────────▼─────────┐
                 │  components/     │
                 │ SplashScreen     │
                 │ VerticalSidebar  │
                 │ DebugPanel       │
                 │ SettingsView     │
                 │ SavedPoemsView   │
                 │ AuthButton       │
                 │ AuthModal        │
                 │ CategoryPill     │
                 │ ThemeDropdown    │
                 └──────────────────┘

Arrow direction = "imports from"
NO CYCLES: constants ← hooks ← app → components
                         ↓
                      services
```

---

## Critical Files

| File | Role in Refactor |
|---|---|
| `src/app.jsx` | The 5,816-line monolith. Every phase modifies it. |
| `src/test/App.test.jsx` | Primary integration test (imports DiwanApp). Must pass after every commit. |
| `src/test/setup.js` | Global mocks (fetch, Audio, IndexedDB). Must work with extracted modules. |
| `src/hooks/useAuth.js` | Existing 472-line hook file. Pattern template for all new hooks. |
| `server.js` | 1,598-line backend. Only design-review routes extracted. |
| `src/test/server.test.js` | Backend tests. Must still import `{ app, pool }` from `server.js`. |
| `vitest.config.js` | CI timeouts (3s test, 2s hooks). Watch for timing regressions. |
| `.github/workflows/ci.yml` | CI pipeline. Changes to `src/**` trigger all jobs. |
