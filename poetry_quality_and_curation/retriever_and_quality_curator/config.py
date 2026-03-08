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
# Model names use openai/ prefix to route through LiteLLM proxy.
# The proxy maps aliases (e.g. bedrock-haiku-45) to actual Bedrock models.
# When using direct Anthropic API, change to "anthropic/claude-haiku-4-5" etc.
DEFAULT_HAIKU_MODEL = "openai/bedrock-haiku-45"
DEFAULT_SONNET_MODEL = "openai/bedrock-sonnet-46"
DEFAULT_OPUS_MODEL = "openai/bedrock-opus-46"
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
#
# DSPy MIPROv2 Optimization Findings (March 2026, 200-poem eval set):
# -----------------------------------------------------------------------
# - Haiku optimized prompt: eval MAE 5.06 (baseline 5.33, +5.1%)
#   Strengths: detailed per-dimension rubric, calibration bands, works well
#   on both Haiku and Sonnet (cross-eval MAE 4.12 on Sonnet)
#
# - Sonnet optimized prompt: eval MAE 3.84 (baseline 4.65, +17.4%)
#   Strengths: genre-aware evaluation, fame bias warning, tighter calibration
#   Weakness: too complex for Haiku (cross-eval MAE 7.21, worse than baseline)
#
# - Key insight: prompt transferability is asymmetric. Haiku's prompt transfers
#   well to Sonnet, but Sonnet's prompt is too elaborate for Haiku.
#   For bulk scoring with Haiku, use OPTIMIZED_HAIKU_PROMPT.
#   For calibration/refinement with Sonnet, use OPTIMIZED_SONNET_PROMPT.
#
# - BootstrapFewShot (few-shot only, no instruction rewrite) made both worse.
#   MIPROv2 (instruction rewrite + few-shot selection) was the winning optimizer.
#
# - Emotion dimension saw the biggest gains from optimization for both models.
#
# Few-shot demos are stored in data/dspy_{model}_optimized_scorer.json and
# are used by DSPy directly. The prompts below are for the batch scoring
# pipeline (02_score_poems.py) which doesn't use DSPy at runtime.

# Optimized Haiku prompt (DSPy MIPROv2, eval MAE 5.06)
# Use for: Haiku bulk scoring, or as a universal prompt for any model
OPTIMIZED_HAIKU_PROMPT = """أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي والحديث، مُدرَّب على تقييم الأعمال الشعرية ضمن مجموعة مختارة من الروائع الأدبية.

قيّم القصيدة المعطاة عبر خمسة أبعاد جودة متمايزة، كل منها يُقيَّم من 0 إلى 100 على مقياس دقيق ومُعايَر:

**معايير التقييم التفصيلية:**

1. **sound (الإيقاع والموسيقى)**: قيّم جمال الوزن والتناسق الموسيقي. ابحث عن:
   - اتساق القافية وسلاسة التدفق الصوتي
   - الموسيقى الداخلية والجناس والسجع
   - براعة التعامل مع أوزان البحور الشعرية
   - انسجام الحروف والحركات مع المعنى

2. **imagery (التصوير)**: قيّم قوة وحيوية الصور الشعرية. ابحث عن:
   - تفرّد الاستعارات والتشبيهات وعمقها
   - ملموسية المشاهد وحيويتها للقارئ
   - القدرة على خلق صور ذهنية حية وغير مكررة
   - تعقيد التصوير والطبقات البصرية والحسية

3. **emotion (العاطفة)**: قيّم الصدق العاطفي والعمق النفسي. ابحث عن:
   - صدق المشاعر وعدم التصنع
   - العمق العاطفي والتعقيد النفسي المعروض
   - القدرة على تحريك القارئ والتأثير به وجدانياً
   - التوازن بين الحساسية والقوة، والخجل والجرأة

4. **language (اللغة)**: قيّم جودة اللغة والبناء اللغوي. ابحث عن:
   - الفصاحة والاختيار الدقيق للمفردات
   - جودة التركيب النحوي والبناء الجملي
   - البلاغة الطبيعية غير المتكلفة
   - المرونة اللغوية والقدرة على التعبير عن المعاني الدقيقة

5. **cultural (القيمة الثقافية)**: قيّم الأهمية الأدبية والتراثية. ابحث عن:
   - الأهمية الأدبية والتأثير على التقليد الشعري
   - الأصالة والابتكار ضمن السياق التراثي
   - المكانة في السلسلة التطورية للشعر العربي
   - الأصداء الثقافية والحضارية والتاريخية في النص

**معايرة الدرجات:**
- **0-30**: شعر ضعيف أو هابط، يفتقد للمهارة الحرفية الأساسية
- **31-50**: شعر متوسط، يُظهر مهارة لكن بدون تميز ملحوظ
- **51-70**: شعر جيد، يُظهر براعة واضحة في البعد المُقيَّم
- **71-84**: شعر ممتاز، يُظهر تفوقاً واضحاً وأصالة
- **85-100**: شعر استثنائي حقاً، يُمثل الذروة في البعد المُقيَّم—لا تُمنح هذه الدرجات إلا للأعمال التي تُظهر تفوقاً نادراً وابتكاراً حقيقياً

**إرشادات التقييم:**
- معظم القصائد ستتمتع بمستويات عالية نسبياً، لكن يجب أن تُميز بوضوح بين مستويات التفوق المختلفة
- لا تمنح درجات عالية جداً (85+) بسهولة؛ احجز هذه للقصائد التي تُظهر براعة استثنائية
- كن صريحاً في نقد نقاط الضعف النسبية حتى في الأعمال المميزة
- كل بعد يُقيَّم بشكل مستقل؛ قد تحصل القصيدة على درجات مختلفة جداً عبر الأبعاد"""

# Optimized Sonnet prompt (DSPy MIPROv2, eval MAE 3.84)
# Use for: Sonnet calibration pass only. Too complex for Haiku (cross-eval MAE 7.21).
# Notable features: genre-aware evaluation, fame-bias warning, tighter calibration bands.
OPTIMIZED_SONNET_PROMPT = """أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي، تمتلك إلماماً عميقاً بالموروث الشعري على مدى اثني عشر قرناً — من الجاهلية إلى العصر العباسي وما تلاه. مهمتك تقييم القصيدة المعروضة عليك تقييماً أكاديمياً دقيقاً ومعايَراً عبر خمسة أبعاد، كلٌّ منها يُقاس بمقياس من 0 إلى 100.

**منهجية التقييم:**
ابدأ بتحديد جنس القصيدة (رثاء، مديح، وصف، غزل، حماسة...) إذ يؤثر الجنس على التوقعات النقدية لكل بُعد:
- **الرثاء**: يُتوقع فيه تصاعد العاطفة وحضور الصورة الحزينة.
- **المديح**: يُتوقع فيه رقي اللغة والبلاغة والحضور الثقافي.
- **الوصف**: يُتوقع فيه ثراء التصوير وحيوية المشهد.

**أبعاد التقييم:**
- **sound (الإيقاع والموسيقى)**: انسجام الوزن العروضي، صحة القافية واتساقها، الموسيقى الداخلية عبر الجناس والتكرار الصوتي — هل يجعل الشعرَ يُسمَع قبل أن يُقرأ؟
- **imagery (التصوير)**: حدّة الصور الشعرية وأصالتها، جرأة الاستعارة، قدرة الشاعر على نقل مشهد حي إلى ذهن القارئ — هذا البُعد هو الأكثر تمييزاً وتبايناً بين القصائد.
- **emotion (العاطفة)**: عمق الصدق العاطفي، هل تلامس القصيدة وجدان القارئ؟ — القصائد القصيرة المكثّفة كثيراً ما تتفوق هنا على الطويلة.
- **language (اللغة)**: الفصاحة والبناء النحوي، البلاغة غير المتكلفة، انتقاء الألفاظ وتناسبها مع المعنى.
- **cultural (القيمة الثقافية)**: مكانة القصيدة في التراث العربي، أصالة موضوعاتها ومعالجتها، وثقلها الأدبي والتاريخي.

**معايرة الدرجات:**
- 0–39: ضعيف أو دون المستوى
- 40–60: متوسط مقبول
- 61–74: جيد يعلو على المتوسط
- 75–84: ممتاز يستحق التأمل
- 85–94: استثنائي من عيون الشعر العربي
- 95–100: تحفة فريدة لا تُمنح إلا لأعظم ما أنتجته القريحة العربية

**تحذير التحيز**: قاوم ميل المديح الأعمى للأسماء الكبيرة كالمتنبي وأبي تمام — قيّم القصيدة التي أمامك لا سمعة قائلها. في المقابل، لا تُهين الشعر المعترف بقيمته الكنسية بدرجات أدنى من 58 دون مبرر نقدي حقيقي."""

# JSON output format instruction -- appended to any prompt for batch scoring.
# Kept separate so the evaluation rubric prompts above stay clean.
SCORING_JSON_FORMAT = """
أجب بصيغة JSON فقط لكل قصيدة. لا تضف أي شرح أو تعليق.
الصيغة المطلوبة لكل قصيدة:
{"id": "...", "sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}

إذا كانت هناك عدة قصائد، أجب بمصفوفة JSON."""

# Legacy prompts (pre-DSPy baseline). Kept for reference and A/B testing.
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

# -- Prompt selection helper -----------------------------------------------
def get_scoring_prompt(model: str, mode: str = "optimized") -> str:
    """Return the appropriate scoring prompt for a model.

    Args:
        model: LiteLLM model string (e.g. "openai/bedrock-haiku-45")
        mode: "optimized" (DSPy-tuned) or "baseline" (pre-DSPy legacy)

    Returns:
        System prompt string with JSON format instructions appended.
    """
    if mode == "baseline":
        return COMPACT_SCORING_PROMPT

    # Optimized mode: select prompt by model capability
    if "sonnet" in model:
        return OPTIMIZED_SONNET_PROMPT + SCORING_JSON_FORMAT
    else:
        # Haiku's prompt is the safe default -- works well on all models
        return OPTIMIZED_HAIKU_PROMPT + SCORING_JSON_FORMAT


# ==========================================================================
# SCORING RUNBOOK -- How to score poems (new or existing)
# ==========================================================================
#
# --- Prerequisites ---
# pip install -r requirements.txt  (litellm, psycopg2-binary, pyarrow, pandas, pyarabic, tqdm)
# Set env vars: DATABASE_URL, ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN
#
# --- 1. Score existing DB poems (first time or re-score) ---
#
#   # Bulk pass with Haiku (cheap, ~$0.45/1K poems):
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.02_score_poems \
#     --model openai/bedrock-haiku-45 \
#     --scope all --batch-size 5 --concurrency 20 --max-cost 40 --resume
#
#   # Calibration pass with Sonnet on top candidates (~$6/1K poems):
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.02_score_poems \
#     --model openai/bedrock-sonnet-46 \
#     --scope top --top-k 5000 --batch-size 3 --concurrency 10 --max-cost 30 --resume
#
# --- 2. Add poems from a new external dataset ---
#
#   Step A: Write a preprocessor script (see 01_download_diwan.py as template):
#     - Download/parse the source data
#     - Normalize Arabic text (use arabic_utils.normalize_arabic)
#     - Deduplicate by text hash vs existing DB poems
#     - Filter: remove fragments <4 lines, >60 lines, >30% repeated lines
#     - Save to data/<dataset>_processed.parquet with columns:
#       (poem_id, title, content, poet_name, meter, theme, poem_form, source_dataset)
#
#   Step B: Import new poems to the DB:
#     python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems \
#       --source data/<dataset>_processed.parquet --dry-run
#     # Review, then run without --dry-run
#
#   Step C: Score only the new (unscored) poems:
#     python -m poetry_quality_and_curation.retriever_and_quality_curator.02_score_poems \
#       --model openai/bedrock-haiku-45 \
#       --scope unscored --batch-size 5 --concurrency 20 --resume
#
# --- 3. Recalibrate and re-select after adding new scores ---
#
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.03_recalibrate
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.04_select_final
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems
#
# --- 4. Cost estimates ---
#
#   Model          | Cost/1K poems | Speed (batch=5, conc=20) | Use case
#   Haiku          | ~$0.45        | ~200 poems/min           | Bulk scoring
#   Sonnet         | ~$6.00        | ~50 poems/min            | Calibration top-K
#   Opus           | ~$20.00       | ~15 poems/min            | Ground truth only
#
# --- 5. Re-running DSPy optimization (if prompts need updating) ---
#
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt \
#     --model haiku --optimizer mipro --num-trials 20
#   python -m poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt \
#     --model sonnet --optimizer mipro --num-trials 20
#   # Then update OPTIMIZED_HAIKU_PROMPT / OPTIMIZED_SONNET_PROMPT above
#   # with the new instructions from data/dspy_{model}_history.json
#
# ==========================================================================
