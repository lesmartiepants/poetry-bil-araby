"""Categorization taxonomy + prompt configuration.

This is the single source of truth for the reader-facing categorization layer:
the controlled vocabularies (dimensions + values), the scalar fields, and the
Claude classification prompt (built from the taxonomy so prompt and validation
never drift).

The classifier (`classify_poems.py`) and the DB seed
(`supabase/migrations/20260722000000_add_poem_categorization.sql`) both derive
from the vocabularies defined here. If you change a vocabulary, regenerate the
seed with:  `python -m poetry_quality_and_curation.categorization.config --print-seed`
"""
from __future__ import annotations

import os

# Reuse the proven DB + model conventions from the quality-curation pipeline.
from poetry_quality_and_curation.retriever_and_quality_curator.config import (  # noqa: F401
    get_db_connection,
    DEFAULT_HAIKU_MODEL,
    DEFAULT_SONNET_MODEL,
    DEFAULT_OPUS_MODEL,
    DATA_DIR as _CURATOR_DATA_DIR,
)
from pathlib import Path

# Keep categorization checkpoints separate from scoring checkpoints.
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Taxonomy schema version. Bump when the vocabularies, families, or output
# contract change. Stamped into per-poem provenance by the pipeline so we can
# tell which taxonomy a row was classified under.
#
# v3 (distillation): the vocabularies + families are unchanged from v2, but the
# OUTPUT CONTRACT changed — tighter caps (2/2/2), a dominant-concept prompt that
# picks one label per synonym family, a confidence floor at import, and a new
# `rationale` field. Rows tagged under v3 are sharper (a few core labels) than
# the v2 rows (avg 7.6 labels/poem). See ideas/categorization-audit.md.
TAXONOMY_VERSION = "3"

# Prompt revision, stamped alongside TAXONOMY_VERSION so we can distinguish rows
# produced by different prompt builds even within one taxonomy version.
#
# distill-2: adds `rationale_en`, an English rendering of the same sentence,
# asked for in the SAME call rather than a second pass — the model already has
# the poem and its own Arabic sentence in context, so a separate pass would pay
# for that context twice and could drift from the sentence it is translating.
# The Arabic instruction is unchanged; English is downstream of it.
PROMPT_VERSION = "distill-2"

# -- Run defaults ----------------------------------------------------------
DEFAULT_MODEL = DEFAULT_HAIKU_MODEL       # bulk classification is cheap on Haiku
# Gemini is the working bulk provider in this environment (the Anthropic/Bedrock
# proxy needs a token we don't have here). `gemini-3.6-flash` is the cheap bulk
# model the v2 corpus was actually tagged with (the earlier default said
# 2.5-flash but every categorization_model value in prod is 3.6-flash);
# `gemini-2.5-pro` is used as the eval judge / reference labeler.
DEFAULT_GEMINI_MODEL = "gemini/gemini-3.6-flash"
DEFAULT_BATCH_SIZE = 4
DEFAULT_CONCURRENCY = 15
DEFAULT_MAX_COST = 60


def resolve_provider(model: str) -> dict:
    """Per-model LiteLLM auth kwargs, so one classifier can target either provider.

    Returns only the ``api_key`` / ``api_base`` kwargs a ``litellm`` call needs
    for ``model``; callers splat the result into ``litellm.acompletion(...)``.

    Routing by model prefix:
      * ``gemini/…``  -> talk to Google directly with ``GEMINI_API_KEY`` (or
        ``GOOGLE_API_KEY``). No ``api_base`` — LiteLLM knows Gemini's endpoint.
        Also pins ``reasoning_effort``: Gemini 2.5 models "think" by default and
        will burn the whole token budget on hidden reasoning, truncating the
        JSON. Classification is a labeling task, so thinking is turned off
        (``disable``) — except ``gemini-2.5-pro``, which forbids a zero thinking
        budget, so it gets the minimum (``low``).
      * anything else (e.g. ``openai/bedrock-*``) -> the LiteLLM/Anthropic proxy:
        ``api_base`` from ``ANTHROPIC_BASE_URL`` / ``LITELLM_API_BASE`` and
        ``api_key`` from ``ANTHROPIC_AUTH_TOKEN`` / ``ANTHROPIC_API_KEY`` /
        ``LITELLM_API_KEY``.

    Missing env vars are simply omitted (never passed as ``None``), so a
    misconfigured environment fails inside LiteLLM with a clear provider error
    rather than here.
    """
    if model.startswith("gemini/"):
        kwargs = {"reasoning_effort": "low" if "pro" in model else "disable"}
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if key:
            kwargs["api_key"] = key
        return kwargs

    api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
    api_key = (os.environ.get("ANTHROPIC_AUTH_TOKEN")
               or os.environ.get("ANTHROPIC_API_KEY")
               or os.environ.get("LITELLM_API_KEY"))
    kwargs = {}
    if api_base:
        kwargs["api_base"] = api_base
    if api_key:
        kwargs["api_key"] = api_key
    return kwargs

# ==========================================================================
# CONTROLLED VOCABULARIES
# --------------------------------------------------------------------------
# Each dimension is multi-label unless noted. `key` is a stable ASCII slug
# (the canonical identifier stored in category_values.key); `ar`/`en` are
# display labels. The model is asked to answer with the ASCII `key`s from the
# enumerated list, which keeps parsing robust and avoids free-text drift.
# ==========================================================================

MOODS = [
    ("melancholy",   "حزن",        "Melancholy"),
    ("nostalgia",    "حنين",       "Nostalgia"),
    ("joy",          "فرح",        "Joy"),
    ("amorous",      "غزل",        "Amorous"),
    ("passion",      "وجد",        "Passion"),
    ("contemplation","تأمّل",      "Contemplation"),
    ("serenity",     "سكينة",      "Serenity"),
    ("defiance",     "تحدٍّ",       "Defiance"),
    ("pride",        "اعتزاز",     "Pride"),
    ("grief",        "أسى",        "Grief"),
    ("hope",         "أمل",        "Hope"),
    ("despair",      "يأس",        "Despair"),
    ("satire",       "سخرية",      "Satire"),
    ("reverence",    "خشوع",       "Reverence"),
    ("bittersweet",  "حلوٌ مرّ",    "Bittersweet"),
    ("yearning",     "شوق",        "Yearning"),
]

TOPICS = [
    ("love",              "الحب",                "Love"),
    ("loss-death",        "الفقد والموت",        "Loss & Death"),
    ("exile-longing",     "الغربة والحنين",      "Exile & Longing"),
    ("homeland",          "الوطن",               "Homeland"),
    ("nature",            "الطبيعة",             "Nature"),
    ("war-conflict",      "الحرب والصراع",       "War & Conflict"),
    ("faith-spirit",      "الإيمان والروحانية",  "Faith & Spirituality"),
    ("wine-pleasure",     "الخمر واللذّة",       "Wine & Pleasure"),
    ("friendship",        "الصداقة والوفاء",     "Friendship & Loyalty"),
    ("time-mortality",    "الزمن والفناء",       "Time & Mortality"),
    ("wisdom-ethics",     "الحكمة والأخلاق",     "Wisdom & Ethics"),
    ("justice-oppression","العدل والظلم",        "Justice & Oppression"),
    ("freedom",           "الحرية",              "Freedom"),
    ("beauty",            "الجمال",              "Beauty"),
    ("honor-pride",       "الفخر والشرف",        "Honor & Pride"),
    ("women-feminine",    "المرأة والأنوثة",     "Women & the Feminine"),
]

MOTIFS = [
    ("night",         "الليل",              "Night"),
    ("desert-ruins",  "الصحراء والطلل",     "Desert & Ruins"),
    ("moon-stars",    "القمر والنجوم",      "Moon & Stars"),
    ("sea-water",     "البحر والماء",       "Sea & Water"),
    ("garden-flowers","الروض والزهر",       "Garden & Flowers"),
    ("wine-cup",      "الكأس والخمر",       "The Wine Cup"),
    ("sword-battle",  "السيف والمعركة",     "Sword & Battle"),
    ("birds",         "الطير",              "Birds"),
    ("fire-light",    "النار والضوء",       "Fire & Light"),
    ("tears",         "الدموع",             "Tears"),
    ("journey",       "الرحلة والراحلة",    "Journey & Mount"),
    ("dawn",          "الفجر والصبح",       "Dawn"),
]

# dimension_key -> spec. `order` matches the seed order in the migration.
DIMENSIONS = {
    "mood":  {"label_ar": "المزاج",   "label_en": "Mood",   "cardinality": "multi", "order": 1, "values": MOODS},
    "topic": {"label_ar": "الموضوع",  "label_en": "Topic",  "cardinality": "multi", "order": 2, "values": TOPICS},
    "motif": {"label_ar": "الصورة",   "label_en": "Motif",  "cardinality": "multi", "order": 3, "values": MOTIFS},
}

# Scalar (non-vocabulary) fields the model also produces, stored as columns
# on `poems` for cheap filtering / sorting.
#
# NOTE: `century` is NOT model-guessed. It is derived from the poem's era
# (era_id) via ERA_CENTURY below, so the model never sees or produces it.
SCALARS = {
    "mood_primary":        "single dominant mood key (must be one of the mood keys)",
    "emotional_intensity": "0-100, how emotionally charged the poem is",
    "accessibility_level": "1-5, 1=easy for Arabic learners, 5=requires deep classical knowledge",
}

# FALLBACK ONLY. `poems.century` is derived from the POET's dates
# (poets.death_year / active_year / birth_year, see migration
# 20260815000000_add_poet_life_dates.sql and the poet_century() function). This
# map is used only for a poet with no dates at all, and even then it is a coarse
# stand-in, not a fact about that poet.
#
# It used to be the sole source of `century`, which is why every Abbasid poem
# read as 9th century whether the poet died in 814, 965 or 1057 (#721).
#
# !! THESE KEYS MUST MATCH THE LIVE `eras` TABLE. !!
# They were wrong once already: the table was renumbered underneath this map, so
# `6: 13` — written for أيوبي — landed on مخضرم and stamped poets who straddled
# the 6th/7th-century arrival of Islam as 13th century, a ~600 year error. Ayyubid
# is era 10, not 6. Verify against `SELECT id, name FROM eras` before editing.
#
# `None` = too broad or too geographic to pin to a single century, kept NULL on
# purpose. أندلسي is None because it is a PLACE: Andalusian poetry runs 8th-15th c.
# and an 11th-century Andalusian and an 11th-century Abbasid share a century
# while belonging to different eras.
ERA_CENTURY = {
    1: 7,     # إسلامي   — Early Islam / Rashidun
    2: 9,     # عباسي    — Abbasid
    3: None,  # متأخر    — late / modern: spans too many centuries to assign
    4: 8,     # أموي     — Umayyad
    5: 6,     # جاهلي    — pre-Islamic
    6: 7,     # مخضرم    — straddles the arrival of Islam (6th/7th c.)
    7: None,  # أندلسي   — geographic, not a period
    8: 14,    # مملوكي   — Mamluk
    9: 17,    # عثماني   — Ottoman
    10: 13,   # أيوبي    — Ayyubid
}

# Per-label confidence contract. The classifier asks the model for a 0-100
# confidence for each value key it assigns (any dimension). It is persisted to
# poem_categories.confidence and echoed in the `categories` JSONB under a
# `confidences` object keyed by value key.
CONFIDENCE_MIN = 0
CONFIDENCE_MAX = 100

# Distillation floor. Labels the model assigns with a confidence below this are
# dropped at import time (import_categories.py), so weak/hedged tags never reach
# poem_categories. The distilled prompt also asks the model not to emit anything
# below this, but the floor is enforced in code as the authoritative guarantee.
# The one exception is mood_primary, which is always kept so mood is never empty
# (mood is a required dimension — see DIMENSION_MIN_LABELS).
CONFIDENCE_FLOOR = 65


def clamp_confidence(value):
    """Clamp a model-provided confidence into [CONFIDENCE_MIN, CONFIDENCE_MAX].

    Returns an int in range, or None if the value is missing / non-numeric so
    callers can simply skip persisting it.
    """
    if value is None:
        return None
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return None
    return max(CONFIDENCE_MIN, min(CONFIDENCE_MAX, n))


def apply_confidence_floor(dim_lists: dict, confidences: dict, mood_primary,
                           floor: int = CONFIDENCE_FLOOR) -> dict:
    """Drop labels whose confidence is known and below ``floor``.

    Distillation (v3): weak/hedged tags never reach the DB. Rules:
      * a label is dropped only when its confidence is present AND < floor
        (a missing confidence is ambiguous, so it is kept);
      * ``mood_primary`` is always kept, so the required mood dimension is never
        emptied by the floor.

    Returns a new ``dim_key -> [value_key]`` dict; inputs are not mutated. The
    same filtered lists feed both poem_categories and the categories JSONB
    (see import_categories.import_rows), so the normalized table and the
    denormalized cache stay consistent. Lives here, in the import-light config
    module, so it is unit-testable without pulling in pandas/psycopg.
    """
    kept = {}
    for dim, keys in dim_lists.items():
        out = []
        for k in keys:
            c = confidences.get(k)
            if c is None or c >= floor or (dim == "mood" and k == mood_primary):
                out.append(k)
        kept[dim] = out
    if mood_primary and mood_primary not in kept.get("mood", []):
        kept.setdefault("mood", []).insert(0, mood_primary)
    return kept

# Valid key sets, for fast validation in the classifier.
VALID_KEYS = {dim: {v[0] for v in spec["values"]} for dim, spec in DIMENSIONS.items()}


# Max labels we accept per multi-label dimension (keeps output focused). Any
# dimension not listed here falls back to DEFAULT_MAX_LABELS_PER_DIM, so adding
# a new dimension needs no edit to this map.
#
# DISTILLATION (v3): tightened from 4/4/5 to 2/2/2. The v2 corpus averaged 7.6
# labels/poem (up to 13), which made discovery filters useless (e.g. `love` sat
# on 46% of poems). A hard ceiling of 2 per dimension caps a poem at 6 labels
# and forces the model to name only the dominant concepts.
DEFAULT_MAX_LABELS_PER_DIM = 2


class _MaxLabels(dict):
    """dict of dimension_key -> max labels, defaulting to
    DEFAULT_MAX_LABELS_PER_DIM for any unlisted dimension. __missing__ does not
    mutate the dict, so lookups stay side-effect free."""

    def __missing__(self, key):  # noqa: D401 - simple accessor
        return DEFAULT_MAX_LABELS_PER_DIM


MAX_LABELS_PER_DIM = _MaxLabels({"mood": 2, "topic": 2, "motif": 2})

# Minimum labels per dimension = the required-vs-optional contract. mood and
# topic are REQUIRED (>=1); motif is OPTIONAL (0 allowed) — an abstract or
# gnomic poem legitimately has no sensory image. This mirrors the min_labels /
# max_labels columns added to category_dimensions in the v3 migration, so the
# DB, the prompt, and validation all agree. Dimensions not listed default to 0
# (optional), so a new dimension needs no edit here.
DIMENSION_MIN_LABELS = {"mood": 1, "topic": 1, "motif": 0}


# Synonym groups: within a dimension, values in the same group are near-synonyms
# that the v2 model piled on together (audit: 2,191 poems carried >=2 of the
# sadness group; 524 carried all three of the desire group). The distilled
# prompt asks for AT MOST ONE label from each group, so a poem is tagged with
# the sharpest shade, not the whole gradient. Config-driven so the rule extends
# with the taxonomy — add a group here and the prompt picks it up automatically.
SYNONYM_GROUPS = {
    "mood": [
        ["melancholy", "grief", "despair", "bittersweet"],  # الأسى/الحزن gradient
        ["amorous", "passion", "yearning"],                 # الهوى/الشوق gradient
    ],
}


# ==========================================================================
# FAMILIES — a cross-dimension grouping layer
# --------------------------------------------------------------------------
# Families sit ABOVE the three dimensions: each family gathers related values
# from mood/topic/motif into one reader-facing cluster (e.g. "Love & Desire").
# Every one of the 44 dimension values belongs to exactly one family (checked
# by validate_taxonomy). `members` is an ordered list of (dimension_key,
# value_key) pairs. `key` is a stable ASCII slug stored in category_families.
# sort_order is the family's position in this list (0-based, matching values).
# ==========================================================================

FAMILIES = [
    {
        "key": "love-desire",
        "label_ar": "الحب والهوى",
        "label_en": "Love & Desire",
        "members": [
            ("mood", "amorous"), ("mood", "passion"), ("mood", "yearning"),
            ("topic", "love"), ("topic", "beauty"), ("topic", "women-feminine"),
            ("motif", "garden-flowers"),
        ],
    },
    {
        "key": "grief-loss",
        "label_ar": "الأسى والفقد",
        "label_en": "Grief & Loss",
        "members": [
            ("mood", "melancholy"), ("mood", "grief"), ("mood", "despair"),
            ("topic", "loss-death"),
            ("motif", "tears"), ("motif", "desert-ruins"),
        ],
    },
    {
        "key": "longing-exile",
        "label_ar": "الحنين والغربة",
        "label_en": "Longing & Exile",
        "members": [
            ("mood", "nostalgia"), ("mood", "bittersweet"),
            ("topic", "exile-longing"), ("topic", "homeland"),
            ("motif", "journey"),
        ],
    },
    {
        "key": "valor-defiance",
        "label_ar": "الحماسة والإباء",
        "label_en": "Valor & Defiance",
        "members": [
            ("mood", "defiance"), ("mood", "pride"), ("mood", "satire"),
            ("topic", "war-conflict"), ("topic", "honor-pride"),
            ("topic", "justice-oppression"), ("topic", "freedom"),
            ("motif", "sword-battle"),
        ],
    },
    {
        "key": "revelry-company",
        "label_ar": "الطرب والصُّحبة",
        "label_en": "Revelry & Companionship",
        "members": [
            ("mood", "joy"),
            ("topic", "wine-pleasure"), ("topic", "friendship"),
            ("motif", "wine-cup"),
        ],
    },
    {
        "key": "reflection-faith",
        "label_ar": "التأمّل والإيمان",
        "label_en": "Reflection & Faith",
        "members": [
            ("mood", "contemplation"), ("mood", "serenity"),
            ("mood", "reverence"), ("mood", "hope"),
            ("topic", "faith-spirit"), ("topic", "wisdom-ethics"),
            ("topic", "time-mortality"),
        ],
    },
    {
        "key": "nature-cosmos",
        "label_ar": "الطبيعة والكون",
        "label_en": "Nature & Cosmos",
        "members": [
            ("topic", "nature"),
            ("motif", "night"), ("motif", "moon-stars"), ("motif", "sea-water"),
            ("motif", "birds"), ("motif", "fire-light"), ("motif", "dawn"),
        ],
    },
]


def validate_taxonomy() -> None:
    """Fail loud on taxonomy drift.

    Raises ValueError if:
      * any dimension, value, or family is missing a non-empty Arabic OR
        English label;
      * any family member references an unknown (dimension, value) key;
      * the 44 dimension values are not each assigned to exactly one family
        (full coverage + single membership).
    """
    # 1. Every dimension has both labels.
    for dim, spec in DIMENSIONS.items():
        if not str(spec.get("label_ar", "")).strip() or not str(spec.get("label_en", "")).strip():
            raise ValueError(f"Dimension '{dim}' is missing an Arabic or English label.")

    # 2. Every value has both labels. Build the full (dim, value) key set.
    all_values = set()
    for dim, spec in DIMENSIONS.items():
        for key, ar, en in spec["values"]:
            if not str(ar).strip() or not str(en).strip():
                raise ValueError(f"Value '{dim}/{key}' is missing an Arabic or English label.")
            all_values.add((dim, key))

    # 3. Every family has both labels + a non-empty key.
    for fam in FAMILIES:
        if not str(fam.get("key", "")).strip():
            raise ValueError("A family is missing its key.")
        if not str(fam.get("label_ar", "")).strip() or not str(fam.get("label_en", "")).strip():
            raise ValueError(f"Family '{fam.get('key')}' is missing an Arabic or English label.")

    # 4. Every family member points at a known (dim, value); count memberships.
    membership = {}  # (dim, value) -> [family_key, ...]
    for fam in FAMILIES:
        for member in fam["members"]:
            if member not in all_values:
                raise ValueError(
                    f"Family '{fam['key']}' references unknown value {member}."
                )
            membership.setdefault(member, []).append(fam["key"])

    # 5. Coverage + single-membership: each of the 44 values in exactly one family.
    unassigned = sorted(all_values - set(membership))
    if unassigned:
        raise ValueError(f"Values not assigned to any family: {unassigned}")
    multiply = {m: fams for m, fams in membership.items() if len(fams) > 1}
    if multiply:
        raise ValueError(f"Values assigned to multiple families: {multiply}")


# ==========================================================================
# PROMPT (built from the taxonomy above)
# ==========================================================================

def _vocab_block(dim: str) -> str:
    lines = [f"  - {key}  ({ar} / {en})" for key, ar, en in DIMENSIONS[dim]["values"]]
    return "\n".join(lines)


def _ar_label(dim: str, key: str) -> str:
    """Arabic label for a (dimension, value key), for rendering prompt guidance."""
    for k, ar, en in DIMENSIONS[dim]["values"]:
        if k == key:
            return ar
    return key


def _synonym_block() -> str:
    """Render the one-per-synonym-group rule from SYNONYM_GROUPS (config-driven).

    Empty string if no groups are defined, so the prompt degrades cleanly.
    """
    lines = []
    for dim, groups in SYNONYM_GROUPS.items():
        for group in groups:
            pretty = "، ".join(f"{_ar_label(dim, k)} ({k})" for k in group)
            lines.append(f"  - اختر رمزاً واحداً على الأكثر من: {pretty}")
    return "\n".join(lines)


def build_classification_prompt() -> str:
    """Build the distilled Arabic system prompt from the controlled vocabularies.

    Distillation (v3): the model is asked to name the DOMINANT concept of the
    poem in a few sharp labels rather than every plausible tag. Caps come from
    MAX_LABELS_PER_DIM (2/2/2); the required-vs-optional contract from
    DIMENSION_MIN_LABELS (mood/topic >=1, motif 0); the one-per-synonym-group
    rule from SYNONYM_GROUPS; and a confidence floor from CONFIDENCE_FLOOR. Every
    number is interpolated from config so prompt and validation never drift.
    """
    mn, mx = DIMENSION_MIN_LABELS, MAX_LABELS_PER_DIM
    return f"""أنت ناقد أدبي عربي خبير بالشعر الكلاسيكي والحديث. مهمتك تصنيف القصيدة المعروضة عليك عبر أبعاد المزاج والموضوع والصورة، بأقلّ عدد من التصنيفات التي تعبّر عن **جوهر** القصيدة، لا كلّ ما هو محتمل. الهدف تمكين القارئ من التصفية والاكتشاف بتصنيفات حادّة مميِّزة.

اختر التصنيفات من القوائم المغلقة التالية فقط، واستخدم الرمز الإنجليزي (key) في إجابتك لا الاسم العربي.

■ المزاج (mood) — اختر من {mn['mood']} إلى {mx['mood']}: مزاجاً مهيمناً واحداً، وأضف ثانوياً واحداً فقط إن كان مختلفاً جوهرياً لا مجرّد ظلٍّ للأول:
{_vocab_block('mood')}

■ الموضوع (topic) — اختر من {mn['topic']} إلى {mx['topic']}: موضوعاً واحداً، أو اثنين إن حمل النصّ موضوعين متمايزين حقاً:
{_vocab_block('topic')}

■ الصورة والرموز (motif) — اختر من {mn['motif']} إلى {mx['motif']} من الصور الحسّية الحاضرة فعلاً وبقوة في النص. إن لم تبرز صورة، اترك القائمة فارغة:
{_vocab_block('motif')}

قاعدة عدم تكديس المرادفات (مهمّة) — من كلّ مجموعة تالية اختر الأدقّ واحداً فقط:
{_synonym_block()}

كما تنتج الحقول التالية:
- mood_primary: المزاج الأوحد الأكثر هيمنة (رمز واحد من قائمة المزاج، ويجب أن يكون ضمن moods).
- rationale: جملة عربية قصيرة تسمّي المفهوم الجوهري للقصيدة وتبرّر اختيارك.
- rationale_en: ترجمة إنجليزية أمينة للجملة السابقة نفسها، جملة واحدة. لا تُضف معنى ولا تشرح أكثر مما قلته بالعربية؛ العربية هي الأصل.
- emotional_intensity: عدد من 0 إلى 100 يقيس شدة الشحنة العاطفية.
- accessibility_level: عدد من 1 إلى 5 (1 = سهلة على متعلّم العربية، 5 = تتطلب معرفة كلاسيكية عميقة).
- confidences: كائن يربط كل رمز اخترته (من أي بُعد) بدرجة ثقتك فيه من 0 إلى 100، مثل {{"amorous": 90, "love": 80}}.

إرشادات:
- صنّف بناءً على النص نفسه لا على شهرة الشاعر.
- لا تخترع رموزاً خارج القوائم.
- سمِّ المفهوم المهيمن أولاً ثم صنّف؛ لا تُدرج تصنيفاً هامشياً لمجرّد وروده.
- لا تُدرج أي رمز درجة ثقتك فيه دون {CONFIDENCE_FLOOR}.
- تمييزات دقيقة: شوق (yearning) حنينٌ نحو شخص، أما حنين (nostalgia) فحنينٌ نحو الوطن أو الديار؛ سخرية (satire) تعني الهجاء اللاذع لا الفكاهة اللطيفة؛ والروض والزهر (garden-flowers) غالباً روض المحبوب لا مجرّد وصف طبيعة.

أجب بصيغة JSON فقط لكل قصيدة، بلا أي شرح خارج الكائن:
{{"id": "...", "moods": ["..."], "mood_primary": "...", "topics": ["..."], "motifs": ["..."], "emotional_intensity": N, "accessibility_level": N, "confidences": {{"<key>": N}}, "rationale": "...", "rationale_en": "..."}}

إذا عُرضت عدة قصائد، أجب بمصفوفة JSON مرتبة بنفس ترتيب القصائد."""


CLASSIFICATION_PROMPT = build_classification_prompt()


# ==========================================================================
# Seed generator (keeps the SQL migration in sync with this file)
# ==========================================================================

def print_seed_sql() -> None:
    """Emit INSERT/UPDATE statements for the controlled vocabularies + families.

    Idempotent and re-runnable. Fails fast on taxonomy drift.
    """
    validate_taxonomy()
    print("-- AUTO-GENERATED from categorization/config.py — do not hand-edit.")
    for dim, spec in sorted(DIMENSIONS.items(), key=lambda kv: kv[1]["order"]):
        print(
            "INSERT INTO category_dimensions (key, label_ar, label_en, cardinality, sort_order) "
            f"VALUES ('{dim}', '{spec['label_ar']}', '{spec['label_en']}', "
            f"'{spec['cardinality']}', {spec['order']}) ON CONFLICT (key) DO NOTHING;"
        )
    print()
    # v3: required-vs-optional contract (min_labels/max_labels). Idempotent
    # UPDATEs; harmless no-op if the columns don't exist yet is NOT true, so the
    # v3 migration adds the columns before applying an equivalent of these.
    for dim, spec in sorted(DIMENSIONS.items(), key=lambda kv: kv[1]["order"]):
        print(
            "UPDATE category_dimensions SET "
            f"min_labels = {DIMENSION_MIN_LABELS.get(dim, 0)}, "
            f"max_labels = {MAX_LABELS_PER_DIM[dim]} WHERE key = '{dim}';"
        )
    print()
    for dim, spec in sorted(DIMENSIONS.items(), key=lambda kv: kv[1]["order"]):
        for i, (key, ar, en) in enumerate(spec["values"]):
            ar_esc = ar.replace("'", "''")
            print(
                "INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) "
                f"SELECT id, '{key}', '{ar_esc}', '{en}', {i} FROM category_dimensions "
                f"WHERE key = '{dim}' ON CONFLICT (dimension_id, key) DO NOTHING;"
            )
        print()

    # Families: cross-dimension grouping layer (category_families must exist).
    for i, fam in enumerate(FAMILIES):
        ar_esc = fam["label_ar"].replace("'", "''")
        print(
            "INSERT INTO category_families (key, label_ar, label_en, sort_order) "
            f"VALUES ('{fam['key']}', '{ar_esc}', '{fam['label_en']}', {i}) "
            "ON CONFLICT (key) DO NOTHING;"
        )
    print()

    # Assign each value to its family.
    for fam in FAMILIES:
        for dim, value in fam["members"]:
            print(
                "UPDATE category_values SET family_id = "
                f"(SELECT id FROM category_families WHERE key = '{fam['key']}') "
                "WHERE dimension_id = "
                f"(SELECT id FROM category_dimensions WHERE key = '{dim}') "
                f"AND key = '{value}';"
            )
        print()


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--print-seed", action="store_true", help="Emit the vocab seed SQL")
    ap.add_argument("--print-prompt", action="store_true", help="Emit the classification prompt")
    args = ap.parse_args()
    if args.print_seed:
        print_seed_sql()
    elif args.print_prompt:
        print(CLASSIFICATION_PROMPT)
    else:
        print(f"Dimensions: {list(DIMENSIONS)}")
        for dim, spec in DIMENSIONS.items():
            print(f"  {dim}: {len(spec['values'])} values ({spec['cardinality']})")
        print(f"Scalars: {list(SCALARS)}")
