#!/usr/bin/env python3
"""Translate Arabic UI strings from the scoring comparison report to English.

Sends all translatable strings (section headers, labels, descriptions) to
Claude Opus via LiteLLM and saves the result as JSON.
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import litellm

load_dotenv()

# ---------------------------------------------------------------------------
# All translatable Arabic UI strings from scoring_comparison_report.html
# (section headers, labels, methodology text, footer -- NOT poem text)
# ---------------------------------------------------------------------------
STRINGS = {
    # Page title and header
    "page_title": "مقارنة تقييم الشعر العربي",
    "page_heading": "مقارنة تقييم الشعر العربي: هايكو ⟷ سونيت ⟷ أوبوس",

    # Section headings
    "section_1": "١. ملخص النتائج",
    "section_2": "٢. تحليل الانحياز (Calibration Bias)",
    "section_3": "٣. استهلاك الرموز والتكلفة",
    "section_4": "٤. مقارنة تفصيلية للقصائد",

    # Stat box labels
    "poems_label": "قصيدة",
    "poems_label_plural": "قصائد",

    # Bias section description
    "bias_desc": "الفرق بين درجات هايكو وسونيت على {count} قصيدة مشتركة. هايكو يبالغ في التقييم بمعدل ~11 نقطة.",

    # Score dimensions
    "dim_sound": "الإيقاع",
    "dim_imagery": "التصوير",
    "dim_emotion": "العاطفة",
    "dim_language": "اللغة",
    "dim_cultural": "القيمة الثقافية",
    "dim_overall": "الدرجة الكلية",

    # Token section labels
    "token_input": "الإدخال",
    "token_output": "الإخراج",
    "token_unit": "رمز",
    "token_batches": "دفعات من",
    "token_disclaimer": "* التكلفة تقديرية بأسعار Bedrock المعلنة. التكلفة الفعلية تمر عبر خادم LiteLLM الداخلي.",

    # Card table headers
    "table_dimension": "البُعد",

    # Model section headers
    "opus_section": "مقارنة أوبوس (Opus) — 10 قصائد",
    "sonnet_section": "مقارنة سونيت (Sonnet) — أكبر 10 اختلافات",

    # Color legend
    "color_legend": "القصائد مرتبة حسب حجم الاختلاف. اللون:",
    "color_green": "أخضر",
    "color_yellow": "أصفر",
    "color_red": "أحمر",

    # No text placeholder
    "no_text": "لا يوجد نص",

    # Footer
    "footer": "تم إنشاء هذا التقرير تلقائياً بواسطة خط أنابيب تنسيق الشعر العربي",

    # Toggle labels
    "toggle_ar": "عربي",
    "toggle_en": "English",
    "toggle_both": "كلاهما",
}

# ---------------------------------------------------------------------------
# Output path
# ---------------------------------------------------------------------------
OUTPUT_PATH = Path(__file__).parent / "data" / "report_translations.json"


def translate_strings() -> dict:
    """Send all Arabic UI strings to Claude Opus and return English translations."""

    api_base = os.environ.get("ANTHROPIC_BASE_URL")
    api_key = os.environ.get("ANTHROPIC_AUTH_TOKEN")

    if not api_base:
        sys.exit("ERROR: ANTHROPIC_BASE_URL environment variable is not set.")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_AUTH_TOKEN environment variable is not set.")

    system_prompt = (
        "You are a professional translator. Translate the following Arabic UI "
        "strings to English. Return ONLY a JSON object with the same keys but "
        "English values. Keep any placeholders like {count} as-is. Keep "
        "technical terms (Haiku, Sonnet, Opus, Bedrock, LiteLLM) in English."
    )

    print(f"Sending {len(STRINGS)} strings to Claude Opus for translation...")
    print(f"  API base: {api_base}")

    response = litellm.completion(
        model="openai/bedrock-opus-46",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(STRINGS, ensure_ascii=False)},
        ],
        api_base=api_base,
        api_key=api_key,
        temperature=0.2,
        max_tokens=4000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines)

    translations = json.loads(raw)

    # Sanity check: every source key must appear in the result
    missing = set(STRINGS.keys()) - set(translations.keys())
    if missing:
        print(f"WARNING: Missing keys in translation: {missing}")

    return translations


def main():
    translations = translate_strings()

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)

    print(f"\nTranslations saved to {OUTPUT_PATH}\n")
    print("--- Translations ---")
    for key, value in translations.items():
        ar = STRINGS[key]
        print(f"  {key}:")
        print(f"    AR: {ar}")
        print(f"    EN: {value}")
    print(f"\nTotal: {len(translations)} strings translated.")


if __name__ == "__main__":
    main()
