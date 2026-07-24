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
TAXONOMY_VERSION = "2"

# -- Run defaults ----------------------------------------------------------
DEFAULT_MODEL = DEFAULT_HAIKU_MODEL       # bulk classification is cheap on Haiku
# Gemini is the working bulk provider in this environment (the Anthropic/Bedrock
# proxy needs a token we don't have here). `gemini-2.5-flash` is the cheap bulk
# model; `gemini-2.5-pro` is used as the eval judge / reference labeler.
DEFAULT_GEMINI_MODEL = "gemini/gemini-2.5-flash"
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

# Representative century (CE) per era_id, used to populate `poems.century`
# WITHOUT asking the model. era_id is the real temporal facet; these are a
# coarse, honest convenience derived from era (see DIWAN_ERA_MAP in
# poetry_quality_and_curation/retriever_and_quality_curator/data/prepare_diwan_import.py).
# `None` = the era is too broad to pin to a single century (kept null on purpose).
ERA_CENTURY = {
    1: 7,     # صدر الإسلام  — Early Islam
    2: 9,     # عباسي        — Abbasid
    3: None,  # متأخر        — late / modern: spans too many centuries to assign
    4: 8,     # أموي         — Umayyad
    5: 6,     # جاهلي        — pre-Islamic
    6: 13,    # أيوبي        — Ayyubid
    7: 11,    # أندلسي       — Andalusian
    8: 14,    # مملوكي       — Mamluk
}

# Per-label confidence contract. The classifier asks the model for a 0-100
# confidence for each value key it assigns (any dimension). It is persisted to
# poem_categories.confidence and echoed in the `categories` JSONB under a
# `confidences` object keyed by value key.
CONFIDENCE_MIN = 0
CONFIDENCE_MAX = 100


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

# Valid key sets, for fast validation in the classifier.
VALID_KEYS = {dim: {v[0] for v in spec["values"]} for dim, spec in DIMENSIONS.items()}


# Max labels we accept per multi-label dimension (keeps output focused). Any
# dimension not listed here falls back to DEFAULT_MAX_LABELS_PER_DIM, so adding
# a new dimension needs no edit to this map.
DEFAULT_MAX_LABELS_PER_DIM = 4


class _MaxLabels(dict):
    """dict of dimension_key -> max labels, defaulting to
    DEFAULT_MAX_LABELS_PER_DIM for any unlisted dimension. __missing__ does not
    mutate the dict, so lookups stay side-effect free."""

    def __missing__(self, key):  # noqa: D401 - simple accessor
        return DEFAULT_MAX_LABELS_PER_DIM


MAX_LABELS_PER_DIM = _MaxLabels({"mood": 4, "topic": 4, "motif": 5})


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


def build_classification_prompt() -> str:
    """Build the Arabic system prompt from the controlled vocabularies."""
    return f"""أنت ناقد أدبي عربي خبير بالشعر الكلاسيكي والحديث. مهمتك تصنيف القصيدة المعروضة عليك عبر عدة أبعاد لتمكين القارئ من التصفية والاكتشاف حسب المزاج والموضوع والصورة.

لكل قصيدة، اختر التصنيفات من القوائم المغلقة التالية فقط. استخدم الرمز الإنجليزي (key) في إجابتك، لا الاسم العربي.

■ المزاج (mood) — اختر من 1 إلى {MAX_LABELS_PER_DIM['mood']} مزاجاً يغلب على القصيدة:
{_vocab_block('mood')}

■ الموضوع (topic) — اختر من 1 إلى {MAX_LABELS_PER_DIM['topic']} موضوعاً:
{_vocab_block('topic')}

■ الصورة والرموز (motif) — اختر من 0 إلى {MAX_LABELS_PER_DIM['motif']} من الصور الحسية الحاضرة فعلاً في النص:
{_vocab_block('motif')}

كما تنتج الحقول التالية:
- mood_primary: المزاج الأوحد الأكثر هيمنة (رمز واحد من قائمة المزاج).
- emotional_intensity: عدد من 0 إلى 100 يقيس شدة الشحنة العاطفية.
- accessibility_level: عدد من 1 إلى 5 (1 = سهلة على متعلّم العربية، 5 = تتطلب معرفة كلاسيكية عميقة).
- confidences: كائن يربط كل رمز اخترته (من أي بُعد) بدرجة ثقتك فيه من 0 إلى 100، مثل {{"amorous": 90, "love": 80}}.

إرشادات:
- صنّف بناءً على النص نفسه لا على شهرة الشاعر.
- لا تخترع رموزاً خارج القوائم. إن لم تنطبق صورة حسية، اترك motifs فارغة.
- كن انتقائياً: اختر أقوى التصنيفات لا كل ما هو محتمل.
- تمييزات دقيقة: شوق (yearning) حنينٌ نحو شخص، أما حنين (nostalgia) فحنينٌ نحو الوطن أو الديار؛ سخرية (satire) تعني الهجاء واللاذع لا الفكاهة اللطيفة؛ والروض والزهر (garden-flowers) غالباً روض المحبوب لا مجرد وصف طبيعة.

أجب بصيغة JSON فقط لكل قصيدة، بلا أي شرح:
{{"id": "...", "moods": ["..."], "mood_primary": "...", "topics": ["..."], "motifs": ["..."], "emotional_intensity": N, "accessibility_level": N, "confidences": {{"<key>": N}}}}

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
