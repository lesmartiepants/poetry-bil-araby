# Modernization Roadmap: Fixing the Monolith

> A step-by-step plan to transform Poetry Bil-Araby from a 6,139-line single-file app into a modern, maintainable codebase — without breaking anything for users along the way.

---

## Executive Summary

Poetry Bil-Araby works. Users can discover, read, listen to, and save Arabic poetry. But the entire frontend lives in one file (`src/app.jsx`, 6,139 lines), making it fragile to change, impossible to test in isolation, and slow to load. This roadmap decomposes the monolith into focused modules, introduces better libraries where the hand-rolled code is brittle, and ensures the app passes all tests after every single commit.

**Guiding principle:** Each commit is a safe, shippable increment. No commit breaks existing functionality. Tests prove it.

---

## The Problem at a Glance

| Issue | Impact | Lines affected |
|-------|--------|---------------|
| Single 6,139-line file | Can't test, profile, or lazy-load anything | All |
| 50+ `useState` in one component | Every state change re-renders everything | ~3,000 (DiwanApp) |
| 3 competing style approaches | Inconsistent theming, hard to maintain | ~500 scattered |
| ~300 lines of manual IndexedDB cache | Fragile, no invalidation strategy | 500–800 |
| 30 lines of hand-rolled drag gestures | Buggy edge cases, no inertia | InsightsDrawer |
| No routing | Can't deep-link or share poems by URL | Manual replaceState |
| No code-splitting | Entire app loads on first paint | Everything |
| Debug panel ships to production | 200 lines of dev-only UI in every bundle | 1083–1298 |

---

## Phase 1: Extract Components (Zero Library Changes)

> **Goal:** Break the monolith into files. Same React, same Tailwind, same behavior. Just files.

Each task below is one commit. Tests run after each. The app works identically before and after.

### 1.1 Extract shared constants and types

**Commit scope:** Move `FEATURES`, `DESIGN`, `THEME`, `BRAND`, `CATEGORIES`, `FONTS`, `GOLD` to `src/constants/`

| File | Contents |
|------|----------|
| `src/constants/features.js` | `FEATURES` object |
| `src/constants/design.js` | `DESIGN`, `BRAND` objects |
| `src/constants/theme.js` | `THEME`, `GOLD` objects |
| `src/constants/poets.js` | `CATEGORIES` array |
| `src/constants/fonts.js` | `FONTS` array |

**Test:** Existing unit tests pass. Import paths updated. No behavior change.

**Why first:** Every subsequent extraction imports these. Do it once.

### 1.2 Extract utility functions

**Commit scope:** Move pure functions out of `app.jsx`

| File | Functions |
|------|-----------|
| `src/utils/seenPoems.js` | `getSeenPoems`, `markPoemSeen`, `pruneSeenPoems`, `getRecentSeenIds` |
| `src/utils/transliterate.js` | `transliterate()` |
| `src/utils/audio.js` | `pcm16ToWav()` |
| `src/utils/filterPoems.js` | `filterPoemsByCategory()` (already exported) |

**Test:** Write unit tests for each utility. `filterPoemsByCategory` already has tests — verify they still pass.

### 1.3 Extract DebugPanel

**Commit scope:** Move `DebugPanel` component to `src/components/DebugPanel.jsx`

- Props stay the same (no interface change)
- Inline `<style>` block for debug-specific styles moves with it
- Gate behind `import.meta.env.DEV` in the import (tree-shaken in prod)

**Test:** Existing E2E tests that interact with debug panel still pass. New unit test for DebugPanel render.

### 1.4 Extract SplashScreen

**Commit scope:** Move `SplashScreen` to `src/components/SplashScreen.jsx`

- Includes the canvas particle system, kinetic walkthrough, and desert phase
- All `@keyframes` used only by splash move with it
- ~400 lines extracted

**Test:** E2E onboarding tests pass. New unit test for splash screen phases.

### 1.5 Extract ErrorBanner and ShortcutHelp

**Commit scope:** Small, self-contained components to `src/components/`

- `ErrorBanner.jsx` (~50 lines)
- `ShortcutHelp.jsx` (~60 lines)

**Test:** Unit tests for both. Existing tests pass.

### 1.6 Extract MysticalConsultationEffect

**Commit scope:** Move to `src/components/MysticalConsultationEffect.jsx`

- Pure visual effect component, no state dependencies beyond `active` and `theme`
- ~30 lines

**Test:** Unit test for render with `active={true}` and `active={false}`.

### 1.7 Extract auth components

**Commit scope:** Move auth-related components to `src/components/auth/`

| File | Component |
|------|-----------|
| `src/components/auth/AuthModal.jsx` | `AuthModal` |
| `src/components/auth/SavePoemButton.jsx` | `SavePoemButton` |
| `src/components/auth/DownvoteButton.jsx` | `DownvoteButton` |

**Test:** Unit tests for each. Auth E2E tests pass.

### 1.8 Extract SavedPoemsView

**Commit scope:** Move to `src/components/SavedPoemsView.jsx`

- ~120 lines, receives saved poems list and handlers as props
- Internal search/filter logic stays with the component

**Test:** Unit test for render, search filtering, poem selection.

### 1.9 Extract VerticalSidebar

**Commit scope:** Move to `src/components/VerticalSidebar.jsx`

- Largest sub-component extraction (~450 lines)
- All sidebar-specific `@keyframes` and styles move with it
- Props interface is already well-defined (30+ props)

**Test:** Unit tests for expanded/collapsed states, button clicks. E2E sidebar tests pass.

### 1.10 Extract InsightsDrawer

**Commit scope:** Move to `src/components/InsightsDrawer.jsx`

- Includes drag-to-dismiss logic (to be replaced in Phase 2)
- ~150 lines

**Test:** Unit test for open/close, drag threshold. E2E insights tests pass.

### 1.11 Extract API and caching layer

**Commit scope:** Move to `src/services/`

| File | Contents |
|------|----------|
| `src/services/gemini.js` | Model discovery, text generation, TTS calls |
| `src/services/database.js` | Database poem fetching, poet list, search |
| `src/services/cache.js` | IndexedDB cache (`initCache`, `getCachedAudio`, `getCachedInsights`, etc.) |
| `src/services/prefetch.js` | Prefetch manager |

**Test:** Unit tests with mocked `fetch`. Existing API-related tests pass.

### Phase 1 checkpoint

After all 1.x commits:
- `src/app.jsx` is ~2,000 lines (down from 6,139) — just `DiwanApp` + imports
- Every component is independently testable
- Zero behavior change for users
- All existing tests (136 unit + 193 E2E) pass

---

## Phase 2: Better Libraries (Incremental Replacement)

> **Goal:** Replace hand-rolled code with battle-tested libraries. Each swap is one commit.

### 2.1 Gate DebugPanel behind `import.meta.env.DEV`

**Commit scope:** Use `React.lazy()` + dynamic import so DebugPanel is tree-shaken from production builds.

```jsx
const DebugPanel = import.meta.env.DEV
  ? React.lazy(() => import('./components/DebugPanel'))
  : () => null;
```

**Impact:** ~200 lines removed from production bundle. Zero user-facing change.

**Test:** Build succeeds. Production bundle doesn't contain DebugPanel code. Dev mode still shows it.

### 2.2 Replace hand-rolled drag with `@use-gesture/react`

**Commit scope:** Install `@use-gesture/react` (~3KB). Replace the 30-line `handleDragStart/Move/End` in `InsightsDrawer` with `useDrag()`.

**Before:** Manual touch event tracking, threshold checks, no inertia
**After:** Velocity-based dismiss, configurable bounds, inertia

**Test:** InsightsDrawer E2E tests pass. New unit test for drag-to-dismiss and drag-to-expand.

### 2.3 Add `wouter` for routing

**Commit scope:** Install `wouter` (~1.5KB). Add routes:

| Route | Component |
|-------|-----------|
| `/` | `DiwanApp` (default poem) |
| `/poem/:id` | `DiwanApp` (load specific poem) |

**Behavior change:** Poems now have shareable URLs. Everything else stays the same.

**Test:** Navigate to `/poem/123` → correct poem loads. Share URL works. Back button works.

### 2.4 Install Framer Motion for `AnimatePresence`

**Commit scope:** Install `framer-motion`. Wrap modal/drawer mount/unmount with `AnimatePresence`.

**Components affected:** `AuthModal`, `InsightsDrawer`, `SplashScreen`, `ShortcutHelp`

**Before:** Binary show/hide or CSS `@keyframes`
**After:** Smooth enter/exit animations with `AnimatePresence`

**Test:** All modal/drawer E2E tests pass. Animations are visually verified.

### 2.5 Consolidate theme tokens into CSS custom properties

**Commit scope:** Replace all hardcoded `#C5A059` / `#8B7355` with CSS custom properties.

```css
:root {
  --gold: #C5A059;
  --gold-light: #8B7355;
}
.dark { --gold: #C5A059; }
.light { --gold: #8B7355; }
```

**Impact:** Single source of truth for gold color. `THEME` object references CSS vars instead of hardcoded hex.

**Test:** Visual regression check. All components render with correct colors in both themes.

### 2.6 Lazy-load SplashScreen

**Commit scope:** `React.lazy()` the SplashScreen component since it's only shown once per visit.

**Impact:** ~400 lines deferred from initial bundle.

**Test:** First visit still shows splash. Subsequent visits skip it. No flash of unstyled content.

---

## Phase 3: State Management (Biggest Win)

> **Goal:** Replace 50+ `useState` calls with organized state stores.

### 3.1 Install Zustand

**Commit scope:** `npm install zustand`. Create initial store structure:

| Store | State it owns |
|-------|--------------|
| `src/stores/poemStore.js` | `poems`, `currentIndex`, `selectedCategory`, `isFetching`, `useDatabase` |
| `src/stores/audioStore.js` | `isPlaying`, `isGeneratingAudio`, `audioUrl`, `audioError` |
| `src/stores/uiStore.js` | `darkMode`, `currentFont`, `textSizeLevel`, `showTranslation`, `showTransliteration` |
| `src/stores/modalStore.js` | `showAuthModal`, `showSavedPoems`, `showSplash`, `insightsDrawerOpen`, `showShortcutHelp` |

**Test:** Create store unit tests. Verify initial state matches current app defaults.

### 3.2 Migrate poem state to `poemStore`

**Commit scope:** Replace `useState` calls for poem-related state with `usePoemStore()`.

**Affected state:** `poems`, `currentIndex`, `selectedCategory`, `poetPickerOpen`, `dynamicPoets`, `poetSearch`, `isFetching`

**Test:** All poem discovery E2E tests pass. New unit tests for store actions.

### 3.3 Migrate audio state to `audioStore`

**Commit scope:** Replace audio-related `useState` + `useRef` with `useAudioStore()`.

**Affected state:** `isPlaying`, `isGeneratingAudio`, `audioUrl`, `audioError`, `audioRef`, `audioContextRef`, `analyserRef`

**Test:** Audio playback E2E tests pass. Store unit tests.

### 3.4 Migrate UI state to `uiStore`

**Commit scope:** Replace UI preference `useState` calls with `useUIStore()`.

**Affected state:** `darkMode`, `currentFont`, `textSizeLevel`, `showTranslation`, `showTransliteration`, `showDebugLogs`, `headerOpacity`

**Test:** Theme toggle, font cycle, text size E2E tests pass.

### 3.5 Migrate modal state to `modalStore`

**Commit scope:** Replace modal visibility `useState` calls with `useModalStore()`.

**Affected state:** `showAuthModal`, `showSavedPoems`, `showSplash`, `insightsDrawerOpen`, `showShortcutHelp`, `poetPickerOpen`

**Test:** All modal open/close E2E tests pass.

### Phase 3 checkpoint

After all 3.x commits:
- `DiwanApp` drops from ~50 `useState` calls to ~5 (for truly local state)
- Components subscribe only to the state they need (surgical re-renders)
- State logic is testable independently of React components
- All 136 unit + 193 E2E tests pass

---

## Phase 4: Data Layer (Optional, Higher Risk)

> **Goal:** Replace manual fetch + IndexedDB cache with TanStack Query.

### 4.1 Install TanStack Query

**Commit scope:** `npm install @tanstack/react-query`. Add `QueryClientProvider` wrapper. No behavior change yet.

**Test:** App renders. No regressions.

### 4.2 Migrate poem fetching to `useQuery`

**Commit scope:** Replace `handleFetch` and database fetch logic with:

```jsx
const { data: poem, refetch } = useQuery({
  queryKey: ['poem', 'random', selectedCategory],
  queryFn: () => fetchRandomPoem(selectedCategory),
  staleTime: 0, // Always fresh
  enabled: false, // Manual trigger via refetch()
});
```

**Test:** Poem discovery works. Fetch error handling works. E2E tests pass.

### 4.3 Migrate insight fetching to `useQuery`

**Commit scope:** Replace `handleExplain` with query-based insight fetching. Automatic caching replaces manual IndexedDB cache for insights.

**Test:** Insight generation works. Cached insights load instantly. E2E tests pass.

### 4.4 Remove IndexedDB cache layer

**Commit scope:** Delete `src/services/cache.js` and `src/services/prefetch.js`. TanStack Query now handles all caching.

**Impact:** ~300 lines of manual cache code removed.

**Test:** Audio and insights still cache correctly. Cache stats in debug panel updated to use TanStack Query devtools.

---

## Dependency Changes Summary

| Phase | Add | Remove | Net bundle impact |
|-------|-----|--------|-------------------|
| 1 (Extract) | Nothing | Nothing | ~0 (same code, different files) |
| 2.2 | `@use-gesture/react` (3KB) | 30 lines hand-rolled drag | -0.5KB |
| 2.3 | `wouter` (1.5KB) | Manual replaceState | +1.5KB |
| 2.4 | `framer-motion` (~15KB tree-shaken) | Raw CSS animations | +10KB |
| 2.5 | CSS custom properties | Hardcoded hex values | ~0 |
| 3.1 | `zustand` (1KB) | 50+ useState calls | -2KB (less code) |
| 4.1 | `@tanstack/react-query` (~12KB) | IndexedDB cache (~300 lines) | +5KB |
| **Total** | ~32KB added | ~600 lines removed | **+15KB net** |

Production bundle also shrinks by ~200 lines (DebugPanel) via tree-shaking.

---

## How to Use This Document

**For the project manager:** Each numbered section (1.1, 1.2, ...) is a single PR-ready task. Assign them sequentially within each phase. Phases can overlap once Phase 1 is complete (2.x and 3.x are independent).

**For the developer:** Each task has a clear scope, file list, and test criteria. Run `npm run test:run && npm run test:e2e` after every commit. If tests fail, the commit is wrong — fix before moving on.

**For code review:** Every PR should:
1. Not change any user-visible behavior (unless noted as "Behavior change")
2. Pass all existing tests
3. Add new tests for extracted/created code
4. Reduce `src/app.jsx` line count (tracked in PR description)

---

*This document is a living roadmap. Update task status as work progresses. Cross off completed items. Add new tasks if discoveries arise during implementation.*
