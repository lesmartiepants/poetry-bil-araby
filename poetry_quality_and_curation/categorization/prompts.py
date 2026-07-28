"""Prompt library: versioned classification prompts.

Source of truth for WHICH prompt produced which labels. Each version records a
human name + a "what changed" note + the prompt text. To add a variant: add an
entry here, re-run the classifier/eval with --prompt-version <id>, and compare.

The dimension vocabulary block is shared (built from config); a version only
overrides the scalar-field instructions (intensity / accessibility) and the
output JSON schema. Keeping the diff small is what makes versions comparable.
"""
from poetry_quality_and_curation.categorization import config

# --- Accessibility scoring (v4): the model emits 5 sub-factors (1-5 each);
#     we DERIVE a 0-10 score. Weights: allusion + lexical dominate (the real
#     learner barriers); narrativity is a light nudge (storytelling = harder). ---
ACCESS_FACTORS = ["lexical", "syntax", "imagery_abstraction", "allusion", "narrativity"]
ACCESS_WEIGHTS = {"allusion": 4, "lexical": 3, "syntax": 2, "imagery_abstraction": 2, "narrativity": 1}


def derive_accessibility_score(factors):
    """Weighted mean of the five 1-5 sub-factors, scaled to a 0-10 score (1 dp).
    Returns None if the factors are missing/invalid."""
    try:
        tot = sum(ACCESS_WEIGHTS.values())
        mean5 = sum(int(factors[k]) * w for k, w in ACCESS_WEIGHTS.items()) / tot
        return round((mean5 - 1) / 4 * 10, 1)
    except Exception:
        return None


_BASELINE = config.CLASSIFICATION_PROMPT

# Baseline lines the v4 transform replaces (must match config output verbatim).
_BASE_INT = "- emotional_intensity: عدد من 0 إلى 100 يقيس شدة الشحنة العاطفية."
_BASE_ACC = "- accessibility_level: عدد من 1 إلى 5 (1 = سهلة على متعلّم العربية، 5 = تتطلب معرفة كلاسيكية عميقة)."

# v4 intensity: anti-clustering calibration (use the full range).
_V4_INT = ("- emotional_intensity: شدة الشحنة العاطفية من 0 إلى 100. استعمل المدى كاملاً ولا تكدّس القيم: أغلب القصائد بين 30 و70، "
           "ما دون 30 للوصف الهادئ والحكمة والتعليم، وما فوق 80 للعاطفة الطاغية (فجيعة عارمة، هيام، سخط شديد).")

# v4 accessibility: five scored sub-factors instead of one holistic level.
_V4_ACC = ("- accessibility_factors: قدّر خمسة عوامل لسهولة القراءة على متعلّم العربية، كل عامل من 1 (أيسر) إلى 5 (أصعب): "
           "lexical (شيوع الألفاظ: 1 حديثة مألوفة ← 5 غريبة أرشيفية)، "
           "syntax (وضوح التركيب: 1 مباشر ← 5 تقديم وتأخير وحذف وتعقيد)، "
           "imagery_abstraction (تجريد الصورة: 1 حسّية مباشرة ← 5 استعارة ممتدة تحتاج فكّاً)، "
           "allusion (الحمل المرجعي: 1 مستقل ← 5 تناص وإشارات تراثية كثيفة)، "
           "narrativity (السرد: 1 صورة آنيّة ← 5 حكاية مُطوَّلة تحتاج متابعة؛ فالسرد أصعب من الصورة). "
           "نوّع تقديراتك واستعمل المدى كاملاً.")


def _build_v4():
    out = (_BASELINE
           .replace(_BASE_INT, _V4_INT)
           .replace(_BASE_ACC, _V4_ACC)
           .replace('"accessibility_level": N',
                    '"accessibility_factors": {"lexical": N, "syntax": N, "imagery_abstraction": N, "allusion": N, "narrativity": N}'))
    assert "accessibility_factors" in out and _V4_INT in out, "v4 prompt build failed (baseline lines changed?)"
    return out


PROMPT_LIBRARY = {
    "v2-baseline": {
        "name": "v2 · baseline",
        "changed": "Original taxonomy prompt. Intensity 0-100 (no calibration, tends to cluster high). "
                   "Accessibility a single holistic 1-5 score.",
        "access": "level_1_5",
        "text": _BASELINE,
    },
    "v4-rubric": {
        "name": "v4 · calibrated intensity + accessibility rubric",
        "changed": "Intensity 0-100 with anti-clustering calibration (use the full range; most poems 30-70, "
                   "reserve 80+ for overwhelming emotion). Accessibility decomposed into 5 scored sub-factors "
                   "(lexical, syntax, imagery_abstraction, allusion, narrativity) -> derived 0-10 score, weights "
                   "allusion=4, lexical=3, syntax=2, imagery=2, narrativity=1. Storytelling counts as harder than imagery.",
        "access": "factors_0_10",
        "text": _build_v4(),
    },
}

DEFAULT_VERSION = "v2-baseline"


def get(version):
    if version not in PROMPT_LIBRARY:
        raise KeyError(f"unknown prompt version {version!r}; have {list(PROMPT_LIBRARY)}")
    return PROMPT_LIBRARY[version]


def get_text(version):
    return get(version)["text"]


def versions():
    return list(PROMPT_LIBRARY)
