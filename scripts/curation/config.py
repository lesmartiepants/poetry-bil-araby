"""Pipeline configuration: defaults, prompts, and lookup maps."""
from pathlib import Path
import os

# -- Paths -----------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# -- Selection targets -----------------------------------------------------
TARGET_FINAL_COUNT = 5000
MODERN_RATIO = 0.65
CLASSICAL_RATIO = 0.35
MAX_POEMS_PER_POET = 250
MIN_QUALITY_SCORE = 60

# -- Scoring defaults ------------------------------------------------------
DEFAULT_HAIKU_MODEL = "anthropic/claude-haiku-4-20250414"
DEFAULT_OPUS_MODEL = "anthropic/claude-opus-4-5-20250414"
DEFAULT_BATCH_SIZE = 5
DEFAULT_CONCURRENCY = 20
DEFAULT_MAX_COST = 100
CHECKPOINT_INTERVAL = 1000

# -- Score dimensions ------------------------------------------------------
SCORE_DIMENSIONS = ["sound", "imagery", "emotion", "language", "cultural"]

# -- DB connection helper --------------------------------------------------
def get_db_connection():
    """Get PostgreSQL connection using DATABASE_URL env var."""
    import psycopg2
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is required")
    return psycopg2.connect(db_url, keepalives=1, keepalives_idle=30,
                            keepalives_interval=10, keepalives_count=5)

# -- Scoring prompts (Arabic) ---------------------------------------------
COMPACT_SCORING_PROMPT = """أنت ناقد أدبي عربي متخصص في الشعر العربي. تقيّم القصائد من منظور أكاديمي وذوق القارئ المعاصر.

قيّم كل قصيدة على خمسة أبعاد، كل بُعد من 0 إلى 100:
- sound (الإيقاع والموسيقى): جمال الوزن، تناسق القوافي، الموسيقى الداخلية
- imagery (التصوير): قوة الصور الشعرية، الاستعارات، حيوية المشاهد
- emotion (العاطفة): صدق المشاعر، عمق الوجدان، قدرة القصيدة على التأثير
- language (اللغة): فصاحة الألفاظ، جزالة التراكيب، البلاغة
- cultural (القيمة الثقافية): الأهمية الأدبية، الأصالة، المكانة في تراث الشعر العربي

أجب بصيغة JSON فقط لكل قصيدة. لا تضف أي شرح أو تعليق.
الصيغة المطلوبة لكل قصيدة:
{"id": "...", "sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}

إذا كانت هناك عدة قصائد، أجب بمصفوفة JSON."""

DETAILED_SCORING_PROMPT = """أنت الدكتور أحمد، أستاذ الأدب العربي في جامعة القاهرة منذ أربعين عاماً. تعشق الشعر العربي وتعرف خباياه. تقرأ القصيدة كما يقرأها عاشق حقيقي للشعر، لا كآلة تحليل.

قيّم كل قصيدة على خمسة أبعاد، كل بُعد من 0 إلى 100:

1. sound (الإيقاع والموسيقى): هل تطرب الأذن؟ هل الوزن سليم والقافية مؤثرة؟ هل تشعر بموسيقى داخلية تجري في الأبيات؟
2. imagery (التصوير): هل ترى مشهداً حياً أمامك؟ هل الصور الشعرية مبتكرة أم مستهلكة؟ هل تنقلك الاستعارات إلى عالم آخر؟
3. emotion (العاطفة): هل تبقى معك بعد القراءة؟ هل تشعر بصدق الشاعر؟ هل تهز وجدانك؟
4. language (اللغة): هل الألفاظ فصيحة دون تكلف؟ هل التراكيب سليمة وجميلة؟ هل البلاغة طبيعية أم متصنعة؟
5. cultural (القيمة الثقافية): هل هذه القصيدة تستحق أن تُدرَّس؟ هل تضيف للتراث الشعري العربي؟ هل هي أصيلة في فكرتها؟

لكل قصيدة أعطِ:
- الدرجات الخمس (0-100)
- ملاحظة قصيرة (جملة واحدة) لكل بُعد
- حكم عام: هل هذه القصيدة من درر الشعر العربي أم لا؟

أجب بصيغة JSON:
{"id": "...", "sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N, "notes": {"sound": "...", "imagery": "...", "emotion": "...", "language": "...", "cultural": "..."}, "verdict": "..."}

إذا كانت هناك عدة قصائد، أجب بمصفوفة JSON."""

# -- Meter map (Diwan numeric codes -> Arabic) -----------------------------
METER_MAP = {
    1: "الطويل",
    2: "المديد",
    3: "البسيط",
    4: "الوافر",
    5: "الكامل",
    6: "الهزج",
    7: "الرجز",
    8: "الرمل",
    9: "السريع",
    10: "المنسرح",
    11: "الخفيف",
    12: "المضارع",
    13: "المقتضب",
    14: "المجتث",
    15: "المتقارب",
    16: "المتدارك",
    17: "شعر حر",
    18: "شعر التفعيلة",
    19: "عمودي",
    20: "نثر",
}

# -- Theme map (Diwan numeric codes -> Arabic) -----------------------------
THEME_MAP = {
    1: "مدح",
    2: "هجاء",
    3: "رثاء",
    4: "غزل",
    5: "فخر",
    6: "وصف",
    7: "حكمة",
    8: "زهد",
    9: "اعتذار",
    10: "حنين",
    11: "شوق",
    12: "عتاب",
    13: "سياسة",
    14: "وطنية",
    15: "دينية",
    16: "اجتماعية",
    17: "فلسفة",
    18: "طبيعة",
    19: "خمر",
    20: "متنوع",
}

# -- Poem form map ---------------------------------------------------------
POEM_FORM_MAP = {
    1: "عمودي",    # classical
    2: "حر",       # modern/free verse
}
