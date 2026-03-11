#!/usr/bin/env python3
"""Prompt Updater: distill multi-expert strategy into a single optimized prompt.

Reads the winning translation strategy, embeds humanizer anti-AI rules,
and produces a prompt compatible with insightParser.js (POEM: / THE DEPTH: / THE AUTHOR:).

Usage:
    # Validate only (dry-run: test format on sample poems, don't write)
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.06_update_prompts --validate

    # Write the updated prompt to src/prompts.js
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.06_update_prompts --write

    # Custom sample size for validation
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.06_update_prompts --validate --sample-size 5
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from poetry_quality_and_curation.translation_and_insight_optimizer.config import (
    DATA_DIR,
    DEFAULT_SONNET_MODEL,
    HUMANIZER_ANTI_PATTERNS,
    get_db_connection,
)

PROMPTS_JS_PATH = _project_root / "src" / "prompts.js"

# The optimized prompt that distills the multi-expert approach into a single call.
# This prompt incorporates bridge/scholar/craftsperson perspectives, humanizer rules,
# and cultural bridge instructions while maintaining the POEM:/THE DEPTH:/THE AUTHOR: format.
OPTIMIZED_PROMPT = """\
You are three experts in one: a faithful Arabic-English translator, a scholar of Arabic \
literary tradition, and an English poet who makes translated verse sing on the page. \
You also write criticism that reads like a passionate human essayist, not an AI summarizer.

TASK: Translate this Arabic poem and explain it so an English-speaking reader truly \
understands it. Produce exactly three sections.

POEM:
Translate the poem into English that is alive as poetry in its own right.

TRANSLATION RULES:
- Produce exactly one English line for each Arabic line, in the same order.
- Do NOT merge, split, add, or remove lines. The line count must match exactly.
- Where a cultural concept has no English equivalent, inline a brief parenthetical \
  gloss (e.g. "the qasida (ode)") rather than footnoting.
- Make classical allusions legible: if the poet references the abandoned campsite, \
  the beloved's caravan, or wine-cup imagery, make the allusion clear in English \
  through word choice alone.
- Favor strong, concrete verbs ("the wind tore" not "the wind was tearing").
- Avoid translationese: no "O thou who" or "verily" unless the register demands it.
- Prefer the specific over the abstract: "pomegranate" over "fruit", "Tigris" over \
  "river" when warranted by the Arabic.
- Read your lines aloud mentally. Favor natural iambic or anapestic cadences when \
  they arise, but never force rhythm at the cost of meaning.
- Preserve the emotional register: solemn Arabic becomes solemn English; playful \
  stays playful.

THE DEPTH:
In 3-5 sentences, explain what this poem means for an English reader.

WRITING RULES FOR THE DEPTH (mandatory):
- Lead with the most surprising or vivid observation. Never open with "This poem \
  explores themes of..." or any throat-clearing summary.
- Vary sentence structure: mix short punchy sentences with longer flowing ones. \
  Never write three sentences of the same length in a row.
- Cover: the central theme, key metaphors or cultural references an English speaker \
  would miss, and why this poem matters in the Arabic literary tradition.
- Use concrete details: name a date, a place, an anecdote if you can. Kill vague \
  superlatives.
- Weave points into narrative flow. Never enumerate insights as disguised bullet \
  points.
- Write as if you have an opinion about this poem. Show what caught your attention. \
  Be a human with a perspective, not a neutral summarizer.
- BANNED PHRASES (instant disqualifiers): """ + json.dumps(HUMANIZER_ANTI_PATTERNS["banned_phrases"]) + """
- BANNED QUALIFIERS (never use): """ + json.dumps(HUMANIZER_ANTI_PATTERNS["banned_qualifiers"]) + """

THE AUTHOR:
In 3-4 sentences, describe the poet.

WRITING RULES FOR THE AUTHOR (mandatory):
- Include: full name, era, geographic context, what they are famous for.
- If exact birth/death years are known, include them; otherwise state approximate \
  century or say dates are unknown.
- If uncertain about attribution, say so. Never invent biographical details.
- Apply the same anti-AI writing rules: vary sentences, no banned phrases, \
  no sycophantic qualifiers, lead with something specific and interesting.

STRUCTURAL ANTI-PATTERNS TO AVOID:
""" + "\n".join(f"- {p}" for p in HUMANIZER_ANTI_PATTERNS["structural_anti_patterns"]) + """

IMPORTANT: Use the section headers POEM:, THE DEPTH:, and THE AUTHOR: only as labels. \
Never write these exact strings (with colon) inside the body of any section.

OUTPUT FORMAT (strictly):
POEM:
[Translation, one line per Arabic line]
THE DEPTH: [Text]
THE AUTHOR: [Text]"""


def parse_args():
    parser = argparse.ArgumentParser(
        description="Distill multi-expert strategy into optimized prompt and update src/prompts.js."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--validate",
        action="store_true",
        help="Dry-run: test the prompt on sample poems and verify parseInsight() compatibility",
    )
    mode.add_argument(
        "--write",
        action="store_true",
        help="Update src/prompts.js with the optimized prompt",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=3,
        help="Number of test poems for validation (default: 3)",
    )
    return parser.parse_args()


def simulate_parse_insight(text: str) -> dict | None:
    """Python port of insightParser.js parseInsight() for validation.

    Splits on /POEM:|THE DEPTH:|THE AUTHOR:/i and returns the three sections.
    """
    if not text:
        return None
    parts = re.split(r"POEM:|THE DEPTH:|THE AUTHOR:", text, flags=re.IGNORECASE)
    parts = [p.strip() for p in parts if p.strip()]
    return {
        "poeticTranslation": parts[0] if len(parts) > 0 else "",
        "depth": parts[1] if len(parts) > 1 else "",
        "author": parts[2] if len(parts) > 2 else "",
    }


def validate_parsed(parsed: dict, arabic_text: str) -> list[str]:
    """Validate that parsed output meets app.jsx requirements.

    Returns list of issues (empty = valid).
    """
    issues = []

    if not parsed["poeticTranslation"]:
        issues.append("POEM section is empty")
    if not parsed["depth"]:
        issues.append("THE DEPTH section is empty")
    if not parsed["author"]:
        issues.append("THE AUTHOR section is empty")

    # Check 1:1 line mapping
    if arabic_text and parsed["poeticTranslation"]:
        arabic_lines = [l for l in arabic_text.strip().split("\n") if l.strip()]
        english_lines = [l for l in parsed["poeticTranslation"].strip().split("\n") if l.strip()]
        if len(arabic_lines) != len(english_lines):
            issues.append(
                f"Line count mismatch: {len(arabic_lines)} Arabic vs {len(english_lines)} English"
            )

    # Check for section headers in body text
    for section_name, section_text in [
        ("POEM", parsed["poeticTranslation"]),
        ("THE DEPTH", parsed["depth"]),
        ("THE AUTHOR", parsed["author"]),
    ]:
        if re.search(r"POEM:|THE DEPTH:|THE AUTHOR:", section_text, re.IGNORECASE):
            issues.append(f"{section_name} section contains a section header in body text")

    # Check for banned phrases in depth/author
    for phrase in HUMANIZER_ANTI_PATTERNS["banned_phrases"]:
        if phrase.lower() in parsed["depth"].lower():
            issues.append(f"THE DEPTH contains banned phrase: '{phrase}'")
        if phrase.lower() in parsed["author"].lower():
            issues.append(f"THE AUTHOR contains banned phrase: '{phrase}'")

    return issues


def fetch_sample_poems(n: int) -> list[dict]:
    """Fetch n random poems from the database for validation."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT p.id, p.content, po.name as poet_name
           FROM poems p
           LEFT JOIN poets po ON p.poet_id = po.id
           WHERE length(p.content) > 50 AND length(p.content) < 2000
           ORDER BY random()
           LIMIT %s""",
        (n,),
    )
    poems = [{"id": str(r[0]), "content": r[1], "poet": r[2]} for r in cur.fetchall()]
    cur.close()
    conn.close()
    return poems


def generate_with_prompt(poem_text: str, model: str = DEFAULT_SONNET_MODEL) -> str:
    """Generate insight using the optimized prompt via LiteLLM."""
    import litellm

    response = litellm.completion(
        model=model,
        messages=[
            {"role": "system", "content": OPTIMIZED_PROMPT},
            {"role": "user", "content": poem_text},
        ],
        api_base=os.environ.get("ANTHROPIC_BASE_URL"),
        api_key=os.environ.get("ANTHROPIC_AUTH_TOKEN"),
        temperature=0.7,
        max_tokens=4000,
    )
    return response.choices[0].message.content.strip()


def run_validation(sample_size: int) -> bool:
    """Validate the optimized prompt against sample poems."""
    print("\n--- Validation Mode ---")
    print(f"  Sample size: {sample_size}")
    print(f"  Model: {DEFAULT_SONNET_MODEL}")

    # Fetch sample poems
    print("\n[1/3] Fetching sample poems...")
    try:
        poems = fetch_sample_poems(sample_size)
    except Exception as e:
        print(f"  ERROR: Could not fetch poems from database: {e}")
        print("  Ensure DATABASE_URL is set and the database is accessible.")
        return False

    if not poems:
        print("  ERROR: No poems returned from database.")
        return False

    print(f"  Fetched {len(poems)} poems")

    # Generate and validate
    print("\n[2/3] Generating with optimized prompt...")
    results = []
    all_passed = True

    for i, poem in enumerate(poems):
        print(f"\n  Poem {i + 1}/{len(poems)} (ID: {poem['id']}, poet: {poem['poet']}):")
        try:
            raw_output = generate_with_prompt(poem["content"])
        except Exception as e:
            print(f"    ERROR generating: {e}")
            all_passed = False
            continue

        # Parse
        parsed = simulate_parse_insight(raw_output)
        if not parsed:
            print(f"    FAIL: parseInsight returned null")
            all_passed = False
            continue

        # Validate
        issues = validate_parsed(parsed, poem["content"])

        if issues:
            print(f"    FAIL: {len(issues)} issue(s):")
            for issue in issues:
                print(f"      - {issue}")
            all_passed = False
        else:
            print(f"    PASS")
            arabic_lines = len([l for l in poem["content"].strip().split("\n") if l.strip()])
            english_lines = len([l for l in parsed["poeticTranslation"].strip().split("\n") if l.strip()])
            print(f"      Lines: {arabic_lines} Arabic -> {english_lines} English")
            print(f"      Depth: {len(parsed['depth'])} chars")
            print(f"      Author: {len(parsed['author'])} chars")

        results.append({
            "poem_id": poem["id"],
            "passed": len(issues) == 0,
            "issues": issues,
            "parsed": parsed,
        })

    # Summary
    print(f"\n[3/3] Validation Summary")
    passed = sum(1 for r in results if r["passed"])
    failed = len(results) - passed
    print(f"  Passed: {passed}/{len(results)}")
    print(f"  Failed: {failed}/{len(results)}")

    if all_passed:
        print("\n  All validations passed. Safe to run with --write.")
    else:
        print("\n  Some validations failed. Review issues before running --write.")

    # Save validation report
    report_path = DATA_DIR / "prompt_validation_report.json"
    report_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(f"  Validation report: {report_path}")

    return all_passed


def update_prompts_js():
    """Replace INSIGHTS_SYSTEM_PROMPT in src/prompts.js with the optimized prompt."""
    if not PROMPTS_JS_PATH.exists():
        print(f"ERROR: {PROMPTS_JS_PATH} not found.")
        sys.exit(1)

    content = PROMPTS_JS_PATH.read_text(encoding="utf-8")

    # Find and replace the INSIGHTS_SYSTEM_PROMPT backtick string.
    # Match: export const INSIGHTS_SYSTEM_PROMPT = `...`;
    pattern = r"(export\s+const\s+INSIGHTS_SYSTEM_PROMPT\s*=\s*`)([^`]*)(`;)"

    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print("ERROR: Could not find INSIGHTS_SYSTEM_PROMPT in src/prompts.js")
        print("  Expected pattern: export const INSIGHTS_SYSTEM_PROMPT = `...`;")
        sys.exit(1)

    # Escape backticks and ${} in the prompt for JS template literals
    js_safe_prompt = OPTIMIZED_PROMPT.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

    new_content = content[: match.start(2)] + "\n" + js_safe_prompt + "\n" + content[match.end(2) :]

    # Verify the replacement
    verify_match = re.search(pattern, new_content, re.DOTALL)
    if not verify_match:
        print("ERROR: Replacement corrupted the file structure.")
        sys.exit(1)

    PROMPTS_JS_PATH.write_text(new_content, encoding="utf-8")
    print(f"[updated] {PROMPTS_JS_PATH}")
    print(f"  Prompt size: {len(OPTIMIZED_PROMPT)} chars")

    # Verify parseInsight compatibility on the new prompt format
    # Extract what we just wrote
    check_content = PROMPTS_JS_PATH.read_text(encoding="utf-8")
    check_match = re.search(pattern, check_content, re.DOTALL)
    if check_match:
        print(f"  Verified: INSIGHTS_SYSTEM_PROMPT found in updated file")
    else:
        print(f"  WARNING: Could not re-verify INSIGHTS_SYSTEM_PROMPT")


def main():
    args = parse_args()

    print("=" * 60)
    print("STEP 6: UPDATE PROMPTS")
    print("=" * 60)
    print(f"  Optimized prompt size: {len(OPTIMIZED_PROMPT)} chars")
    print(f"  Target file: {PROMPTS_JS_PATH}")

    # Show the key features of the optimized prompt
    print("\n  Key features of optimized prompt:")
    print("    - Multi-expert synthesis (bridge + scholar + craftsperson) in single call")
    print("    - 1:1 Arabic-to-English line mapping enforced")
    print(f"    - {len(HUMANIZER_ANTI_PATTERNS['banned_phrases'])} banned phrases embedded")
    print(f"    - {len(HUMANIZER_ANTI_PATTERNS['banned_qualifiers'])} banned qualifiers embedded")
    print(f"    - {len(HUMANIZER_ANTI_PATTERNS['structural_anti_patterns'])} structural anti-patterns")
    print("    - Output format: POEM: / THE DEPTH: / THE AUTHOR:")

    if args.validate:
        success = run_validation(args.sample_size)
        sys.exit(0 if success else 1)

    elif args.write:
        print("\n--- Write Mode ---")

        # Check if validation was run first
        report_path = DATA_DIR / "prompt_validation_report.json"
        if report_path.exists():
            report = json.loads(report_path.read_text(encoding="utf-8"))
            passed = sum(1 for r in report if r.get("passed"))
            total = len(report)
            print(f"  Last validation: {passed}/{total} passed")
            if passed < total:
                print("  WARNING: Not all validations passed. Proceeding anyway.")
        else:
            print("  NOTE: No validation report found. Consider running --validate first.")

        update_prompts_js()
        print("\n[done] Prompt updated successfully.")


if __name__ == "__main__":
    main()
