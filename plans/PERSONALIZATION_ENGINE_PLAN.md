# User-Driven Curated Preferences — the Personalization Engine

## Context

The **Curated** feed shipped (#700, #705): a toggle that biases discovery toward a taste profile
defined in `config/curation.json` — every mood/topic/motif value tiered **favor / neutral / avoid**,
turned into weighted sampling by `curation.js`. Today there is exactly **one** profile (`default`),
hand-derived from a single reader's 114 saves + 11 downvotes, and everyone who flips the toggle gets it.

Two things make this ready to become a real personalization engine, not a rewrite:

1. **The resolver is already user-first.** `resolveProfile(userId, requested)` in `curation.js` takes a
   `userId` and a `users: {}` map; it just always returns `default` today. Filling in per-user weights is
   one function, not new plumbing.
2. **The signal already exists.** `poem_events` records `save` / `downvote` / `serve` / `view` per user,
   and the #691 onboarding flow (`preferences.js`, `preferenceWeighting.js`, `PREFS_STORAGE_KEY`) already
   collects **explicit** mood/topic answers. We have both implicit behavior and explicit intent — they are
   just not yet fused into the curated weight vector.

**The gap this plan closes:** turn the curated toggle from "one shipped taste" into "_your_ taste,"
computed from what each reader explicitly picks and implicitly does, over the same interpretable dimensions.

## Core idea

A **taste vector** = a per-user tier weighting over the 44 mood/topic/motif values — the same shape as a
`config/curation.json` profile, but derived rather than hand-written. `resolveProfile` composes it from
three layers, highest-confidence first:

```
  explicit  (onboarding answers)      strong, sparse, opt-in
  implicit  (saves +, downvotes −)    grows with use, always on
  default   (global lyric-intimate)   cold-start floor, never empty
```

Resolution is additive-then-clamped: start from `default`, apply implicit lift where the reader has enough
events, override with explicit answers where they gave them. A reader who has done nothing gets `default`; a
reader who answered onboarding gets that immediately; a reader who has saved 50 poems gets a vector that
reflects them. **One mechanism, three inputs** — and because the vector is interpretable, the profile is
explainable ("you lean Depth + faith-spirit, away from war/pride"), never a black box.

This also **unifies the two taste systems** currently in the tree: #691's onboarding-prefs scored feed and
the curated config-tiers become one engine over one set of dimensions, instead of two parallel weightings.

## Where it plugs in

- `curation.js` — `resolveProfile(userId)` fills its `computed` branch (a profile can declare
  `"source": "computed"`); add `computeTasteVector(userId)` reading `poem_events` + onboarding prefs.
- `server.js` — `/api/poems/random?curated=1` already routes through `resolveProfile`; it just needs the
  authenticated `userId` (rides the existing auth/session, not a query param) and a cache for the vector.
- Client — no change to the toggle; the feed simply becomes personal once a user is signed in.

## Phases

### Phase 0 — Persist the vector (schema + cache)

- Store the computed vector so it isn't recomputed per request: a `user_taste_profiles` row
  (`user_id`, `vector JSONB`, `n_events`, `computed_at`, `source`), refreshed on save/downvote or on a TTL.
- ✓ Gate: a stored vector round-trips through `resolveProfile` and reproduces `default` for a user with
  zero events.

### Phase 1 — Implicit weights from behavior

- `computeTasteVector(userId)`: per-value lift = (save-rate on that value) ÷ (corpus rate), downvotes push
  toward `avoid`. Reuse the exact method that produced the `default` profile. Map lifts → tiers with a
  **confidence floor**: below ~N events on a value, stay `neutral` (don't over-fit a handful of saves).
- ✓ Gate: for the anchor user, the computed vector reproduces today's hand-tuned `default` within tolerance;
  a synthetic all-grief-saver comes out with grief favored.

### Phase 2 — Fold in explicit onboarding answers

- Merge `readPrefs()` answers into the vector (explicit picks override implicit for those values). Retire
  the separate `fetchWeightedFeed` scored-feed path in favor of the unified vector so there is one feed engine.
- ✓ Gate: answering onboarding immediately shifts the curated feed; changing an answer re-shifts it.

### Phase 3 — Explicit preference capture (the real signal)

- Add lightweight **pairwise / swipe** capture ("which of these two?") — the move flagged in
  `ideas/enjoyability-findings.md`, because passive saves are exposure-biased and weak (held-out AUC capped
  ~0.64). Forced choices give real negatives; fit the vector (or a Bradley-Terry ranking) from them.
- Surface a short "tune your taste" session in onboarding and as an optional settings action.
- ✓ Gate: readers who complete a capture session get a feed that measurably separates their picks from
  control better than saves alone.

## Validation

- Per-user held-out separation (does the vector rank a user's saves/picks above control?) beats `default`.
- The engine degrades cleanly: signed-out or event-less → `default`, never empty, never errors.
- One feed engine after Phase 2 (no parallel scored-feed path); `feature-manifest.json` / tests updated.

## Risks & decisions

- **Sparse per-user data.** Most readers have few events; the confidence floor + `default` fallback keep the
  feed sane. Don't expose per-value weights until they're earned.
- **Saves are a weak label** (positive-only, exposure-biased). Phase 3 pairwise capture is where real
  personalization comes from; Phases 1–2 are a decent prior, not the destination.
- **Privacy.** The vector is derived from the user's own events, stored against their `user_id`, and never
  leaves the curated ranking; it's interpretable, so a reader could be shown (and edit) their own profile.
- **Open decision:** should a strong personalized vector eventually replace `quality_score` as the serving
  gate, or stay a re-rank on top of it? (Out of scope here — flag when Phase 3 lands.)

## Related

- Shipped: #700 (curated Discover), #705 (curated scroll feed).
- Open bug: #719 (scroll-blocked state, `PoemFeed.jsx`) — unrelated but touches the same feed surface.
- Prior art in-repo: `ideas/enjoyability-findings.md` (why saves cap out, pairwise recommendation),
  `poetry_quality_and_curation/categorization/config.py` (the tier/lift method to reuse).
