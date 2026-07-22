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

# -- Run defaults ----------------------------------------------------------
DEFAULT_MODEL = DEFAULT_HAIKU_MODEL       # bulk classification is cheap on Haiku
DEFAULT_BATCH_SIZE = 4
DEFAULT_CONCURRENCY = 15
DEFAULT_MAX_COST = 60

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
SCALARS = {
    "mood_primary":        "single dominant mood key (must be one of the mood keys)",
    "emotional_intensity": "0-100, how emotionally charged the poem is",
    "accessibility_level": "1-5, 1=easy for Arabic learners, 5=requires deep classical knowledge",
    "century":             "estimated century CE as an integer (e.g. 10, 20), or null if unknown",
}

# Valid key sets, for fast validation in the classifier.
VALID_KEYS = {dim: {v[0] for v in spec["values"]} for dim, spec in DIMENSIONS.items()}

# Max labels we accept per multi-label dimension (keeps output focused).
MAX_LABELS_PER_DIM = {"mood": 4, "topic": 4, "motif": 5}


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

كما تنتج الحقول العددية التالية:
- mood_primary: المزاج الأوحد الأكثر هيمنة (رمز واحد من قائمة المزاج).
- emotional_intensity: عدد من 0 إلى 100 يقيس شدة الشحنة العاطفية.
- accessibility_level: عدد من 1 إلى 5 (1 = سهلة على متعلّم العربية، 5 = تتطلب معرفة كلاسيكية عميقة).
- century: القرن الميلادي التقريبي لنظم القصيدة كعدد صحيح (مثل 10 أو 20)، أو null إن تعذّر التقدير.

إرشادات:
- صنّف بناءً على النص نفسه لا على شهرة الشاعر.
- لا تخترع رموزاً خارج القوائم. إن لم تنطبق صورة حسية، اترك motifs فارغة.
- كن انتقائياً: اختر أقوى التصنيفات لا كل ما هو محتمل.

أجب بصيغة JSON فقط لكل قصيدة، بلا أي شرح:
{{"id": "...", "moods": ["..."], "mood_primary": "...", "topics": ["..."], "motifs": ["..."], "emotional_intensity": N, "accessibility_level": N, "century": N}}

إذا عُرضت عدة قصائد، أجب بمصفوفة JSON مرتبة بنفس ترتيب القصائد."""


CLASSIFICATION_PROMPT = build_classification_prompt()


# ==========================================================================
# Seed generator (keeps the SQL migration in sync with this file)
# ==========================================================================

def print_seed_sql() -> None:
    """Emit INSERT statements for the controlled vocabularies (idempotent)."""
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
