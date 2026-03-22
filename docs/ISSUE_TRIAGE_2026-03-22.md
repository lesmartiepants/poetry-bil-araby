# Issue Triage Report — March 22, 2026

**Total open issues before triage:** 29
**Recommended to close:** 18
**Remaining open:** 11

## Context

Two major PRs changed the codebase significantly:

- **PR #240** (merged Mar 12): Unified sidebar layout — rewrote VerticalSidebar, InsightsDrawer, DebugPanel, AuthModal; removed daily poem, obsolete components; added seen-poem deduplication, TTS fallback, shrink-on-scroll header, gold checkmark animations, icon updates.
- **PR #285** (open): Monolith decomposition — extracted services, hooks, constants, components from app.jsx.

Issues #286–#297 were created as a backlog for PR #285 but their work was already completed by PR #240 on main.

---

## Issues to Close (18)

### Already Implemented by PR #240 (12 issues)

| #   | Title                                            | Evidence                                                                  |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| 286 | TTS: Pro primary + Flash fallback                | `fetchTTSWithFallback()` exists in `src/services/gemini.js`               |
| 287 | Rewrite VerticalSidebar                          | `src/components/VerticalSidebar.jsx` — collapsible, poet picker, settings |
| 288 | Rewrite DebugPanel                               | `src/components/DebugPanel.jsx` — floating panel, bug report              |
| 289 | Create InsightsDrawer                            | `src/components/InsightsDrawer.jsx` — drag gestures, expansion            |
| 290 | Redesign AuthModal                               | `src/components/auth/AuthModal.jsx` — gradient, Google-only               |
| 291 | Header BRAND + shrink-on-scroll                  | `BRAND` in `src/constants/design.js`; scroll anim in PR #240              |
| 292 | Seen poems deduplication                         | `src/utils/seenPoems.js` + server.js `exclude` param                      |
| 293 | Gold checkmark sparkle + icons                   | Implemented alongside sidebar rewrite in PR #240                          |
| 294 | Remove daily poem feature                        | `useDailyPoem.js` no longer exists                                        |
| 295 | Remove CategoryPill, ThemeDropdown, SettingsView | All three files absent from codebase                                      |
| 296 | Update constants (Arabic IDs, BRAND, glass)      | `src/constants/poets.js` uses Arabic IDs; `BRAND` exists                  |
| 297 | Update tests for unified sidebar                 | 316/316 unit tests pass (verified Mar 22)                                 |

### Unactionable Bug Reports (4 issues)

| #   | Title                             | Reason                                         |
| --- | --------------------------------- | ---------------------------------------------- |
| 279 | User-submitted from debug console | No description; logs show normal operation     |
| 280 | User-submitted from debug console | No description; logs show normal operation     |
| 301 | "I tried to press play after xxx" | Incomplete description                         |
| 306 | "Bro it's breaking"               | No specific error; logs contradict any failure |

### Duplicates (2 issues)

| #   | Title                                                      | Canonical             |
| --- | ---------------------------------------------------------- | --------------------- |
| 303 | "press play got this" — iOS audio permission               | Duplicate of **#304** |
| 309 | "Could not listen on branch deploy" — iOS audio permission | Duplicate of **#304** |

### Stale Tracker (1 issue)

| #   | Title                            | Reason                                                                    |
| --- | -------------------------------- | ------------------------------------------------------------------------- |
| 67  | UI/UX Design Branches — Tracking | Created Feb 19; references early PRs. PR #240 shipped the unified design. |

---

## Issues to Keep Open (11)

### Active Bugs (5)

| #       | Title                                                   | Priority | Notes                                                                                  |
| ------- | ------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **332** | Poet search broken across EN/AR + keyboard covers modal | High     | Draft PR #333 exists. Real mobile UX issue.                                            |
| **311** | Poem attributed to wrong poet                           | Medium   | Data integrity — poem ID shows wrong poet name.                                        |
| **304** | iOS audio playback permission denied                    | Medium   | Canonical issue. iOS Safari blocks audio outside user gesture. Also covers #303, #309. |
| **305** | Didn't recite entire poem                               | Low      | TTS truncation with long poems. Rate-limit fallback to Flash may contribute.           |
| **302** | Discover button — nothing happened                      | Low      | Backend worked (logs confirm), UI didn't update. iOS Safari rendering issue.           |

### Active Enhancements (4)

| #       | Title                                     | Priority | Notes                                                                         |
| ------- | ----------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| **300** | Batch translate 9,072 poem titles         | Medium   | Script exists but uses deprecated Gemini model. Update to `gemini-2.5-flash`. |
| **276** | Separate translate from insights pipeline | Medium   | Translation still triggers full insights generation.                          |
| **275** | TTS latency research & strategy           | Low      | Roadmap issue with 5 strategies. Good for planning.                           |
| **274** | Tablet 768px layout overlap               | Low      | Insight panel overlaps brand at md: breakpoint. May still exist post-PR #240. |

### Auth Bug (1)

| #       | Title                                   | Priority | Notes                                                      |
| ------- | --------------------------------------- | -------- | ---------------------------------------------------------- |
| **271** | OAuth redirect to production on preview | Low      | Requires Supabase dashboard config + dynamic `redirectTo`. |

---

## Execution

Run the cleanup script:

```bash
# Dry run first
DRY_RUN=1 bash scripts/close-stale-issues.sh

# Execute
bash scripts/close-stale-issues.sh
```

Requires `gh` CLI authenticated: `gh auth login`
