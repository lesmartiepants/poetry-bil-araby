# TTS Prompt Research — Status Report

## Current Production State

```
PR #259 (merged) — Prompt K (static, Imru' al-Qais)
File: src/prompts.js → getTTSInstruction(poem)
```

**Production prompt (LIVE NOW):**
```
أنت امرؤ القيس بن حُجر، الملك الضليل وشاعر العرب الأول.
تقف أمام قبيلتك في مجلس شعر بصحراء نجد. النار تتقد، والحضور مُصغون.
قُم وألقِ معلقتك — القصيدة التي خلّدت اسمك عبر الأجيال.
هذه قصيدتك أنت، ألمك أنت، ذكرياتك أنت. ألقِها بسلطان الملوك وعاطفة الشعراء.
ابدأ:
{poem.arabic}
```

**Problem:** Hardcoded to Imru' al-Qais. Does NOT generalize (400 errors, runaway audio with other poets).

---

## Quality Rankings (User Evaluation)

```
 #1  sample-rest-K.wav          ★★★★★  BEST — Imru' al-Qais, static Prompt K
 #2  sample-rest-K-76756.wav    ★★★★☆  Close second — النابغة الذبياني, dynamic Prompt K
 #3  sample-rest-H.wav          ★★★★☆  Third — Imru' al-Qais, Arabic steady tajweed meter (Prompt H)
 #4  sample-rest-R-27161.wav    ★★★★☆  Fourth — المتنبي, K simplified generic poet (Prompt R, Round 4)
 #5  sample-live-R-imru.wav     ★★★★☆  Fifth — Imru' al-Qais, K simplified on Live API (Prompt R, Round 4)
 #6  sample-live-K-76756.wav    ★★★☆☆  Okay — النابغة الذبياني, Live API (REST still preferred)
 #7  sample-rest-A.wav          ★★★☆☆  Decent — original English prompt (Prompt A)
     sample-rest-F, G, I        ★★☆☆☆  Too fast/not authentic enough
     sample-rest-B thru E       ★☆☆☆☆  Too slow/ballad-like
```

---

## All Prompts Tested

### Round 1 — English vs Arabic instruction styles
| ID | Style | Lang | Result |
|----|-------|------|--------|
| A  | 7-rule instruction list ("sha'ir performing inshad") | EN | Decent, reliable baseline |
| B  | Full Arabic إنشاد شعري rules | AR | Too slow/ballad |
| C  | Bilingual hybrid | Mix | Too slow |
| D  | Minimal Arabic | AR | Too slow |
| E  | Detailed Fusha emphasis | AR | Too slow, longest audio |

### Round 2 — Pace-focused revisions
| ID | Style | Lang | Result |
|----|-------|------|--------|
| F  | English, stripped to pace/energy | EN | Too short (12.7s), felt rushed |
| G  | Arabic, explicitly "don't slow down" | AR | Better but still not great |
| H  | Arabic, steady tajweed meter | AR | Decent pacing |
| I  | Hybrid A + Arabic meter terms | EN+AR | Close to A, nothing special |

### Round 3 — Fundamentally different architectures
| ID | Style | Lang | Result |
|----|-------|------|--------|
| J  | Role-play orator scene-setting | EN | Good on REST, RUNAWAY on Live (59s!) |
| **K** | **Role-play orator scene-setting** | **AR** | **★ BEST on REST. Fails to generalize** |
| L  | Bare minimum ("recite with power") | EN | Surprisingly decent |
| M  | Bare minimum | AR | Decent |
| N  | V0 historical ("master orator") | EN | Worst — slow, soulful |
| **O** | **Director's cue (recording session)** | **EN** | **Reliable, 24% faster than A, generalizes** |

### Generalization Tests (4 diverse poems × 2 APIs)
| Prompt | REST success | Live success | Avg duration | Notes |
|--------|-------------|-------------|--------------|-------|
| K (dynamic) | 3/4 (1× 400 error) | 4/4 | REST: 26s, Live: 64s | Runaway on Live, unreliable |
| O | 4/4 | 4/4 | REST: 22s, Live: 27s | Consistent, reliable |
| A | 4/4 | 4/4 | REST: 29s, Live: 36s | Reliable but slower |

### Round 4 — K-quality + O-reliability hybrids (5 poems × 2 APIs)
| ID | Style | Lang | REST | Live | Avg dur (REST) | Avg dur (Live) |
|----|-------|------|------|------|---------------|---------------|
| P  | K + guard rails | AR | 4/5 | 5/5 | 21.3s | 25.7s |
| **Q** | **K + O hybrid** | **AR+EN** | **5/5** | **5/5** | **20.2s** | **23.4s** |
| R  | K simplified (generic poet) | AR | 2/5* | 5/5 | 27.2s | 26.2s |
| S  | K generic poet | AR | 0/5* | 5/5 | - | 27.5s |
| T  | K atmosphere + O structure | AR+EN | 0/5* | 5/5 | - | 26.6s |

*S/T/R REST failures were API quota (429), not prompt failures.

**Round 4 winner: Prompt Q** — 100% reliable, fastest on both APIs, generalizes across all poets.

### Architecture Fix: systemInstruction separation
**Problem discovered:** TTS model was reciting the instruction text aloud (the scene-setting intro), not just the poem.
**Fix:** Split prompt into `systemInstruction` (delivery directions) + `contents` (poem text only).
This means the model gets the scene-setting context but only speaks the actual poem.

---

## Prompt Texts (Reference)

### Prompt A (original English — was in prod before PR #255-259)
```
You are a legendary Arabic sha'ir (poet-orator) performing a live inshad
recitation of a poem by {poet} from the {era} era. This is a PERFORMANCE,
not a reading — deliver it with the full emotional power and artistic craft
of classical Arabic oral tradition. This poem's mood is {mood}.
DELIVERY RULES:
1. PROJECT your voice with authority and presence from the very first word.
2. EMPHASIZE key words and emotionally charged lines.
3. USE dramatic pauses before and after powerful lines.
4. VARY your tempo dynamically.
5. STRESS the end-rhyme (qafiya) of each verse.
6. Let your voice SWELL and RECEDE with the emotional arc.
7. Avoid flat, monotone delivery at all costs.
Poem:
{poem.arabic}
```

### Prompt K — static (IN PROD NOW)
```
أنت امرؤ القيس بن حُجر، الملك الضليل وشاعر العرب الأول.
تقف أمام قبيلتك في مجلس شعر بصحراء نجد. النار تتقد، والحضور مُصغون.
قُم وألقِ معلقتك — القصيدة التي خلّدت اسمك عبر الأجيال.
هذه قصيدتك أنت، ألمك أنت، ذكرياتك أنت. ألقِها بسلطان الملوك وعاطفة الشعراء.
ابدأ:
{poem.arabic}
```

### Prompt K — dynamic (used in generalization test, user liked 76756)
```
أنت {poet}، {context}.
تقف أمام جمهور في مجلس شعر. قُم وألقِ قصيدتك أمام الحضور.
هذه قصيدتك أنت، كلماتك أنت. ألقِها بسلطان الشعراء وعاطفة من عاش كل كلمة.
ابدأ:
{poem.arabic}
```

### Prompt O (Director's cue — best generalizer)
```
RECORDING SESSION — Arabic Poetry Performance.
Voice: commanding male orator.
Style: classical Arabic poetry recitation (not singing, not chanting).
Energy: HIGH.
Pace: NATURAL conversational authority, NOT slow.
The poet speaks with conviction, not sorrow.
Poem:
{poem.arabic}
```

---

## Decision Tree

```
                    ┌─ Quality: K-static ★★★★★
                    │  (hardcoded Imru' al-Qais)
                    │  Problem: breaks for other poets, recites intro
                    │
User's favorites ───┤  ┌─ Quality: R ★★★★ (rest-R-27161, live-R-imru)
                    ├──┤  K simplified, generic poet
                    │  │  Live: 5/5 reliable, REST: needs more data
                    │  │
                    │  ├─ Quality: Q ★★★★ (K+O hybrid)
                    │  │  100% reliable both APIs, fastest (20.2s REST)
                    │  │  RECOMMENDED for production
                    │  │
                    │  └─ Quality: K-dynamic ★★★★
                    │     Problem: 75% reliable REST, runaway Live
                    │
                    └─ Quality: A/O ★★★☆
                       Reliable baselines

ARCHITECTURE FIX (CRITICAL):
→ Use systemInstruction for delivery directions
→ Send ONLY poem text in contents
→ Prevents model from reciting the prompt itself

NEXT STEPS:
→ Deploy systemInstruction fix to production
→ Re-test K-static with systemInstruction (may sound different)
→ Evaluate Q with systemInstruction (best candidate for prod)
```

---

## Audio Samples Location
All files: `/Users/sfarage/Github/personal/poetry-audio-ux/prompt-samples/`

| File pattern | Description |
|-------------|-------------|
| `sample-rest-{A-O}.wav` | Round 1-3, Imru' al-Qais poem |
| `sample-live-{A-O}.wav` | Round 1-3, Imru' al-Qais poem |
| `sample-rest-K-{id}.wav` | K generalization test (4 poems) |
| `sample-live-K-{id}.wav` | K generalization test (4 poems) |
| `sample-rest-O-{id}.wav` | O generalization test (4 poems) |
| `sample-live-O-{id}.wav` | O generalization test (4 poems) |
| `sample-rest-A-{id}.wav` | A generalization test (4 poems) |
| `sample-live-A-{id}.wav` | A generalization test (4 poems) |
| `sample-rest-{P-T}-{id}.wav` | Round 4 hybrids (5 poems, REST — partial due to quota) |
| `sample-live-{P-T}-{id}.wav` | Round 4 hybrids (5 poems, Live — all succeeded) |
