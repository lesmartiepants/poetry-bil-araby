#!/usr/bin/env python3
"""Scaffold (or extend) a docs-builder reference and register it in INDEX.md.

Idempotent: re-running for an existing slug updates the INDEX row (keywords,
summary, date) without clobbering already-written SYNTHESIS.md / raw / sources.

Usage:
    ref_init.py --topic "Supabase Row Level Security" \
                --keywords "rls, row level security, auth.uid, postgres policy" \
                --summary "RLS policy patterns and gotchas for Supabase"
"""
import argparse
import datetime
import os
import re
import subprocess
import sys

STORE_REL = os.path.join(".claude", "docs-builder", "references")

SYNTHESIS_TEMPLATE = """# {topic} — synthesis
_Built {date} · sources in sources.json · raw docs in raw/_

## Orientation
<2-4 sentences: what this is, the mental model, the one thing to get right.>

## Key patterns
- **<pattern>**: <terse how + when>. `detail: raw/<file>:<lines>`

## Common API calls
| call | signature | returns / notes | detail |
|------|-----------|-----------------|--------|
| `<call>` | `<sig>` | `<notes>` | `raw/<file>:<lines>` |

## Gotchas
- <the sharp edge>, <why it bites>. `detail: raw/<file>:<lines>`

## Recipes
<Optional: 1-3 copy-pasteable end-to-end snippets for the most common tasks.>

## Not covered / open questions
<What you deliberately left out, or couldn't verify.>
"""

INDEX_HEADER = """# Reference Index

References docs-builder has built. **Before web-searching docs for any topic
below, read its SYNTHESIS.md instead** — it's faster, cheaper, and reusable.
The `keywords` column is what `ref_lookup.py` and the pre-websearch hook match
against, so keep it rich with the phrasings someone would actually type.

| topic | keywords | dir | updated | summary |
|-------|----------|-----|---------|---------|
"""


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "untitled"


def find_repo_root():
    proj = os.environ.get("CLAUDE_PROJECT_DIR")
    if proj and os.path.isdir(proj):
        return proj
    try:
        root = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
        if root:
            return root
    except Exception:
        pass
    return os.getcwd()


def upsert_index_row(index_path, topic, keywords, slug, date, summary):
    """Insert or replace the INDEX.md row for this slug."""
    ref_dir = slug + "/"
    new_row = f"| {topic} | {keywords} | {ref_dir} | {date} | {summary} |\n"
    if not os.path.exists(index_path):
        with open(index_path, "w", encoding="utf-8") as fh:
            fh.write(INDEX_HEADER + new_row)
        return "created index"
    with open(index_path, encoding="utf-8") as fh:
        lines = fh.readlines()
    for i, line in enumerate(lines):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 3 and cells[2] == ref_dir:
            lines[i] = new_row
            with open(index_path, "w", encoding="utf-8") as fh:
                fh.writelines(lines)
            return "updated row"
    # Append after the table (end of file is fine; rows are contiguous).
    if not lines[-1].endswith("\n"):
        lines[-1] += "\n"
    lines.append(new_row)
    with open(index_path, "w", encoding="utf-8") as fh:
        fh.writelines(lines)
    return "added row"


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True)
    ap.add_argument("--keywords", default="")
    ap.add_argument("--summary", default="")
    ap.add_argument("--slug", default=None)
    args = ap.parse_args(argv)

    slug = args.slug or slugify(args.topic)
    date = datetime.date.today().isoformat()
    store = os.path.join(find_repo_root(), STORE_REL)
    topic_dir = os.path.join(store, slug)
    raw_dir = os.path.join(topic_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)

    synth = os.path.join(topic_dir, "SYNTHESIS.md")
    created = []
    if not os.path.exists(synth):
        with open(synth, "w", encoding="utf-8") as fh:
            fh.write(SYNTHESIS_TEMPLATE.format(topic=args.topic, date=date))
        created.append("SYNTHESIS.md")

    sources = os.path.join(topic_dir, "sources.json")
    if not os.path.exists(sources):
        with open(sources, "w", encoding="utf-8") as fh:
            fh.write("[]\n")
        created.append("sources.json")

    index_action = upsert_index_row(
        os.path.join(store, "INDEX.md"),
        args.topic, args.keywords, slug, date, args.summary,
    )

    print(f"Reference '{slug}' ready at {topic_dir}")
    print(f"  index: {index_action}")
    print(f"  created: {', '.join(created) if created else '(nothing new — extending existing)'}")
    print("\nNext: harvest sources into raw/, record them in sources.json,")
    print("then distill SYNTHESIS.md (see the skill's format spec).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
