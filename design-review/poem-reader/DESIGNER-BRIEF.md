# Designer Brief — Poem Reading "Sparkler Reveal" (v2)

_A self-prompt. Read this before building any reveal/layout work. It supersedes the
first-pass "Aurora bloom" direction, which shipped but (a) didn't visibly animate,
(b) showed the whole poem at once, and (c) gave the title/poet block too much weight._

## Who this is for
A reader savoring classical Arabic poetry, mostly on a phone, mostly one-handed, often
at night. The screen should feel calm, dark, and reverent — the poem is the subject;
chrome recedes. Reading is an unhurried, deliberate act: lines arrive, you breathe, you
tap for more.

## The five fixes (from user feedback)
1. **The reveal must be a "sparkler".** Not a fade. A bright, fire-like point of light
   travels along each line — right→left for Arabic — *igniting* the text as it passes and
   throwing off gold/orange/white sparks that arc and fade. Behind the head: lit, settled
   text. Ahead: darkness. One line ≈ 1.2–1.6s. Calm, not frantic. Think a lit birthday
   sparkler drawing the sentence into being.
2. **Vertical, magnetic poem-to-poem scroll.** Full-screen poem "cards" stacked
   vertically. The current card resists a pull (magnetic / rubber-band); once the pull
   passes a threshold it *releases and accelerates* away to snap the next card in. Not a
   free scroll — a deliberate, weighted page change.
3. **Tap reveals lines** — and it must actually work on touch (pointer/touch events, big
   hit area, no swallowing by overlays).
4. **Compact meta.** Title + poet are a small, quiet header (or a corner credit). The
   poem and its reveal own the screen.
5. **Landing animation.** On open: a slow, calm, dark reveal of the wordmark
   **"poetry" + "بالعربي"** (English + Arabic). A tap animates it out and reveals the
   main reading page. **No onboarding screens.**

## The reveal model (precise)
Always show a **maximum of 4 lines**. Lines arrive in **pairs** after the first read-in:
- **On load:** sparkler-reveal line 1, then line 2 (sequential, like reading aloud).
- **Prompt a tap** ("tap to continue").
- **Tap →** reveal lines 3 & 4. Now 1–4 are visible (window full).
- **Tap →** reveal lines 5 & 6, **replacing** 1 & 2 (1–2 slide up & out, 3–4 rise to the
  top slots, 5–6 sparkler in at the bottom). Visible: 3–6.
- **Tap →** reveal 7 & 8 replacing 3 & 4. Visible: 5–8. …and so on.
- **At the end** (last pair revealed): invite the reader to open the **insight panel**
  (explanation) — a gentle "✦ see the meaning?" affordance, not an auto-pop.

A short poem (≤4 lines) reveals fully across the load + first tap, then offers insight.

## Visual language (reuse the app's tokens)
- Dark by default. `--gold #c5a059`, `--gold-bright #d4b463`, lapis `#1e3a6e/#2e5090/#4a7cc9`.
- Sparkler palette: white-hot core → `--gold-bright` → amber `#e8923a` → ember red `#c2410c`.
- Arabic: **Amiri** (verses), Reem Kufi (wordmark/title). English: Cormorant Garamond.
- **RTL-correct.** Never split Arabic into per-letter spans (breaks shaping) — reveal via a
  **moving mask/clip** so ligatures stay intact; the "letter-by-letter" feel comes from the
  sweeping ignition edge + the sparkler head, not from chopping the text.
- Respect `prefers-reduced-motion`: replace the sparkler with a calm fade; no particles.

## Motion principles
- Calm > flashy. Long, eased timings (expo/quart out). Nothing bounces.
- The sparkler **head** is the only "hot" element; everything else is restrained.
- Sparks: short-lived (~0.5s), gravity + slight drift, additive glow, thin out fast so the
  settled text stays legible.
- Pair transitions: outgoing pair drifts up & dims; incoming pair ignites. ~0.6s.

## Layout questions to explore (the "few options")
- **A — Centered scroll:** tiny top credit (title · poet, one line), poem vertically
  centered, reveal window of 4 lines, insight affordance at the end.
- **B — Corner credit:** wordmark/credit shrinks into a top corner after load; poem gets
  the full canvas.
- **C — Header-fade:** title/poet shown briefly large on card-in, then animate small/up to
  a slim bar as the first lines ignite.

## Definition of done (verify, don't assume)
- The sparkler **visibly travels** and throws sparks — proven by captured mid-animation
  frames (t≈0.3s / 0.8s / 1.4s), not just start/end.
- Tap advances the 4-line window in pairs; end offers the insight panel.
- Vertical magnetic snap moves between poems with resistance-then-release.
- Landing wordmark reveal → tap → main page, no onboarding.
- Meta is visibly subordinate to the poem.
- Reduced-motion path is calm and complete.
