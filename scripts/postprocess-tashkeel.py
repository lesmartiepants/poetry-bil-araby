#!/usr/bin/env python3
"""Post-process diacritized poems to fix known Mishkal issues.

Applies built-in fixes and extensible learned rules to improve tashkeel quality.
Re-runnable: running again after adding new rules applies only new fixes.

Usage:
    python scripts/postprocess-tashkeel.py
    python scripts/postprocess-tashkeel.py --input poems_diacritized_complete.parquet
    python scripts/postprocess-tashkeel.py --dry-run  # preview changes without saving
"""
import json
import re
import sys
import argparse
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Error: pandas not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

try:
    import pyarabic.araby as araby
except ImportError:
    print("Error: pyarabic not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

DATA_DIR = Path(__file__).parent / "diacritize-data"
DEFAULT_INPUT = DATA_DIR / "poems_diacritized_complete.parquet"
DEFAULT_OUTPUT = DATA_DIR / "poems_diacritized_final.parquet"
FIX_LOG = DATA_DIR / "postprocess-log.json"

# Arabic constants
TASHKEEL_PATTERN = re.compile("[\u064B-\u0652]")
DUPLICATE_MARKS = re.compile(r"([\u064B-\u0652])\1+")
ARABIC_LETTER = re.compile("[\u0621-\u064A]")
HEMISTICH_SEP = "*"


# ── Built-in fixes ───────────────────────────────────────────────────

def fix_normalize_whitespace(text):
    """Strip and collapse double spaces."""
    text = text.strip()
    text = re.sub(r"  +", " ", text)
    return text


def fix_deduplicate_marks(text):
    """Remove consecutive duplicate tashkeel marks."""
    return DUPLICATE_MARKS.sub(r"\1", text)


def fix_line_ending_tashkeel(text):
    """For hemistichs ending on unmarked consonant, re-diacritize last word.

    Uses Mishkal with enable_last_mark() on just the last word to get
    the appropriate ending mark.
    """
    try:
        from mishkal.tashkeel import TashkeelClass
    except ImportError:
        return text

    lines = text.split("\n")
    fixed_lines = []
    vocalizer = None  # lazy init

    for line in lines:
        parts = line.split(HEMISTICH_SEP)
        fixed_parts = []
        for part in parts:
            stripped_part = part.strip()
            if not stripped_part:
                fixed_parts.append(part)
                continue

            # Find last Arabic letter
            last_letter_idx = -1
            for i in range(len(stripped_part) - 1, -1, -1):
                if ARABIC_LETTER.match(stripped_part[i]):
                    last_letter_idx = i
                    break

            if last_letter_idx == -1:
                fixed_parts.append(part)
                continue

            # Check if already marked
            has_mark = False
            if (last_letter_idx + 1 < len(stripped_part)
                    and stripped_part[last_letter_idx + 1] in "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652"):
                has_mark = True
            if (last_letter_idx + 2 < len(stripped_part)
                    and stripped_part[last_letter_idx + 1] == "\u0651"
                    and stripped_part[last_letter_idx + 2] in "\u064B\u064C\u064D\u064E\u064F\u0650\u0652"):
                has_mark = True

            if has_mark:
                fixed_parts.append(part)
                continue

            # Extract last word and re-diacritize it
            bare = araby.strip_tashkeel(stripped_part)
            words = bare.split()
            if not words:
                fixed_parts.append(part)
                continue

            last_word = words[-1]
            if not ARABIC_LETTER.search(last_word):
                fixed_parts.append(part)
                continue

            # Lazy init vocalizer
            if vocalizer is None:
                vocalizer = TashkeelClass()
                vocalizer.set_limit(100000)

            # Diacritize just the last word
            try:
                diacritized_word = vocalizer.tashkeel(last_word).strip()
            except Exception:
                fixed_parts.append(part)
                continue

            # Extract the ending mark(s) from the diacritized word
            if not diacritized_word:
                fixed_parts.append(part)
                continue

            # Find the mark(s) at the end of the diacritized word
            end_marks = ""
            for ch in reversed(diacritized_word):
                if ch in "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652":
                    end_marks = ch + end_marks
                else:
                    break

            if end_marks:
                # Append the ending mark after the last Arabic letter in the original
                new_part = (stripped_part[:last_letter_idx + 1]
                           + end_marks
                           + stripped_part[last_letter_idx + 1:])
                # Preserve original leading/trailing whitespace
                leading = len(part) - len(part.lstrip())
                trailing = len(part) - len(part.rstrip())
                new_part = part[:leading] + new_part + part[len(part)-trailing:] if trailing else part[:leading] + new_part
                fixed_parts.append(new_part)
            else:
                fixed_parts.append(part)

        fixed_lines.append(HEMISTICH_SEP.join(fixed_parts))

    return "\n".join(fixed_lines)


# ── Built-in rule registry ───────────────────────────────────────────

BUILTIN_RULES = [
    {
        "name": "normalize_whitespace",
        "description": "Strip and collapse double spaces",
        "apply": fix_normalize_whitespace,
    },
    {
        "name": "deduplicate_marks",
        "description": "Remove consecutive duplicate tashkeel marks",
        "apply": fix_deduplicate_marks,
    },
    {
        "name": "line_ending_tashkeel",
        "description": "Add tashkeel to unmarked hemistich-ending consonants",
        "apply": fix_line_ending_tashkeel,
    },
]


# ── Learned rules (populated by Arabic quality review agent) ─────────
# Each rule is a dict with: name, description, apply (function), source, confidence
# The agent adds rules here after reviewing a stratified sample of poems.
# Rules are applied in order after built-in rules.

LEARNED_RULES = [
    # Example (to be populated by arabic-review agent):
    # {
    #     "name": "tanween_on_proper_nouns",
    #     "description": "Mishkal adds tanween to well-known proper nouns",
    #     "apply": lambda text: text,  # actual fix function
    #     "source": "arabic-review-agent",
    #     "confidence": 0.9,
    # },
]


# ── Main post-processing logic ───────────────────────────────────────

def postprocess(input_path, output_path, dry_run=False):
    """Apply all rules to diacritized poems."""
    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df)} poems from {input_path}")

    all_rules = BUILTIN_RULES + LEARNED_RULES
    print(f"Applying {len(all_rules)} rules: "
          + ", ".join(r["name"] for r in all_rules))

    fix_counts = {r["name"]: 0 for r in all_rules}
    total_changed = 0

    for idx in range(len(df)):
        original = df.iloc[idx]["diacritized_content"]
        current = original

        for rule in all_rules:
            before = current
            current = rule["apply"](current)
            if current != before:
                fix_counts[rule["name"]] += 1

        if current != original:
            total_changed += 1
            if not dry_run:
                df.at[df.index[idx], "diacritized_content"] = current

    # Summary
    print(f"\n{'='*60}")
    print(f"POST-PROCESSING SUMMARY")
    print(f"{'='*60}")
    print(f"Total poems: {len(df)}")
    print(f"Poems changed: {total_changed} ({total_changed/len(df)*100:.1f}%)")
    print(f"\nFix counts by rule:")
    for rule in all_rules:
        count = fix_counts[rule["name"]]
        print(f"  {rule['name']}: {count} poems")

    # Write output
    if not dry_run:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, index=False)
        print(f"\nOutput: {output_path}")
    else:
        print(f"\n[DRY RUN] No files written.")

    # Write fix log
    log = {
        "total_poems": len(df),
        "poems_changed": total_changed,
        "fix_counts": fix_counts,
        "rules_applied": [r["name"] for r in all_rules],
        "dry_run": dry_run,
    }
    FIX_LOG.parent.mkdir(parents=True, exist_ok=True)
    FIX_LOG.write_text(json.dumps(log, indent=2))
    print(f"Fix log: {FIX_LOG}")

    return log


def main():
    parser = argparse.ArgumentParser(
        description="Post-process diacritized poems to fix known Mishkal issues"
    )
    parser.add_argument("--input", type=str, default=str(DEFAULT_INPUT),
                        help=f"Input parquet (default: {DEFAULT_INPUT})")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT),
                        help=f"Output parquet (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without saving")
    args = parser.parse_args()

    postprocess(args.input, args.output, args.dry_run)


if __name__ == "__main__":
    main()
