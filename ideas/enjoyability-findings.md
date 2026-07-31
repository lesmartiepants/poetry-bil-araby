# Enjoyability framework — findings & where it landed

Durable record of the attempt to build + validate an **enjoyability** scoring framework for poems,
anchored on the user's saved poems as ground truth. Read this before investing more in it.

Related: the dev lab lives at `/enjoyability` (served from `enjoyability-lab.html`, gated behind
`ENABLE_DEV_LAB`, linked from the Debug panel). Its **Framework** tab shows the fit results below.

## The rubric we tested
- **Analytic core = the "7th rubric"**: six clusters — Music, Image, Emotion, Turn, Depth, Reach
  (13 subfactors). The "why it's good" axis.
- **Visceral / endurance layer** = four data-selected "unscorable" dims: the chill (qashaʿrīra),
  arousal transfer, survival-of-the-hundredth-reading, inheritance-friction. (Dropped *would-I-forward*
  as too noisy and *body's-assent* as non-discriminating.)
- **Personas** (8 lenses) became the taste-profile machinery, not the score.
- Rule: **no hand-weighting — every dimension earns its weight from how well it separates the user's
  saves from a control, or it's dropped.**

## The result (held-out AUC, 0.5 = chance)
Method: score ~105 saved poems + an era-matched control on the rubric via `gemini-3.6-flash`, then fit
weights to separate them; report **held-out** AUC.

| Model | held-out AUC |
|---|--:|
| craft rubric (7th + visceral), gated control | 0.62 |
| craft, widened below-gate control | 0.63 (confounded — quality separates it 0.95 by construction) |
| content (categorization tags), v2 | 0.60 |
| content, **v3 distilled tags** (re-check) | **0.586** |
| quality_score alone | 0.598 (~chance) |
| content + craft + quality (best) | 0.637 |

**Key findings:**
1. **Nothing predicts the saves strongly — ceiling ~0.64.** Barely above chance.
2. **The visceral layer did NOT earn its place** — adding the chill/arousal/etc. *lowered* AUC (−0.013);
   collinear with the analytic core (chill ≈ felt_weight 0.78).
3. **The craft sub-dimensions collapse to ~one factor** (correlations up to 0.95), so differential
   weights don't generalize; honest best is near-equal weight on the ~9 dims that carry any signal.
4. **quality_score is ~chance** (not anti-correlated — an earlier quick rank-AUC misread the direction).
5. **Distilling the categorization did NOT rescue the content signal** (0.60 → 0.586). This was the
   decisive test: the ceiling is the **anchor, not tag quality**.

## The one real, usable signal: a content *register* preference (a direction, not a classifier)
From the v3 content fit (signed weights):
- **Rewards:** contemplation, passion, friendship, time-mortality, faith-spirit, love, homeland, moon-stars.
- **Avoids (strong):** sword-battle (−0.48), wisdom-ethics, honor-pride, journey, desert-ruins, pride,
  loss-death, grief.
- One-liner: **lyric-intimate over heroic-martial.** Consistent across v2 and v3. Closest lab persona to
  the fitted weights: **the Poetry Professor** (cosine 0.886).

## Why it's capped (not a model problem)
The saved set is a weak label: **positive-only** (no explicit "no"s), **exposure-biased** (you can only
save what the app surfaced), n~210 vs ~53 features, and **save-intent is heterogeneous** ("loved it" vs
"read later"). No amount of re-scoring beats that.

## What shipped / what didn't
- **Shipped:** the Enjoyability Lab (`enjoyability-lab.html`) is on `main`, gated behind `ENABLE_DEV_LAB`
  (enabled on the prod Render service), linked from the Debug panel. Tabs: Enjoyability / Personas /
  Diagnostics / Saved / Framework.
- **Did NOT ship:** a per-poem enjoyability *score* in the DB/API. Correct call — the fit doesn't justify
  a ~9k-poem scoring pass or a user-facing sort.

## Recommendation & next step: fix the DATA, not the model
The bottleneck is the anchor. The only thing likely to push past ~0.6 is **better preference data**:

**Preference capture (pairwise / swipe) — the real unlock.**
- **Signal:** show two poems, "which do you prefer?" (forced choice), plus a light swipe/skip for explicit
  negatives. This yields *ranked pairs* and *real "no"s* — far stronger than positive-only saves, and it
  removes the "loved it vs read later" ambiguity.
- **Model:** fit a **Bradley-Terry / logistic pairwise** ranker over the same interpretable sub-scores
  (7th-rubric clusters + content facets). A taste profile = the fitted weight vector; personalize per user.
- **Cost/size:** ~150–300 pairwise judgments from one user is enough to fit a stable weight vector (much
  more informative per label than a passive save). Seed the pairs by max-diversity + uncertainty sampling
  so each judgment is maximally informative.
- **Debias exposure:** draw the pair candidates across the *whole* corpus (not just what was surfaced), so
  the preference isn't confounded by what the feed happened to show.
- **Where it plugs in:** a short onboarding "which of these two?" session → a taste vector → drives
  discovery/feed ranking. The interpretable sub-scores mean the profile is explainable ("you weight Depth
  + faith-spirit, away from war/pride"), not a black box.

**Interim (no new data):** use the soft **lyric-intimate > heroic-martial** lean as a gentle onboarding
bias (nudge toward love/faith/contemplation, away from war/pride/desert-ruins). Honest as a *direction*,
not sold as a strong predictor.

## Caveat on reproducing
The raw per-poem fit artifacts (`enjoy-fit/*.json`) lived in an ephemeral scratchpad and are gone; the
**conclusions** survive (this doc + the Framework tab), but rerunning the fit means re-scoring the sample.
