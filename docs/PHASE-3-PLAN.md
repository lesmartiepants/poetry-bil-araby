# Phase 3 Plan: State Management with Zustand

## Current State (measured)

- **37 useState** calls in DiwanApp
- **19 useRef** calls
- **19 useEffect** hooks
- **30+ handler** functions
- **2 dead states** (`copySuccess`, `isPrefetching`) — never read or set
- **0 useCallback** wrapping handlers (every handler recreates on every render)
- **app.jsx: 3,113 lines**

Every state change triggers a full re-render of the 3,113-line component and all its children.

---

## Store Architecture

```
src/stores/
├── poemStore.js      Poem collection, index, discovery, category
├── audioStore.js     Playback, generation, TTS, volume refs
├── uiStore.js        Theme, font, text size, translation, debug
└── modalStore.js     All overlay visibility flags
```

### 3.0 — Housekeeping: Remove dead state

Remove `copySuccess` + `setCopySuccess` and `isPrefetching` + `setIsPrefetching`.
Neither is read or set anywhere after declaration.

**Test:** All 316 unit tests pass. No behavior change.

### 3.1 — Install Zustand, create empty stores

```bash
npm install zustand
```

Create 4 store files with initial state matching current defaults.
No wiring yet — just the store definitions and unit tests for each.

**Files created:**

- `src/stores/poemStore.js`
- `src/stores/audioStore.js`
- `src/stores/uiStore.js`
- `src/stores/modalStore.js`

**Test:** New unit tests verify initial state matches app defaults.

### 3.2 — Migrate poem state to poemStore

**State moved (7 vars):**
| useState | → store field |
|----------|--------------|
| `poems` | `poemStore.poems` |
| `currentIndex` | `poemStore.currentIndex` |
| `selectedCategory` | `poemStore.selectedCategory` |
| `isFetching` | `poemStore.isFetching` |
| `autoExplainPending` | `poemStore.autoExplainPending` |
| `useDatabase` | `poemStore.useDatabase` |
| `poetsFetched` | `poemStore.poetsFetched` |

**Derived values that move:**

- `filtered` (useMemo) → `poemStore.filtered` (computed selector)
- `current` → `poemStore.current` (computed selector)

**Actions:**

- `addPoem(poem)` — appends + updates index
- `setCurrentIndex(i)`
- `setCategory(cat)` — resets index
- `setFetching(bool)`
- `setAutoExplain(bool)`

**Handler moved:** `handleFetch()` → `poemStore.fetchPoem(addLog)`

**Ref moved:** `selectedCategoryRef` → store ref (Zustand is synchronous, no ref needed)

**Test:** All poem discovery tests pass. Category switching works.

### 3.3 — Migrate audio state to audioStore

**State moved (4 vars):**
| useState | → store field |
|----------|--------------|
| `isPlaying` | `audioStore.isPlaying` |
| `isGeneratingAudio` | `audioStore.isGenerating` |
| `audioUrl` | `audioStore.url` |
| `audioError` | `audioStore.error` |

**Refs that move:**

- `audioRef` → `audioStore.audioElement` (module-level Audio instance)
- `isTogglingPlay` → `audioStore.isToggling`
- `activeAudioRequests` → `audioStore.activeRequests`

**Actions:**

- `togglePlay(poemId, poem, addLog)` — full TTS flow with cache check
- `resetAudio()` — called on poem change
- `setPlaying(bool)` — for ended event

**Tightly coupled sets in togglePlay() today:**

```
setIsGeneratingAudio(true)  → combined into togglePlay action
setAudioUrl(url)            →
setAudioError(err)          →
setCacheStats(...)          → stays in debug/ui store
setIsPlaying(true)          →
```

**Test:** Audio playback tests pass. Cache hit/miss flows work.

### 3.4 — Migrate UI state to uiStore

**State moved (7 vars):**
| useState | → store field |
|----------|--------------|
| `darkMode` | `uiStore.darkMode` |
| `currentFont` | `uiStore.font` |
| `textSizeLevel` | `uiStore.textSize` |
| `showTranslation` | `uiStore.showTranslation` |
| `showTransliteration` | `uiStore.showTransliteration` |
| `showDebugLogs` | `uiStore.showDebugLogs` |
| `logs` | `uiStore.logs` |

**Derived values:**

- `theme` → `uiStore.theme` (computed)
- `currentFontClass` → `uiStore.fontClass` (computed)
- `textScale` → `uiStore.textScale` (computed)

**Actions:**

- `toggleDarkMode()`
- `cycleFont()`
- `cycleTextSize()`
- `toggleTranslation()`
- `toggleTransliteration()`
- `addLog(label, msg, level)`
- `loadSettings({ darkMode, font })` — for user settings restore

**Test:** Theme toggle, font cycle, text size, translation toggle all work.

### 3.5 — Migrate modal state to modalStore

**State moved (8 vars):**
| useState | → store field |
|----------|--------------|
| `showAuthModal` | `modalStore.authModal` |
| `authModalMessage` | `modalStore.authMessage` |
| `showSavedPoems` | `modalStore.savedPoems` |
| `showSplash` | `modalStore.splash` |
| `showOnboarding` | `modalStore.onboarding` |
| `insightsDrawerOpen` | `modalStore.insightsDrawer` |
| `showShortcutHelp` | `modalStore.shortcutHelp` |
| `poetPickerOpen` | `modalStore.poetPicker` |

**Also includes feedback toasts:**

- `showCopySuccess` → `modalStore.copyToast`
- `showShareSuccess` → `modalStore.shareToast`
- `showInsightSuccess` → `modalStore.insightToast`

**Actions:**

- `openAuth(message?)` / `closeAuth()`
- `openSavedPoems()` / `closeSavedPoems()`
- `dismissSplash()`
- `toggleInsightsDrawer()`
- `toggleShortcutHelp()`
- `openPoetPicker()` / `closePoetPicker()`
- `flashToast(type, duration)` — generic toast with auto-dismiss

**Escape key handler:** `closeAll()` — closes topmost open modal

**Test:** All modal open/close flows work. Escape key dismisses correctly.

### 3.6 — Migrate interpretation state, wire remaining effects

**State moved (2 vars):**
| useState | → store field |
|----------|--------------|
| `interpretation` | `poemStore.interpretation` |
| `isInterpreting` | `poemStore.isInterpreting` |

These belong with poem state because they reset on poem change.

**Derived values:**

- `insightParts` → `poemStore.insightParts` (computed)
- `versePairs` → `poemStore.versePairs` (computed)

**Actions:**

- `handleAnalyze(addLog)` → `poemStore.analyze(addLog)`
- `resetInterpretation()` — called on poem change

**Remaining effects to rewire:**

- Keyboard shortcut effect → reads from all stores
- Auto-explain effect → reads poemStore
- Settings persistence effect → reads uiStore + user
- Poem-change reset effect → calls audioStore.reset + poemStore.resetInterpretation

**Test:** Insights generation, cache hits, auto-explain all work.

---

## What Stays in DiwanApp (~5 local useState)

| State               | Reason                                      |
| ------------------- | ------------------------------------------- |
| `headerOpacity`     | Scroll-derived, DOM-only                    |
| `poetPickerClosing` | Animation micro-state                       |
| `poetSearch`        | Ephemeral input, resets on close            |
| `dynamicPoets`      | Fetched-on-demand, tied to picker lifecycle |
| `cacheStats`        | Debug-only counters                         |

---

## Commit Order & Risk

```
3.0  Remove dead state          ──── trivial, 0 risk
3.1  Install Zustand + shells   ──── additive, 0 risk
3.2  Poem store migration       ──── medium risk (most handlers)
3.3  Audio store migration      ──── medium risk (async + refs)
3.4  UI store migration         ──── low risk (simple toggles)
3.5  Modal store migration      ──── low risk (boolean flags)
3.6  Interpretation + wiring    ──── medium risk (effects chain)
```

Each step: run tests → commit → push. Revert if tests break.

---

## Expected Outcome

- DiwanApp drops from **37 useState → ~5**
- Components subscribe only to their slice → **fewer re-renders**
- Handler logic moves into stores → **independently testable**
- No user-facing behavior change
- Bundle: +1KB (Zustand) −2KB (less boilerplate) = **-1KB net**
