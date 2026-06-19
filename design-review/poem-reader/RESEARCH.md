# Poem Reader Redesign — Library Landscape & Decision Record

_Research date: June 2026. Author: redesign sprint._

This document captures the library research and the product decisions behind the
"Tap to Reveal" poem reading & discovery redesign. It is the **decision record** —
read it before changing the animation stack.

---

## 1. The brief

- Show **4 lines (a stanza) at a time**, revealed by **tapping**.
- Make moving to the **next poem effortless** (browsing + discovery).
- Use **modern animation libraries** — not constrained to what's already installed.
- **Prototype the options first**, then build the winner with modular engineering.

### Locked product decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Navigation** | **Vertical swipe feed** | Swipe up = next poem, down = previous, from an endless discovery queue ("Reels for poetry"). Tap is reserved entirely for the in-poem reveal, so the two gestures never collide. Vertical feeds are the dominant, muscle-memory pattern for "just keep discovering." |
| 2 | **Reveal pace** | **Stanza blooms at once** | Each tap reveals a group of up to 4 lines with a staggered cascade, then the next tap advances to the next 4. Faster sense of progress than line-by-line while still pacing the poem. |
| 3 | **Workflow** | **Prototypes first** | Build 3 self-contained HTML prototypes (distinct motion personalities) → user picks/mixes → then production integration + tests. |

---

## 2. Library landscape (2026)

### Final recommendation: one powerful new dependency on top of the existing modern stack

The app already ships a strong, modern animation/gesture stack (Framer Motion v12,
Embla, @use-gesture, Vaul, Zustand). We add **exactly one** new runtime dependency —
GSAP — rather than a zoo of libraries.

| Role | Library | Status | Why |
|---|---|---|---|
| **Hero text reveal** | **GSAP 3.13+ `SplitText`** + `@gsap/react` (`useGSAP`) | **NEW** | The marquee addition. SplitText is the industry tool for per-word / per-line staggered reveals — exactly the "stanza bloom." |
| **Orchestration / gestures / AnimatePresence** | **Motion (Framer Motion v12)** | installed | Panel transitions, spring physics, exit animations, reduced-motion. |
| **Vertical feed pager** | **Embla `axis: 'y'`** | installed | Reuse existing carousel knowledge + the rich `onSlideChange` plumbing. Switch axis to vertical. |
| **Tap vs swipe disambiguation** | **@use-gesture/react** | installed | Cleanly separate tap (reveal) from drag (navigate). |
| **Ambience** | `SquoctogonBackground` + sparkle system | in-repo | Reuse; no new particle lib needed. |

### Why GSAP now (the key finding)

- **As of April 2025, GSAP — including all formerly paid "Club" plugins (SplitText,
  MorphSVG, DrawSVG, ScrollTrigger, ScrollSmoother) — is 100% free, including for
  commercial use**, after Webflow's acquisition of GreenSock.
- **SplitText was rewritten from the ground up**: ~50% smaller file size and 14 new
  features. It splits text into chars / words / lines and (critically for Arabic)
  handles wrapping and cleanup (`split.revert()`).
- This removes the historical blocker (licensing cost) that kept GSAP out of many
  projects. It is now the obvious choice for premium text motion.

### Candidates considered and why not (as runtime deps)

- **React Spring** — excellent physics, but smaller API surface and no text-splitting
  primitive; Motion already covers our spring needs.
- **Anime.js v4** — nice ESM rewrite, but overlaps GSAP/Motion without a SplitText
  equivalent; adds a third motion engine for no gain.
- **Lenis (smooth scroll)** — would fight CSS scroll-snap / Embla snap in a paged feed;
  not needed.
- **React Three Fiber / drei, Rive, Lottie** — overkill for a text-first reading
  experience; bundle and authoring cost not justified.
- **tsParticles** — the app already has a sparkle/particle ambience system; reuse it.

### Reference (not a runtime dependency)

- **Aceternity UI / Magic UI** "blur-fade" text components (Motion + Tailwind,
  copy-paste). Used as **visual inspiration** for the blur-to-focus reveal feel; we
  implement the effect ourselves with GSAP/Motion rather than vendoring components.

---

## 3. Bundle-size & performance notes

- GSAP core ≈ **23 KB** min+gzip; `SplitText` adds ≈ **4 KB**. Full premium text
  setup stays under ~35 KB.
- GSAP is imported in **exactly one module** (`src/hooks/useSplitTextReveal.js`) so it
  is tree-shakeable and easy to lazy-load if needed.
- `force3D: true` on revealed words → GPU compositing for smooth mobile animation.
- Always `split.revert()` on cleanup to restore the DOM (and the original text nodes
  for screen readers / copy-paste).

---

## 4. Accessibility & reduced motion

- **`prefers-reduced-motion: reduce`** → skip SplitText entirely; reveal stanzas with a
  plain CSS opacity fade. The app already respects this globally in `index.css` /
  `tts-highlight.css`.
- SplitText must restore real text on revert so **screen readers, selection, and
  copy-paste** keep working on the full Arabic line, not per-word spans.
- Keep `dir="rtl"` on Arabic, `dir="ltr"` on English/transliteration.
- Tap target ≥ 44px; keep `aria-label`s on controls; provide a visible "tap to reveal"
  affordance so the gesture is discoverable.

---

## 5. New dependencies to add (Phase 2)

```
npm i gsap @gsap/react
```

`@gsap/react` provides the `useGSAP()` hook (proper React 18 cleanup + scoping).
`SplitText` is registered via `gsap.registerPlugin(SplitText)` inside the single
reveal hook.

---

## Sources

- Webflow makes GSAP 100% free (Apr 2025): https://webflow.com/blog/gsap-becomes-free
- GSAP SplitText docs: https://gsap.com/docs/v3/Plugins/SplitText/
- GSAP pricing (now free): https://gsap.com/pricing/
- GSAP vs Framer Motion vs React Spring (2026): https://lab.good-fella.com/blog/gsap-vs-framer-motion-vs-react-spring
- LogRocket — best React animation libraries 2026: https://blog.logrocket.com/best-react-animation-libraries/
- Aceternity UI blur-fade text (reference): https://ui.aceternity.com/blocks/text-animations/text-animation-blur-fade-in
- Codrops — creative demos with free GSAP plugins: https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/
