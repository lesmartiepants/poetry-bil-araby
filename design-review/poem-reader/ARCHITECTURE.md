# Poem Reader Redesign — Current-State Architecture & Target Map

_Findings from codebase exploration that the "Tap to Reveal" redesign builds on.
Paths and line numbers reflect the repo at the time of the redesign sprint and may
drift; treat them as signposts._

---

## 1. Poem data shape

A poem object flows through the app with this shape (see `src/data/seed-poems.json`,
`src/stores/poemStore.js` FALLBACK_POEM, and `normalizeDbPoem` in
`src/services/database.js`):

| Field | Type | Notes |
|---|---|---|
| `id` | number | DB id |
| `poet` / `poetArabic` | string | English/transliterated & Arabic |
| `title` / `titleArabic` | string | English & Arabic |
| `arabic` | string | **Full poem, lines delimited by `\n`** (DB `*` normalized to `\n`) |
| `english` | string | Translation, lines delimited by `\n` |
| `cachedTranslation` / `cachedExplanation` / `cachedAuthorBio` | string\|null | DB caches |
| `tags` | string[] | genre/style |
| `isSeedPoem` / `isFromDatabase` | boolean | provenance flags |

**There is no "stanza" or "couplet" concept today** — lines are just newline-split.

## 2. How lines become verse pairs (the redesign's input)

`src/app.jsx` (~line 817) memoizes `versePairs`:

```js
const versePairs = useMemo(() => {
  const arLines = (displayedPoem?.arabic || '').split('\n').filter((l) => l.trim());
  const enSource = insightParts?.poeticTranslation || displayedPoem?.english || '';
  const enLines = enSource.split('\n').filter((l) => l.trim());
  const pairs = [];
  const max = Math.max(arLines.length, enLines.length);
  for (let i = 0; i < max; i++) pairs.push({ ar: arLines[i] || '', en: enLines[i] || '' });
  return pairs;
}, [displayedPoem, insightParts]);
```

**The redesign chunks `versePairs` into stanzas of 4** via a new pure util
`chunkStanzas(versePairs, 4)`. This is the single source-of-truth transform — reuse
`versePairs`, do not re-parse `arabic`.

## 3. Current display & navigation (what we replace)

- `src/components/PoemCarousel.jsx` — **horizontal** Embla carousel
  (`axis:'x'`, `loop:true`, `dragFree:false`). Renders the **whole poem at once** per
  slide; swipes between poems by the **same poet**. Has desktop chevrons, a swipe hint,
  active-slide height tracking via `ResizeObserver`, and infinite `onLoadMore`.
- `src/app.jsx` (~1609-1697) renders `PoemCarousel`; the `onSlideChange` handler
  (~1614-1672) does a lot we must preserve:
  - stops active audio playback,
  - clears TTS highlighting,
  - cancels in-flight analysis + resets interpretation,
  - updates URL to `/poem/:id`,
  - queues English translation if missing.
- Discovery lives in `src/components/DiscoverDrawer.jsx` (bottom sheet, poet search +
  featured strip) and `PoetPicker.jsx`.

**Redesign:** replace the horizontal carousel with a **vertical Embla feed**
(`axis:'y'`) of full-screen poem panels; reuse the same `onSlideChange` side-effects and
`onLoadMore` discovery fetch so the feed is endless. Tap is now the in-poem reveal.

## 4. TTS highlight pipeline (must stay working)

- `src/app.jsx` builds `allWords` + `wordOffsets` from `versePairs` (~830).
- `src/hooks/useTTSHighlight.js` drives word-by-word highlight via rAF over `wordRefs`.
- `src/components/HighlightedVerse.jsx` renders one verse as per-word `<span>`s with
  `data-word-index`, styled by `.tts-style-*` CSS in `src/styles/tts-highlight.css`.

**Reconciliation:** the reveal hides not-yet-tapped stanzas. When the user presses
Listen/Play, call `useStanzaReveal.revealAll()` so every stanza is visible and the
existing highlight runs unchanged over the full `versePairs`.

## 5. State management (Zustand)

- `src/stores/poemStore.js` — `poems`, `currentIndex`, `selectedCategory`,
  `carouselPoems`, `carouselIndex`, interpretation state, in-flight id sets.
- `src/stores/uiStore.js` — theme, font, `textSize`, `showTranslation`,
  `showTransliteration`, `highlightStyle`, TTS prefs, sparkle/background, logs.
- `src/stores/audioStore.js` — `isPlaying`, `player`, etc.

Selector pattern: `const x = useStore((s) => s.x)`; imperative: `useStore.getState().fn()`.

## 6. Design system & conventions

- `src/constants/design.js` — `DESIGN` (layout/anim/radius/touchTarget), `POEM_META`
  (title/poet/verse sizes via `clamp()`), `BRAND`.
- `src/constants/theme.js` — `THEME.dark` / `THEME.light` (same keys), `GOLD`.
- `src/constants/fonts.js` — selectable Arabic fonts (`font-amiri`, etc.).
- `src/index.css` — CSS vars `--gold`, `--gold-bright`, `--gold-foil`, `--lapis-*`;
  global `prefers-reduced-motion` + `:focus-visible`.
- Components: Tailwind + inline styles for computed values; `aria-label` on buttons;
  sparse strategic `data-testid`; `dir` attributes for RTL/LTR.

## 7. Testing & prototypes

- Unit: Vitest + happy-dom (`src/test/*.test.jsx`); framer-motion and hooks are mocked.
- E2E: Playwright (`e2e/*.spec.js`); `e2e/carousel.spec.js` has route-mock + `loadApp`
  helpers to reuse.
- Prototypes: self-contained HTML under `design-review/`; `npm run screenshots`
  (`scripts/capture-design-screenshots.js`) captures every `.html` desktop + mobile.

---

## 8. Target modular file map (Phase 2)

```
src/utils/chunkStanzas.js          # pure: versePairs -> [[{ar,en}...]]  (unit-tested)
src/hooks/useStanzaReveal.js       # state machine: stanzaIndex, advance, reset, revealAll
src/hooks/useSplitTextReveal.js    # ONLY file importing gsap; reduced-motion fallback
src/components/reveal/StanzaReveal.jsx   # renders one stanza, runs the bloom
src/components/reveal/PoemReader.jsx     # one poem panel: meta + StanzaReveal + tap + progress dots
src/components/feed/PoemFeed.jsx         # vertical Embla feed of PoemReader panels
```

Integration: swap the `PoemCarousel` render block in `src/app.jsx` for `PoemFeed`,
keeping the existing `onSlideChange` side-effects and `onLoadMore`. Keep
`PoemCarousel.jsx` until parity is verified, then remove.
