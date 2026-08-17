# Poet life dates — review sheet

Companion to [`poet-dates.csv`](./poet-dates.csv) / [`poet-dates.json`](./poet-dates.json).
Tracking issue: [#721](https://github.com/lesmartiepants/poetry-bil-araby/issues/721).

This is the **review artifact for phase 2**. Nothing here has been written to the
database. Read the CSV top-down: it is sorted by served poem count, so the rows
that move the most poems are first.

## Columns

| column                                      | meaning                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `poems_served`                              | poems this poet contributes after the `SERVING` filters in `server.js`       |
| `poems_total`                               | unfiltered poem count — only known for eras 3, 9 and 10 (see below)          |
| `era_id`/`era_name`                         | what the database says today                                                 |
| `century_now`                               | what `poems.century` says today — one stamped value per era, no poet content |
| `death_year` / `birth_year` / `active_year` | the new per-poet data                                                        |
| `century_new`                               | `ceil(coalesce(death, active, birth) / 100)`                                 |
| `date_confidence`                           | `exact`, `approx`, or empty when the poet has no dates at all                |

## How many poets there actually are

`/api/poets?all=1` returns **711** poets. That is every poet with at least one
poem that survives the serving filters.

The public API has no unfiltered poet listing — every list endpoint
(`/api/poets`, `/api/poems/search`, `/api/poems/by-category`, the
`distributions` in `/api/categories`) applies `servingFilters()`. So the raw
`poets` row count cannot be read from outside the database.

What can be said: for eras 3, 9 and 10 an unfiltered poet list does exist
(287 + 16 + 25 = **328 poets**, 3,138 unfiltered poems). **All 328 also appear in
the served 711.** The serving filter drops poems, not poets. The unfiltered
`poets` table is therefore 711 plus a small tail of poets whose every poem was
filtered out — zero of them in the three eras where this is measurable.

Every one of the 711 is dated in this file.

## Coverage

|          | poets | share |
| -------- | ----: | ----: |
| `exact`  |   302 |   42% |
| `approx` |   400 |   56% |
| no dates |     9 |    1% |

`approx` covers three different situations, all visible in `source_note`:
attested-but-disputed years (most pre-Islamic poets), a floruit estimate where
no death year survives, and boundary cases pulled to keep a poet with the era
they are already grouped with.

The 9 undated rows keep a NULL century, which the API already handles
(`undated=1` / `includeUndated=1`). Four of them are not poets at all — see below.

## What the century looks like before and after

Served poems per century:

| century  |   before |  after |
| -------- | -------: | -----: |
| 6        |      267 |    188 |
| 7        |       15 |    503 |
| 8        |      361 |    317 |
| 9        |     1823 |    797 |
| 10       |        — |    656 |
| 11       |      477 |    631 |
| 12       |        — |    429 |
| 13       |      187 |    271 |
| 14       |      464 |    227 |
| 15       |        — |      8 |
| 16       |        — |      5 |
| 17       |        — |     13 |
| 18       |        — |     46 |
| 19       |        — |     52 |
| 20       |        — |    471 |
| 21       |        — |     79 |
| **NULL** | **1173** | **74** |

The 9th century stops being 38% of the library and becomes 17%. The undated
bucket, which was a quarter of everything, drops to 1.6%.

## Rows that are not poets

Four `poets` rows are theme labels that got imported as authors. They have no
dates and are flagged in `source_note`:

| row                     | means                            | served poems |
| ----------------------- | -------------------------------- | -----------: |
| `وصف المطر والسحاب`     | "description of rain and clouds" |            8 |
| `الفروسية`              | "chivalry"                       |            8 |
| `المدايح النبوية`       | "prophetic panegyric"            |            1 |
| `ثورات التغيير العربية` | "the Arab uprisings"             |            1 |

They are reported, not fixed — deleting or reattributing them is a separate call.

## The anonymous entries — spot-check result

`مجهول` (129 poems unfiltered, 50 served) and `شعراء مجهولون` (3 / 1).

The owner's provisional call was to assign these the 6th century as a
convention. **The spot-check says do not.** A 12-poem sample read against the
usual period markers is unambiguously post-classical, not pre-Islamic:

- Every sampled poem is a 2–4 line `muqaṭṭaʿa`, the epigram form of the
  anthologies. No `qaṣīda`, no `aṭlāl` opening, no rite of the desert journey.
- The diction is mannered `badīʿ` — `موشع ومذبج ومفوف`, paronomasia, antithesis
  worked line by line. Pre-Islamic verse does not read like this.
- The ghazal is the post-Abbasid `ظبي` / `عذار الشباب` / cheek-and-wine mode,
  with `حناء`, `كافور`, `مسك`, `زمردة الشنف`. That is Andalusian-to-Mamluk
  anthology material.
- One poem cites `سورة الفتح`; another is technical Sufi vocabulary
  (`فنى ... بالبقا` — fanāʾ and baqāʾ), which puts it no earlier than the 3rd
  century AH and realistically 6th–7th AH.
- Accessibility scores cluster at 1.5–3.8. Genuine Jahili verse scores far
  harder on this corpus because of its `gharīb` lexis.

Stamping these 6th century would file mannered late-medieval ghazal under
"Pre-Islamic" in the onboarding era step — a visible, wrong answer for 1% of the
library. **Recommendation: leave both undated (NULL century).** That is what the
file does. If you still want the convention, the change is two rows.

## Duplicate poets

48 rows are spelling or naming variants of a poet who already exists under
another row, holding **252 served poems** between them. `تماضر بنت الشريد` is a
49th — it is al-Khansa's given name. Each is flagged in `source_note` with the
canonical it belongs to. The full list is in the PR body; nothing has been merged.

One trap worth naming: `قيس لبنى` is **not** a variant of Majnun Layla. It is the
byname of `قيس بن ذريح`, a different Umayyad ʿudhrī poet who happens to share a
death year. The two Qays clusters must not be merged into each other.

## The era column is wrong independently of century

Dating the poets exposed that `poets.era_id` itself carries bad rows, which the
old derived century hid. Examples, all with the era the database currently
gives them:

- `حافظ ابراهيم` (d. 1932) — **أندلسي**
- `ابراهيم ناجي` (d. 1953) — **أموي**
- `احمد الصافي النجفي` (d. 1977) — **مخضرم**
- `شهاب الدين الالوسي` (d. 1854) — **جاهلي**
- `الامام علي بن ابي طالب` (d. 661) — **أندلسي**
- `الشريف المرتضى` (d. 1044) — **مملوكي**
- `ابن عبد ربه الاندلسي` (d. 940) — **مملوكي**

200 poets holding 795 served poems fall outside any defensible century window for
their era. That is phase 4 and is not part of this file.

## Root cause of the two wrong stamps

`poetry_quality_and_curation/categorization/config.py` `ERA_CENTURY` maps
`6: 13, # أيوبي — Ayyubid`. In the live database era 6 is **مخضرم** and أيوبي is
era **10**. The era table was renumbered after that mapping was written, so
مخضرم inherited the Ayyubid century — the ~600 year error. أندلسي's stamp of 11
is a different mistake: it is not wrong by accident, it is wrong by kind, because
Andalusian poetry runs 8th–15th c. and "Andalusian" is a place.
