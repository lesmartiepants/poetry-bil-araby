# PR #62 Cross-Branch UX Review + 20 End-to-End Mockup Concepts

Date: 2026-02-17  
Scope: PR #62 consolidated design explorations + local A-K mockups in this branch

## 1) What I reviewed (agent-style workflow)

### Sources reviewed
- PR #62 design catalog (28 options across splash, main app, controls, auth)
- PR #62 desktop + mobile screenshot manifest
- Local branch mockups (A-K): scroll/deco/heavy-frame concept set

### Real navigation validation (desktop + mobile)
I ran scripted interaction walkthroughs against PR #62 review UI and local mockups:
- Opened review shell
- Navigated all options via next/prev + keyboard
- Switched components/categories
- Triggered verdict/comment/submit flows
- Ran both desktop and mobile contexts

Result summary:
- `28/28` options reachable in desktop and mobile review shell
- No runtime page errors
- No console errors
- Submit flow works in both contexts

## 2) Cross-platform findings (staff-level UX pass)

## Strengths
1. **Splash quality is strongest overall** (Particles, Light, Manuscript have strong emotional hooks).
2. **Control rail explorations are mature**:
   - Dark mode: Notion / Minimal rails are production-friendly.
   - Light mode: Scandinavian + Neumorphic feel premium and clear.
3. **Auth UI states are coherent** (modal, tooltip, mobile overflow are good system pieces).

## Gaps
1. **Main-app mobile responsiveness is the biggest gap**  
   Most PR #62 main layouts are desktop-first and clip on narrow viewports.
2. **Logo/header scaling in local A-K options needs responsive rules**  
   On mobile, branding overlaps poem content.
3. **Some visual systems are excellent per-screen but not yet end-to-end coherent**  
   (great splash + weakly matched main/controls, or vice versa).

## Best current cross-branch base stack (single “best” pick)

**Best base to build on now:**
- **Splash:** Particles Option 2 (Gold Mystical)
- **Walkthrough direction:** Scroll-story pacing + spotlight dust transitions
- **Main app:** Scroll Story (U) structure, with mobile-first adaptation
- **Vertical controls:** Notion/Linear (dark), Scandinavian (light)
- **Auth:** Mobile overflow + modal from auth set

Why this wins:
- Highest emotional entry, strongest readability, easiest to productionize across mobile/web with fewer risky effects.

## 3) Recommended top directions

1. **Gold Orbit Story** (premium, poetic, scalable)
2. **Spotlight Ether / Scroll Reveal** (cinematic, differentiated)
3. **Nordic Quiet Reader** (minimalist, calm, highly usable)
4. **Deco Discovery** (editorial luxury, brand-heavy)
5. **Ink Mono Archive** (focused, performance-first, serious poetry tone)

## 4) End-to-end architecture (target interaction model)

```text
[Splash Animation]
      |
      v
[Walkthrough: 4 cards]
  1. Discover
  2. Listen
  3. Insight
  4. Save / Sign-in
      |
      v
[Main Reader]
  |-- Bottom Nav: Discover / Listen / Insight / Copy / Theme
  |-- Vertical Rail: Save(Heart) / A+ / A- / Transliteration / Reset
  |-- Mode: Local-Web toggle + Poet filter
  |-- Auth Gate: Save => tooltip => modal/sheet
```

---

## 5) Set A - 10 cohesive end-to-end options

Each option includes splash + walkthrough + main + nav/controls + vertical rail + auth + all core features.

### A1. Gold Orbit Story (Recommended #1)
- Inspiration: PR62 `particles-opt2`, `mainapp-u`, `controls-opt3`, auth overflow/modal.
- Splash: Gold particle halo with subtle constellation links.
- Walkthrough: 4-step orbit cards (Discover, Listen, Insight, Save).
- Main: Story-chapter reader, two-pane on web / single-pane stacked on mobile.
- Nav/Controls: Bottom nav (Discover, Listen, Insight, Copy, Theme).
- Vertical rail: Notion style (Heart, A+, A-, Transliteration, Reset).
- Auth: Save click -> tooltip -> OAuth sheet/modal.

### A2. Paper & Photon
- Inspiration: `manuscript-opt3` texture + `light-opt3` spotlight dust.
- Splash: Unrolling paper with warm beam + floating dust.
- Walkthrough: “Page turn” transitions with real paper grain.
- Main: Scroll canvas with lit reading column.
- Rail: Scandinavian circles in light mode; dark variant auto-switches to Notion.
- Auth: “Bookmark this scroll” contextual sheet.

### A3. Ink Mono Archive
- Inspiration: `mainapp-p-inkmono`, `ink-opt3-calligraphy`.
- Splash: Ink stroke reveal (RTL-first animation).
- Walkthrough: Typewriter reveal + audio waveform hint.
- Main: Monochrome editorial layout, ultra-readable Arabic-first typesetting.
- Rail: Minimal monochrome icon rail.
- Auth: Inline save lock + non-blocking sign-in modal.

### A4. Desert Editorial Air
- Inspiration: `mainapp-o-desert`, light typography from manuscript set.
- Splash: Sunrise gradient with low-motion dust.
- Walkthrough: Postcard cards with poetic captions.
- Main: Warm, airy reading space with generous spacing.
- Rail: Scandinavian in light mode, Notion in dark.
- Auth: Bottom-sheet signup with “save to your travel journal”.

### A5. Constellation Atlas
- Inspiration: `particles-opt3`, `mainapp-n-bento`.
- Splash: Sparse constellation map; tap stars to reveal poet eras.
- Walkthrough: Atlas onboarding tiles (themes, poets, moods).
- Main: Modular panels web / card-stack mobile.
- Rail: Notion compact (better density with modular UI).
- Auth: Save packs/collections gated via modal.

### A6. Nordic Quiet Reader
- Inspiration: `controls-opt9`, `mainapp-m` minimal direction.
- Splash: Near-static, calm minimal typography with tiny glow cues.
- Walkthrough: Minimal cards, high whitespace, Scandinavian iconography.
- Main: Centered poem canvas; reduced chrome.
- Rail: Scandinavian circles + subtle counters.
- Auth: Clean modal with minimal copy and strong hierarchy.

### A7. Ink Ritual
- Inspiration: `ink-opt3`, `controls-opt1`.
- Splash: Ritualized calligraphy reveal + breathing background.
- Walkthrough: Ink droplets progress indicator.
- Main: Quiet dark reader with ritual controls (Prev/Play/Insight/Save).
- Rail: Minimal glass rail with tooltips.
- Auth: Save ritual prompt + Apple/Google single-tap.

### A8. Deco Discovery
- Inspiration: local `option-f`, `option-k` heavy frame + PR62 dark controls.
- Splash: Art deco frame reveal around bilingual logo.
- Walkthrough: Framed cards + gilded dividers.
- Main: Elegant dark stage, central poem focus.
- Rail: Notion for clarity (deco visuals stay in shell/chrome).
- Auth: Deco-styled sheet preserving accessibility contrast.

### A9. Scroll of Dawn
- Inspiration: `manuscript-opt3` + `mainapp-u` narrative.
- Splash: Physical scroll unroll (no wax seal emphasis; steel rod + paper realism).
- Walkthrough: Chapter ribbon from top-to-bottom.
- Main: Story arcs + chapter markers.
- Rail: Notion (dark) / Scandinavian (light).
- Auth: “Save chapter progress” contextual login.

### A10. Dual-Mode Harmony
- Inspiration: best production-ready pieces from PR62.
- Splash: Gold particles in dark theme, clean minimal in light theme.
- Walkthrough: Theme-aware onboarding.
- Main: Shared layout skeleton with theme skins.
- Rail: Notion dark + Neumorphic light.
- Auth: consistent modal/sheet in both themes.

---

## 6) Set B - 10 options optimized for your preferred styles

Mandatory motifs intentionally blended:  
Particles, physical scroll opening, spotlight+dust, Notion vertical controls, Neumorphic/Scandinavian alternatives.

### B1. Zen Particles + Steel Scroll
- Splash: Zen particle field, low-density, slow drift.
- Transition: Steel-capped scroll unroll from top to bottom.
- Main: Clean dark story reader.
- Rail: Notion default; Scandinavian on light mode.
- Auth: save-first login prompt.

### B2. Spotlight Ether
- Splash: Single moving spotlight with ambient magic dust.
- Transition: Dust forms chapter title.
- Main: Spotlight-guided reading lane.
- Rail: Notion with contextual labels on focus.
- Secondary rail skin: Neumorphic for light theme.

### B3. Heavy Scroll, Soft Controls
- Splash: Heavy paper realism + metallic rod.
- Walkthrough: Scroll panels with tactile swipe cues.
- Main: Paper-on-dark contrast.
- Rail: Neumorphic by default, Notion available in settings.
- Auth: bottom sheet with tactile buttons.

### B4. Particle Cathedral
- Splash: Dense particle dome (desktop), reduced cluster (mobile).
- Walkthrough: Constellation to chapter cards.
- Main: Grand but restrained dark stage.
- Rail: Notion compact + mini badges.
- Auth: modal with poet memory copy.

### B5. Dust Beam Minimal
- Splash: Light beam + sparse particles only in shadow.
- Walkthrough: monochrome cards with gold highlights.
- Main: minimalist typography-forward reader.
- Rail: Scandinavian default, Notion for power users.
- Auth: minimalist sign-in with strong CTA clarity.

### B6. Metallic Manuscript
- Splash: forged-metal top bar + realistic parchment unroll.
- Walkthrough: artifact cards (poet, era, theme, save).
- Main: manuscript-inspired but modern spacing.
- Rail: Notion dark / Neumorphic light.
- Auth: “archive your favorite lines” save gate.

### B7. Orbital Scroll Story
- Splash: particle orbit ring.
- Transition: ring becomes scroll spindle.
- Main: scroll-story chapters with orbit markers.
- Rail: Notion with chapter quick-jump.
- Auth: chapter-save unlock prompt.

### B8. Ritual Spotlight Hybrid
- Splash: spotlight + calligraphy stroke reveal.
- Walkthrough: 4 ritual steps with dust accents.
- Main: two-mode layout (immersive + compact).
- Rail: Notion (immersive), Scandinavian (compact).
- Auth: compact modal aligned to active mode.

### B9. Kinetic Scroll Atlas
- Splash: kinetic particles form map points.
- Walkthrough: map points unroll into guide cards.
- Main: atlas + story merge; explore poets then read.
- Rail: Notion for dense actions.
- Auth: save collections + synced history.

### B10. Signature Blend (Recommended #2)
- Splash: Gold particles + subtle spotlight dust.
- Transition: premium unrolling scroll (no wax seal, paper grain realism).
- Walkthrough: chaptered cards with bilingual copy and micro motion.
- Main: Scroll Story structure with Celestial depth cues.
- Rail: Notion in dark + Scandinavian in light + optional Neumorphic skin.
- Auth: frictionless save flow (tooltip -> sheet -> OAuth), supports web/mobile parity.

---

## 7) Implementation guardrails for “wow” + smoothness

- Motion budget: use transform/opacity; avoid layout thrash.
- Particle budget:
  - Mobile: `80-140`
  - Desktop: `180-320`
- 60fps target on mid-tier mobile.
- Touch targets: minimum `44px`.
- Arabic typography:
  - Maintain line-height >= `1.9` for body Arabic
  - Avoid clipping with dynamic font scaling
- Responsive breakpoints must reflow headers/logos first (to prevent overlap seen in several current mobile mocks).

## 8) Immediate recommendation

If you want one direction to execute first:

1. **A1 Gold Orbit Story** (fastest path to premium + reliable)  
2. **B10 Signature Blend** (highest “wow” potential)  
3. **A8 Deco Discovery** (brand-distinctive, editorial luxury)

