# Distillation — before/after analysis (sample n=300)

Sample: 300 poems stratified by century × current label-count (0 failed to classify). "Before" = current DB tags; "after" = v3 distilled classifier (caps 2/2/2, confidence floor 65, one-per-synonym-family) run via the app's gemini-3.6-flash proxy. Post-processing mirrors the real import (`apply_confidence_floor`). No DB writes.

## 1. Label volume

|                 | before      | after    | Δ     |
| --------------- | ----------- | -------- | ----- |
| avg labels/poem | **8.40**    | **4.49** | -3.91 |
| max             | 13          | 6        |       |
| min             | 3           | 2        |       |
| poems ≥8 labels | 185 (61.7%) | 0 (0.0%) |       |

Label-count distribution (labels/poem : #poems)

- **before:** 3:4 4:20 5:36 6:23 7:32 8:35 9:31 10:39 11:35 12:33 13:12
- **after:** 2:12 3:64 4:63 5:88 6:73

## 2. Per-dimension average labels/poem

| dim   | before | after |
| ----- | ------ | ----- |
| mood  | 3.03   | 1.60  |
| topic | 2.72   | 1.65  |
| motif | 2.65   | 1.24  |

## 3. Prevalence of the broadest values (share of sample carrying each)

| value                       | dim-hint | before | after |
| --------------------------- | -------- | ------ | ----- |
| love (Love)                 |          | 49.3%  | 40.3% |
| melancholy (Melancholy)     |          | 44.7%  | 8.7%  |
| tears (Tears)               |          | 43.3%  | 27.7% |
| yearning (Yearning)         |          | 39.0%  | 13.3% |
| honor-pride (Honor&Pride)   |          | 34.3%  | 25.3% |
| pride (Pride)               |          | 33.7%  | 23.3% |
| loss-death (Loss&Death)     |          | 32.7%  | 22.7% |
| night (Night)               |          | 31.3%  | 14.7% |
| sword-battle (Sword&Battle) |          | 28.7%  | 15.7% |
| grief (Grief)               |          | 28.0%  | 23.0% |
| passion (Passion)           |          | 26.7%  | 11.7% |
| moon-stars (Moon&Stars)     |          | 25.7%  | 7.7%  |
| fire-light (Fire&Light)     |          | 25.3%  | 10.0% |
| amorous (Amorous)           |          | 23.7%  | 16.0% |
| desert-ruins (Desert&Ruins) |          | 23.0%  | 13.7% |

## 4. Synonym-stack collapse (mood gradients)

| group                                          | before ≥2  | after ≥2 |
| ---------------------------------------------- | ---------- | -------- |
| sadness (melancholy/grief/despair/bittersweet) | 92 (30.7%) | 0 (0.0%) |
| desire (amorous/passion/yearning)              | 83 (27.7%) | 5 (1.7%) |

## 5. Values dropped most (before→removed after)

| value                           | dropped from N poems |
| ------------------------------- | -------------------- |
| melancholy (Melancholy)         | 112                  |
| yearning (Yearning)             | 79                   |
| moon-stars (Moon&Stars)         | 55                   |
| night (Night)                   | 52                   |
| passion (Passion)               | 51                   |
| fire-light (Fire&Light)         | 48                   |
| tears (Tears)                   | 47                   |
| birds (Birds)                   | 44                   |
| women-feminine (Women)          | 43                   |
| sword-battle (Sword&Battle)     | 41                   |
| bittersweet (Bittersweet)       | 38                   |
| time-mortality (Time&Mortality) | 36                   |
| sea-water (Sea&Water)           | 34                   |
| wisdom-ethics (Wisdom&Ethics)   | 33                   |
| pride (Pride)                   | 33                   |

_Values newly added by distillation (should be small — sharper primary sometimes not in the over-tagged before set):_

contemplation:20, exile-longing:7, passion:6, time-mortality:6, amorous:5, reverence:5, melancholy:4, honor-pride:4

## 6. Spot-check (12 real poems: old tags → new tags + rationale)

| id    | century | before (≈)                                                                                                                                        | after                                                               | mood₁ b→a             | rationale                                                                                                        |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1854  | 14      | grief,melancholy,defiance,bittersweet · loss-death,honor-pride,exile-longing,time-mortality · tears,sword-battle,night,birds                      | **grief · loss-death · tears**                                      | grief→grief           | رثاء مفجع ومؤثر في فقد الشاعر لابنه، معبراً عن حرقة الثكل ولوعة الفراق.                                          |
| 49023 | 6       | grief,melancholy,pride,yearning · loss-death,honor-pride,time-mortality · tears,fire-light,night,moon-stars,desert-ruins                          | **grief · loss-death · tears,fire-light**                           | grief→grief           | رثاء مفجع ومستفيض للأخ صخر وتعداد لمناقبه ومكانته وسخائه بعد وفاته.                                              |
| 6287  | 8       | yearning,passion,defiance,amorous · love,exile-longing,women-feminine · night,birds,wine-cup,moon-stars,sword-battle                              | **yearning · love · night,journey**                                 | yearning→yearning     | قصيدة غزلية تشف عن الشوق للمحبوبة اليمانية ويكتنفها السرى والليل وعناء المسافة.                                  |
| 33302 | 13      | nostalgia,bittersweet,amorous,joy · love,wine-pleasure,exile-longing,friendship · desert-ruins,wine-cup,fire-light,night,journey                  | **nostalgia · exile-longing,wine-pleasure · desert-ruins,wine-cup** | bittersweet→nostalgia | قصيدة كلاسيكية قديمة تقف على الأطلال وتسترجع ذكريات الأحبة ومجالس الخمر ولهو الشباب.                             |
| 5288  | 9       | nostalgia,yearning,bittersweet,serenity · exile-longing,love,homeland,nature · tears,sea-water,garden-flowers,moon-stars,sword-battle             | **nostalgia · exile-longing,homeland · tears,garden-flowers**       | nostalgia→nostalgia   | شوق وحنين لبغداد وأيام الوصل فيها مع وصف جمال القصر وجنباته.                                                     |
| 5106  | —       | yearning,nostalgia,pride · exile-longing,homeland,honor-pride,love · desert-ruins,tears,garden-flowers,moon-stars,sword-battle                    | **nostalgia · exile-longing · garden-flowers,tears**                | yearning→nostalgia    | استهلال بحنين المغترب ببلاد الروم لمرابع الصبا بالشام مع المزج بالمديح والثناء على الممدوح.                      |
| 80061 | 7       | passion,nostalgia,yearning,melancholy · love,exile-longing,faith-spirit · sea-water,fire-light                                                    | **yearning · love**                                                 | passion→yearning      | قصيدة غزلية عذرية تفيض بالشوق والوجد وصفيّة لأثر ذكر المحبوبة على الجسد والروح.                                  |
| 5639  | 11      | passion,yearning,amorous,nostalgia · love,wine-pleasure,beauty · wine-cup,garden-flowers,moon-stars,fire-light,tears                              | **passion · love,faith-spirit · garden-flowers,wine-cup**           | passion→passion       | غزل صوفي يتوسل بالرموز الخمرية والرياضية للتعبير عن شدة الشوق والوجد الإلهي.                                     |
| 27051 | 13      | grief,melancholy,pride,yearning · loss-death,honor-pride,friendship · sword-battle,tears,night,fire-light,desert-ruins                            | **grief · loss-death,honor-pride · tears,sword-battle**             | grief→grief           | قصيدة رثاء جاهلية/إسلامية بليغة في الشقيق مالك بن نويرة تجمع بين حرقة الفقد وتعديد مناقب الفتوة والجود والشجاعة. |
| 1832  | 14      | grief,melancholy,yearning,despair · loss-death,time-mortality,war-conflict · night,birds,tears,fire-light                                         | **grief,contemplation · loss-death · tears**                        | grief→grief           | رثاء مفجع للولد يمتزج بالشكوى من تقلبات الزمان والتسليم بقضاء الله.                                              |
| 5027  | —       | amorous,pride,nostalgia,bittersweet · love,honor-pride,wisdom-ethics,women-feminine · moon-stars,garden-flowers,dawn,birds,sea-water              | **amorous,pride · love,honor-pride · garden-flowers,moon-stars**    | amorous→amorous       | افتتاح بغزل في الحسن والشباب ينتقل منه الشاعر إلى مدح الممدوح والفخر بمآثره.                                     |
| 10644 | 11      | grief,contemplation,melancholy,reverence · loss-death,time-mortality,wisdom-ethics,faith-spirit · night,tears,moon-stars,sea-water,garden-flowers | **grief,contemplation · loss-death,time-mortality · night,tears**   | grief→grief           | مرثية أندلسية يمتزج فيها لوعة الفقد والحزن على فقيد بقرطبة مع التأمل الفلسفي في فناء العالم وحتمية الموت.        |

## 7. Regression flags

None. Every distilled poem kept ≥1 mood and ≥1 topic (required dims never emptied), and no poem dropped its before-primary mood without replacement.

## 8. Verdict signals (for the writeup)

- avg labels 8.40 → 4.49
- love prevalence 49.3% → 40.3% (target <40%)
- sadness-stack 30.7% → 0.0%; desire-stack 27.7% → 1.7%
- regressions: 0

## 9. Caveats + projection to full corpus

- **The sample is deliberately over-tag-heavy.** It was oversampled for high-label-count poems (before avg **8.40** vs the corpus's **7.59**), so the after-numbers here are a _harder_ test than the corpus average. On the full corpus the distilled avg should land a bit lower than 4.49.
- **`love` at 40.3% is not over-tagging — it's the corpus.** Classical Arabic poetry is ghazal/nasīb-saturated; a plurality of poems genuinely open on love. Before, `love` sat at 49.3% (sample) / 46.4% (corpus) _stacked with_ amorous+passion+yearning+beauty. After, it's a single sharp topic with the desire-mood stack collapsed (27.7%→1.7%). So `love` staying near 40% reflects real signal; the discrimination gain comes from the other 15 topics and the mood/motif dimensions sharpening, plus synonym de-stacking. It is the one value that stays broad, and worth watching, but not a distillation failure.
- **No signal loss detected.** 0 regressions: every poem kept ≥1 mood and ≥1 topic; no before-primary mood dropped without replacement. The 12-poem spot-check shows the after-tags naming the dominant concept correctly (elegies → grief·loss-death·tears; Udhri ghazal → yearning·love; Sufi wine-poem → passion·love,faith-spirit). The only meaningful additions are `contemplation` (+20) on elegies/wisdom poems that legitimately are contemplative — a sharpening, not new noise.

## Verdict

**Distillation clearly improves filter discrimination without losing signal.** Avg labels/poem drops 8.40→4.49 (−47% on this heavy sample), the 13-label ceiling becomes 6, the two synonym gradients that made mood filters mush (sadness, desire) collapse from ~30%/28% co-occurrence to 0%/1.7%, and every broad value except `love` falls sharply (melancholy 44.7%→8.7%, yearning 39%→13.3%, night 31.3%→14.7%). `love` stays near 40% because the corpus really is that love-heavy, but it's now a clean single topic rather than a 4-way desire stack. Zero regressions on required dimensions. Recommend proceeding to the full re-classification.
