"""DSPy-based prompt optimization for Arabic poetry scoring.

Optimizes the scoring prompt for a target model so its quality scores
converge toward Opus ground truth using DSPy optimizers.

DSPy pulls these levers:
  1. Instruction rewriting — rephrases the scoring rubric
  2. Few-shot examples — picks train poems with clear Opus scores as demos
  3. Output formatting — adjusts JSON response format
  4. Chain-of-thought — may add reasoning steps before scoring

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt --model haiku
    python -m poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt --model sonnet
    python -m poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt --model haiku --optimizer mipro --num-trials 25
"""
import argparse
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import dspy
import numpy as np
import pandas as pd

from poetry_quality_and_curation.retriever_and_quality_curator import config
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring

DIMS = config.SCORE_DIMENSIONS  # ["sound", "imagery", "emotion", "language", "cultural"]
DATA_DIR = config.DATA_DIR

MODEL_CONFIGS = {
    "haiku": "openai/bedrock-haiku-45",
    "sonnet": "openai/bedrock-sonnet-46",
}

# Fixed split sizes per spec: 200 poems, 140 train / 60 eval
MAX_POEMS = 200
TRAIN_SIZE = 140
EVAL_SIZE = 60


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(description="DSPy prompt optimization for poem scoring")
    p.add_argument("--model", choices=list(MODEL_CONFIGS.keys()), required=True,
                   help="Target model to optimize (haiku or sonnet)")
    p.add_argument("--num-trials", type=int, default=20,
                   help="Number of optimization trials (default: 20)")
    p.add_argument("--optimizer", choices=["bootstrap", "mipro"], default="bootstrap",
                   help="DSPy optimizer: bootstrap (cheaper/faster) or mipro (aggressive). Default: bootstrap")
    p.add_argument("--temperature", type=float, default=0.3,
                   help="LLM temperature (default: 0.3)")
    p.add_argument("--max-poems", type=int, default=MAX_POEMS,
                   help=f"Max poems to use from Opus ground truth (default: {MAX_POEMS})")
    p.add_argument("--output", type=str, default=None,
                   help="Output JSON path (default: data/dspy_{model}_history.json)")
    return p.parse_args()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_opus_ground_truth() -> pd.DataFrame:
    """Load all Opus-scored poems as gold standard."""
    path = DATA_DIR / "scores_openai_bedrock-opus-46.parquet"
    df = pd.read_parquet(path)
    print(f"Loaded {len(df)} Opus ground truth poems")
    return df


def load_poem_content(poem_ids: list[str]) -> dict[str, dict]:
    """Load poem content from PostgreSQL for the given IDs."""
    conn = config.get_db_connection()
    try:
        cur = conn.cursor()
        placeholders = ",".join(["%s"] * len(poem_ids))
        cur.execute(f"""
            SELECT p.id, p.title, p.content, po.name AS poet_name
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.id IN ({placeholders})
        """, poem_ids)
        rows = cur.fetchall()
        return {
            str(r[0]): {
                "id": str(r[0]),
                "title": r[1] or "",
                "content": r[2] or "",
                "poet_name": r[3] or "",
            }
            for r in rows
        }
    finally:
        conn.close()


def build_eval_dataset(max_poems: int = MAX_POEMS) -> list[dspy.Example]:
    """Build DSPy examples from Opus ground truth with poem content.

    Caps at max_poems, shuffled with fixed seed for reproducibility.
    """
    opus_df = load_opus_ground_truth()

    # Cap and shuffle
    if len(opus_df) > max_poems:
        opus_df = opus_df.sample(n=max_poems, random_state=42)
        print(f"  Capped to {max_poems} poems (from {len(opus_df)})")

    poem_ids = opus_df["poem_id"].astype(str).tolist()
    poems = load_poem_content(poem_ids)

    examples = []
    for _, row in opus_df.iterrows():
        pid = str(row["poem_id"])
        poem = poems.get(pid)
        if not poem:
            print(f"Warning: poem {pid} not found in DB, skipping")
            continue

        poem_text = format_for_scoring(
            poem["id"], poem["title"], poem["content"], poem["poet_name"]
        )

        ex = dspy.Example(
            poem_text=poem_text,
            sound=int(row["sound"]),
            imagery=int(row["imagery"]),
            emotion=int(row["emotion"]),
            language=int(row["language"]),
            cultural=int(row["cultural"]),
        ).with_inputs("poem_text")

        examples.append(ex)

    print(f"Built {len(examples)} evaluation examples from Opus ground truth")
    return examples


# ---------------------------------------------------------------------------
# DSPy Signature & Module
# ---------------------------------------------------------------------------

class PoemScoring(dspy.Signature):
    """أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي والحديث.
    قيّم القصيدة المعطاة عبر خمسة أبعاد جودة، كل منها يُقيَّم من 0 إلى 100.

    معايير التقييم:
    - sound (الإيقاع والموسيقى): جمال الوزن، اتساق القافية، الموسيقى الداخلية
    - imagery (التصوير): قوة الصور الشعرية، الاستعارات، حيوية المشهد
    - emotion (العاطفة): صدق المشاعر، العمق العاطفي، القدرة على تحريك القارئ
    - language (اللغة): الفصاحة، جودة البناء، البلاغة الطبيعية
    - cultural (القيمة الثقافية): الأهمية الأدبية، الأصالة، المكانة في تراث الشعر العربي

    كن دقيقاً ومميزاً. ليست كل قصيدة تستحق درجات عالية.
    القصيدة المتوسطة تُقيَّم 40-60. فقط الشعر الاستثنائي حقاً يتجاوز 85.
    """
    poem_text: str = dspy.InputField(desc="القصيدة العربية مع العنوان واسم الشاعر والأبيات")
    sound: int = dspy.OutputField(desc="درجة الإيقاع والموسيقى 0-100")
    imagery: int = dspy.OutputField(desc="درجة التصوير والاستعارات 0-100")
    emotion: int = dspy.OutputField(desc="درجة العمق العاطفي 0-100")
    language: int = dspy.OutputField(desc="درجة الجودة اللغوية 0-100")
    cultural: int = dspy.OutputField(desc="درجة القيمة الثقافية 0-100")


class PoemScorer(dspy.Module):
    """DSPy module that scores Arabic poems on 5 dimensions."""

    def __init__(self):
        super().__init__()
        self.predict_scores = dspy.Predict(PoemScoring)

    def forward(self, poem_text: str):
        result = self.predict_scores(poem_text=poem_text)
        # Clamp scores to 0-100
        for dim in DIMS:
            val = getattr(result, dim, 50)
            try:
                val = int(val)
            except (ValueError, TypeError):
                val = 50
            setattr(result, dim, max(0, min(100, val)))
        return result


# ---------------------------------------------------------------------------
# Metric
# ---------------------------------------------------------------------------

def mae_metric(example, prediction, trace=None) -> float:
    """Compute 1 - normalized MAE so higher is better (DSPy maximizes).

    Returns a score between 0.0 (worst, MAE=100) and 1.0 (perfect, MAE=0).
    """
    errors = []
    for dim in DIMS:
        gold = getattr(example, dim, 50)
        pred_val = getattr(prediction, dim, 50)
        try:
            pred_val = int(pred_val)
        except (ValueError, TypeError):
            pred_val = 50
        errors.append(abs(gold - pred_val))

    mean_mae = np.mean(errors)
    return 1.0 - (mean_mae / 100.0)


def compute_detailed_mae(examples, scorer, bypass_cache=False) -> dict:
    """Compute per-dimension and overall MAE for a scorer on examples."""
    dim_errors = {d: [] for d in DIMS}

    if bypass_cache:
        ctx = dspy.context(bypass_cache=True)
    else:
        from contextlib import nullcontext
        ctx = nullcontext()

    with ctx:
        for ex in examples:
            pred = scorer(poem_text=ex.poem_text)
            for dim in DIMS:
                gold = getattr(ex, dim, 50)
                pred_val = getattr(pred, dim, 50)
                try:
                    pred_val = int(pred_val)
                except (ValueError, TypeError):
                    pred_val = 50
                dim_errors[dim].append(abs(gold - pred_val))

    result = {}
    all_errors = []
    for dim in DIMS:
        result[f"mae_{dim}"] = float(np.mean(dim_errors[dim]))
        all_errors.extend(dim_errors[dim])
    result["mae_overall"] = float(np.mean(all_errors))
    return result


# ---------------------------------------------------------------------------
# Prompt progression extraction
# ---------------------------------------------------------------------------

def extract_prompt_info(optimized_scorer, history: dict):
    """Extract optimized instructions, demos, and trial progression from the
    compiled DSPy program."""
    # Trial-level progression (MIPROv2 only)
    progression = []
    if hasattr(optimized_scorer, "trial_logs"):
        trial_logs = optimized_scorer.trial_logs
        for trial_num in sorted(trial_logs.keys()):
            trial_data = trial_logs[trial_num]
            entry = {
                "trial": trial_num,
                "score": trial_data.get("full_eval_score"),
            }
            if "program" in trial_data:
                prog = trial_data["program"]
                if hasattr(prog, "predict_scores") and hasattr(prog.predict_scores, "signature"):
                    sig = prog.predict_scores.signature
                    entry["instructions"] = getattr(sig, "instructions", "")
                if hasattr(prog, "predict_scores") and hasattr(prog.predict_scores, "demos"):
                    entry["num_demos"] = len(prog.predict_scores.demos)
            progression.append(entry)
    history["prompt_progression"] = progression

    # Final optimized instructions
    if hasattr(optimized_scorer, "predict_scores") and hasattr(optimized_scorer.predict_scores, "signature"):
        sig = optimized_scorer.predict_scores.signature
        instructions = getattr(sig, "instructions", str(sig.__doc__) if sig.__doc__ else "")
        history["optimized_instructions"] = instructions

    # Baseline instructions for comparison
    baseline_sig = PoemScoring
    history["baseline_instructions"] = baseline_sig.__doc__.strip() if baseline_sig.__doc__ else ""

    return history


def _summarize_prompt_changes(history: dict) -> str:
    """Generate a one-line summary of what changed vs baseline."""
    parts = []
    num_demos = history.get("num_demos", 0)
    if num_demos > 0:
        parts.append(f"{num_demos} few-shot examples")
    baseline_instr = history.get("baseline_instructions", "")
    optimized_instr = history.get("optimized_instructions", "")
    if optimized_instr and optimized_instr != baseline_instr:
        parts.append("rewrote instructions")
    if not parts:
        return "no changes (baseline optimal)"
    return ", ".join(parts)


# ---------------------------------------------------------------------------
# Optimization
# ---------------------------------------------------------------------------

def run_optimization(args):
    """Run the DSPy prompt optimization pipeline for the specified model."""
    model_name = args.model
    model_id = MODEL_CONFIGS[model_name]

    # Resolve output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = DATA_DIR / f"dspy_{model_name}_history.json"

    print(f"=== Optimizing {model_name.upper()} ({model_id}) ===")
    print(f"    Optimizer: {args.optimizer}")

    # Configure LM
    lm = dspy.LM(
        model=model_id,
        api_base=os.environ["ANTHROPIC_BASE_URL"],
        api_key=os.environ["ANTHROPIC_AUTH_TOKEN"],
        temperature=args.temperature,
        max_tokens=2000,
    )
    dspy.configure(lm=lm)

    # Build dataset (capped at max_poems)
    examples = build_eval_dataset(max_poems=args.max_poems)
    if len(examples) < 20:
        print(f"ERROR: Need at least 20 examples for optimization, got {len(examples)}")
        return

    # Fixed 70/30 split: 140 train / 60 eval (or proportional if fewer poems)
    rng = np.random.RandomState(42)
    indices = rng.permutation(len(examples))
    eval_size = max(10, int(len(examples) * 0.3))
    train_size = len(examples) - eval_size
    train_examples = [examples[i] for i in indices[:train_size]]
    eval_examples = [examples[i] for i in indices[train_size:]]

    print(f"Train set: {len(train_examples)} poems, Eval set: {len(eval_examples)} poems (held out)")

    # Baseline evaluation on BOTH sets
    baseline_scorer = PoemScorer()
    print(f"\n--- {model_name.upper()} Baseline (iteration 0) ---")
    baseline_train_mae = compute_detailed_mae(train_examples, baseline_scorer)
    baseline_eval_mae = compute_detailed_mae(eval_examples, baseline_scorer)
    print(f"Train MAE: {baseline_train_mae['mae_overall']:.2f}")
    print(f"Eval MAE:  {baseline_eval_mae['mae_overall']:.2f}")
    for dim in DIMS:
        print(f"  {dim}: train={baseline_train_mae[f'mae_{dim}']:.2f}  eval={baseline_eval_mae[f'mae_{dim}']:.2f}")

    # Initialize history with iteration 0 (baseline)
    history = {
        "model": model_name,
        "model_id": model_id,
        "optimizer": args.optimizer,
        "num_trials": args.num_trials,
        "num_examples": len(examples),
        "train_size": len(train_examples),
        "eval_size": len(eval_examples),
        "baseline_train_mae": baseline_train_mae,
        "baseline_eval_mae": baseline_eval_mae,
        "iterations": [
            {
                "iteration": 0,
                "train_mae": baseline_train_mae,
                "eval_mae": baseline_eval_mae,
                "prompt_summary": "baseline (current prompt, no optimization)",
            }
        ],
    }

    # Run optimizer
    print(f"\n--- Running {args.optimizer} optimization ({args.num_trials} trials) ---")
    start_time = time.time()

    if args.optimizer == "mipro":
        optimizer = dspy.MIPROv2(
            metric=mae_metric,
            num_threads=1,
            max_bootstrapped_demos=3,
            max_labeled_demos=5,
            num_candidates=10,
            auto=None,
            verbose=True,
        )
        optimized_scorer = optimizer.compile(
            PoemScorer(),
            trainset=train_examples,
            num_trials=args.num_trials,
            minibatch=False,
        )
    else:  # bootstrap
        optimizer = dspy.BootstrapFewShot(
            metric=mae_metric,
            max_bootstrapped_demos=4,
            max_labeled_demos=6,
            max_rounds=args.num_trials,
        )
        optimized_scorer = optimizer.compile(
            PoemScorer(),
            trainset=train_examples,
        )

    elapsed = time.time() - start_time
    print(f"Optimization completed in {elapsed:.1f}s")

    # Extract prompt info (instructions, demos, trial progression)
    extract_prompt_info(optimized_scorer, history)

    # Extract trial-level scores into iterations (MIPROv2 logs per-trial)
    if hasattr(optimized_scorer, "trial_logs"):
        trial_logs = optimized_scorer.trial_logs
        for trial_num in sorted(trial_logs.keys()):
            trial_data = trial_logs[trial_num]
            score = trial_data.get("full_eval_score", None)
            if score is not None:
                # score is DSPy metric (1 - MAE/100), convert back
                trial_mae = (1.0 - score) * 100.0
                history["iterations"].append({
                    "iteration": trial_num,
                    "trial_score": float(score),
                    "trial_mae": float(trial_mae),
                    "prompt_summary": f"trial {trial_num} (DSPy internal eval)",
                })

    if hasattr(optimized_scorer, "score"):
        history["best_trial_score"] = float(optimized_scorer.score)

    # Count demos
    num_demos = 0
    if hasattr(optimized_scorer, "predict_scores") and hasattr(optimized_scorer.predict_scores, "demos"):
        num_demos = len(optimized_scorer.predict_scores.demos)
    history["num_demos"] = num_demos
    print(f"Optimized program has {num_demos} few-shot demos")

    # Final evaluation on BOTH sets (bypass cache for fresh results)
    print(f"\n--- {model_name.upper()} Final Evaluation (after optimization) ---")
    optimized_train_mae = compute_detailed_mae(train_examples, optimized_scorer, bypass_cache=True)
    optimized_eval_mae = compute_detailed_mae(eval_examples, optimized_scorer, bypass_cache=True)
    print(f"Train MAE: {optimized_train_mae['mae_overall']:.2f}")
    print(f"Eval MAE:  {optimized_eval_mae['mae_overall']:.2f}")
    for dim in DIMS:
        print(f"  {dim}: train={optimized_train_mae[f'mae_{dim}']:.2f}  eval={optimized_eval_mae[f'mae_{dim}']:.2f}")

    # Add final iteration entry
    prompt_summary = _summarize_prompt_changes(history)
    history["iterations"].append({
        "iteration": "final",
        "train_mae": optimized_train_mae,
        "eval_mae": optimized_eval_mae,
        "prompt_summary": f"optimized: {prompt_summary}",
    })

    history["optimized_train_mae"] = optimized_train_mae
    history["optimized_eval_mae"] = optimized_eval_mae
    history["elapsed_seconds"] = elapsed

    # Compute per-poem details on eval set for analysis
    poem_details = []
    with dspy.context(bypass_cache=True):
        for ex in eval_examples:
            base_pred = baseline_scorer(poem_text=ex.poem_text)
            opt_pred = optimized_scorer(poem_text=ex.poem_text)
            detail = {"poem_text_prefix": ex.poem_text[:80]}
            for dim in DIMS:
                gold = getattr(ex, dim)
                base_val = int(getattr(base_pred, dim, 50))
                opt_val = int(getattr(opt_pred, dim, 50))
                detail[f"{dim}_gold"] = gold
                detail[f"{dim}_baseline"] = base_val
                detail[f"{dim}_optimized"] = opt_val
                detail[f"{dim}_baseline_err"] = abs(gold - base_val)
                detail[f"{dim}_optimized_err"] = abs(gold - opt_val)
            poem_details.append(detail)
    history["poem_details"] = poem_details

    # Save demos if present
    if hasattr(optimized_scorer, "predict_scores") and hasattr(optimized_scorer.predict_scores, "demos"):
        demos = optimized_scorer.predict_scores.demos
        if demos:
            serializable_demos = []
            for demo in demos:
                d = {}
                for key in demo.keys():
                    d[key] = str(getattr(demo, key, ""))
                serializable_demos.append(d)
            history["demos"] = serializable_demos

    # Summary
    train_imp = baseline_train_mae["mae_overall"] - optimized_train_mae["mae_overall"]
    eval_imp = baseline_eval_mae["mae_overall"] - optimized_eval_mae["mae_overall"]
    print(f"\n--- {model_name.upper()} Summary ---")
    print(f"Baseline MAE:  train={baseline_train_mae['mae_overall']:.2f}  eval={baseline_eval_mae['mae_overall']:.2f}")
    print(f"Optimized MAE: train={optimized_train_mae['mae_overall']:.2f}  eval={optimized_eval_mae['mae_overall']:.2f}")
    print(f"Improvement:   train={train_imp:+.2f}  eval={eval_imp:+.2f}")
    print(f"Prompt: {prompt_summary}")

    if history.get("optimized_instructions"):
        print(f"\n--- Optimized Instructions ---")
        print(history["optimized_instructions"][:500])

    # Save history
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    print(f"\nHistory saved to {output_path}")

    # Save the optimized program
    program_path = DATA_DIR / f"dspy_{model_name}_optimized_scorer.json"
    optimized_scorer.save(str(program_path))
    print(f"Optimized program saved to {program_path}")

    return history


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    args = parse_args()
    run_optimization(args)
