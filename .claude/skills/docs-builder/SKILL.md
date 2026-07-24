---
name: docs-builder
description: >-
  Build and reuse a persistent, token-efficient reference library for external
  libraries, APIs, SDKs, frameworks, and tools. Use this skill WHENEVER you are
  about to research how to use something external — read official docs,
  understand an API, set up an integration, or web-search documentation. FIRST
  check the local reference library at .claude/docs-builder/references/: if a
  reference already exists, load its SYNTHESIS.md instead of re-searching the
  web; if it is missing, build one by harvesting official docs, GitHub, and
  high-signal blog/Reddit posts, then distill a compact synthesis with
  line-level pointers into the raw docs. Trigger on requests like "how do I use
  X", "research the docs for Y", "set up / integrate Z", "build a reference for
  X", "what's the API for", "I keep forgetting how W works", or any task where
  you would otherwise read a lot of external documentation. Especially reach for
  this skill the moment you find yourself about to WebSearch or WebFetch
  documentation — a saved reference is faster, cheaper, and reusable.
---

# docs-builder

A system for turning scattered web documentation into a **persistent, reusable, token-efficient reference library** that lives in the repo. You build a reference once; every future session loads a compact synthesis and drills into raw docs only where needed.

## Why this exists

Reading docs off the web is expensive and lossy. You burn tokens fetching whole pages, you do it again next week, and the good parts (the one gotcha, the exact signature) are buried in marketing prose. This skill front-loads that work into a structured reference so that:

- **The expensive step happens once.** Harvesting and reading docs is done at build time, not every time.
- **Recall is cheap.** Day-to-day you read one small `SYNTHESIS.md`, then `Read` only the specific `raw/<file>:<lines>` a task needs. That's the whole token-efficiency game: a small always-loaded layer that points into a large load-on-demand layer.
- **Knowledge compounds.** References accumulate and are committable, so the team (and future you) inherit them.

## The mental model: three layers of disclosure

```
.claude/docs-builder/references/
  INDEX.md                  # tiny. topic -> dir map. cheap to scan.
  <topic-slug>/
    SYNTHESIS.md            # small. patterns, API calls, gotchas + pointers.
    raw/                     # large. harvested docs, chunked by subtopic.
      <subtopic>.md
    sources.json            # provenance: url, date, type, trust.
```

Layer 1 (`INDEX.md`) tells you _whether_ a reference exists. Layer 2 (`SYNTHESIS.md`) answers most questions outright. Layer 3 (`raw/`) holds the full detail, reached only by following a pointer. Never load layer 3 wholesale — that defeats the purpose.

## Step 0 — Locate the store

All paths resolve from the repo root. The scripts handle this for you (`git rev-parse --show-toplevel`), but when reading files directly, the store is `<repo-root>/.claude/docs-builder/references/`.

---

## Mode A — A reference might already exist (the common case)

This is where you start for almost every "how do I use X" task. **Check before you search.**

1. Look it up:

   ```bash
   python3 .claude/skills/docs-builder/scripts/ref_lookup.py "<the thing you need, in plain words>"
   ```

   It scores the query against `INDEX.md` topics + keywords and prints matching reference dirs (exit code 1 = no match).

2. On a hit, read that topic's `SYNTHESIS.md`. It's small by design — read the whole thing.

3. Follow pointers **only as needed.** When the synthesis says `detail: raw/auth.md:40-95`, use `Read` with `offset`/`limit` to pull just those lines. Don't read whole `raw/` files unless you're genuinely exploring.

4. If the synthesis answers the task, you're done — no web access at all. If it's missing a piece or looks stale (check `sources.json` dates against how fast the thing moves), go to Mode B to extend or refresh it.

> A `PreToolUse` hook also runs this lookup automatically before `WebSearch`/`WebFetch` and reminds you when a reference exists. Treat that nudge as authoritative: read the reference first.

---

## Mode B — Build (or extend) a reference

Triggered when no reference exists, or an existing one is stale/incomplete.

### B1. Scaffold

```bash
python3 .claude/skills/docs-builder/scripts/ref_init.py \
  --topic "Supabase Row Level Security" \
  --keywords "rls, row level security, auth.uid, postgres policy, supabase auth" \
  --summary "RLS policy patterns and gotchas for Supabase Postgres"
```

This creates the topic dir, an empty `raw/`, a `sources.json` (`[]`), a `SYNTHESIS.md` from the template, and adds/updates the `INDEX.md` row. It's idempotent — safe to re-run to extend. The `keywords` matter: they're what the lookup and the hook match against, so include the phrasings someone would actually type, plus key symbol names.

### B2. Gather sources (priority order)

Spend effort proportional to source quality. The goal is correctness, not volume.

1. **Official docs — primary.** The canonical reference, guides, API pages. This is the backbone; most of `raw/` should be this.
2. **GitHub — ground truth.** README, `/examples`, and when docs are thin or ambiguous, the actual source (type signatures, defaults, error messages). A repo's issues surface real-world gotchas.
3. **Blogs / Reddit / StackOverflow — gap-fillers only.** Use these for the things official docs omit: migration pain, version breakage, "why doesn't X work." Treat as lower-trust; verify claims against official docs or source before they enter the synthesis. Never let a blog post be the sole source for an API signature.

**How to fetch:** use the `/browse` skill for web browsing (per project convention). Fall back to `WebFetch` for a known URL or `WebSearch` to find URLs. When fetching is broad or multi-page, spawn parallel subagents (one per source) so harvesting doesn't serialize.

### B3. Harvest into `raw/`

For each source worth keeping, write a `raw/<subtopic>.md` file. Chunk by subtopic (`auth.md`, `rls.md`, `realtime.md`), not by source URL — you want to find things by what they're about. Keep the substance (signatures, code blocks, parameter tables, error conditions); drop nav, ads, and prose padding. Preserve enough that the line pointers in the synthesis land on real content.

Record every source in `sources.json`:

```json
[
  {
    "file": "raw/rls.md",
    "url": "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "type": "official",
    "trust": "high",
    "fetched": "2026-05-30"
  }
]
```

`type`: `official` | `github` | `blog` | `forum`. `trust`: `high` | `medium` | `low`.

### B4. Distill `SYNTHESIS.md` (the payoff)

This is the artifact that gets read a thousand times. Make it dense, scannable, and pointer-rich. Follow the format below exactly — consistency is what lets future Claude trust the structure without re-learning it each time.

### B5. Finalize

- Confirm the `INDEX.md` row is accurate (summary + keywords reflect what you actually built).
- **Optional semantic recall:** if `gbrain` is available (`command -v gbrain`), ingest the synthesis so vague queries surface it even without keyword overlap:
  ```bash
  gbrain put "ref/<topic-slug>" < .claude/docs-builder/references/<topic-slug>/SYNTHESIS.md
  ```
- Tell the user what you built and where, and surface anything you couldn't verify.

---

## SYNTHESIS.md format

ALWAYS use this structure. Every factual claim that has deeper detail ends with a `detail: raw/<file>:<start>-<end>` pointer so the reader can drill in for a few tokens instead of loading everything.

```markdown
# <Topic> — synthesis

_Built <date> · sources in sources.json · raw docs in raw/_

## Orientation

<2-4 sentences: what this is, the mental model, the one thing to get right.>

## Key patterns

- **<pattern name>**: <terse how + when>. `detail: raw/<file>:<lines>`
- **<pattern name>**: <terse how>. `detail: raw/<file>:<lines>`

## Common API calls

| call                      | signature                     | returns / notes              | detail               |
| ------------------------- | ----------------------------- | ---------------------------- | -------------------- |
| `client.from(t).select()` | `(cols?) => PostgrestBuilder` | `{ data, error }`, chainable | `raw/api.md:120-145` |

## Gotchas

- <the sharp edge>, <why it bites>. `detail: raw/<file>:<lines>`

## Recipes

<Optional: 1-3 copy-pasteable end-to-end snippets for the most common tasks.>

## Not covered / open questions

<What you deliberately left out, or couldn't verify. Honesty here saves the next reader a wasted search.>
```

**Example entry** (what good looks like):

Input: official RLS docs + a blog post about a common policy mistake.
Output line in Key patterns:
`- **Owner-only rows**: enable RLS on the table, then \`create policy ... using (auth.uid() = user_id)\`. Without the enable step the policy is silently ignored. detail: raw/rls.md:12-30`

Notice: the pattern is stated outright (no need to open `raw/` for the common case), but the pointer is there for the full policy syntax and edge cases.

## Keeping references honest

- **Staleness:** fast-moving tools (frameworks, SDKs) go stale in months; stable specs (HTTP, SQL) don't. When loading a reference, glance at `sources.json` dates. If it predates a major version you know shipped, refresh the affected `raw/` files and bump the synthesis.
- **Don't fabricate pointers.** A `detail:` pointer must land on real lines in a real file. If you didn't harvest it, don't cite it.
- **Extend, don't duplicate.** If a topic exists but lacks a subtopic, add a `raw/` file and a synthesis entry rather than creating a second overlapping topic.

## Bundled scripts

| script                                                         | purpose                                                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/ref_lookup.py "<query>"`                              | Find existing references by query. Exit 1 = none. Used by you and by the hook.                                                                      |
| `scripts/ref_init.py --topic ... --keywords ... --summary ...` | Scaffold/extend a reference dir and the INDEX row. Idempotent.                                                                                      |
| `scripts/pre_websearch_hook.py`                                | PreToolUse hook. Reads tool input on stdin, injects a "you already have a reference" nudge before WebSearch/WebFetch on an index hit. Non-blocking. |

The hook is registered in `.claude/settings.json` under `PreToolUse` matching `WebSearch|WebFetch`. It never blocks a search — it only adds context when a relevant reference already exists.
