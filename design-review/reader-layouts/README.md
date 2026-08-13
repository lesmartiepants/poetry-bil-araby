# Reader layouts — how much of the poem can you actually see?

> "The issue right now is that you can't see a lot of the poem, but I suspect there are
> different layouts we could try allowing for more of the poem to be visible."

Six working reading screens on the same real poems, driven by one shared engine, so
comparing them isolates layout rather than styling. Open `index.html`, or on any Vercel
preview: `/design-review/reader-layouts/`.

These are **prototypes, not a branch of the app** — see [Why prototypes](#why-prototypes).

---

## 0. Correction — the first numbers were measured Arabic-only

The first cut of this folder measured every layout on **Arabic-only rows**, and reported
that the shipping reader fits 8 verses. That was wrong, and it flattered every option.

The reader is **bilingual by default**: `showTranslation = true` (`PoemReader.jsx`), and
`SparklerStage` renders Arabic → transliteration → English as one unit, sizing rows by the
tallest unit. A translated verse is a **tall** row. Measuring on Arabic-only rows
overstates how many verses fit, by roughly half.

Corrected, on the same 22-line qasida at 393×852:

| Mode | Baseline fits | |
| --- | ---: | --- |
| Arabic only | 8 verses | a database poem with no translation |
| **Arabic + English** | **4 verses** | **the default — what ships** |
| + transliteration | 4 verses | transliteration toggled on |

**The shipping reader fits four bilingual verses of a twenty-two-line qasida.** That is the
real statement of the problem, and it is twice as bad as the first version of this document
claimed.

Why the corpus hid it: the API's `english` field is hardcoded `''` (`server.js:319`). Real
translations arrive in a separate `cachedTranslation` field, and only **~13% of sampled
poems carry one** (`tools/probe-english.mjs`, 2/15). The original sample happened to draw
four poems with no translation, so the prototypes rendered Arabic-only and the error was
invisible. `poems-bilingual.json` now holds four real poems that do carry verse-aligned
translations.

All three modes read that same sample, so `?lang=ar` is a true control — the identical poem
with the English row withheld, not a different poem that lacks a translation.

---

## 1. The measurement

Taken against the shipping reader (`src/components/feed/PoemReader.jsx`) on **iPhone 16,
393×852**, with `tools/measure-app.sh`.

### Where the height goes

| Band                                            |    px | % of screen |
| ----------------------------------------------- | ----: | ----------: |
| Top inset — safe area + title + English + byline |   136 |       16.0% |
| Bottom inset — reader actions + cue              |   111 |       13.0% |
| Bottom nav — Dislike/Save/Library/Discover/Acct  |    85 |       10.0% |
| **Reading area left for the poem**               | **605** | **71.0%** |
| Poem ink **on landing** (2 of 10 verses)         |   109 |   **12.8%** |
| Poem ink, 4-line poem fully revealed             |   237 |       27.8% |

The insets are `clamp(..., 16vh, ...)` / `clamp(..., 13vh, ...)`, so they hold that ~29%
share at every phone height. At 375×812 it is the same story (129 + 106).

### Where the width goes — the part I did not expect

| Metric                                  | Value            |
| --------------------------------------- | ---------------- |
| Viewport width                          | 393px            |
| Poem box                                | **305px (77.6%)** |
| Lost to page padding (32) + rail lane (56) | 88px (22.4%)  |
| `--fit` on the rendered verses          | **0.97**         |
| Rendered Arabic size                    | 23.6px           |

`SparklerStage` shrinks a verse rather than wrapping it (ligature-safe), via a `--fit`
multiplier. At 393px wide **the Arabic is already at its clamp floor and still being
shrunk 3% to survive the box**. So the 56px scrubber lane isn't just costing line length,
it's costing type size. Width is a real lever, not a rounding error.

### The finding that reframes the complaint

On landing, the stage sizes itself to `visRows × rowHeight` immediately — it holds rows
open for verses that have not been revealed yet. At 393×852 with a 10-line poem that was
a **448px window containing 109px of ink: 339px of reserved, permanently blank rows**
sitting in the middle of the screen.

But raising capacity alone makes landing *worse*. `A · Recede` frees 158px of chrome and
the blank goes from 436px to **615px**, because a taller empty window is still empty. So:

- **Capacity** (how many verse rows could be on screen) is what layout controls.
- **Blank on landing** is owned by the reveal mechanic, which shows one verse at a time.

They are independent, and most options fix only one. That is why `E · Composite` exists.

### Desktop

At 1280×900 the shipping reader fits 7 verse rows and 57% ink — vertically it is fine.
What it wastes is width: the poem column is 760px of 1280 (59%). **Desktop is not where
the complaint lives**, and no option below regresses it.

---

## 2. The options

All six keep the full navigation contract (see §3). Scores are the 22-line qasida, fully
revealed, at 393×852.

Verse rows on screen, same qasida, all three language modes:

| Option            | ar only |  **+ EN (ships)** | + translit |    Reading area |   Poem box |
| ----------------- | ------: | ----------------: | ---------: | --------------: | ---------: |
| **Baseline**      |       8 |             **4** |          4 |   530px · 62.2% |      305px |
| **A · Recede**    |      10 |             **5** |          5 |   642px · 75.4% |      305px |
| **B · Flow**      | 22 (all) |            **7** |          6 |   852px · 100%  |      353px |
| **C · Focus**     |       9 |          **9** \* |          7 |   586px · 68.8% | **373px**  |
| **D · Frame**     |       9 |             **4** |          4 |   541px · 63.5% |      305px |
| **E · Composite** |      10 |             **5** |          5 |   642px · 75.4% |      369px |

\* **C is Arabic-only by design.** Its 9 rows are the Arabic-only rows — that is the whole
premise of the option (English is opt-in per verse). Toggle `EN` on and it falls to
baseline, ~4. It is not getting more poem on screen than the others; it is showing less
poem *content* per verse. Read its column as a different trade, not a better score.

Transliteration is a third row and costs B one more verse (7 → 6). It is **off by default**
(`uiStore.js: showTransliteration: false`), so it is an option state rather than the
baseline, but it is the state where every layout is tightest.

### A · Recede — chrome gets out of the way

Header collapses to one line (title · poet, dropping the English title and the Latin
transcription of the poet's name). The bottom nav slides out while a verse is being read
and returns on a bottom-edge touch or when the reveal rests.

**Buys** +2 rows (8 → 10), the single biggest capacity win available without restructuring.
**Trades** the nav stops being ambient. Save/Library/Discover become things you must know
are there. On a discovery-driven app that is a real cost, and it makes the landing blank
worse (436 → 615px) unless paired with D.

### B · Flow — the poem is a column, not a window

Drops the teleprompter entirely. The poem renders in full and scrolls; verses reveal as
they enter view. Unrevealed verses stay dimmed rather than absent, so you can see how much
poem there is from the first screen. Next Verse still works — it scrolls the next
unrevealed verse into view.

**English rides interleaved, per verse** — Arabic then its translation, the pairing
`SparklerStage` already uses. The two alternatives were grouping all the English after all
the Arabic (cheaper in height, but it breaks verse correspondence, and for a reader
following along that correspondence *is* the feature) and making English opt-in like C
(which is C's option, not this one). Interleaving costs the most height and is still right:
a flow layout's whole advantage is that height is no longer scarce.

**Buys** the largest reading area of any option (100%, no bands at all) and the only one
where poem length stops being capped by screen height — the rest of the qasida is a scroll
away rather than behind a paging gesture.

**Its headline did not survive English.** Arabic-only, B showed all 22 verses at once. With
translations it shows **7 before you scroll** (6 with transliteration). So the claim is no
longer "see the whole poem" — it is "reach the whole poem without leaving it". That is
still the strongest offer here, and it is still 75% more than baseline's 4, but it is a
different and smaller claim than the one I made first.
**Trades** the sparkler's fixed-frame choreography, which is the app's signature. It also
needs gesture arbitration: the inner column has to own the drag until it bottoms out
before a swipe can page to the next poem. That is implemented here and it works, but it is
the most delicate thing in this folder and the most likely to feel wrong on a real device.
**If a layout breaks `e2e/sparkler-reader.spec.js`, this is the one** — and that would be
a real signal about the reveal mechanic, not a test to edit around.

### C · Focus — take the width back

The rail becomes a 3px hairline on the screen edge with a 32px invisible hit area; the
56px lane returns to the verse. Page padding 16 → 10px. English moves to a per-verse
toggle in a small utility rail.

**Buys** the widest poem box of any fixed-window option: 305 → **373px (+22%)**. This is
the one that addresses the type-size finding.
**Trades** the rail gets harder to grab, especially left-handed. And demoting English is a
product decision, not a layout one — though note that **in database mode there is no stored
translation at all** (all four sampled poems returned `english: ""`), so Arabic-only is
already the common case rather than a new one.

### D · Frame — stop reserving rows that have nothing in them

The window is only as tall as the verses actually revealed, and grows as you advance. Once
the reveal passes what fits, it scrolls exactly like today. Bands trimmed 136/111 → 108/96.
`dvh` instead of `vh`.

**Buys** the reserved blank goes 436px → **18px**, and the poem sits in the optical centre
from the first verse instead of clinging to the top of a tall void. Cheapest to ship: no
new gesture, no chrome behaviour, no change to the reveal, scrubber or swipe. A sizing fix.
**Trades** the window changes height as you read, which is motion the current design does
not have. It is eased, but it is there. And it barely moves capacity (8 → 9).

### E · Composite — A + C + D

Receding chrome, growing window, width reclaimed. Recommended.

**Buys** 10 rows *and* an 18px blank *and* a 369px box — the only option that fixes
capacity and landing-blank together without the scroll rewrite.
**Trades** it inherits A's modal nav and C's edge rail. It is three behaviour changes at
once, so it is the hardest to review and the easiest to get subtly wrong.

---

## 3. The navigation contract

A layout that buys poem area by dropping a control is not an option. `tools/verify-nav.sh`
asserts all seven per option — **42/42 pass**:

1. Next Verse advances the sparkler reveal
2. the poem body is **not** a tap target (tapping a verse must not advance)
3. "Read full poem" reveals the whole poem
4. the progress scrubber seeks
5. a drag inside `[data-owns-gesture]` does **not** swipe the poem underneath
6. wheel / vertical swipe pages to the next poem
7. the bottom nav keeps all five items

**الميزان (the draw inspector)** is an app-level overlay, not part of `src/components/feed/`,
so it is not reimplemented here. It rides on `data-owns-gesture`
(`DiscoveryDrawInspector.jsx:615`), and check 5 verifies that mechanism holds in every
layout — including the two that move the rail to the screen edge, which is where an
edge-anchored panel would most plausibly have broken it.

---

## 4. Why prototypes, not a branch of the app

Deliberate:

- **The ask is a comparison.** Six options need to sit side by side. Branch-switching the
  live app shows one at a time and makes the trade-offs impossible to feel against
  each other.
- **`design-review/` already deploys** at `/design-review/` on every Vercel preview, which
  is exactly the review surface this needs.
- **`src/components/feed/` is contended.** Other agents are in `app.jsx` and
  `src/components/onboarding/`; three competing layouts in `PoemReader.jsx` would collide.
- **Zero risk to the reveal.** `e2e/sparkler-reader.spec.js` and the 1002-test unit suite
  stay untouched while the shape of the answer is still open.

The cost is honest: these are faithful in layout, geometry and navigation, but the reveal
is a simplified CSS/word-span version rather than the real GSAP timeline in
`useSparklerReveal`. They will not tell you how the sparkle *feels*. Once a direction is
picked, it has to be built against the real controller — and B · Flow especially needs
that before anyone trusts it.

Row rhythm is matched deliberately: `.unit` carries the same 18px of breathing room
`SparklerStage` adds for tashkeel, so rows land at ~64px exactly as they do in the app.
That is what makes these numbers comparable rather than merely plausible.

---

## 5. Poems

`poems.json` — four **real** poems pulled from production
(`https://poetry-bil-araby-2mb0.onrender.com`) by `tools/fetch-poems.mjs`, chosen to vary
length deliberately:

| `?poem=` | Lines | Poet                             |
| -------: | ----: | -------------------------------- |
|        0 |     4 | Majhul (epigram)                 |
|        1 |     8 | Qays ibn al-Mulawwaḥ             |
|        2 |    12 | Abu al-Rabi' Sulayman al-Muwahidi |
|        3 |    22 | Abu al-Ala al-Ma'arri (qasida)   |

All four carry **full tashkeel**, which is why row height is 64px rather than the ~48px
unvocalized text would need. None ship an English translation from the database — that is
generated on demand — which is what makes C's "English is opt-in" less radical than it
sounds.

Read-only: the fetcher hits `GET /api/poems/random` and nothing else. **No database writes
anywhere in this folder.**

## 6. Tools

```bash
# geometry of the SHIPPING reader (needs: npm run dev -- --port 8099)
design-review/reader-layouts/tools/measure-app.sh 393x852 full

# serve the prototypes
npx http-server design-review/reader-layouts -p 8102 -c-1

# screenshot + score every option in one run
design-review/reader-layouts/tools/capture.sh 393x852 3 all

# assert the navigation contract in every option
design-review/reader-layouts/tools/verify-nav.sh
```

URL params on any option: `?poem=0..3`, `?reveal=all`, `?clean` (hides the probe overlay).
