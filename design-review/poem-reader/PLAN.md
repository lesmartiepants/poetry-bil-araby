# Poem Reading & Discovery Redesign — "Tap to Reveal"

## Context

Today a poem is dumped on screen all at once inside a **horizontal** Embla carousel
(`src/components/PoemCarousel.jsx`) that only swaps between poems by the *same poet*.
There is no progressive reveal, no sense of pacing, and discovery is buried in a drawer.
For Arabic poetry — which is meant to be read line-by-line, savored — this flattens the
experience.

The user wants a **major experience upgrade**:
- Show **4 lines (a stanza) at a time**, revealed by **tapping**.
- Make moving to the **next poem effortless** (browsing + discovery).
- Use **modern animation libraries**, not constrained to what's already installed.
- **Prototype the options first**, then build the winner with solid, modular engineering.

**Locked product decisions (from the user):**
1. **Navigation:** *Vertical swipe feed* — swipe up = next poem, down = previous, from an
   endless discovery queue (Reels-for-poetry). Tap stays as the in-poem reveal.
2. **Reveal pace:** *Stanza blooms at once* — each tap reveals a group of up to 4 lines with
   a staggered cascade, then the next tap advances to the next 4.
3. **Workflow:** *Prototypes first* → user picks/mixes → then production integration + tests.

## Library decision (modern, 2026)

Research summary (sources at bottom). Recommendation = **one powerful new dependency**
layered on top of the strong modern stack already present — not a zoo of libs.

| Role | Library | Status | Why |
|---|---|---|---|
| **Hero text reveal** | **GSAP 3.13+ `SplitText`** + `@gsap/react` (`useGSAP`) | **NEW** | Since **April 2025 GSAP + all plugins (SplitText, ScrollTrigger) are 100% free** incl. commercial. SplitText was rewritten (−50% size) and is *the* industry tool for per-word/line stagger reveals — exactly the "stanza bloom" we want. ~23KB core + ~4KB SplitText. |
| **Orchestration / gestures / AnimatePresence** | **Motion (Framer Motion v12)** | already installed | Reuse for panel transitions, spring physics, exit anims, reduced-motion. |
| **Vertical feed pager** | **Embla `axis: 'y'`** | already installed | Reuse existing carousel knowledge + the rich `onSlideChange` plumbing (stop audio, URL sync, prefetch, translation queue). Switch axis to vertical. |
| **Tap vs swipe disambiguation** | **@use-gesture/react** | already installed | Reuse to cleanly separate tap (reveal) from drag (navigate). |
| **Ambience** | existing `SquoctogonBackground` + sparkle system | already present | Reuse; no new particle lib needed. |

Prototypes will also draw visual inspiration from **Aceternity UI / Magic UI** "blur-fade"
text patterns (copy-paste, Motion-based) — used as reference, not a runtime dependency.

New deps to add at build phase: `gsap`, `@gsap/react`.

## Phase 0 — Research artifacts (save first)

Persist the research as committed markdown so it survives the ephemeral container and informs
the build. Two files:

- **`design-review/poem-reader/RESEARCH.md`** — the **library landscape & decision record**:
  the comparison table above (GSAP SplitText / Motion / Embla-y / use-gesture / Aceternity ref),
  the GSAP-is-free-since-Apr-2025 finding, bundle-size notes, reduced-motion strategy, and the
  three locked product decisions with rationale. Includes the Sources list.
- **`design-review/poem-reader/ARCHITECTURE.md`** — the **current-state findings** from codebase
  exploration that the redesign builds on: poem data shape (`arabic`/`english` newline lines →
  `versePairs` at `app.jsx:817`), current `PoemCarousel` flow + `onSlideChange` handlers
  (`app.jsx:1614-1672`), Zustand stores, TTS highlight pipeline, conventions, and the target
  modular file map for Phase 2.

(These live under `design-review/` next to the prototypes so design + research + screenshots
sit together.)

## Phase 1 — Prototypes (build, get sign-off)

Three **self-contained HTML prototypes** under `design-review/poem-reader/` (matches the
existing `design-review/` convention; `npm run screenshots` auto-captures them desktop+mobile
via `scripts/capture-design-screenshots.js`). All three share the locked model
(**vertical feed + tap-to-bloom stanzas**) but explore distinct **motion personalities**, each
loading GSAP + SplitText from CDN, with 2–3 real Arabic sample poems, progress dots, dark/light:

- **`aurora-bloom.html`** — meditative. SplitText *word-by-word blur-up* cascade, soft gold
  glow, slow "breathing" geometric background. Minimal chrome.
- **`ink-and-light.html`** — heritage. Per-line `clip-path` ink-wash / curtain reveal inside
  the stanza cascade, manuscript paper texture, ornamental frame between stanzas.
- **`kinetic-verse.html`** — modern editorial. Bolder kinetic typography (lines mask + slide +
  scale in), subtle parallax depth on vertical swipe, confident accent motion.

Each prototype demonstrates: tap → 4-line bloom → tap → next stanza → (at poem end) swipe-up →
next poem with a smooth panel transition. Reduced-motion fallback (simple fade) included.

**Gate:** user reviews screenshots / opens the HTML, picks one (or a mix). Then Phase 2.

## Phase 2 — Production integration (modular)

Chunk-of-4 logic builds on the existing `versePairs` memo (`src/app.jsx:817`), which already
pairs Arabic↔English lines from `poem.arabic`/`poem.english`. New, isolated modules:

**Pure logic (unit-tested):**
- `src/utils/chunkStanzas.js` — `chunkStanzas(versePairs, size = 4)` → `[[{ar,en}...], ...]`.
- `src/hooks/useStanzaReveal.js` — state machine: `{ stanzaIndex, revealAll, advance(), reset() }`;
  resets on poem `id` change; `revealAll()` for the audio path (see below).

**Reveal engine (single GSAP owner):**
- `src/hooks/useSplitTextReveal.js` — wraps `useGSAP`/`SplitText`: splits a stanza into words,
  runs the staggered bloom, cleans up (`split.revert()`), and **falls back to a plain CSS fade
  when `prefers-reduced-motion`**. The *only* file that imports `gsap`.

**Components (`src/components/reveal/` + `src/components/feed/`):**
- `StanzaReveal.jsx` — renders one stanza (RTL Arabic + optional English/translit), drives the
  reveal via `useSplitTextReveal`. Reuses `DESIGN`/`POEM_META`/`THEME` constants and font classes;
  keeps `dir="rtl"`/`dir="ltr"` and `.arabic-shadow`.
- `PoemReader.jsx` — one poem panel: meta header (reuse the title/poet block from
  `PoemCard.jsx`), `StanzaReveal`, tap handler, and a **misbaha-style stanza progress** dot row.
- `PoemFeed.jsx` — **vertical** Embla feed (`axis:'y'`, snap, loop) of `PoemReader` panels.
  Wires `onSlideChange` to the existing app handlers in `src/app.jsx:1614-1672` (stop audio,
  clear TTS highlight, cancel analysis, URL `/poem/:id`, queue translation) and to
  `onLoadMore` → existing discovery fetch so the feed is endless.

**Integration into `src/app.jsx`:**
- Replace the horizontal `PoemCarousel` render block (`app.jsx:1609-1697`) with `PoemFeed`.
  Keep `PoemCarousel.jsx` until parity is confirmed, then remove.
- **TTS reconciliation:** pressing Listen/Play calls `useStanzaReveal.revealAll()` so the whole
  poem is visible and the existing word-highlight (`useTTSHighlight`, `HighlightedVerse`) runs
  unchanged across all `versePairs`.
- Discovery: keep `DiscoverDrawer`; the vertical feed *is* the new ambient discovery surface
  (poet/tag steering of the queue can be a fast follow).

**Conventions to follow:** Zustand selector pattern; Tailwind + inline styles with
`DESIGN`/`THEME`; `clamp()` typography; `aria-label`s + `data-testid` on interactive elements;
respect `prefers-reduced-motion`; 44px touch targets.

## Verification

- **Unit (Vitest):** `chunkStanzas` (edge cases: <4 lines, empty, exact multiples) and
  `useStanzaReveal` (advance/reset/revealAll) — mirror patterns in `src/test/*.test.jsx`.
  Mock `gsap`/SplitText in `StanzaReveal` tests like framer-motion is mocked today.
- **E2E (Playwright):** extend `e2e/carousel.spec.js` (or new `e2e/reader.spec.js`): tap reveals
  a stanza, tap advances, vertical swipe loads the next poem, Listen reveals the full poem.
  Reuse the route-mock + `loadApp` helpers already in `carousel.spec.js`.
- **Manual:** `npm run dev`, test on mobile viewport (tap + vertical swipe), dark/light, a long
  qasida and a 2-line poem, RTL rendering, reduced-motion on. `npm run screenshots` for prototypes.
- `npm run build`, `npm run lint`, `npm run test:run` green before commit/push to
  `claude/poem-browsing-redesign-wt5jxq` (no PR unless asked).

## Sources
- Webflow makes GSAP 100% free (Apr 2025): https://webflow.com/blog/gsap-becomes-free
- GSAP SplitText docs: https://gsap.com/docs/v3/Plugins/SplitText/
- GSAP vs Framer Motion vs React Spring (2026): https://lab.good-fella.com/blog/gsap-vs-framer-motion-vs-react-spring
- LogRocket — best React animation libraries 2026: https://blog.logrocket.com/best-react-animation-libraries/
- Aceternity UI blur-fade text (reference): https://ui.aceternity.com/blocks/text-animations/text-animation-blur-fade-in
