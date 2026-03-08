"""SIMBA optimization for Arabic poetry scoring calibration.

Uses DSPy's SIMBA optimizer (Stochastic Introspective Mini-Batch Ascent) to
calibrate Haiku or Sonnet to match Opus gold-standard scores. SIMBA generates
self-reflective rules by comparing better vs worse trajectories on the same poems.

Usage:
    python data/dspy_simba_optimize.py --model haiku
    python data/dspy_simba_optimize.py --model sonnet
"""
import argparse
import os
import sys
import json
import time
import re
import traceback
import shutil
import numpy as np
import pandas as pd
from scipy import stats

from dotenv import load_dotenv
load_dotenv('/Users/sfarage/Github/personal/poetry-curation/.env')

import dspy

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(BASE, '..'))
from arabic_utils import format_for_scoring

DIMS = ['sound', 'imagery', 'emotion', 'language', 'cultural']


# ── DSPy Signature ────────────────────────────────────────────────────

class ArabicPoetryScorer(dspy.Signature):
    """Score an Arabic poem on 5 quality dimensions (sound, imagery, emotion, language, cultural).
    Each dimension is scored 0-100. Return JSON with all 5 scores."""

    poem_text: str = dspy.InputField(desc="Arabic poem text with title and poet name")
    scores_json: str = dspy.OutputField(
        desc='JSON: {"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}'
    )


class PoetryScorePredictor(dspy.Module):
    def __init__(self):
        super().__init__()
        self.scorer = dspy.Predict(ArabicPoetryScorer)

    def forward(self, poem_text):
        return self.scorer(poem_text=poem_text)


# ── Helpers ───────────────────────────────────────────────────────────

def parse_scores(scores_json_str):
    """Parse scores JSON from model output."""
    if not scores_json_str:
        return None
    text = scores_json_str.strip()
    json_match = re.search(r'```(?:json)?\s*(\{[^}]+\})\s*```', text, re.DOTALL)
    if json_match:
        text = json_match.group(1)
    json_match = re.search(r'\{[^}]+\}', text)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if all(k in data for k in DIMS):
                scores = {k: int(data[k]) for k in DIMS}
                if all(0 <= v <= 100 for v in scores.values()):
                    return scores
        except (json.JSONDecodeError, ValueError, TypeError):
            pass
    return None


def build_dspy_examples(data):
    """Convert training data to DSPy examples."""
    examples = []
    for item in data:
        poem_text = format_for_scoring(
            item['poem_id'], item['title'], item['content'], item['poet_name']
        )
        scores = {k: int(item[k]) for k in DIMS}
        ex = dspy.Example(
            poem_text=poem_text,
            scores_json=json.dumps(scores),
        ).with_inputs('poem_text')
        examples.append(ex)
    return examples


def scoring_metric(example, pred, trace=None):
    """Metric: inverse MAE, normalized to 0-1. Higher = better."""
    gold = parse_scores(example.scores_json)
    predicted = parse_scores(pred.scores_json)
    if gold is None or predicted is None:
        return 0.0

    errors = [abs(gold[d] - predicted[d]) for d in DIMS]
    mae = np.mean(errors)

    # Normalize: MAE=0 -> 1.0, MAE=50 -> 0.0
    score = max(0, 1.0 - mae / 50.0)

    # Penalty for large outlier errors
    max_error = max(errors)
    if max_error > 20:
        score *= 0.8

    return score


def evaluate_detailed(program, examples, label=""):
    """Detailed evaluation with per-dimension MAE and correlation."""
    gold_all = {d: [] for d in DIMS}
    pred_all = {d: [] for d in DIMS}
    gold_overall = []
    pred_overall = []
    failures = 0

    for ex in examples:
        try:
            result = program(poem_text=ex.poem_text)
            predicted = parse_scores(result.scores_json)
            gold = parse_scores(ex.scores_json)
            if predicted and gold:
                for d in DIMS:
                    gold_all[d].append(gold[d])
                    pred_all[d].append(predicted[d])
                gold_overall.append(np.mean([gold[d] for d in DIMS]))
                pred_overall.append(np.mean([predicted[d] for d in DIMS]))
            else:
                failures += 1
        except Exception:
            failures += 1

    n = len(gold_overall)
    if n < 5:
        return {"n": n, "failures": failures, "error": "too few successful predictions"}

    result = {"n": n, "failures": failures}
    for d in DIMS:
        result[f"mae_{d}"] = round(np.mean(np.abs(np.array(gold_all[d]) - np.array(pred_all[d]))), 2)
        r, _ = stats.pearsonr(gold_all[d], pred_all[d])
        result[f"r_{d}"] = round(r, 4)

    result["mae_overall"] = round(np.mean(np.abs(np.array(gold_overall) - np.array(pred_overall))), 2)
    r, _ = stats.pearsonr(gold_overall, pred_overall)
    result["r_overall"] = round(r, 4)

    if label:
        print(f"\n  {label}:")
        print(f"    n={n}, failures={failures}")
        for d in DIMS:
            print(f"    {d:10s}: MAE={result[f'mae_{d}']:5.2f}, r={result[f'r_{d}']:.4f}")
        print(f"    {'overall':10s}: MAE={result['mae_overall']:5.2f}, r={result['r_overall']:.4f}")

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["haiku", "sonnet"], required=True)
    parser.add_argument("--max-steps", type=int, default=10)
    parser.add_argument("--bsize", type=int, default=16)
    parser.add_argument("--num-candidates", type=int, default=6)
    parser.add_argument("--max-demos", type=int, default=4)
    parser.add_argument("--prompt-model", type=str, default=None,
                        help="Model for SIMBA rule generation (default: sonnet for haiku, same for sonnet)")
    args = parser.parse_args()

    model_map = {
        "haiku": "openai/bedrock-haiku-45",
        "sonnet": "openai/bedrock-sonnet-46",
    }
    model_id = model_map[args.model]

    # SIMBA needs a capable prompt_model for self-reflective rule generation.
    # For haiku optimization, use sonnet as the prompt model.
    # For sonnet optimization, use the same sonnet model.
    prompt_model_id = args.prompt_model or model_map["sonnet"]

    print("=" * 60)
    print(f"SIMBA OPTIMIZATION: {args.model.upper()}")
    print(f"Student model: {model_id}")
    print(f"Prompt model:  {prompt_model_id}")
    print(f"Steps: {args.max_steps}, Batch: {args.bsize}, Candidates: {args.num_candidates}")
    print("=" * 60)

    # Enable SIMBA logging for progress visibility
    import logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s: %(message)s')
    logging.getLogger('dspy.teleprompt.simba').setLevel(logging.INFO)

    api_base = os.environ.get('ANTHROPIC_BASE_URL')
    api_key = os.environ.get('ANTHROPIC_AUTH_TOKEN') or os.environ.get('ANTHROPIC_API_KEY')

    # Configure student LM (the model being optimized)
    lm = dspy.LM(
        model_id,
        api_base=api_base,
        api_key=api_key,
        temperature=0.3,
        max_tokens=500,
    )
    dspy.configure(lm=lm)

    # Configure prompt LM (used by SIMBA for rule generation / OfferFeedback)
    prompt_lm = dspy.LM(
        prompt_model_id,
        api_base=api_base,
        api_key=api_key,
        temperature=0.7,
        max_tokens=2000,
    )

    # Load data
    with open(os.path.join(BASE, 'dspy_train.json'), 'r', encoding='utf-8') as f:
        train_data = json.load(f)
    with open(os.path.join(BASE, 'dspy_test.json'), 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    train_examples = build_dspy_examples(train_data)
    test_examples = build_dspy_examples(test_data)
    print(f"Train: {len(train_examples)}, Test: {len(test_examples)}")

    # Use a stratified subset for SIMBA (needs at least bsize examples)
    # Select ~80 examples spanning score range
    scores = np.array([item.get('opus_score', item.get('quality_score', 70)) for item in train_data])
    ranges = [(0, 55), (55, 70), (70, 80), (80, 90), (90, 100)]
    selected_idx = []
    for lo, hi in ranges:
        mask = (scores >= lo) & (scores < hi)
        indices = np.where(mask)[0]
        if len(indices) > 0:
            n_sel = min(16, len(indices))
            np.random.seed(42)
            chosen = np.random.choice(indices, n_sel, replace=False)
            selected_idx.extend(chosen)
            print(f"  [{lo}-{hi}): {n_sel}/{len(indices)}")

    train_subset = [train_examples[i] for i in selected_idx]
    print(f"SIMBA training set: {len(train_subset)} examples")

    # Baseline evaluation
    print("\n--- Baseline (no optimization) ---")
    baseline_program = PoetryScorePredictor()
    baseline_eval = evaluate_detailed(baseline_program, test_examples[:50], "Baseline (test)")

    # Output paths
    output_path = os.path.join(BASE, f'dspy_simba_{args.model}_optimized.json')
    log_path = os.path.join(BASE, f'dspy_simba_{args.model}_log.json')

    log = {
        "model": args.model,
        "model_id": model_id,
        "prompt_model_id": prompt_model_id,
        "optimizer": "SIMBA",
        "config": {
            "max_steps": args.max_steps,
            "bsize": args.bsize,
            "num_candidates": args.num_candidates,
            "max_demos": args.max_demos,
        },
        "train_size": len(train_subset),
        "test_size": len(test_examples),
        "baseline": baseline_eval,
        "started_at": time.strftime('%Y-%m-%dT%H:%M:%S'),
    }

    # Save log checkpoint
    def save_log():
        tmp = log_path + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(log, f, ensure_ascii=False, indent=2, default=str)
        shutil.move(tmp, log_path)

    save_log()

    # Run SIMBA
    print(f"\n--- Running SIMBA ({args.max_steps} steps) ---")
    start_time = time.time()

    try:
        print(f"  prompt_model: {prompt_model_id}")
        optimizer = dspy.SIMBA(
            metric=scoring_metric,
            bsize=args.bsize,
            num_candidates=args.num_candidates,
            max_steps=args.max_steps,
            max_demos=args.max_demos,
            prompt_model=prompt_lm,
            temperature_for_sampling=0.3,
            temperature_for_candidates=0.3,
        )

        optimized_program = optimizer.compile(
            PoetryScorePredictor(),
            trainset=train_subset,
            seed=42,
        )

        elapsed = time.time() - start_time
        log["compile_time_sec"] = round(elapsed, 1)
        log["prompt_model"] = prompt_model_id
        print(f"\nSIMBA completed in {elapsed:.1f}s")

        # Extract trial logs if available
        if hasattr(optimized_program, 'trial_logs'):
            log["trial_logs"] = {}
            for k, v in optimized_program.trial_logs.items():
                log["trial_logs"][str(k)] = {
                    sk: sv for sk, sv in v.items() if not callable(sv)
                }
        if hasattr(optimized_program, 'candidate_programs'):
            log["num_candidate_programs"] = len(optimized_program.candidate_programs)
            # Log candidate scores
            log["candidate_scores"] = [
                round(c["score"], 4) for c in optimized_program.candidate_programs
            ]

    except Exception as e:
        print(f"SIMBA error: {e}")
        traceback.print_exc()
        log["error"] = str(e)
        log["compile_time_sec"] = round(time.time() - start_time, 1)
        save_log()
        print("\nSIMBA failed. No fallback -- fix the error and retry.")
        return

    # Evaluate optimized on test set
    print("\n--- Evaluating optimized program ---")
    optimized_eval = evaluate_detailed(optimized_program, test_examples[:50], "Optimized (test)")
    log["optimized_test"] = optimized_eval

    # Full test set evaluation
    print("\n--- Full test set evaluation ---")
    full_eval = evaluate_detailed(optimized_program, test_examples, "Full test")
    log["optimized_full_test"] = full_eval

    # Save the optimized program
    print("\n--- Saving optimized program ---")
    try:
        program_state_path = os.path.join(BASE, f'dspy_simba_{args.model}_program.json')
        optimized_program.save(program_state_path)
        print(f"  Saved program state: {program_state_path}")
        log["program_state_file"] = f'dspy_simba_{args.model}_program.json'
    except Exception as e:
        print(f"  Could not save program state: {e}")
        log["save_error"] = str(e)

    # Extract demos and instructions for the scoring pipeline
    scorer_data = {"model": args.model, "model_id": model_id}
    if hasattr(optimized_program, 'scorer'):
        scorer = optimized_program.scorer
        if hasattr(scorer, 'demos') and scorer.demos:
            scorer_data["demos"] = []
            for demo in scorer.demos:
                d = {}
                if hasattr(demo, 'poem_text'):
                    d["poem_text"] = demo.poem_text
                if hasattr(demo, 'scores_json'):
                    scores = parse_scores(demo.scores_json)
                    if scores:
                        d.update(scores)
                    d["scores_json"] = demo.scores_json
                if hasattr(demo, 'augmented'):
                    d["augmented"] = demo.augmented
                scorer_data["demos"].append(d)
            print(f"  Extracted {len(scorer_data['demos'])} demos")

        if hasattr(scorer, 'signature') and hasattr(scorer.signature, 'instructions'):
            scorer_data["instructions"] = scorer.signature.instructions
            print(f"  Extracted instructions ({len(scorer_data['instructions'])} chars)")

        # Check for SIMBA-generated rules
        if hasattr(scorer, 'extended_signature'):
            sig = scorer.extended_signature
            if hasattr(sig, 'instructions'):
                scorer_data["extended_instructions"] = sig.instructions
                print(f"  Extracted extended instructions with SIMBA rules")

    # Save scorer data
    tmp = output_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(scorer_data, f, ensure_ascii=False, indent=2)
    shutil.move(tmp, output_path)
    print(f"  Saved: {output_path}")

    # Save log
    log["completed_at"] = time.strftime('%Y-%m-%dT%H:%M:%S')
    save_log()
    print(f"  Saved: {log_path}")

    # Summary
    print(f"\n{'='*60}")
    print(f"SIMBA OPTIMIZATION SUMMARY: {args.model.upper()}")
    print(f"{'='*60}")
    b = baseline_eval
    o = optimized_eval
    print(f"  Baseline MAE:  {b.get('mae_overall', 'N/A')}")
    print(f"  Optimized MAE: {o.get('mae_overall', 'N/A')}")
    if isinstance(b.get('mae_overall'), (int, float)) and isinstance(o.get('mae_overall'), (int, float)):
        improvement = b['mae_overall'] - o['mae_overall']
        pct = improvement / b['mae_overall'] * 100 if b['mae_overall'] > 0 else 0
        print(f"  Improvement:   {improvement:+.2f} ({pct:+.1f}%)")
    print(f"  Baseline r:    {b.get('r_overall', 'N/A')}")
    print(f"  Optimized r:   {o.get('r_overall', 'N/A')}")
    print(f"  Time:          {log.get('compile_time_sec', 'N/A')}s")


if __name__ == '__main__':
    main()
