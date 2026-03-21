# Poetry Bil-Araby — Design Makeover Brief

> **Site:** [poetry-bil-araby.vercel.app](https://poetry-bil-araby.vercel.app)
> **Title:** بالعربي | Poetry Bil-Araby — Arabic Poetry Explorer
> **Platform:** Vercel (likely Next.js / React SPA)
> **Direction:** RTL-first, bilingual Arabic ↔ English

---

## 1. What This App Is Trying to Do

Based on the title, meta, and the broader category of Arabic poetry explorer apps, the core intent is clear: make Arabic poetry accessible, explorable, and engaging — bridging classical literature with modern web UX. The app likely supports browsing by poet, era, and theme, reading poems in Arabic (possibly with translation/transliteration), and possibly audio recitation.

**The fundamental tension:** Arabic poetry is an _oral, performative, deeply emotional_ art form. Most digital poetry platforms treat it like a database. The opportunity is to build something that feels closer to _listening to a recitation in a majlis_ than scrolling a Wikipedia article.

---

## 2. Current State — Probable Pain Points

These are the common issues across Arabic poetry web apps (including sites like Aldiwan, arabic-poems.com, and similar Vercel-hosted projects) that almost certainly apply here:

### Layout & Typography

- RTL text handling is likely functional but not _designed_ — most apps just flip direction without rethinking hierarchy
- Arabic calligraphic beauty is usually lost in standard web fonts (Noto Sans Arabic, system defaults)
- Line breaks in poetry (bayt structure: صدر + عجز) are rarely given proper visual treatment
- Mixed Arabic/English layouts create visual tension without intentional design

### Navigation & Discovery

- Likely a standard sidebar or top-nav with categories (poets, eras, themes)
- Flat list browsing — no sense of journey, relationship, or context
- Search is probably keyword-only with no fuzzy matching for Arabic diacritics
- No sense of “where am I” in the corpus — how does this poem relate to others?

### Reading Experience

- Poetry is probably rendered as plain text blocks
- No visual distinction between the two hemistichs (صدر and عجز) of a bayt
- Likely no audio, or audio is a bolted-on play button
- Translation (if present) probably sits as a static block below — not synchronized

### Mobile Experience

- Almost certainly not PWA-optimized
- Touch gestures (swipe between poems, pinch for font size) are likely absent
- Bottom navigation is probably missing in favor of a hamburger menu

### Emotional Design

- The biggest miss: poetry apps rarely _feel_ like poetry. They feel like reference tools
- No ambient mood, no color that shifts with theme, no motion that echoes meter
- The transition between poems is probably a hard page load, not a choreographed moment

---

## 3. Component & Library Upgrade Map

| Current (Probable)                     | Replace With                                                                              | Why                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Default system/Google fonts for Arabic | **Amiri** or **Scheherazade New** (for classical) / **IBM Plex Arabic** (for UI)          | Purpose-built for Arabic poetry readability; proper ligatures and kashida support |
| Generic CSS layout                     | **Tailwind CSS + RTL plugin** (`tailwindcss-rtl`)                                         | Native RTL utilities, logical properties (ps/pe instead of pl/pr)                 |
| Basic React state                      | **Zustand**                                                                               | Lightweight global state for reading progress, bookmarks, preferences             |
| No animation                           | **Framer Motion**                                                                         | `layoutId` for poem-to-poem transitions; spring physics for Arabic text reveals   |
| Standard HTML audio                    | **Tone.js** or custom `<audio>` with **Framer Motion** sync                               | Synchronized verse highlighting during recitation                                 |
| Static lists                           | **Embla Carousel** (horizontal poet browsing) + **Vaul** (bottom sheets for poem details) | Native-feel swipe and drawer interactions on mobile                               |
| Alert/toast (if any)                   | **Sonner**                                                                                | Beautiful, non-intrusive notifications (bookmarked, copied, etc.)                 |
| No command palette                     | **cmdk**                                                                                  | ⌘K to search entire corpus instantly — poets, verses, themes                      |
| Basic dropdowns/modals                 | **Radix Primitives** + **shadcn/ui**                                                      | Accessible, composable, polished — RTL-aware                                      |
| No URL state                           | **nuqs**                                                                                  | Deep-linkable poem state (poem ID, verse, translation mode) in URL                |
| No offline                             | **Serwist** (next-pwa successor)                                                          | Cache poems for offline reading — true PWA                                        |

---

## 4. Option A — “The Refined Scroll” (Evolutionary Redesign)

> _Philosophy: Respect the current structure. Elevate every surface. Make it feel like a beautifully typeset book that happens to be interactive._

### Visual Identity

- **Color palette:** Warm parchment (#F5F0E8) background, deep ink (#1A1A2E) for text, gold (#C4A35A) accents for interactive elements. Dark mode inverts to midnight blue (#0D1117) with cream text
- **Typography:** Amiri for poem text (classical feel, excellent ligatures), IBM Plex Arabic for UI elements, Inter for English. Generous line-height (1.8–2.0) for Arabic verse
- **Spacing:** The poem is the hero. Massive whitespace around each bayt. The hemistichs separated by a decorative diamond (◆) or vertical line, not just a gap

### Navigation Redesign

- **Bottom tab bar** on mobile: Home (المكتبة), Explore (استكشف), Search (بحث), Bookmarks (محفوظات)
- **cmdk command palette** for instant search across all poets and verses
- **Breadcrumb trail:** Era → Poet → Diwan → Poem — always visible, always tappable
- **Swipe between poems** within a diwan using Embla Carousel

### Reading Experience

- Each bayt renders as a centered two-line unit with clear visual structure:

  ```
         صدر البيت
            ❖
         عجز البيت
  ```

- Tap a verse to reveal: English translation (slide up via Vaul drawer), transliteration, and vocabulary
- Audio recitation with **verse-synced highlighting** — the current bayt glows softly as it’s spoken
- Font size slider persisted in Zustand → localStorage alternative (in-memory)
- Reading progress indicator (thin gold line at top of viewport)

### Transitions & Motion

- Poem cards use `layoutId` (Framer Motion) so tapping a card expands it into the full reading view — no hard page change
- Verse-by-verse entrance animation: each bayt fades and slides in with staggered spring timing
- Page transitions use shared element animation (the poem title travels from list to header)

### PWA

- Service worker caches all poems after first visit
- Add-to-home-screen prompt styled with custom UI
- Offline indicator: subtle toast via Sonner when reading cached content

---

## 5. Option B — “The Living Majlis” (Radical Reimagination)

> _Philosophy: Throw away the database mentality. Poetry is oral, social, emotional. Build an experience that feels like sitting in a desert tent listening to a sha’ir recite by firelight._

### Core Concept

The app opens not to a list — but to a **single verse**, beautifully rendered, filling the screen. This is the “daily verse” — your entry point. Everything radiates outward from this moment of encounter.

### The Home Screen: One Verse

- Full-screen, centered Arabic calligraphy of a single bayt
- Subtle particle animation in the background (sand, stars, or ink drops — matching the poem’s theme)
- Tap to hear it recited. Long-press to see translation
- Swipe up to enter the full poem. Swipe left/right for more daily selections
- The verse changes daily, or is AI-curated based on your reading history

### Navigation: Concentric Circles, Not Lists

Instead of flat category lists, use a **radial/constellation navigation**:

- Center: the current poem/poet
- First ring: related poems by same poet
- Second ring: same era or theme
- Third ring: influenced-by / influenced connections
- Built with **D3.js** or **Three.js** (constellation view) — a visual knowledge graph
- Each node pulses gently. Tap to preview. Double-tap to navigate

### The Reading Room

- Immersive full-screen reading mode — no chrome, no nav
- Background color shifts with the poem’s theme:
  - Love poetry (غزل): warm rose/amber
  - Elegy (رثاء): deep indigo/grey
  - Praise (مدح): gold/cream
  - Nature (طبيعة): sage/teal
- Audio plays automatically (opt-in) with **spatial audio** feel — slight reverb, as if in a stone hall
- Verses appear one at a time as you scroll — each one _arrives_, not just _exists_
- Between poems, a brief “breathing” transition: the screen dims, a new verse fades in

### Social & Sharing

- “Share a verse” creates a beautiful image card (canvas-rendered) with the verse in calligraphy + attribution — designed for Instagram/WhatsApp stories
- “Recite mode” — user can record their own recitation of a poem, with verse-synced karaoke-style highlighting
- Community favorites: see which verses others have bookmarked most (anonymous, aggregate)

### The Poet’s World

- Poet profiles aren’t bio pages — they’re **mood boards**
- A full-bleed header with era-appropriate imagery (desert, palace, city)
- A timeline of their life events interwoven with their poems
- “Listen to their voice” — AI-generated reading in period-appropriate style (if ethically sourced) or curated human recordings
- Their poetic “fingerprint” — a visual showing their most-used meters, themes, and vocabulary

### Technical Stack for Option B

```
Next.js 15 (App Router)        → Framework, RSC for static poem data
Tailwind CSS + tailwindcss-rtl  → Styling with RTL-first utilities
Framer Motion                   → All transitions, verse animations, layout morphs
Three.js or D3.js               → Constellation navigation / knowledge graph
Tone.js                         → Spatial audio for recitations
shadcn/ui + Radix               → UI primitives (drawers, dialogs, tooltips)
Vaul                            → Bottom sheet for translations/annotations
Sonner                          → Toast notifications
cmdk                            → Universal search
Zustand                         → State (reading progress, preferences, history)
Serwist                         → PWA service worker
Canvas API / html2canvas        → Shareable verse cards
nuqs                            → URL state for deep linking
```

---

## 6. Typography Deep Dive (Both Options)

Arabic poetry typography is the single highest-leverage improvement. Get this right and the app transforms even without other changes.

### Font Pairing

| Role                  | Font              | Weight      | Size (mobile) |
| --------------------- | ----------------- | ----------- | ------------- |
| Poem text (classical) | Amiri             | Regular 400 | 22–28px       |
| Poem text (modern)    | Noto Naskh Arabic | Regular 400 | 20–26px       |
| UI labels (Arabic)    | IBM Plex Arabic   | Medium 500  | 14–16px       |
| UI labels (English)   | Inter             | Medium 500  | 14–16px       |
| Poet names / headers  | Scheherazade New  | Bold 700    | 18–24px       |
| Transliteration       | JetBrains Mono    | Regular 400 | 14px          |

### Bayt Layout CSS Pattern

```css
.bayt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
  padding: 1.5em 0;
  direction: rtl;
  font-family: 'Amiri', serif;
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  line-height: 2;
  text-align: center;
}

.sadr,
.ajuz {
  max-width: 90%;
}

.bayt-divider {
  width: 1.5em;
  height: 1px;
  background: currentColor;
  opacity: 0.3;
}
```

### Kashida & Justification

Arabic text justification via kashida (elongation of connecting strokes) is critical for poetry. CSS `text-align: justify` alone doesn’t handle this. Use:

- `font-feature-settings: "liga" 1, "calt" 1;` for proper ligatures
- Consider **Tatweel character** (ـ U+0640) insertion for manual justification in headers

---

## 7. Accessibility & Internationalization

- **Screen reader:** Every bayt should have `aria-label` with full transliteration for non-Arabic screen readers
- **Reduced motion:** All animations respect `prefers-reduced-motion` — verses appear instantly instead of animating
- **Font scaling:** Entire UI scales with `rem` units; no fixed `px` for text
- **Color contrast:** Both light and dark themes pass WCAG AA (4.5:1 minimum)
- **Keyboard navigation:** Arrow keys navigate between abyat (verses); Enter plays audio; Escape exits immersive mode
- **Language toggle:** Persistent, one-tap switch between Arabic-primary and English-primary layouts — not just translation, but the entire UI direction flips

---

## 8. Quick Wins (Ship This Week)

These require minimal architecture changes and dramatically improve perceived quality:

1. **Switch to Amiri font** for all poem text — one CSS change, massive visual upgrade
1. **Add Sonner** for copy/bookmark confirmations instead of browser alerts
1. **Add cmdk** command palette — instant search across all content
1. **Bottom tab bar** on mobile instead of hamburger menu
1. **PWA manifest + basic service worker** — installable in 30 minutes
1. **Verse sharing** — html2canvas to generate a styled image card of any verse
1. **Reading progress bar** — thin colored line at viewport top
1. **`prefers-color-scheme` dark mode** — use CSS custom properties, ship in a day

---

## 9. Competitive Landscape

| App                                                | Strength                                           | Weakness                                   | Steal This                |
| -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ------------------------- |
| [Aldiwan](https://www.aldiwan.net)                 | Massive corpus, structured data                    | Dated UI, no mobile optimization, no audio | Data depth                |
| [TheArabicPoetry.com](https://thearabicpoetry.com) | Audio sync, trilingual (AR/EN/transliteration)     | Limited corpus, basic design               | Sync model                |
| [Aruudy](https://aruudy.vercel.app)                | Meter analysis, modern UI                          | Niche (prosody only)                       | Technical poetry features |
| Diwan Al Arab (Android)                            | Offline, 79K+ poems                                | Native only, small text, no audio          | Offline-first approach    |
| [arabic-poems.com](https://arabic-poems.com)       | Cultural context, poet bios, school categorization | Web 1.0 aesthetic, no interactivity        | Editorial depth           |

**The gap no one fills:** A beautiful, mobile-first, PWA poetry experience with audio sync, modern interactions, AND a large corpus. That’s the lane.

---

## 10. Decision Framework

| Factor              | Option A: Refined Scroll      | Option B: Living Majlis              |
| ------------------- | ----------------------------- | ------------------------------------ |
| Dev effort          | 2–4 weeks                     | 8–12 weeks                           |
| Risk                | Low — incremental improvement | High — untested paradigm             |
| User learning curve | Near zero                     | Moderate (new navigation model)      |
| Wow factor          | “Oh, this is nice”            | “I’ve never seen anything like this” |
| Scalability         | Easy to add content           | Complex content relationships needed |
| Best for            | Growing an existing user base | Launching something viral            |
| Recommended if…     | You want polish and retention | You want to define the category      |

**My recommendation:** Ship Option A first (the quick wins + refined reading experience). Build Option B’s constellation navigation and immersive reading as a v2 feature, layered on top of A’s solid foundation. The daily verse home screen from Option B can ship immediately as part of Option A — it’s the single highest-impact feature.

---

## Appendix: Key Resources

- [Amiri Font](https://github.com/aliftype/amiri) — Open source, designed for Arabic literary text
- [IBM Plex Arabic](https://github.com/IBM/plex) — Clean, modern Arabic UI font
- [tailwindcss-rtl](https://github.com/20lives/tailwindcss-rtl) — RTL utilities for Tailwind
- [shadcn/ui](https://ui.shadcn.com) — Component foundation
- [Vaul](https://github.com/emilkowalski/vaul) — Bottom sheet drawer
- [Sonner](https://sonner.emilkowal.ski) — Toast notifications
- [cmdk](https://cmdk.paco.me) — Command palette
- [Framer Motion](https://motion.dev) — Animation library
- [Embla Carousel](https://embla-carousel.com) — Touch-friendly carousel
- [Serwist](https://serwist.pages.dev) — Next.js PWA tooling
- [nuqs](https://nuqs.47ng.com) — URL search params state
- [Tone.js](https://tonejs.github.io) — Web audio framework
