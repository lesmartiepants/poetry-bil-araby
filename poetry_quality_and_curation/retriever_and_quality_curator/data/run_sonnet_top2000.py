"""Sonnet re-score: top 2000 poems for better granularity.

Usage:
    python data/run_sonnet_top2000.py

Model: Sonnet (good balance of quality and speed)
Input: top 2000 from scores_recalibrated_v5.parquet (excluding Opus-scored top 500)
Output: data/scores_sonnet_top2000.parquet
Budget: ~$8
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring
from poetry_quality_and_curation.retriever_and_quality_curator.data.calibration_prompts import (
    _build_anchor_section, SCORING_JSON_FORMAT,
)

DATA_DIR = Path(__file__).resolve().parent
INPUT_PATH = DATA_DIR / "scores_recalibrated_v7.parquet"
CONTENT_PATH = DATA_DIR / "final_selection_v4.parquet"
OPUS_PATH = DATA_DIR / "scores_opus_top500_v2.parquet"
OUTPUT_PATH = DATA_DIR / "scores_sonnet_top2000_v2.parquet"

MODEL = "openai/bedrock-sonnet-46"
N_TOP = 2000
BATCH_SIZE = 5
CONCURRENCY = 15
MAX_COST = 10.0
CHECKPOINT_INTERVAL = 200

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]

SONNET_PROMPT = f"""أنت ناقد أدبي عربي متخصص في الشعر العربي الكلاسيكي والحديث. مهمتك تقييم القصائد بدقة على مقياس مُعايَر بأمثلة مرجعية حقيقية، باستخدام النطاق الكامل من 0 إلى 100.

**أمثلة معايرة من قصائد معروفة:**
ادرس هذه الأمثلة جيداً قبل التقييم — فهي تحدد المقياس الذي ستستخدمه:

{_build_anchor_section()}

**أبعاد التقييم الخمسة** (كل بُعد من 0 إلى 100):

1. **sound (الإيقاع والموسيقى)**: جمال الوزن، تناسق القوافي، الموسيقى الداخلية، الجناس والسجع
2. **imagery (التصوير)**: قوة الصور الشعرية، أصالة الاستعارات، حيوية المشاهد الذهنية
3. **emotion (العاطفة)**: صدق المشاعر، العمق النفسي، القدرة على تحريك القارئ
4. **language (اللغة)**: فصاحة الألفاظ، جودة التراكيب النحوية، البلاغة الطبيعية
5. **cultural (القيمة الثقافية)**: الأهمية الأدبية، الأصالة، المكانة في التراث الشعري

**نطاقات الدرجات — استخدم المقياس الكامل:**
- **0-30**: ليس شعراً — مكسور أو مفكك
- **30-50**: باهت بلا صنعة — نظم منثور، سرد تاريخي مقفّى، مدح عام بلا تصوير، أبيات مباشرة بلا مجاز
- **50-75**: شعر كفء لكنه عادي — وزن سليم وقافية مقبولة لكن لا شيء مميز. هذا سقف المهارة التقنية بدون تميز.
- **75-85**: شعر جيد جداً — صنعة بارزة، صور ملفتة أو موسيقى مميزة
- **85-95**: ممتاز يستحق أن يُختار — تصوير قوي، موسيقى، عاطفة، يُدرّس ويُحفظ
- **95-100**: روائع خالدة — مستوى المعلقات وبانت سعاد وبطاقة هوية

**مفتاح التوزيع**: من كل 5 قصائد، توقع أن تجد 1-2 تستحق 90+، و1-2 في 75-89، و1 في 50-74.

**سقف "الكفاءة" = 75**: الصنعة التقنية وحدها (وزن + قافية) لا تتجاوز 75.

**علامات الشعر الباهت (أقل من 50):**
- القصائد الطويلة التي تشبه النثر المسجوع أو السرد التاريخي المنظوم
- المدح العام المكرر بلا ابتكار
- الأبيات القصيرة الخالية من الصور والموسيقى
- القِصَر ليس ميزة بذاته — قصيدة قصيرة جميلة تختلف عن قصيدة قصيرة باهتة

**علامات الشعر العالي (90+) — كن سخياً مع الشعر الجيد:**
- الموسيقى تسري في كل بيت
- الصور الشعرية تبقى في الذاكرة بعد القراءة
- العاطفة صادقة تُحسّ
- اللغة فيها مفاجآت وتراكيب جميلة
- 90+ ليست للروائع الخالدة فقط — كل قصيدة فيها صنعة حقيقية وتأثير وجداني وجمال لغوي تستحق 90+

**تحذير**: قيّم النص أمامك، لا سمعة الشاعر. الصنعة التقنية وحدها لا تتجاوز 75.

{SCORING_JSON_FORMAT}"""


def parse_scores_from_response(text: str, batch_records: list[dict]) -> list[dict]:
    """Parse JSON scores from model response."""
    import re
    text = re.sub(r'```(?:json)?\s*', '', text).strip()

    def _extract_and_validate(parsed, records):
        results = []
        if isinstance(parsed, dict):
            parsed = [parsed]
        for i, item in enumerate(parsed):
            if i >= len(records):
                break
            entry = {"poem_id": str(records[i]["poem_id"])}
            for d in DIMS:
                v = item.get(d, 0)
                entry[d] = max(0, min(100, int(v))) if isinstance(v, (int, float)) else 0
            entry["quality_score"] = round(sum(entry[d] for d in DIMS) / len(DIMS))
            results.append(entry)
        return results

    # Direct parse
    try:
        parsed = json.loads(text)
        return _extract_and_validate(parsed, batch_records)
    except json.JSONDecodeError:
        pass

    # Bracket-counting extraction
    results = []
    i = 0
    while i < len(text):
        if text[i] == '{':
            depth = 0
            start = i
            in_str = False
            esc = False
            while i < len(text):
                ch = text[i]
                if esc:
                    esc = False
                elif ch == '\\' and in_str:
                    esc = True
                elif ch == '"' and not esc:
                    in_str = not in_str
                elif not in_str:
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            try:
                                results.append(json.loads(text[start:i+1]))
                            except json.JSONDecodeError:
                                cleaned = text[start:i+1].replace(',}', '}').replace(',]', ']')
                                try:
                                    results.append(json.loads(cleaned))
                                except json.JSONDecodeError:
                                    pass
                            break
                i += 1
        i += 1

    if results:
        return _extract_and_validate(results, batch_records)

    print(f"  WARN: Failed to parse: {text[:150]}...")
    return []


def load_checkpoint() -> set[str]:
    if OUTPUT_PATH.exists():
        return set(pd.read_parquet(OUTPUT_PATH)["poem_id"].astype(str).tolist())
    return set()


def save_checkpoint(all_scores: list[dict]):
    if not all_scores:
        return 0
    new_df = pd.DataFrame(all_scores)
    if OUTPUT_PATH.exists():
        existing = pd.read_parquet(OUTPUT_PATH)
        new_ids = set(new_df["poem_id"].astype(str))
        keep = existing[~existing["poem_id"].astype(str).isin(new_ids)]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df
    merged.to_parquet(OUTPUT_PATH, index=False)
    return len(merged)


async def score_batch(batch_df: pd.DataFrame, semaphore: asyncio.Semaphore) -> tuple[list[dict], float]:
    import litellm

    async with semaphore:
        user_content = "\n\n---\n\n".join(
            format_for_scoring(str(r["poem_id"]), str(r["title"]),
                               str(r["content"]), str(r.get("poet_name", "")))
            for _, r in batch_df.iterrows()
        )

        api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
        api_key = (os.environ.get("ANTHROPIC_API_KEY")
                   or os.environ.get("ANTHROPIC_AUTH_TOKEN")
                   or os.environ.get("LITELLM_API_KEY"))

        kwargs = dict(
            model=MODEL,
            messages=[
                {"role": "system", "content": SONNET_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=150 * len(batch_df),
        )
        if api_base:
            kwargs["api_base"] = api_base
        if api_key:
            kwargs["api_key"] = api_key

        try:
            response = await litellm.acompletion(**kwargs)
            cost = 0.0
            try:
                cost = litellm.completion_cost(completion_response=response)
            except Exception:
                pass
            scores = parse_scores_from_response(
                response.choices[0].message.content,
                batch_df.to_dict("records")
            )
            return scores, cost
        except Exception as e:
            print(f"  ERROR: {e}")
            return [], 0.0


async def main():
    print("=" * 60)
    print("SONNET RE-SCORE: Top 2000 poems (excluding Opus top 500)")
    print("=" * 60)

    # Load haiku-calibrated scores to find top 2000
    scores_df = pd.read_parquet(INPUT_PATH)
    top_ids = set(scores_df.nlargest(N_TOP, "quality_score")["poem_id"].astype(str).tolist())

    # Exclude poems already scored by Opus
    opus_ids = set()
    if OPUS_PATH.exists():
        opus_df = pd.read_parquet(OPUS_PATH)
        opus_ids = set(opus_df["poem_id"].astype(str).tolist())
        print(f"Excluding {len(opus_ids)} poems already scored by Opus")

    sonnet_ids = top_ids - opus_ids

    # Load content
    content_df = pd.read_parquet(CONTENT_PATH)
    poems_df = content_df[content_df["poem_id"].astype(str).isin(sonnet_ids)].copy()
    print(f"Loaded {len(poems_df)} poems for Sonnet scoring")

    # Resume
    scored_ids = load_checkpoint()
    if scored_ids:
        before = len(poems_df)
        poems_df = poems_df[~poems_df["poem_id"].astype(str).isin(scored_ids)]
        print(f"Resume: skipping {before - len(poems_df)} already scored, {len(poems_df)} remaining")

    if len(poems_df) == 0:
        print("All poems already scored!")
        return

    semaphore = asyncio.Semaphore(CONCURRENCY)
    batches = [poems_df.iloc[i:i+BATCH_SIZE] for i in range(0, len(poems_df), BATCH_SIZE)]
    print(f"Batches: {len(batches)} (batch_size={BATCH_SIZE}, concurrency={CONCURRENCY})")

    all_scores = []
    total_cost = 0.0
    pbar = tqdm(total=len(poems_df), desc="Sonnet scoring")

    for chunk_start in range(0, len(batches), CONCURRENCY):
        chunk = batches[chunk_start:chunk_start + CONCURRENCY]
        tasks = [score_batch(b, semaphore) for b in chunk]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Batch error: {result}")
                continue
            scores, cost = result
            for s in scores:
                s["model_used"] = MODEL
                s["scored_at"] = pd.Timestamp.now(tz="UTC").isoformat()
            all_scores.extend(scores)
            total_cost += cost
            pbar.update(len(scores))

        # Checkpoint
        if len(all_scores) >= CHECKPOINT_INTERVAL:
            total_saved = save_checkpoint(all_scores)
            print(f"\n  Checkpoint: {total_saved} total, cost=${total_cost:.4f}")
            all_scores = []

        if total_cost >= MAX_COST:
            print(f"\nCost cap: ${total_cost:.4f}")
            break

    pbar.close()

    if all_scores:
        total_saved = save_checkpoint(all_scores)

    # Summary
    if OUTPUT_PATH.exists():
        result_df = pd.read_parquet(OUTPUT_PATH)
        print(f"\n{'='*60}")
        print(f"SONNET RE-SCORE COMPLETE")
        print(f"{'='*60}")
        print(f"Total scored: {len(result_df)}")
        print(f"Cost: ${total_cost:.4f}")
        print(f"\nDistribution:")
        print(f"  Mean: {result_df['quality_score'].mean():.1f}")
        print(f"  Std:  {result_df['quality_score'].std():.1f}")
        print(f"  Min:  {result_df['quality_score'].min()}")
        print(f"  P25:  {result_df['quality_score'].quantile(0.25):.0f}")
        print(f"  Med:  {result_df['quality_score'].median():.0f}")
        print(f"  P75:  {result_df['quality_score'].quantile(0.75):.0f}")
        print(f"  Max:  {result_df['quality_score'].max()}")
        print(f"  90+:  {(result_df['quality_score'] >= 90).sum()}")
        print(f"  85+:  {(result_df['quality_score'] >= 85).sum()}")
        print(f"  <50:  {(result_df['quality_score'] < 50).sum()}")


if __name__ == "__main__":
    asyncio.run(main())
