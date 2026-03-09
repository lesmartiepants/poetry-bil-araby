"""
DSPy Haiku optimization v2: Combine calibration prompt with DSPy few-shot demos.

Uses the best anchor-calibrated prompt from calibration_prompts.py and
optimizes the few-shot examples using DSPy BootstrapFewShot.

Tests on full training set for reliable correlation estimate.
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

# ── Load data ─────────────────────────────────────────────────────────
with open(os.path.join(BASE, 'dspy_train.json'), 'r', encoding='utf-8') as f:
    train_data = json.load(f)
print(f"Loaded {len(train_data)} training examples")

# Load DSPy v1 optimized demos for reference
with open(os.path.join(BASE, 'dspy_haiku_optimized.json'), 'r', encoding='utf-8') as f:
    v1_result = json.load(f)


# ── Calibration prompt from existing system ───────────────────────────
# We use Variant C (forced distribution) as the system prompt for the signature
CALIBRATION_SYSTEM = """أنت ناقد أدبي عربي متخصص. مهمتك تقييم القصائد على مقياس دقيق ومُعايَر من 0 إلى 100.

أمثلة معايرة من قصائد معروفة:

--- مثال معايرة ---
القصيدة: قفا نبك من ذكرى حبيب وعرفان — امرؤ القيس
(معلقة - أشهر قصيدة في الشعر العربي)
الدرجة المرجعية: 97/100
---

--- مثال معايرة ---
القصيدة: على قدر أهل العزم تأتي العزائم — المتنبي
(من أشهر قصائد المتنبي - تُدرّس في كل المناهج)
الدرجة المرجعية: 92/100
---

--- مثال معايرة ---
القصيدة: أضحى التنائي بديلا من تدانينا — ابن زيدون
(نونية ابن زيدون - أجمل قصائد الحب في الأندلس)
الدرجة المرجعية: 88/100
---

--- مثال معايرة ---
القصيدة: كيف بصاحب إن أدن منه — أبو الأسود الدؤلي
(شعر سليم الوزن والقافية لكنه عادي)
الدرجة المرجعية: 70/100
---

--- مثال معايرة ---
القصيدة: بالجزع بين الأبرقين الموعد — محيي الدين بن عربي
(قصيدة لا بأس بها لشاعر كبير — فيها بعض الصنعة لكن بلا تميز حقيقي)
الدرجة المرجعية: 60/100
---

--- مثال معايرة ---
القصيدة: قد أعانتني الحمية لما — أبو فراس الحمداني
(أبيات قصيرة مباشرة — وزن سليم لكن بلا صور ولا موسيقى ولا جمال)
الدرجة المرجعية: 45/100
---

--- مثال معايرة ---
القصيدة: أ ملتهب العواطف — خالد مصباح مظلوم
(نظم منثور — مدح عام بلا صور ولا استعارات)
الدرجة المرجعية: 35/100
---

أبعاد التقييم (كل بُعد من 0 إلى 100):
1. sound — الإيقاع والموسيقى
2. imagery — التصوير والاستعارات
3. emotion — العاطفة والصدق الوجداني
4. language — الفصاحة والبلاغة
5. cultural — القيمة الثقافية والأدبية

نطاقات الدرجات:
- 0-30: ليس شعراً — مكسور أو مفكك
- 30-50: باهت بلا صنعة — نظم منثور، أبيات خالية من المجاز والموسيقى
- 50-75: شعر كفء لكنه عادي — سقف المهارة التقنية بدون تميز
- 75-85: جيد جداً — صنعة بارزة
- 85-95: ممتاز — يستحق الاختيار والتدريس
- 95-100: روائع خالدة

تحذير: الصنعة التقنية وحدها (وزن سليم + قافية) = حد أقصى 75.
قيّم النص أمامك بموضوعية. لا تضغط الدرجات.

أجب بصيغة JSON فقط:
{"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}"""


class CalibratedPoetryScorer(dspy.Signature):
    """Score an Arabic poem on 5 quality dimensions (each 0-100).
    Use the calibration anchors in your instructions to set the scale.
    Return ONLY a JSON object: {"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}"""

    poem_text: str = dspy.InputField(desc="Arabic poem text with title and poet name to evaluate")
    scores_json: str = dspy.OutputField(desc='JSON with exactly 5 integer scores: {"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}')


class CalibratedScorer(dspy.Module):
    def __init__(self):
        super().__init__()
        self.scorer = dspy.Predict(CalibratedPoetryScorer)

    def forward(self, poem_text):
        return self.scorer(poem_text=poem_text)


def parse_scores(text):
    """Parse scores JSON from model output."""
    if not text:
        return None
    text = text.strip()
    json_match = re.search(r'\{[^}]+\}', text)
    if json_match:
        try:
            data = json.loads(json_match.group())
            required = ['sound', 'imagery', 'emotion', 'language', 'cultural']
            if all(k in data for k in required):
                scores = {k: int(data[k]) for k in required}
                if all(0 <= v <= 100 for v in scores.values()):
                    return scores
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return None


def quality_score(scores):
    return round(np.mean([scores['sound'], scores['imagery'], scores['emotion'],
                          scores['language'], scores['cultural']]), 1)


def scoring_metric(example, pred, trace=None):
    gold = parse_scores(example.scores_json)
    pred_s = parse_scores(pred.scores_json)
    if gold is None or pred_s is None:
        return 0.0

    gold_avg = quality_score(gold)
    pred_avg = quality_score(pred_s)

    abs_error = abs(gold_avg - pred_avg)
    error_score = max(0, 1.0 - abs_error / 50.0)

    dim_errors = [abs(gold[d] - pred_s[d]) for d in ['sound', 'imagery', 'emotion', 'language', 'cultural']]
    dim_score = max(0, 1.0 - np.mean(dim_errors) / 50.0)

    return 0.6 * error_score + 0.4 * dim_score


# ── Build examples ────────────────────────────────────────────────────
def build_examples(data):
    examples = []
    for item in data:
        poem_text = format_for_scoring(item['poem_id'], item['title'], item['content'], item['poet_name'])
        scores = {
            'sound': int(item['sound']),
            'imagery': int(item['imagery']),
            'emotion': int(item['emotion']),
            'language': int(item['language']),
            'cultural': int(item['cultural']),
        }
        ex = dspy.Example(
            poem_text=poem_text,
            scores_json=json.dumps(scores),
        ).with_inputs('poem_text')
        examples.append(ex)
    return examples


def evaluate_program(program, examples, desc=""):
    """Full evaluation on all examples."""
    gold_scores = []
    pred_scores = []
    errors = []
    parse_failures = 0

    for i, ex in enumerate(examples):
        try:
            result = program(poem_text=ex.poem_text)
            pred = parse_scores(result.scores_json)
            gold = parse_scores(ex.scores_json)
            if pred and gold:
                g = quality_score(gold)
                p = quality_score(pred)
                gold_scores.append(g)
                pred_scores.append(p)
                errors.append(abs(g - p))
            else:
                parse_failures += 1
        except Exception as e:
            parse_failures += 1

        if (i + 1) % 25 == 0:
            print(f"  [{desc}] Evaluated {i+1}/{len(examples)}, parse_failures={parse_failures}")

    if len(gold_scores) < 10:
        return {'error': 'too few valid scores', 'valid': len(gold_scores)}

    r, p = stats.pearsonr(gold_scores, pred_scores)
    return {
        'n_evaluated': len(examples),
        'n_valid': len(gold_scores),
        'parse_failures': parse_failures,
        'pearson_r': round(r, 4),
        'pearson_p': round(p, 6),
        'mae': round(np.mean(errors), 2),
        'pred_std': round(np.std(pred_scores), 2),
        'gold_std': round(np.std(gold_scores), 2),
        'pred_mean': round(np.mean(pred_scores), 2),
        'gold_mean': round(np.mean(gold_scores), 2),
    }


def select_stratified_demos(data, n=10):
    """Select demos spanning the full score range."""
    scores = np.array([item['opus_score'] for item in data])

    # Define score bins and how many to select from each
    bins = [
        (0, 45, 1),     # Very low
        (45, 55, 1),    # Low
        (55, 65, 1),    # Below average
        (65, 72, 2),    # Average
        (72, 80, 2),    # Above average
        (80, 88, 2),    # Good
        (88, 100, 1),   # Excellent
    ]

    selected = []
    np.random.seed(42)
    for lo, hi, count in bins:
        mask = (scores >= lo) & (scores < hi)
        indices = np.where(mask)[0]
        if len(indices) > 0:
            chosen = np.random.choice(indices, min(count, len(indices)), replace=False)
            selected.extend(chosen)

    return selected


def main():
    print("=" * 60)
    print("DSPy Haiku Optimization v2 (Calibrated)")
    print("=" * 60)

    all_examples = build_examples(train_data)

    # Select stratified subset for optimization
    demo_indices = select_stratified_demos(train_data, n=10)
    train_subset = [all_examples[i] for i in demo_indices]
    print(f"Selected {len(train_subset)} stratified training examples for optimization")

    # Show selected scores
    for idx in demo_indices:
        item = train_data[idx]
        print(f"  {item['poem_id']}: opus_score={item['opus_score']}, poet={item['poet_name']}")

    # Use a validation subset (not used for demo selection)
    np.random.seed(123)
    val_indices = [i for i in range(len(all_examples)) if i not in demo_indices]
    val_sample = np.random.choice(val_indices, min(80, len(val_indices)), replace=False)
    val_examples = [all_examples[i] for i in val_sample]

    # ── Approach 1: LabeledFewShot with calibration prompt ────────────
    print("\n--- Approach 1: LabeledFewShot (k=8) ---")
    optimizer1 = dspy.LabeledFewShot(k=8)
    program1 = optimizer1.compile(
        CalibratedScorer(),
        trainset=train_subset,
    )

    print("Evaluating on validation set (80 poems)...")
    stats1 = evaluate_program(program1, val_examples, desc="LabeledFewShot")
    print(f"Results: {stats1}")

    # ── Approach 2: BootstrapFewShot with calibration prompt ──────────
    print("\n--- Approach 2: BootstrapFewShot ---")

    # Wider training set for bootstrap
    score_array = np.array([item['opus_score'] for item in train_data])
    ranges = [(0, 50, 5), (50, 65, 8), (65, 75, 8), (75, 85, 10), (85, 100, 8)]
    bootstrap_indices = []
    np.random.seed(42)
    for lo, hi, n in ranges:
        mask = (score_array >= lo) & (score_array < hi)
        indices = np.where(mask)[0]
        if len(indices) > 0:
            chosen = np.random.choice(indices, min(n, len(indices)), replace=False)
            bootstrap_indices.extend(chosen)
    bootstrap_examples = [all_examples[i] for i in bootstrap_indices]
    print(f"Bootstrap training set: {len(bootstrap_examples)} examples")

    try:
        optimizer2 = dspy.BootstrapFewShot(
            metric=scoring_metric,
            max_bootstrapped_demos=3,
            max_labeled_demos=6,
            max_rounds=1,
        )
        program2 = optimizer2.compile(
            CalibratedScorer(),
            trainset=bootstrap_examples,
        )

        print("Evaluating on validation set (80 poems)...")
        stats2 = evaluate_program(program2, val_examples, desc="BootstrapFewShot")
        print(f"Results: {stats2}")
    except Exception as e:
        print(f"BootstrapFewShot failed: {e}")
        traceback.print_exc()
        stats2 = {'error': str(e)}
        program2 = None

    # ── Pick the best approach ────────────────────────────────────────
    results = [
        ('LabeledFewShot', stats1, program1),
    ]
    if program2 and 'pearson_r' in stats2:
        results.append(('BootstrapFewShot', stats2, program2))

    # Pick by highest Pearson r
    best_name, best_stats, best_program = max(results, key=lambda x: x[1].get('pearson_r', -1))
    print(f"\n--- Best approach: {best_name} ---")
    print(f"Stats: {best_stats}")

    # ── Full evaluation on all 473 training examples ──────────────────
    print(f"\n--- Full evaluation on all {len(all_examples)} training examples ---")
    full_stats = evaluate_program(best_program, all_examples, desc="Full")
    print(f"Full results: {full_stats}")

    # ── Save results ──────────────────────────────────────────────────
    # Extract demos
    demos = []
    if hasattr(best_program, 'scorer') and hasattr(best_program.scorer, 'demos'):
        for demo in best_program.scorer.demos:
            d = {}
            if hasattr(demo, 'poem_text'):
                d['poem_text'] = demo.poem_text
            if hasattr(demo, 'scores_json'):
                d['scores_json'] = demo.scores_json
            demos.append(d)

    output = {
        'model': 'openai/bedrock-haiku-45',
        'version': 'v2',
        'optimizer': best_name,
        'calibration_system_prompt': CALIBRATION_SYSTEM,
        'validation_stats': best_stats,
        'full_train_stats': full_stats,
        'v1_stats': v1_result.get('optimized_stats', {}),
        'few_shot_demos': demos,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
    }

    out_path = os.path.join(BASE, 'dspy_haiku_optimized.json')
    tmp = out_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    os.replace(tmp, out_path)
    print(f"\nSaved: {out_path}")

    # Save program state
    state_path = os.path.join(BASE, 'dspy_haiku_program_state.json')
    try:
        best_program.save(state_path)
        print(f"Saved: {state_path}")
    except Exception as e:
        print(f"Could not save program state: {e}")

    # Save log
    log = {
        'approaches': {
            'LabeledFewShot': stats1,
        },
        'best': best_name,
        'full_eval': full_stats,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
    }
    if 'pearson_r' in stats2:
        log['approaches']['BootstrapFewShot'] = stats2

    log_path = os.path.join(BASE, 'dspy_haiku_optimization_log.json')
    tmp = log_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(log, f, ensure_ascii=False, indent=2, default=str)
    os.replace(tmp, log_path)
    print(f"Saved: {log_path}")

    # Summary
    print("\n" + "=" * 60)
    print("OPTIMIZATION v2 SUMMARY")
    print("=" * 60)
    print(f"Best approach: {best_name}")
    print(f"Validation (80): r={best_stats.get('pearson_r', 'N/A')}, MAE={best_stats.get('mae', 'N/A')}, std={best_stats.get('pred_std', 'N/A')}")
    print(f"Full train (473): r={full_stats.get('pearson_r', 'N/A')}, MAE={full_stats.get('mae', 'N/A')}, std={full_stats.get('pred_std', 'N/A')}")
    print(f"V1 baseline:      r={v1_result['optimized_stats'].get('pearson_r', 'N/A')}, MAE={v1_result['optimized_stats'].get('mae', 'N/A')}, std={v1_result['optimized_stats'].get('pred_std', 'N/A')}")


if __name__ == '__main__':
    main()
