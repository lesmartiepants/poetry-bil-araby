"""
DSPy optimization of Haiku scoring prompt to match Opus gold labels.

Uses BootstrapFewShotWithRandomSearch to find few-shot examples that
make Haiku produce scores aligned with Opus.

Output:
  - data/dspy_haiku_optimized.json
  - data/dspy_haiku_optimization_log.json
"""

import os
import sys
import json
import time
import re
import traceback
import numpy as np
import pandas as pd
from scipy import stats

# Setup env
from dotenv import load_dotenv
load_dotenv('/Users/sfarage/Github/personal/poetry-curation/.env')

import dspy

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, '..'))
from arabic_utils import format_for_scoring

# ── Configure LM ──────────────────────────────────────────────────────
lm = dspy.LM(
    'openai/bedrock-haiku-45',
    api_base=os.environ.get('ANTHROPIC_BASE_URL'),
    api_key=os.environ.get('ANTHROPIC_AUTH_TOKEN') or os.environ.get('ANTHROPIC_API_KEY'),
    temperature=0.3,
    max_tokens=500,
)
dspy.configure(lm=lm)

# ── Load training data ────────────────────────────────────────────────
with open(os.path.join(BASE, 'dspy_train.json'), 'r', encoding='utf-8') as f:
    train_data = json.load(f)

print(f"Loaded {len(train_data)} training examples")

# ── DSPy Signature ────────────────────────────────────────────────────

SYSTEM_INSTRUCTIONS = """أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي والحديث.
مهمتك تقييم جودة القصائد بدقة على مقياس من 0 إلى 100.

أبعاد التقييم الخمسة (كل بُعد من 0 إلى 100):
1. sound: الإيقاع والموسيقى والوزن
2. imagery: التصوير والاستعارات والصور الشعرية
3. emotion: العاطفة والصدق الوجداني
4. language: الفصاحة والبلاغة وجودة التراكيب
5. cultural: القيمة الثقافية والأدبية والأصالة

نطاقات الدرجات:
- 0-30: ليس شعراً حقيقياً
- 30-50: باهت بلا صنعة شعرية
- 50-75: شعر كفء لكنه عادي — سقف الصنعة التقنية بلا تميز
- 75-85: جيد جداً — صنعة بارزة
- 85-95: ممتاز — يستحق الاختيار والتدريس
- 95-100: روائع خالدة

قيّم النص الشعري أمامك بموضوعية. الصنعة التقنية وحدها لا تتجاوز 75.

أجب بصيغة JSON فقط:
{"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}"""


class ArabicPoetryScorer(dspy.Signature):
    """Score an Arabic poem on 5 dimensions (sound, imagery, emotion, language, cultural) each 0-100.
    Return JSON: {"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}"""

    poem_text: str = dspy.InputField(desc="Arabic poem text with title and poet name")
    scores_json: str = dspy.OutputField(desc='JSON object with 5 scores: {"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}')


class PoetryScorePredictor(dspy.Module):
    def __init__(self):
        super().__init__()
        self.scorer = dspy.Predict(ArabicPoetryScorer)

    def forward(self, poem_text):
        return self.scorer(poem_text=poem_text)


def parse_scores(scores_json_str):
    """Parse scores JSON from model output, handling various formats."""
    if not scores_json_str:
        return None

    text = scores_json_str.strip()

    # Try to extract JSON from markdown code block
    json_match = re.search(r'```(?:json)?\s*(\{[^}]+\})\s*```', text, re.DOTALL)
    if json_match:
        text = json_match.group(1)

    # Try direct JSON parse
    json_match = re.search(r'\{[^}]+\}', text)
    if json_match:
        try:
            data = json.loads(json_match.group())
            required = ['sound', 'imagery', 'emotion', 'language', 'cultural']
            if all(k in data for k in required):
                scores = {k: int(data[k]) for k in required}
                # Validate ranges
                if all(0 <= v <= 100 for v in scores.values()):
                    return scores
        except (json.JSONDecodeError, ValueError, TypeError):
            pass

    return None


def compute_quality_score(scores):
    """Compute overall quality score from 5 sub-scores."""
    return round(np.mean([scores['sound'], scores['imagery'], scores['emotion'],
                          scores['language'], scores['cultural']]), 1)


# ── Build DSPy examples ──────────────────────────────────────────────
def build_dspy_examples(data):
    """Convert training data to DSPy examples."""
    examples = []
    for item in data:
        poem_text = format_for_scoring(
            item['poem_id'], item['title'], item['content'], item['poet_name']
        )
        scores = {
            'sound': int(item['sound']),
            'imagery': int(item['imagery']),
            'emotion': int(item['emotion']),
            'language': int(item['language']),
            'cultural': int(item['cultural']),
        }
        scores_json = json.dumps(scores)
        ex = dspy.Example(
            poem_text=poem_text,
            scores_json=scores_json,
        ).with_inputs('poem_text')
        examples.append(ex)
    return examples


# ── Metric function ──────────────────────────────────────────────────
def scoring_metric(example, pred, trace=None):
    """Metric: how close is predicted quality_score to Opus gold?
    Combines absolute error with correlation-friendliness."""
    gold_scores = parse_scores(example.scores_json)
    pred_scores = parse_scores(pred.scores_json)

    if gold_scores is None or pred_scores is None:
        return 0.0

    gold_avg = compute_quality_score(gold_scores)
    pred_avg = compute_quality_score(pred_scores)

    # Absolute error (normalized to 0-1 scale, inverted so lower error = higher metric)
    abs_error = abs(gold_avg - pred_avg)
    error_score = max(0, 1.0 - abs_error / 50.0)  # 50 points error = 0 score

    # Per-dimension error
    dim_errors = []
    for dim in ['sound', 'imagery', 'emotion', 'language', 'cultural']:
        dim_errors.append(abs(gold_scores[dim] - pred_scores[dim]))
    avg_dim_error = np.mean(dim_errors)
    dim_score = max(0, 1.0 - avg_dim_error / 50.0)

    # Combined metric (60% overall, 40% per-dimension)
    return 0.6 * error_score + 0.4 * dim_score


# ── Evaluation helper ────────────────────────────────────────────────
def evaluate_on_subset(program, examples, n=50):
    """Quick evaluation on a subset of examples."""
    np.random.seed(42)
    indices = np.random.choice(len(examples), min(n, len(examples)), replace=False)
    subset = [examples[i] for i in indices]

    gold_scores = []
    pred_scores = []
    errors = []
    successes = 0

    for ex in subset:
        try:
            result = program(poem_text=ex.poem_text)
            pred = parse_scores(result.scores_json)
            gold = parse_scores(ex.scores_json)
            if pred and gold:
                g_avg = compute_quality_score(gold)
                p_avg = compute_quality_score(pred)
                gold_scores.append(g_avg)
                pred_scores.append(p_avg)
                errors.append(abs(g_avg - p_avg))
                successes += 1
        except Exception as e:
            pass

    if successes < 5:
        return {'success_rate': successes / len(subset), 'n': len(subset)}

    correlation, _ = stats.pearsonr(gold_scores, pred_scores)
    mae = np.mean(errors)
    pred_std = np.std(pred_scores)
    gold_std = np.std(gold_scores)

    return {
        'n': len(subset),
        'successes': successes,
        'success_rate': successes / len(subset),
        'pearson_r': round(correlation, 4),
        'mae': round(mae, 2),
        'pred_std': round(pred_std, 2),
        'gold_std': round(gold_std, 2),
        'pred_mean': round(np.mean(pred_scores), 2),
        'gold_mean': round(np.mean(gold_scores), 2),
    }


# ── Main optimization ────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("DSPy Haiku Prompt Optimization")
    print("=" * 60)

    train_examples = build_dspy_examples(train_data)
    print(f"Built {len(train_examples)} DSPy training examples")

    # Select stratified subset for optimization (DSPy doesn't need all 473)
    # Use ~60 examples spanning the score range for efficient optimization
    scores = [item['opus_score'] for item in train_data]
    score_array = np.array(scores)

    # Select examples from different score ranges
    ranges = [
        (0, 50),    # Low quality
        (50, 65),   # Below average
        (65, 75),   # Average
        (75, 85),   # Good
        (85, 100),  # Excellent
    ]

    selected_indices = []
    for lo, hi in ranges:
        mask = (score_array >= lo) & (score_array < hi)
        indices = np.where(mask)[0]
        if len(indices) > 0:
            n_select = min(12, len(indices))
            np.random.seed(42)
            chosen = np.random.choice(indices, n_select, replace=False)
            selected_indices.extend(chosen)
            print(f"  Score range [{lo}, {hi}): selected {n_select} from {len(indices)} available")

    # Also add the very top
    mask = score_array >= 90
    top_indices = np.where(mask)[0]
    extra = [i for i in top_indices if i not in selected_indices][:8]
    selected_indices.extend(extra)
    print(f"  Score range [90, 100]: added {len(extra)} extra top poems")

    train_subset = [train_examples[i] for i in selected_indices]
    print(f"\nOptimization training set: {len(train_subset)} examples")

    # Baseline evaluation
    print("\n--- Baseline (no few-shot) ---")
    baseline_program = PoetryScorePredictor()
    baseline_stats = evaluate_on_subset(baseline_program, train_examples, n=30)
    print(f"Baseline: {baseline_stats}")

    # ── Run BootstrapFewShotWithRandomSearch ──────────────────────────
    print("\n--- Starting BootstrapFewShotWithRandomSearch ---")
    print(f"Max trials: 15, Few-shot examples: 8")

    optimization_log = {
        'baseline': baseline_stats,
        'optimizer': 'BootstrapFewShotWithRandomSearch',
        'config': {
            'max_bootstrapped_demos': 4,
            'max_labeled_demos': 8,
            'num_candidate_programs': 15,
            'num_threads': 1,
        },
        'trials': [],
        'start_time': time.time(),
    }

    try:
        optimizer = dspy.BootstrapFewShotWithRandomSearch(
            metric=scoring_metric,
            max_bootstrapped_demos=4,
            max_labeled_demos=8,
            num_candidate_programs=15,
            num_threads=1,
        )

        optimized_program = optimizer.compile(
            PoetryScorePredictor(),
            trainset=train_subset,
        )

        optimization_log['compile_time'] = time.time() - optimization_log['start_time']
        print(f"\nOptimization completed in {optimization_log['compile_time']:.1f}s")

    except Exception as e:
        print(f"Optimization error: {e}")
        traceback.print_exc()
        optimization_log['error'] = str(e)

        # Fall back to LabeledFewShot
        print("\n--- Falling back to LabeledFewShot ---")
        optimizer = dspy.LabeledFewShot(k=8)
        optimized_program = optimizer.compile(
            PoetryScorePredictor(),
            trainset=train_subset,
        )
        optimization_log['fallback'] = 'LabeledFewShot'

    # ── Evaluate optimized program ───────────────────────────────────
    print("\n--- Evaluating optimized program ---")
    optimized_stats = evaluate_on_subset(optimized_program, train_examples, n=50)
    print(f"Optimized: {optimized_stats}")
    optimization_log['optimized'] = optimized_stats

    # ── Extract the few-shot examples and prompt ─────────────────────
    print("\n--- Extracting optimized configuration ---")

    # Get the demos from the optimized program
    scorer_demos = []
    if hasattr(optimized_program, 'scorer') and hasattr(optimized_program.scorer, 'demos'):
        for demo in optimized_program.scorer.demos:
            demo_dict = {}
            if hasattr(demo, 'poem_text'):
                demo_dict['poem_text'] = demo.poem_text[:200] + '...' if len(demo.poem_text) > 200 else demo.poem_text
            if hasattr(demo, 'scores_json'):
                demo_dict['scores_json'] = demo.scores_json
            scorer_demos.append(demo_dict)
        print(f"Extracted {len(scorer_demos)} few-shot demos")

    # ── Save optimized program ───────────────────────────────────────
    # Save DSPy program state
    program_path = os.path.join(BASE, 'dspy_haiku_optimized.json')
    tmp_path = program_path + '.tmp'

    optimized_output = {
        'model': 'openai/bedrock-haiku-45',
        'optimizer': optimization_log.get('fallback', 'BootstrapFewShotWithRandomSearch'),
        'baseline_stats': baseline_stats,
        'optimized_stats': optimized_stats,
        'few_shot_demos': scorer_demos,
        'system_instructions': SYSTEM_INSTRUCTIONS,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
    }

    # Also save the full program state via DSPy's save method
    program_state_path = os.path.join(BASE, 'dspy_haiku_program_state.json')
    try:
        optimized_program.save(program_state_path)
        print(f"Saved DSPy program state: {program_state_path}")
        optimized_output['program_state_file'] = 'dspy_haiku_program_state.json'
    except Exception as e:
        print(f"Could not save program state: {e}")

    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(optimized_output, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, program_path)
    print(f"Saved: {program_path}")

    # Save optimization log
    log_path = os.path.join(BASE, 'dspy_haiku_optimization_log.json')
    tmp_log = log_path + '.tmp'
    optimization_log['end_time'] = time.time()
    optimization_log['total_time'] = optimization_log['end_time'] - optimization_log['start_time']
    with open(tmp_log, 'w', encoding='utf-8') as f:
        json.dump(optimization_log, f, ensure_ascii=False, indent=2, default=str)
    os.replace(tmp_log, log_path)
    print(f"Saved: {log_path}")

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("OPTIMIZATION SUMMARY")
    print("=" * 60)
    print(f"Baseline  - Pearson r: {baseline_stats.get('pearson_r', 'N/A')}, MAE: {baseline_stats.get('mae', 'N/A')}, pred_std: {baseline_stats.get('pred_std', 'N/A')}")
    print(f"Optimized - Pearson r: {optimized_stats.get('pearson_r', 'N/A')}, MAE: {optimized_stats.get('mae', 'N/A')}, pred_std: {optimized_stats.get('pred_std', 'N/A')}")

    improvement_r = optimized_stats.get('pearson_r', 0) - baseline_stats.get('pearson_r', 0)
    improvement_mae = baseline_stats.get('mae', 0) - optimized_stats.get('mae', 0)
    print(f"Improvement - Pearson r: {improvement_r:+.4f}, MAE: {improvement_mae:+.2f}")
    print(f"Total time: {optimization_log['total_time']:.1f}s")


if __name__ == '__main__':
    main()
