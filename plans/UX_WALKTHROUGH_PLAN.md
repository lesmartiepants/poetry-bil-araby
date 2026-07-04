# App-Building UX Review — Remediation Plan

## Context

An iPhone 16 walkthrough of every user path (first-run tour → reading → playback → text
settings → theme → account → dislike → discover → save) surfaced a set of UX issues, now
tracked as #606–#614. This plan gives, for each issue, a **Before** (current behavior, with
code refs), an **After** (proposed target), and **Validation questions** — the open decisions
to confirm before building, so we lock direction issue-by-issue.

Confirmed during review: in production the reading stage **does** ignite the opening couplet at
rest (`useSparklerReveal.js:296-302`); the fully-blank canvas seen in the sandbox was an
audio-less/headless artifact. The plan below reflects that.

## Sequencing

1. **#611** — static reading state _(anchor; several others depend on it)_
2. **#614** — play-time scroll-jump _(touches the same reveal/scroll path)_
3. **#613** — vertical scrub bar _(same reader chrome)_
4. **#606** — dislike sign-in wall
5. **#609** — Header Geometry behind Advanced
6. **#612** — "swipe up" copy · **#608** — tour welcome copy _(quick copy wins)_
7. **#607** — tour "Listen" demo _(depends on #611)_
8. **#610** — polish batch (contrast, voice label, tour persistence)

---

## #611 — Static reading state (anchor)

**Before**

- Verses are visibility-gated: `SparklerStage` sets `opacity: i < revealedCount ? 1 : 0`
  (`SparklerStage.jsx:169`). At rest `start()` ignites the first **2** bayts
  (`useSparklerReveal.js:296-302`); everything else is hidden.
- The only ways to see the rest: **Next Verse** (`handleAdvance` → `controller.advance()`,
  `PoemReader.jsx:241-243`) reveals a pair, or **Listen** (`handleListen` → `revealAll()` +
  play, `PoemReader.jsx:246-249`) reveals all _and_ starts audio. There is no "just show me the
  whole poem to read" path decoupled from playback, and no static fallback if the reveal stalls.

**After**

- **At rest:** opening two bayts visible (keep the ignite-in) — unchanged.
- **Two explicit reader choices** surfaced as first-class actions:
  - **Read in pairs** — reveal next bayt-pair on demand (existing advance behavior, relabeled).
  - **Read full poem** — reveal all verses as static, readable text, **no audio required**
    (new: decouple `revealAll` from `onTogglePlay`).
- **Listen** becomes an overlay: the word-highlight recitation runs over whatever text is
  currently shown, not the sole path to reveal.
- Content is never empty: if the reveal pipeline stalls, the static text is already painted.

**Validation questions**

- Default at rest: keep 2 bayts, or show the **whole poem statically** and treat the sparkler
  reveal as a per-poem opt-in? (Changes what "default" means.)
- Are **Read in pairs** and **Read full poem** two separate controls, or one control that
  expands pair-by-pair with a "reveal all" affordance?
- When a reader chose **Read full poem** (static) and then taps **Listen**, should the highlight
  animate over the full text with no re-reveal, or re-run the ignite per line?
- Should the chosen mode (static vs. reveal) **persist** across poems / in user settings?
- Any concern that static full-text weakens the signature sparkler moment — do we gate it behind
  a subtle affordance rather than a prominent button?

---

## #614 — Play jumps to bottom then scrolls up (bug)

**Before**

- Tapping **Play/Listen** calls `revealAll()` then playback; the teleprompter track briefly
  translates to the **bottom** (all lines revealed) before the TTS-follow/reset repositions to
  the top — a visible downward jump then scroll-up.

**After**

- Play loads the poem and begins from the top with **no intermediate bottom frame**: set reveal
  state fully but pin/reset the scroll track to the top in the same frame so the end never paints.

**Validation questions**

- Is the desired start-of-playback position **line 0 at top**, or the current "first spoken line
  with one line of context above" framing (`ttsFollow`)? (Defines the correct resting scroll.)
- Should **Read full poem** (static, #611) use the same instant-top behavior, confirming the fix
  is shared between both paths?
- Acceptable to remove the reveal-all animation entirely on Play (instant), or must the ignite
  still play — just without scrolling?

---

## #613 — Vertical scrub bar on the right

**Before**

- Horizontal scrub bar pinned near the bottom (`scrubWrapRef`, `PoemReader.jsx:422+`); doubles as
  reveal-seek while reading and scroll-position while in insights. Bottom band is crowded (scrub +
  "swipe up" cue + tab bar).

**After**

- Vertical scrub rail anchored to the **right edge** of the reading stage, mapping to top→bottom
  reading position. Preserves drag-to-seek and fill/handle semantics (fill = progress; handle only
  when scrollable) and the dual reading/insight behavior.

**Validation questions**

- Full-height rail, or a shorter centered rail? Always visible, or only on
  touch/scrub (auto-hide)?
- Which edge in RTL context — screen-right regardless, or the "leading" edge? (Arabic reads R→L
  but scrolls top→bottom; confirm right edge reads correctly.)
- Does the insight view keep the same right rail for paragraph scroll, or revert to something else
  when reading prose (English `font-fell`)?
- Interaction with the right-side gutter and safe-area inset on notched phones — any collision
  with system gestures?

---

## #606 — Dislike forces a sign-in wall

**Before**

- `handleDownvote` opens Google sign-in when signed out (`app.jsx:1159`, → `handleSignIn`). Auth
  sheet copy is the generic "Sign in to save poems and preferences," which doesn't match a skip.

**After**

- Dislike works signed-out, persisted locally (mirroring skip/seen handling), and auto-advances.
  If auth is ever prompted, do it contextually/non-blocking with copy matching the action.

**Validation questions**

- Do we need dislikes tied to an account at all for signed-out users, or is `localStorage`
  (migrated on later sign-in) sufficient?
- If we keep an eventual prompt, what's the trigger (e.g. after N dislikes) and the exact copy?
- Should the same signed-out-local treatment extend to **Save** (currently also auth-gated), or is
  Save intentionally the account hook and Dislike is not? (Defines the auth boundary.)

---

## #609 — Header Geometry behind "Advanced"

**Before**

- The Aa text-settings panel shows reading controls **and** authoring controls in one flat list:
  Header Geometry (hex line colour `#4a7cc9`, pattern density `8.5`, "Open pattern generator").

**After**

- Default panel = reading controls only (Translation/Romanize, Font size, Font, Read Along,
  Buttons). Header Geometry + pattern generator moved under a collapsed **Advanced** disclosure.

**Validation questions**

- Ship Header Geometry to all users behind Advanced, or gate it behind a dev/feature flag entirely?
- Is the hex/pattern control meant for end users at all, or is it a design/authoring tool that
  should leave the reader UI?
- Should "Advanced" state (open/closed) persist per user?

---

## #612 — "Swipe up for the next poem" (copy)

**Before**

- Between-poems cue reads "scroll up for next poem" (`PoemReader.jsx:500` area).

**After**

- "Swipe up for the next poem" on touch; keep universal or branch on pointer type for desktop.

**Validation questions**

- One universal string ("Swipe up …") everywhere, or pointer-type-aware ("Scroll" on desktop)?
- Exact wording — "Swipe up for the next poem" vs. shorter "Swipe up for more"?

---

## #608 — Tour welcome copy references a non-existent highlight

**Before**

- The `welcome` step (centered, `target: null`) shows the note "Tap the highlighted action to move
  on…" though nothing is highlighted (`tourSteps.js`). Only **Next** advances.

**After**

- Suppress the "tap the highlighted action" note on the centered intro (`welcome`) and outro
  (`finish`) cards; show it only on steps with a real `target`.

**Validation questions**

- Keep the dual-advance on feature steps (tap the real control **or** Next), or drive purely by the
  real interaction? (Affects whether Next shows at all on anchored steps.)
- Any copy change to the intro card to make "Next" the obvious action?

---

## #607 — Tour "Listen" step never shows the highlight (softened)

**Before**

- Opening couplet renders behind the tour (confirmed), so the stage isn't blank. But the "Listen"
  step describes synced word-by-word highlighting without ever animating it; "Understand the
  meaning" may point at insights that haven't loaded.

**After**

- Ensure the opening bayts are painted **before** the tour starts. Add a short scripted
  auto-reveal / highlight pulse on the "Listen" step so the signature feature is shown, not just
  described.

**Validation questions**

- On the "Listen" step, play a **silent** highlight pulse (no audio), or actually start a brief
  recitation? (Autoplaying audio in onboarding may be unwelcome / blocked on mobile.)
- Should the tour **block** until the first poem's couplet is on screen, or start regardless and
  just avoid steps whose targets aren't ready?
- Does resolving #611 (static full-text option) change what the "meaning" step should point at?

---

## #610 — Polish batch (contrast · voice label · tour persistence)

**Before**

- Low-contrast chrome: top icons (theme/Aa/compass), bottom tab labels, and the reveal actions
  ("Start recitation"/"Next Verse") are dim gold on near-black, worse in light mode.
- Account menu shows `Voice — Orus`, a raw Gemini voice ID.
- Tour completion can fail to persist if Done is tapped while the auth sheet is open (desktop);
  "Resume tour" chip then shows instead of the completed "Restart tour" icon
  (`TourLauncher.jsx`).

**After**

- Chrome and reveal actions meet WCAG AA in both themes.
- Voices get human-friendly display names (raw IDs mapped in one place).
- `tourCompleted` persists regardless of open overlays when Done is tapped.

**Validation questions**

- Contrast: bump token values globally, or only in light mode where it's worst? Any brand
  constraint on how bright the gold can go (`THEME`/`DESIGN`)?
- Voice naming — invent friendly names ourselves, or is there a canonical mapping to reuse? Show a
  one-word character hint alongside?
- Split any of these three into their own issues if they're picked up independently?
