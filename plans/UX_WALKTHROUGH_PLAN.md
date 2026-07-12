# App-Building UX Review — Remediation Plan

## Context

An iPhone 16 walkthrough of every user path (first-run tour → reading → playback → text
settings → theme → account → dislike → discover → save) surfaced a set of UX issues, now
tracked as #606–#614. For each issue this plan records a **Before** (current behavior, with
code refs), an **After** (proposed target), and the **Decision (locked)** — the direction and
timing confirmed with the product owner.

Confirmed during review: in production the reading stage **does** ignite the opening couplet at
rest (`useSparklerReveal.js:296-302`); the fully-blank canvas seen in the sandbox was an
audio-less/headless artifact.

**Status:** ✅ **SHIPPED.** All nine fixes (#606–#614) were implemented across four parallel
worktree lanes with sprint-lead QA gates between waves, verified on iPhone 16 (393×852), and
merged to `claude/app-building-ux-review-nyrehn`. See the execution plan in
`~/.claude/plans/now-plan-with-defined-lovely-babbage.md`. Original locked directions are grouped
below for reference.

## Batches (all scheduled "later")

- **Batch A — Reader-chrome pass:** #611 (anchor) → #614 → #613 → #607
  _(one coherent redesign of the reading stage; #607 lands after #611)._
- **Batch B — Onboarding & copy:** #612, #608
- **Batch C — Auth/flow:** #606
- **Batch D — Settings & polish:** #609, #610

---

## #611 — Static reading state (anchor) · Batch A

**Before**

- Verses are visibility-gated: `SparklerStage` sets `opacity: i < revealedCount ? 1 : 0`
  (`SparklerStage.jsx:169`). At rest `start()` ignites the first **2** bayts
  (`useSparklerReveal.js:296-302`); everything else is hidden.
- The only ways to see the rest: **Next Verse** (`handleAdvance` → `controller.advance()`,
  `PoemReader.jsx:241-243`) reveals a pair, or **Listen** (`handleListen` → `revealAll()` +
  play, `PoemReader.jsx:246-249`) reveals all _and_ starts audio. There is no "just show me the
  whole poem to read" path decoupled from playback, and no static fallback if the reveal stalls.

**After**

- Keep the 2-bayt ignite at rest.
- Add a **single expanding reveal control**: reveals pair-by-pair on tap, with a secondary
  "reveal all / read full poem" affordance that loads the whole poem as static, readable text —
  **no audio required** (decouple `revealAll` from `onTogglePlay`).
- **Listen** becomes an overlay: the highlight runs over whatever text is currently shown.
- Content is never empty: if the reveal pipeline stalls, static text is already painted.

**Decision (locked)**

- **Default at rest:** keep 2 bayts + add an explicit "Read full poem" path.
- **Controls:** **one expanding control** (pair-by-pair, with a "reveal all" affordance) — not two
  separate buttons.
- **Timing:** **Later — Batch A** (design the interaction first; it's the anchor).
- _Open when building:_ does chosen mode persist across poems; does Listen-after-full-read re-run
  the ignite or highlight in place.

---

## #614 — Play jumps to bottom then scrolls up (bug) · Batch A

**Before**

- Tapping **Play/Listen** calls `revealAll()` then playback; the teleprompter track briefly
  translates to the **bottom** (all lines revealed) before the TTS-follow/reset repositions to
  the top — a visible downward jump then scroll-up.

**After**

- Play loads the poem and begins from **line 0 at the top** with **no intermediate bottom frame**:
  set reveal state fully but pin/reset the scroll track to the top in the same frame so the end
  never paints.

**Decision (locked)**

- **Rest position:** **line 0 at the top** when playback starts.
- **Timing:** **Later — Batch A** (shares the reveal/scroll path with #611/#613).

---

## #613 — Vertical scrub bar on the right · Batch A

**Before**

- Horizontal scrub bar pinned near the bottom (`scrubWrapRef`, `PoemReader.jsx:422+`); doubles as
  reveal-seek while reading and scroll-position while in insights. Bottom band is crowded (scrub +
  "swipe up" cue + tab bar).

**After**

- **Full-height, always-visible** vertical scrub rail anchored to the **screen-right edge** of the
  reading stage, mapping to top→bottom reading position. Preserves drag-to-seek and fill/handle
  semantics (fill = progress; handle only when scrollable) and the dual reading/insight behavior.

**Decision (locked)**

- **Form:** full-height, **always visible** (persistent reading-position rail).
- **Edge:** **screen-right** edge regardless of RTL.
- **Timing:** **Later — Batch A** (reader-chrome pass).
- _Open when building:_ insight-view rail behavior; right safe-area / system-gesture collisions;
  ≥44px touch target.

---

## #607 — Tour "Listen" step never shows the highlight · Batch A (after #611)

**Before**

- Opening couplet renders behind the tour (confirmed), so the stage isn't blank. But the "Listen"
  step describes synced word-by-word highlighting without ever showing it in motion.

**After**

- Ensure the opening bayts are painted before the tour starts, and on the "Listen" step play a
  **brief real recitation** so users actually hear + see the synced highlight.

**Decision (locked)**

- **Demo:** **brief real recitation** on the Listen step (not a silent pulse).
- **Timing:** **Later — Batch A, after #611** (depends on the reader-chrome shape).
- _Open when building:_ mobile autoplay constraints — the recitation may need a tap to start
  rather than true autoplay.

---

## #612 — "Swipe up for the next poem" (copy) · Batch B

**Before**

- Between-poems cue reads "scroll up for next poem" (`PoemReader.jsx:500` area).

**After**

- **Pointer-aware:** "Swipe up for the next poem" on touch, "Scroll up …" on desktop.

**Decision (locked)**

- **Wording:** **pointer-aware** (swipe on touch, scroll on desktop).
- **Timing:** **Later — Batch B.**

---

## #608 — Tour welcome copy references a non-existent highlight · Batch B

**Before**

- The `welcome` step (centered, `target: null`) shows the note "Tap the highlighted action to move
  on…" though nothing is highlighted (`tourSteps.js`). Only **Next** advances.

**After**

- Suppress the "tap the highlighted action" note on the centered intro (`welcome`) / outro
  (`finish`) cards. On anchored feature steps, drive advancement by the **real interaction only**
  (remove the redundant Next button on those steps).

**Decision (locked)**

- **Advance model:** **real interaction only** on anchored steps; note hidden on intro/outro.
- **Timing:** **Later — Batch B.**

---

## #606 — Dislike forces a sign-in wall · Batch C

**Before**

- `handleDownvote` opens Google sign-in when signed out (`app.jsx:1159` → `handleSignIn`). Auth
  sheet copy is the generic "Sign in to save poems and preferences," which doesn't match a skip.

**After**

- Keep the sign-in prompt on dislike, but **fix the copy** so it matches the action (e.g.
  "Sign in to remember what you skip"). Save remains the primary account hook.

**Decision (locked)**

- **Behavior:** **keep auth, fix copy only** (dislike still prompts sign-in when signed out).
- **Auth boundary:** **Save stays the account hook**; dislike shares the prompt with matched copy.
- **Timing:** **Later — Batch C.**

---

## #609 — Header Geometry behind "Advanced" · Batch D

**Before**

- The Aa text-settings panel shows reading controls **and** authoring controls in one flat list:
  Header Geometry (hex line colour `#4a7cc9`, pattern density `8.5`, "Open pattern generator").

**After**

- Default panel = reading controls only (Translation/Romanize, Font size, Font, Read Along,
  Buttons). Header Geometry + pattern generator moved under a collapsed **Advanced** disclosure.

**Decision (locked)**

- **Direction:** **behind an "Advanced" disclosure** (kept as a user feature, not removed/flagged).
- **Timing:** **Later — Batch D.**

---

## #610 — Polish batch (contrast · voice label · tour persistence) · Batch D

**Before**

- Low-contrast chrome: top icons (theme/Aa/compass), bottom tab labels, and the reveal actions
  ("Start recitation"/"Next Verse") are dim gold on near-black, worse in light mode.
- Account menu shows `Voice — Orus`, a raw Gemini voice ID.
- Tour completion can fail to persist if Done is tapped while the auth sheet is open (desktop);
  "Resume tour" chip then shows instead of the completed "Restart tour" icon (`TourLauncher.jsx`).

**After**

- **Light mode** chrome + reveal actions meet WCAG AA.
- Voices get **Arabic personal names** chosen to match each voice's character/personality (raw IDs
  mapped in one place).
- `tourCompleted` persists regardless of open overlays when Done is tapped.

**Decision (locked)**

- **Contrast scope:** **light mode only** (dark mode left as-is).
- **Voice naming:** **Arabic people-names matching each voice's characteristics/personality.**
- **Timing:** **Later — Batch D** (all three together).
