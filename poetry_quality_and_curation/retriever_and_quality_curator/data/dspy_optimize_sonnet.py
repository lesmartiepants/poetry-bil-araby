"""
DSPy optimization of Sonnet prompt for Arabic poetry scoring.
Aligns Sonnet scores with Opus gold labels using MIPROv2 optimizer.

Output:
  - data/dspy_sonnet_optimized.json  (optimized program)
  - data/dspy_sonnet_optimization_log.json  (trial results)

Budget: ~$2 max, 15 trials.
"""

import os
import sys
import json
import time
import re
import traceback
import numpy as np
from scipy import stats as scipy_stats

# Add parent dir for arabic_utils
BASE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(BASE)
sys.path.insert(0, PARENT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PARENT, '..', '.env'))

import dspy
from arabic_utils import format_for_scoring

# ── Constants ────────────────────────────────────────────────────────
SCORE_DIMS = ["sound", "imagery", "emotion", "language", "cultural"]
MAX_TRIALS = 15
CHECKPOINT_EVERY = 5
OUTPUT_PROGRAM = os.path.join(BASE, "dspy_sonnet_optimized.json")
OUTPUT_LOG = os.path.join(BASE, "dspy_sonnet_optimization_log.json")


# ── LM Setup ────────────────────────────────────────────────────────
def setup_lm():
    api_base = os.environ.get('ANTHROPIC_BASE_URL')
    api_key = os.environ.get('ANTHROPIC_AUTH_TOKEN') or os.environ.get('ANTHROPIC_API_KEY')

    if not api_base or not api_key:
        print("ERROR: ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN/ANTHROPIC_API_KEY must be set")
        sys.exit(1)

    lm = dspy.LM(
        'openai/bedrock-sonnet-46',
        api_base=api_base,
        api_key=api_key,
        temperature=0.3,
        max_tokens=500,
    )
    dspy.configure(lm=lm)
    print(f"LM configured: openai/bedrock-sonnet-46 via {api_base}")
    return lm


# ── Load Training Data ──────────────────────────────────────────────
def load_data():
    train_path = os.path.join(BASE, "dspy_train.json")
    test_path = os.path.join(BASE, "dspy_test.json")

    with open(train_path) as f:
        train_raw = json.load(f)
    with open(test_path) as f:
        test_raw = json.load(f)

    def to_examples(records):
        examples = []
        for r in records:
            poem_text = format_for_scoring(
                r["poem_id"], r["title"], r["content"], r.get("poet_name", "")
            )
            ex = dspy.Example(
                poem_text=poem_text,
                sound=int(round(r["sound"])),
                imagery=int(round(r["imagery"])),
                emotion=int(round(r["emotion"])),
                language=int(round(r["language"])),
                cultural=int(round(r["cultural"])),
            ).with_inputs("poem_text")
            examples.append(ex)
        return examples

    train = to_examples(train_raw)
    test = to_examples(test_raw)

    # Use a subset for optimization (speed), full set for final eval
    # Use ~100 examples for training the optimizer, rest for dev eval
    if len(train) > 120:
        np.random.seed(42)
        idx = np.random.permutation(len(train))
        opt_train = [train[i] for i in idx[:80]]
        opt_dev = [train[i] for i in idx[80:120]]
    else:
        opt_train = train[:60]
        opt_dev = train[60:]

    print(f"Loaded: {len(train)} train, {len(test)} test")
    print(f"Optimizer will use: {len(opt_train)} train, {len(opt_dev)} dev")
    return train, test, opt_train, opt_dev


# ── DSPy Signature ──────────────────────────────────────────────────
class PoemScoring(dspy.Signature):
    """أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي والحديث.
    قيّم القصيدة المعروضة عبر خمسة أبعاد، كل بُعد من 0 إلى 100.

    أبعاد التقييم:
    - sound: الإيقاع والموسيقى — انسجام الوزن، صحة القافية، الموسيقى الداخلية
    - imagery: التصوير — قوة الصور الشعرية، أصالة الاستعارات، حيوية المشاهد
    - emotion: العاطفة — صدق المشاعر، العمق النفسي، تأثير القصيدة على القارئ
    - language: اللغة — فصاحة الألفاظ، جودة التراكيب، البلاغة الطبيعية
    - cultural: القيمة الثقافية — الأهمية الأدبية، الأصالة، المكانة في التراث

    نطاقات الدرجات:
    - 95-100: روائع خالدة مثل المعلقات
    - 85-95: شعر ممتاز يُدرّس ويُحفظ
    - 75-85: شعر جيد جداً بصنعة بارزة
    - 50-75: شعر كفء لكنه عادي
    - 30-50: باهت بلا صنعة حقيقية
    - 0-30: ليس شعراً حقيقياً

    قيّم النص لا سمعة الشاعر. أجب بالأرقام فقط."""

    poem_text: str = dspy.InputField(desc="القصيدة العربية مع العنوان واسم الشاعر والأبيات")
    sound: int = dspy.OutputField(desc="درجة الإيقاع والموسيقى 0-100")
    imagery: int = dspy.OutputField(desc="درجة التصوير والاستعارات 0-100")
    emotion: int = dspy.OutputField(desc="درجة العمق العاطفي 0-100")
    language: int = dspy.OutputField(desc="درجة الجودة اللغوية 0-100")
    cultural: int = dspy.OutputField(desc="درجة القيمة الثقافية 0-100")


# ── Scorer Module ───────────────────────────────────────────────────
class PoemScorer(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predict_scores = dspy.Predict(PoemScoring)

    def forward(self, poem_text):
        result = self.predict_scores(poem_text=poem_text)
        # Parse and clamp scores
        parsed = {}
        for dim in SCORE_DIMS:
            val = getattr(result, dim, None)
            if val is None:
                parsed[dim] = 50  # fallback
            else:
                try:
                    # Handle string values
                    if isinstance(val, str):
                        # Extract first number from string
                        match = re.search(r'\d+', val)
                        val = int(match.group()) if match else 50
                    else:
                        val = int(val)
                    parsed[dim] = max(0, min(100, val))
                except (ValueError, TypeError):
                    parsed[dim] = 50
        return dspy.Prediction(**parsed)


# ── Metric Function ─────────────────────────────────────────────────
def scoring_metric(example, prediction, trace=None):
    """Combined metric: low MAE + high Pearson correlation vs Opus gold.

    Returns a score in [0, 100] where higher is better.
    Components:
    - MAE penalty: 100 - mean_absolute_error (lower MAE = higher score)
    - Pearson bonus: correlation * 10 (up to +10 points)
    """
    gold = []
    pred = []
    abs_errors = []

    for dim in SCORE_DIMS:
        g = getattr(example, dim, None)
        p = getattr(prediction, dim, None)
        if g is not None and p is not None:
            try:
                g_val = int(g)
                p_val = int(p)
                gold.append(g_val)
                pred.append(p_val)
                abs_errors.append(abs(g_val - p_val))
            except (ValueError, TypeError):
                abs_errors.append(20)  # penalty for parse failure

    if not abs_errors:
        return 0.0

    mae = np.mean(abs_errors)
    # MAE component: 100 - MAE (if MAE=0, score=100; if MAE=50, score=50)
    mae_score = max(0, 100 - mae)

    # Pearson correlation bonus (only if we have enough data points)
    corr_bonus = 0
    if len(gold) >= 3:
        try:
            r, _ = scipy_stats.pearsonr(gold, pred)
            if not np.isnan(r):
                corr_bonus = max(0, r * 10)  # up to +10 points
        except Exception:
            pass

    return mae_score + corr_bonus


# ── Evaluation ──────────────────────────────────────────────────────
def evaluate_program(program, examples, label=""):
    """Evaluate a program on examples, return detailed stats."""
    all_errors = {dim: [] for dim in SCORE_DIMS}
    all_gold = {dim: [] for dim in SCORE_DIMS}
    all_pred = {dim: [] for dim in SCORE_DIMS}
    failures = 0

    for ex in examples:
        try:
            pred = program(poem_text=ex.poem_text)
            for dim in SCORE_DIMS:
                g = int(getattr(ex, dim))
                p = int(getattr(pred, dim, 50))
                all_errors[dim].append(abs(g - p))
                all_gold[dim].append(g)
                all_pred[dim].append(p)
        except Exception as e:
            failures += 1
            for dim in SCORE_DIMS:
                all_errors[dim].append(20)
                all_gold[dim].append(int(getattr(ex, dim, 50)))
                all_pred[dim].append(50)

    # Compute MAE per dimension
    mae = {f"mae_{dim}": np.mean(all_errors[dim]) for dim in SCORE_DIMS}
    mae["mae_overall"] = np.mean([mae[f"mae_{dim}"] for dim in SCORE_DIMS])

    # Compute Pearson correlations
    pearson = {}
    for dim in SCORE_DIMS:
        try:
            r, p = scipy_stats.pearsonr(all_gold[dim], all_pred[dim])
            pearson[f"r_{dim}"] = round(r, 4) if not np.isnan(r) else 0.0
        except Exception:
            pearson[f"r_{dim}"] = 0.0
    pearson["r_mean"] = round(np.mean([pearson[f"r_{dim}"] for dim in SCORE_DIMS]), 4)

    results = {**mae, **pearson, "failures": failures, "n": len(examples)}

    if label:
        print(f"\n{'='*60}")
        print(f"  {label}")
        print(f"{'='*60}")
        print(f"  MAE overall: {mae['mae_overall']:.2f}")
        for dim in SCORE_DIMS:
            print(f"  MAE {dim:10s}: {mae[f'mae_{dim}']:.2f}  |  r={pearson[f'r_{dim}']:.3f}")
        print(f"  Pearson mean: {pearson['r_mean']:.3f}")
        if failures:
            print(f"  Failures: {failures}/{len(examples)}")

    return results


# ── Main ─────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  DSPy Sonnet Prompt Optimization")
    print("=" * 60)

    lm = setup_lm()
    train, test, opt_train, opt_dev = load_data()

    # ── Baseline evaluation ──
    print("\n--- Baseline (no optimization) ---")
    baseline = PoemScorer()
    baseline_eval = evaluate_program(baseline, opt_dev[:20], label="Baseline (dev sample)")

    # ── Log ──
    log = {
        "model": "sonnet",
        "model_id": "openai/bedrock-sonnet-46",
        "optimizer": "MIPROv2",
        "max_trials": MAX_TRIALS,
        "train_size": len(opt_train),
        "dev_size": len(opt_dev),
        "test_size": len(test),
        "baseline": baseline_eval,
        "trials": [],
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    # ── DSPy Optimization ──
    print(f"\n--- Starting MIPROv2 optimization ({MAX_TRIALS} trials) ---")

    optimizer = dspy.MIPROv2(
        metric=scoring_metric,
        auto="medium",
        num_threads=2,
    )

    try:
        optimized = optimizer.compile(
            PoemScorer(),
            trainset=opt_train,
            max_bootstrapped_demos=4,
            max_labeled_demos=4,
        )
        print("\nOptimization complete!")
    except Exception as e:
        print(f"\nOptimization error: {e}")
        traceback.print_exc()
        # Save what we have
        log["error"] = str(e)
        with open(OUTPUT_LOG, "w") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)
        # Fall back to baseline
        optimized = baseline
        print("Falling back to baseline program.")

    # ── Evaluate optimized on dev ──
    opt_eval = evaluate_program(optimized, opt_dev, label="Optimized (full dev)")

    # ── Evaluate on test set ──
    test_eval = evaluate_program(optimized, test[:50], label="Optimized (test sample)")

    log["optimized_dev"] = opt_eval
    log["optimized_test_sample"] = test_eval
    log["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")

    # ── Improvement summary ──
    improvement = baseline_eval["mae_overall"] - opt_eval["mae_overall"]
    print(f"\n{'='*60}")
    print(f"  IMPROVEMENT: MAE {baseline_eval['mae_overall']:.2f} -> {opt_eval['mae_overall']:.2f} (delta: {improvement:+.2f})")
    print(f"{'='*60}")

    # ── Save optimized program ──
    optimized.save(OUTPUT_PROGRAM)
    print(f"\nSaved optimized program: {OUTPUT_PROGRAM}")

    # ── Save log ──
    with open(OUTPUT_LOG, "w") as f:
        json.dump(log, f, indent=2, ensure_ascii=False, default=str)
    print(f"Saved optimization log: {OUTPUT_LOG}")

    # Print final prompt for reference
    print("\n--- Optimized Prompt ---")
    try:
        sig = optimized.predict_scores.signature
        print(f"Instructions: {sig.instructions[:200]}...")
        print(f"Demos: {len(optimized.predict_scores.demos)}")
    except Exception:
        print("(could not extract prompt details)")

    return optimized, log


if __name__ == "__main__":
    main()
