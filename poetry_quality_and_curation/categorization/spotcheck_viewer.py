#!/usr/bin/env python3
"""Rich multi-version spot-check viewer.

Renders a self-contained dark-theme HTML page comparing the judge (3.1-pro) vs
gemini-2.5-flash vs gemini-3.6-flash across EVERY prompt version, for 20 spot-
check poems. Reads ``data/spotcheck_versions.json`` (schema: prompt_versions +
models + judge_model + poems[pid].labels[vid][model]).

Features
--------
* AR/EN poem toggle.
* Prompt-version selector (top controls): pick one version; the judge/candidate
  comparison tables switch live (all versions pre-rendered, toggled by a body
  class -> instant + correct). Defaults to the LAST version (v4-rubric).
* One-chip-per-line label diff ordered by the JUDGE baseline
  (green=match, red=flash-added, blue=judge-had/flash-missed, ★=primary),
  with line-broken hover tooltips (dimension options).
* Stylized intensity bar + delta-vs-judge pills.
* Per-version accessibility rendering:
    - level_1_5 versions  -> 5-pip meter + numeric + delta.
    - factors_0_10 versions -> 0-10 meter + score + the five 1-5 sub-factors
      (lex/syn/img/all/narr) as tiny labelled pips (+ hover tooltip), delta on
      the 0-10 score.
* Sortable columns; sorting keys read the CURRENTLY selected version's judge
  intensity / accessibility / agreement so they stay meaningful on switch.
* Right sidebar: view mode (per-version prompt markdown, AR/EN toggle, "what
  changed" note) + diff mode (pick A/B versions -> line-level difflib diff of
  the prompt texts). Prompt-feedback textarea preserved.
* Per-poem feedback (localStorage + export). Export bundles poem feedback +
  prompt feedback + records the active version.

Run:  python -m poetry_quality_and_curation.categorization.spotcheck_viewer
  or  python poetry_quality_and_curation/categorization/spotcheck_viewer.py
Writes: data/spotcheck_viewer.html (repo artifact).
"""
import difflib
import hashlib
import html
import json
import re
import sys
from pathlib import Path

# Allow running as a bare script from anywhere in the worktree.
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

import markdown as _markdown  # noqa: E402
from poetry_quality_and_curation.categorization import config, prompts  # noqa: E402

D = Path(__file__).resolve().parent / "data"
OUT = D / "spotcheck_viewer.html"

data = json.load(open(D / "spotcheck_versions.json", encoding="utf-8"))
PROMPT_VERSIONS = data["prompt_versions"]          # {vid: {name, changed, access}}
MODELS = data["models"]                            # [judge, 2.5-flash, 3.6-flash]
JUDGE_MODEL = data.get("judge_model", "judge")
POEMS = list(data["poems"].values())

VIDS = list(PROMPT_VERSIONS.keys())
DEFAULT_VID = VIDS[-1]                              # last version (v4-rubric)
CAND_MODELS = [m for m in MODELS if m != "judge"]  # candidates in order

esc = lambda s: html.escape(s or "", quote=True)
slug = lambda vid: re.sub(r"[^a-z0-9]", "", vid.lower())

# ---------------------------------------------------------------------------
# English label glosses + dimension tooltips (shared across versions).
# ---------------------------------------------------------------------------
EN = {}
for _dim, _spec in config.DIMENSIONS.items():
    for _key, _ar, _en in _spec["values"]:
        EN[_key] = f"{_en} · {_ar}"

DIMLBL = {"mood": "Mood", "topic": "Topic", "motif": "Motif"}
MAXN = {"mood": 4, "topic": 4, "motif": 5}


def _opts_lines(d, per=2):
    opts = [EN[k] for k, _, _ in config.DIMENSIONS[d]["values"]]
    return "\n".join("  ·  ".join(opts[i:i + per]) for i in range(0, len(opts), per))


DIM_TIP = {d: f"{DIMLBL[d]} (multi-label, up to {MAXN[d]}).\nOptions:\n" + _opts_lines(d)
           for d in config.DIMENSIONS}
INT_TIP = ("Emotional intensity (0-100)\nhow emotionally charged the poem is\n"
           "blue <40 calm\namber 40-70\nred >70 intense")
ACC_TIP_LEVEL = ("Accessibility (1-5)\n1 = easy for Arabic learners\n"
                 "5 = requires deep classical knowledge\n"
                 "green (1-2) easy · amber (3) · red (4-5) hard")
ACC_TIP_FACTORS = (
    "Accessibility (0-10 derived score; higher = harder)\n"
    "from 5 sub-factors (each 1 easy → 5 hard):\n"
    "lex lexical rarity · syn syntax complexity · img imagery abstraction\n"
    "all allusion / referential load · narr narrativity (storytelling)\n"
    "weights allusion=4, lexical=3, syntax=2, imagery=2, narrativity=1\n"
    "green <3.5 easy · amber 3.5-6.5 · red >6.5 hard")
PRIM_TIP = "Primary mood\nthe single dominant mood\n(one of the mood options)"

FACTOR_ABBR = [("lexical", "lex"), ("syntax", "syn"), ("imagery_abstraction", "img"),
               ("allusion", "all"), ("narrativity", "narr")]

# ---------------------------------------------------------------------------
# Prompt text -> markdown (reused for view mode); AR + EN (translate/cache EN).
# ---------------------------------------------------------------------------
def _prompt_to_md(p):
    out = []
    for ln in (p or "").split("\n"):
        t = ln.strip()
        if t.startswith("■"):
            out.append("### " + t.lstrip("■").strip())
        elif t.startswith("- "):
            out.append("- " + t[2:].strip())
        elif t.startswith("{") and t.endswith("}"):
            out.append("```json\n" + t + "\n```")
        elif t.endswith(":") and len(t) < 70:
            out.append("### " + t)
        else:
            out.append(ln.rstrip())
    return "\n".join(out)


def _md(p):
    return _markdown.markdown(_prompt_to_md(p), extensions=["fenced_code"])


def _env_candidates():
    """.env files to try: the worktree root, and (if we're inside a git worktree)
    the primary checkout root, which is where API keys usually live."""
    cands = [_REPO / ".env"]
    s = str(_REPO)
    marker = "/.claude/worktrees/"
    if marker in s:
        cands.append(Path(s[:s.index(marker)]) / ".env")
    return [c for c in cands if c.exists()]


_PCACHE = D / "prompt_en_cache.json"


def _load_encache():
    """Return {vid: {'hash':h,'en':en}}, migrating the legacy single-prompt cache
    ({'hash','en'} == the v2 baseline) into the per-version shape."""
    if not _PCACHE.exists():
        return {}
    try:
        c = json.loads(_PCACHE.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if "versions" in c:
        return c["versions"]
    if "hash" in c:  # legacy flat cache — belongs to whichever version matches.
        for vid in VIDS:
            if hashlib.sha1(prompts.get_text(vid).encode()).hexdigest()[:12] == c["hash"]:
                return {vid: {"hash": c["hash"], "en": c.get("en", "")}}
    return {}


def _translate_prompt_en(text):
    """Translate an Arabic prompt to English, preserving structure. Returns None
    on any failure so the build never hard-depends on network/API."""
    try:
        from dotenv import load_dotenv
        # Load .env from the worktree AND the main checkout (worktree .env may
        # lack the API key that lives in the primary repo root).
        for envp in _env_candidates():
            load_dotenv(str(envp))
        import litellm
        kw = config.resolve_provider("gemini/gemini-2.5-flash")
        instruction = (
            "Translate this Arabic LLM classification prompt to English. "
            "Preserve the structure exactly: keep the ■ section markers, keep each "
            "'- key (...)' bullet with its English key slug unchanged, and keep the "
            "final JSON schema line(s) verbatim. Translate only the Arabic instructional "
            "prose and the Arabic glosses. Return only the translated prompt, nothing else.\n\n"
        )
        r = litellm.completion(
            model="gemini/gemini-2.5-flash",
            messages=[{"role": "user", "content": instruction + text}],
            max_tokens=3000, **kw)
        return (r.choices[0].message.content or "").strip() or None
    except Exception as e:  # noqa: BLE001
        print(f"  [warn] EN translation failed: {e}", file=sys.stderr)
        return None


_encache = _load_encache()
_encache_dirty = False
PROMPT_META = {}   # vid -> {name, changed, access, text, ar_html, en_html, has_en}
for vid in VIDS:
    text = prompts.get_text(vid)
    h = hashlib.sha1(text.encode()).hexdigest()[:12]
    ce = _encache.get(vid)
    en = ce.get("en") if ce and ce.get("hash") == h else None
    if en is None:
        en = _translate_prompt_en(text)
        if en:
            _encache[vid] = {"hash": h, "en": en}
            _encache_dirty = True
    meta = PROMPT_VERSIONS[vid]
    PROMPT_META[vid] = {
        "name": meta["name"],
        "changed": meta.get("changed", ""),
        "access": meta.get("access", "level_1_5"),
        "text": text,
        "ar_html": _md(text),
        "en_html": _md(en) if en else "",
        "has_en": bool(en),
    }
if _encache_dirty:
    _PCACHE.write_text(json.dumps({"versions": _encache}, ensure_ascii=False, indent=2),
                       encoding="utf-8")

# ---------------------------------------------------------------------------
# Comparison cells.
# ---------------------------------------------------------------------------
def _fmt_num(x):
    if isinstance(x, float):
        return f"{x:.1f}".rstrip("0").rstrip(".")
    return str(x)


def _delta(v, ref):
    if ref is None or not isinstance(v, (int, float)) or not isinstance(ref, (int, float)):
        return ""
    d = round(v - ref, 1)
    if d == 0:
        return '<span class="dlt zero" title="vs judge">0</span>'
    cls = "up" if d > 0 else "down"
    sign = "+" if d > 0 else ""
    return f'<span class="dlt {cls}" title="vs judge">{sign}{_fmt_num(d)}</span>'


def chip(v, cls, tip, star=False):
    return (f'<span class="chip tip {cls}" data-tip="{tip}">'
            f'{html.escape(EN.get(v, v))}{" ★" if star else ""}</span>')


def judge_labels(vals, dim, primary=None):
    tip = esc(DIM_TIP[dim])
    return " ".join(chip(v, "agree", tip, v == primary)
                    for v in (vals or [])) or "<span class='none'>—</span>"


def cand_labels(vals, jvals, dim, primary=None):
    """Judge-baseline order: walk judge labels (green if candidate has it, blue if
    missed), then append candidate-only extras (red)."""
    tip = esc(DIM_TIP[dim]); cset = set(vals or []); jset = set(jvals or [])
    parts = [chip(v, "agree" if v in cset else "missed", tip, v == primary) for v in (jvals or [])]
    for v in (vals or []):
        if v not in jset:
            parts.append(chip(v, "extra", tip, v == primary))
    return " ".join(parts) or "<span class='none'>—</span>"


def judge_prim(p):
    return chip(p, "agree", esc(PRIM_TIP), True) if p else "<span class='none'>—</span>"


def cand_prim(cp, jp):
    tip = esc(PRIM_TIP)
    if not cp:
        return chip(jp, "missed", tip) if jp else "<span class='none'>—</span>"
    parts = [chip(cp, "agree" if cp == jp else "extra", tip, True)]
    if jp and jp != cp:
        parts.append(chip(jp, "missed", tip))
    return " ".join(parts)


def bar_cell(v, ref=None):
    iv = v if isinstance(v, (int, float)) else 0
    icls = "lo" if iv < 40 else ("mid" if iv < 70 else "hi")
    return (f'<div class="bar"><div class="fill {icls}" style="width:{iv}%"></div></div>'
            f'<b>{_fmt_num(v) if v is not None else "—"}</b>{_delta(v, ref)}')


def pips_cell(a, ref=None):
    """5-pip accessibility (level_1_5)."""
    av = a if isinstance(a, int) else 0
    acls = "easy" if av <= 2 else ("med" if av == 3 else "hard")
    pips = "".join(f'<i class="{"on" if k <= av else "off"}"></i>' for k in range(1, 6))
    return (f'<span class="pips {acls}">{pips}</span>'
            f'<b>{a if a is not None else "—"}</b>{_delta(a, ref)}')


def _sub_pip(name, abbr, val):
    v = val if isinstance(val, (int, float)) else 0
    cls = "easy" if v <= 2 else ("med" if v == 3 else "hard")
    full = {"lexical": "lexical rarity", "syntax": "syntax complexity",
            "imagery_abstraction": "imagery abstraction", "allusion": "allusion / referential load",
            "narrativity": "narrativity (storytelling)"}[name]
    return (f'<span class="subf {cls}" title="{full} = {_fmt_num(val) if val is not None else "?"} (1 easy → 5 hard)">'
            f'{abbr}<b>{_fmt_num(val) if val is not None else "?"}</b></span>')


def factors_cell(score, factors, ref_score=None):
    """0-10 accessibility meter + score + 5 sub-factor pips (factors_0_10)."""
    factors = factors or {}
    sv = score if isinstance(score, (int, float)) else 0
    acls = "easy" if sv < 3.5 else ("med" if sv <= 6.5 else "hard")
    subs = "".join(_sub_pip(name, abbr, factors.get(name)) for name, abbr in FACTOR_ABBR)
    return (f'<div class="accwrap">'
            f'<div class="accrow"><div class="bar acc"><div class="afill {acls}" '
            f'style="width:{sv * 10}%"></div></div>'
            f'<b>{_fmt_num(score) if score is not None else "—"}</b>'
            f'<span class="ref10">/10</span>{_delta(score, ref_score)}</div>'
            f'<div class="subs">{subs}</div></div>')


def access_cell(access_kind, row, judge_row):
    if access_kind == "factors_0_10":
        return factors_cell(row.get("accessibility_score"),
                            row.get("accessibility_factors"),
                            (judge_row or {}).get("accessibility_score"))
    return pips_cell(row.get("accessibility_level"),
                    (judge_row or {}).get("accessibility_level"))


def agree_pct(cand, judge):
    j = set((judge.get("moods") or []) + (judge.get("topics") or []) + (judge.get("motifs") or []))
    c = set((cand.get("moods") or []) + (cand.get("topics") or []) + (cand.get("motifs") or []))
    return round(100 * len(j & c) / len(j)) if j else 0


def _th(access_kind):
    return (f"<table class='cmp'><thead><tr><th></th>"
            f"<th>Judge · 3.1-pro <span class='ref'>(ref)</span></th>"
            f"<th>2.5-flash</th><th>3.6-flash</th></tr></thead><tbody>")


def _row(label, tip, cells, cls=""):
    tds = "".join(f"<td>{c}</td>" for c in cells)
    return (f"<tr class='{cls}'><td class='rl tip' data-tip=\"{esc(tip)}\">{label}</td>{tds}</tr>")


def build_table(poem, vid):
    labels = poem["labels"][vid]
    j = labels.get("judge", {})
    cands = [labels.get(m, {}) for m in CAND_MODELS]
    kind = PROMPT_META[vid]["access"]
    acc_tip = ACC_TIP_FACTORS if kind == "factors_0_10" else ACC_TIP_LEVEL
    jp = j.get("mood_primary")

    def cells_prim():
        return [judge_prim(jp)] + [cand_prim(c.get("mood_primary"), jp) for c in cands]

    def cells_dim(dim, field, use_prim):
        jvals = j.get(field)
        out = [judge_labels(jvals, dim, jp if use_prim else None)]
        for c in cands:
            out.append(cand_labels(c.get(field), jvals, dim,
                                    c.get("mood_primary") if use_prim else None))
        return out

    def cells_int():
        ji = j.get("emotional_intensity")
        return [bar_cell(ji)] + [bar_cell(c.get("emotional_intensity"), ji) for c in cands]

    def cells_acc():
        return [access_cell(kind, j, None)] + [access_cell(kind, c, j) for c in cands]

    return (_th(kind)
            + _row("primary", PRIM_TIP, cells_prim())
            + _row("mood", DIM_TIP["mood"], cells_dim("mood", "moods", True))
            + _row("topic", DIM_TIP["topic"], cells_dim("topic", "topics", False))
            + _row("motif", DIM_TIP["motif"], cells_dim("motif", "motifs", False))
            + _row("intensity", INT_TIP, cells_int(), "mtr")
            + _row("access", acc_tip, cells_acc(), "mtr")
            + "</tbody></table>")


def sort_data(poem):
    """Per-version numeric keys for sorting (read live by JS)."""
    out = {}
    for vid in VIDS:
        labels = poem["labels"][vid]
        j = labels.get("judge", {})
        kind = PROMPT_META[vid]["access"]
        acc = (j.get("accessibility_score") if kind == "factors_0_10"
               else j.get("accessibility_level"))
        row = {"int": j.get("emotional_intensity") or 0,
               "acc": acc if isinstance(acc, (int, float)) else 0,
               "prim": j.get("mood_primary") or ""}
        for m in CAND_MODELS:
            key = "a25" if "2.5" in m else "a36"
            row[key] = agree_pct(labels.get(m, {}), j)
        out[slug(vid)] = row
    return out


# ---------------------------------------------------------------------------
# Cards.
# ---------------------------------------------------------------------------
cards = []
for i, p in enumerate(POEMS, 1):
    ar = html.escape(p.get("content") or "").replace("*", "<br>").replace("\n", "<br>")
    en = html.escape(p.get("english") or "").replace("\n", "<br>")
    sd = sort_data(p)
    tables = "".join(
        f"<div class='cmpwrap cmp-{slug(vid)}'>{build_table(p, vid)}</div>" for vid in VIDS)
    cards.append(f"""
    <section class='card' data-num='{i}' data-pid='{p["id"]}'
             data-sort='{html.escape(json.dumps(sd), quote=True)}'>
      <div class='hd'><span class='num'>{i}</span> <span class='ttl'>{html.escape(p.get("title") or "(untitled)")}</span>
        <span class='poet'>{html.escape(p.get("poet_name") or "")}</span> <span class='pid'>#{p["id"]}</span>
        <span class='ag'></span></div>
      <div class='fb' data-pid='{p["id"]}'>
        <span class='fl'>judge</span>
        <button class='fbtn jgood' data-k='judge' data-v='good'>👍</button><button class='fbtn jbad' data-k='judge' data-v='bad'>👎</button>
        <span class='fl'>best</span>
        <button class='fbtn best' data-k='best' data-v='2.5'>2.5</button><button class='fbtn best' data-k='best' data-v='3.6'>3.6</button>
        <button class='fbtn best' data-k='best' data-v='tie'>tie</button><button class='fbtn best' data-k='best' data-v='weak'>both weak</button>
        <input class='note' data-k='note' placeholder='note…'>
      </div>
      <div class='body'>
        <div class='poem'><div class='ar' dir='rtl'>{ar}</div><div class='en' dir='ltr'>{en}</div></div>
        {tables}
      </div>
    </section>""")

# ---------------------------------------------------------------------------
# Prompt sidebar: version selector (view) + A/B diff + AR/EN + feedback.
# ---------------------------------------------------------------------------
def _vsel(idcls, active_vid):
    return "".join(
        f"<button data-vid='{slug(vid)}' class='{'on' if vid == active_vid else ''}'>{html.escape(PROMPT_META[vid]['name'])}</button>"
        for vid in VIDS)


# per-version prompt bodies (AR + EN), toggled by class.
_prompt_bodies = []
for vid in VIDS:
    m = PROMPT_META[vid]
    en_body = m["en_html"] if m["has_en"] else (
        "<p class='noen'>(English translation unavailable — showing Arabic source)</p>" + m["ar_html"])
    _prompt_bodies.append(
        f"<div class='pbody pbody-{slug(vid)}'>"
        f"<div class='vmeta'><div class='vname'>{html.escape(m['name'])}</div>"
        f"<div class='vchg'>{html.escape(m['changed'])}</div></div>"
        f"<div class='pbmd ar' dir='rtl'>{m['ar_html']}</div>"
        f"<div class='pbmd en' dir='ltr'>{en_body}</div></div>")

# pairwise diffs (difflib on the Arabic prompt source), embedded + toggled.
def _diff_html(a_vid, b_vid):
    a_lines = PROMPT_META[a_vid]["text"].split("\n")
    b_lines = PROMPT_META[b_vid]["text"].split("\n")
    rows = []
    for ln in difflib.Differ().compare(a_lines, b_lines):
        tag, txt = ln[:2], ln[2:]
        if tag == "? ":
            continue
        cls = {"+ ": "add", "- ": "del", "  ": "ctx"}.get(tag, "ctx")
        gut = {"add": "+", "del": "−", "ctx": " "}[cls]
        body = html.escape(txt) or "&nbsp;"
        rows.append(f"<div class='dl {cls}'><span class='gut'>{gut}</span>"
                    f"<span class='dtx' dir='rtl'>{body}</span></div>")
    ma, mb = PROMPT_META[a_vid], PROMPT_META[b_vid]
    header = (f"<div class='diffmeta'>"
              f"<div class='dm a'><span class='tag del'>A −</span> {html.escape(ma['name'])}"
              f"<div class='vchg'>{html.escape(ma['changed'])}</div></div>"
              f"<div class='dm b'><span class='tag add'>B +</span> {html.escape(mb['name'])}"
              f"<div class='vchg'>{html.escape(mb['changed'])}</div></div></div>")
    return f"<div class='diffwrap' data-pair='{slug(a_vid)}|{slug(b_vid)}'>{header}<div class='difflines'>{''.join(rows)}</div></div>"


_diffs = []
for a_vid in VIDS:
    for b_vid in VIDS:
        if a_vid != b_vid:
            _diffs.append(_diff_html(a_vid, b_vid))
_DEFAULT_A = VIDS[0]
_DEFAULT_B = VIDS[-1] if len(VIDS) > 1 else VIDS[0]

prompt_panel = (
    "<aside id='promptbar'>"
    "<div class='pbhd'><span>Classification prompt</span>"
    "<span class='pbright'>"
    "<span class='pseg' id='ptab'><button data-t='view' class='on'>view</button><button data-t='diff'>diff</button></span>"
    "<span class='pseg' id='plang'><button data-pl='ar' class='on'>عربي</button><button data-pl='en'>EN</button></span>"
    "<button id='closeprompt' title='close'>✕</button></span></div>"
    # VIEW mode: version selector + bodies.
    "<div class='pmode pmode-view'>"
    f"<div class='pvsel'><span class='pvl'>version</span><span class='pseg' id='pver'>{_vsel('pver', DEFAULT_VID)}</span></div>"
    f"{''.join(_prompt_bodies)}"
    "</div>"
    # DIFF mode: A/B selectors + diff bodies.
    "<div class='pmode pmode-diff'>"
    f"<div class='pvsel'><span class='pvl'>A</span><span class='pseg' id='diffA'>{_vsel('diffA', _DEFAULT_A)}</span>"
    f"<span class='pvl'>B</span><span class='pseg' id='diffB'>{_vsel('diffB', _DEFAULT_B)}</span></div>"
    f"<div class='diffbox'>{''.join(_diffs)}</div>"
    "</div>"
    "<div class='pbfb'><div class='pfl'>Prompt feedback (saved + included in export)</div>"
    "<textarea id='promptfb' placeholder='what would you change about the prompt? wording, missing guidance, label definitions…'></textarea></div>"
    "</aside>"
)

# version selector for the header controls.
def _verbtn(vid):
    on = " on" if vid == DEFAULT_VID else ""
    return (f"<button class='verbtn{on}' data-vid='{slug(vid)}'>"
            f"{html.escape(PROMPT_META[vid]['name'])}</button>")


header_vsel = "".join(_verbtn(vid) for vid in VIDS)

# JS lookups: slug -> access kind / name, and default slugs.
JS_ACCESS = json.dumps({slug(vid): PROMPT_META[vid]["access"] for vid in VIDS})
JS_DEFAULT = json.dumps(slug(DEFAULT_VID))
JS_VID_NAMES = json.dumps({slug(vid): PROMPT_META[vid]["name"] for vid in VIDS})
JS_DEFAULT_A = json.dumps(slug(_DEFAULT_A))
JS_DEFAULT_B = json.dumps(slug(_DEFAULT_B))
JS_DEFAULT_PVIEW = json.dumps(slug(DEFAULT_VID))

# CSS rules that show only the active version's tables / prompt body.
ver_css = "\n".join(f" body.ver-{slug(vid)} .cmp-{slug(vid)}{{display:block}}" for vid in VIDS)
pbody_css = "\n".join(f" #promptbar.pv-{slug(vid)} .pbody-{slug(vid)}{{display:block}}" for vid in VIDS)

HTML = f"""<!doctype html><html><head><meta charset='utf-8'><title>Spot-check · versions</title><style>
 :root{{--gold:#c9a35b}}
 body{{font-family:-apple-system,system-ui,sans-serif;margin:0;background:#0d0f12;color:#e8e6e3;line-height:1.45}}
 header{{position:sticky;top:0;background:#14171c;border-bottom:1px solid #2a2f37;padding:8px 14px;z-index:20}}
 header h1{{font-size:14px;margin:0 0 6px}}
 .ctrl{{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:12px;color:#9aa0a8}}
 .seg button,.sortbtn,.exp,.verbtn{{background:#1b1f26;color:#c7ccd3;border:1px solid #2a2f37;border-radius:6px;padding:3px 9px;cursor:pointer;font-size:12px}}
 .seg button.on,.sortbtn.on,.verbtn.on{{background:var(--gold);color:#111;border-color:var(--gold);font-weight:600}}
 .verseg{{display:flex;gap:6px}} .verwrap{{display:flex;gap:8px;align-items:center;padding:2px 8px;border:1px solid #2a2f37;border-radius:8px;background:#12151a}}
 .verwrap>span{{color:var(--gold)}}
 .exp{{background:#16321f;color:#7fe3a1;border-color:#23543a}} .exp:hover{{background:#1d4429}}
 .leg .chip{{display:inline-block;padding:0 6px}}
 #promptbar{{position:fixed;top:0;right:0;height:100vh;width:480px;max-width:96vw;background:#111418;border-left:1px solid #2a2f37;box-shadow:-14px 0 44px rgba(0,0,0,.55);transform:translateX(100%);transition:transform .22s ease;z-index:40;display:flex;flex-direction:column}}
 body.prompt-open #promptbar{{transform:translateX(0)}}
 .pbhd{{padding:12px 14px;border-bottom:1px solid #2a2f37;font-size:13px;color:var(--gold);display:flex;justify-content:space-between;align-items:center}}
 .pbhd button{{background:none;border:none;color:#9aa0a8;font-size:16px;cursor:pointer}}
 .pbright{{display:flex;gap:8px;align-items:center;flex-wrap:wrap}}
 .pseg button{{background:#1b1f26;color:#c7ccd3;border:1px solid #2a2f37;border-radius:6px;padding:1px 8px;cursor:pointer;font-size:12px}} .pseg button.on{{background:var(--gold);color:#111;border-color:var(--gold);font-weight:600}}
 .pmode{{display:none;flex:1;overflow:auto;flex-direction:column}}
 #promptbar.tab-view .pmode-view{{display:flex}} #promptbar.tab-diff .pmode-diff{{display:flex}}
 .pvsel{{padding:8px 14px;border-bottom:1px solid #23272e;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:#9aa0a8}}
 .pvl{{color:#6b7280}}
 .pbody{{display:none;flex-direction:column;overflow:auto}}
{pbody_css}
 .vmeta{{padding:8px 16px;border-bottom:1px solid #23272e;background:#0f1216}}
 .vname{{color:var(--gold);font-size:13px;font-weight:600}} .vchg{{color:#9aa0a8;font-size:11px;line-height:1.5;margin-top:3px}}
 #promptbar.show-en .pbmd.ar{{display:none}} #promptbar:not(.show-en) .pbmd.en{{display:none}}
 .pbmd{{padding:6px 16px;font-size:14px;line-height:1.85}}
 .pbmd h3{{color:var(--gold);font-size:14px;margin:16px 0 6px;border-bottom:1px solid #23272e;padding-bottom:4px}}
 .pbmd p{{margin:8px 0;color:#cfd4db}} .pbmd ul{{margin:6px 0;padding-right:22px}} .pbmd li{{margin:3px 0}}
 .pbmd code{{background:#0f1216;padding:1px 5px;border-radius:4px;font-size:12px}}
 .pbmd pre{{background:#0f1216;border:1px solid #2a2f37;border-radius:8px;padding:10px;overflow:auto;direction:ltr}} .pbmd pre code{{background:none;padding:0}}
 .noen{{color:#7a828c;font-style:italic}}
 .diffbox{{overflow:auto;flex:1}} .diffwrap{{display:none}} .diffwrap.on{{display:block}}
 .diffmeta{{display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid #23272e;background:#0f1216}}
 .dm{{flex:1;font-size:12px;color:#cfd4db}} .tag{{font-weight:700;padding:0 5px;border-radius:5px;margin-right:4px}}
 .tag.add{{background:#16321f;color:#7fe3a1}} .tag.del{{background:#2a1c1c;color:#e6a1a1}}
 .difflines{{font-size:12.5px;padding:6px 0;font-family:'SF Mono',ui-monospace,Menlo,monospace}}
 .dl{{display:flex;gap:8px;padding:1px 12px;white-space:pre-wrap}}
 .dl .gut{{width:12px;flex:0 0 12px;text-align:center;color:#565c66}}
 .dl .dtx{{flex:1;font-family:'Amiri','Times New Roman',serif;font-size:15px}}
 .dl.add{{background:#0f2417}} .dl.add .dtx{{color:#8fe6b0}} .dl.add .gut{{color:#7fe3a1}}
 .dl.del{{background:#241315}} .dl.del .dtx{{color:#e6a1a1}} .dl.del .gut{{color:#e6a1a1}}
 .dl.ctx .dtx{{color:#7a828c}}
 .pbfb{{border-top:1px solid #2a2f37;padding:10px 14px}} .pfl{{font-size:12px;color:#9aa0a8;margin-bottom:4px}}
 #promptfb{{width:100%;min-height:90px;background:#0f1216;border:1px solid #2a2f37;border-radius:8px;color:#e8e6e3;padding:8px;font-size:13px;resize:vertical;box-sizing:border-box}}
 .card{{border-bottom:1px solid #23272e;padding:14px;max-width:1240px;margin:0 auto}}
 .hd{{margin-bottom:6px;font-size:14px}} .num{{color:var(--gold);font-weight:700;margin-right:4px}} .ttl{{font-weight:600}} .poet{{color:#9aa0a8;margin-left:8px}} .pid{{color:#565c66;font-size:12px}} .ag{{float:right;color:#8a909a;font-size:12px}}
 .fb{{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0 10px;font-size:12px}}
 .fl{{color:#6b7280;margin-left:6px}} .fbtn{{background:#1b1f26;color:#c7ccd3;border:1px solid #2a2f37;border-radius:6px;padding:2px 8px;cursor:pointer}}
 .fbtn.on{{background:var(--gold);color:#111;border-color:var(--gold);font-weight:600}} .jgood.on{{background:#2ea36b;border-color:#2ea36b;color:#fff}} .jbad.on{{background:#c0504d;border-color:#c0504d;color:#fff}}
 .note{{flex:1;min-width:120px;background:#0f1216;border:1px solid #2a2f37;border-radius:6px;color:#e8e6e3;padding:3px 8px;font-size:12px}}
 .body{{display:grid;grid-template-columns:360px 1fr;gap:16px}} @media(max-width:860px){{.body{{grid-template-columns:1fr}}}}
 .poem{{background:#14171c;border:1px solid #2a2f37;border-radius:8px;padding:14px;max-height:360px;overflow:auto}}
 .poem .ar{{font-size:20px;font-family:'Amiri','Times New Roman',serif}} .poem .en{{font-size:14px;color:#b9c0c9;margin-top:10px;padding-top:10px;border-top:1px dashed #2a2f37}}
 body.lang-ar .poem .en{{display:none}} body.lang-en .poem .ar{{display:none}}
 .cmpwrap{{display:none}}
{ver_css}
 table.cmp{{width:100%;border-collapse:collapse}} table.cmp th{{text-align:left;font-size:12px;color:#9aa0a8;padding:4px 8px;border-bottom:1px solid #2a2f37}} .ref{{color:#565c66}}
 table.cmp td{{vertical-align:top;padding:7px 8px;border-top:1px solid #1c2026;border-right:1px solid #1c2026}}
 table.cmp td.rl{{color:#8a909a;font-size:11px;white-space:nowrap;width:64px;border-right:1px solid #2a2f37;background:#111418}}
 table.cmp tr.mtr td{{vertical-align:middle}}
 .chip{{display:block;width:fit-content;max-width:100%;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px 0}}
 .chip.agree{{background:#16321f;color:#7fe3a1;border:1px solid #23543a}}
 .chip.extra{{background:#2a1c1c;color:#e6a1a1;border:1px solid #533}}
 .chip.missed{{background:#16263a;color:#8ab6e6;border:1px solid #274867}}
 .none{{color:#565c66}}
 .tip{{position:relative;cursor:help}}
 .tip:hover::after{{content:attr(data-tip);position:absolute;left:0;top:135%;z-index:60;width:300px;max-width:78vw;background:#0f1216;border:1px solid #3a4250;border-radius:8px;padding:9px 11px;font-size:11px;line-height:1.55;color:#cfd4db;box-shadow:0 8px 26px rgba(0,0,0,.6);white-space:pre-line;pointer-events:none}}
 td.rl.tip{{text-decoration:underline dotted #4a5160;text-underline-offset:2px}}
 .bar{{display:inline-block;vertical-align:middle;width:96px;height:7px;background:#1c2026;border-radius:4px;overflow:hidden;margin-right:6px}} .bar.acc{{width:80px}} .fill,.afill{{height:100%}} .fill.lo{{background:#3f8cff}} .fill.mid{{background:#e0a83a}} .fill.hi{{background:#e0603a}}
 .afill.easy{{background:#2ea36b}} .afill.med{{background:#e0a83a}} .afill.hard{{background:#e0603a}}
 .pips i{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:2px}} .pips i.off{{background:#242a32}}
 .pips.easy i.on{{background:#2ea36b}} .pips.med i.on{{background:#e0a83a}} .pips.hard i.on{{background:#e0603a}} .pips{{margin-right:6px}}
 .accwrap{{display:flex;flex-direction:column;gap:4px}} .accrow{{display:flex;align-items:center}} .ref10{{color:#565c66;font-size:10px;margin-left:2px}}
 .subs{{display:flex;gap:4px;flex-wrap:wrap}}
 .subf{{display:inline-flex;align-items:center;gap:2px;font-size:9.5px;color:#8a909a;padding:1px 5px;border-radius:6px;border:1px solid #2a2f37;background:#12151a;cursor:help}}
 .subf b{{font-size:10px}} .subf.easy{{color:#7fe3a1;border-color:#23543a}} .subf.med{{color:#e0c07a;border-color:#5a4a24}} .subf.hard{{color:#e6a1a1;border-color:#533}}
 .mtr b{{color:#c7ccd3}}
 .dlt{{margin-left:6px;font-size:10px;padding:0 5px;border-radius:8px;font-weight:600}}
 .dlt.up{{background:#3a1f1c;color:#f0a58a;border:1px solid #5a2f28}} .dlt.down{{background:#16263a;color:#8ab6e6;border:1px solid #274867}} .dlt.zero{{background:#1c2026;color:#6b7280;border:1px solid #2a2f37}}
</style></head><body class='lang-both ver-{slug(DEFAULT_VID)}'>
<header>
 <h1>Spot-check — judge 3.1-pro vs 2.5-flash vs 3.6-flash · {len(POEMS)} poems · {len(VIDS)} prompt versions</h1>
 <div class='ctrl'>
   <span class='verwrap'><span>prompt version</span><span class='verseg' id='verpick'>{header_vsel}</span></span>
   <span>lang</span><span class='seg' id='lang'><button data-l='ar'>عربي</button><button data-l='en'>EN</button><button data-l='both' class='on'>both</button></span>
   <span>sort</span><span id='sort'>
     <button class='sortbtn on' data-s='num'>poem#</button><button class='sortbtn' data-s='int'>intensity</button>
     <button class='sortbtn' data-s='acc'>access</button><button class='sortbtn' data-s='prim'>primary</button>
     <button class='sortbtn' data-s='a25'>agree 2.5</button><button class='sortbtn' data-s='a36'>agree 3.6</button>
     <button class='sortbtn' id='dir' data-dir='asc'>▲</button></span>
   <button class='sortbtn' id='togprompt'>📄 prompt</button>
   <button class='exp' id='export'>⬇ export feedback</button>
   <span class='leg'><span class='chip agree'>green</span> match · <span class='chip extra'>red</span> flash added · <span class='chip missed'>blue</span> judge had, flash missed · ★ primary</span>
 </div>
</header>
{prompt_panel}
<main id='list'>{''.join(cards)}</main>
<footer style='padding:20px;text-align:center;color:#565c66;font-size:12px'>feedback saved in your browser (localStorage) · export writes spotcheck_feedback.json to Downloads · active prompt version is recorded in the export</footer>
<script>
const ACCESS={JS_ACCESS};
const VNAMES={JS_VID_NAMES};
let VER={JS_DEFAULT};

// ---- per-poem feedback (localStorage) ----
const KEY='spotcheck_fb_v2';
const load=()=>JSON.parse(localStorage.getItem(KEY)||'{{}}');
const save=o=>localStorage.setItem(KEY,JSON.stringify(o));
const fb=load();
document.querySelectorAll('.fb').forEach(bar=>{{
  const pid=bar.dataset.pid, rec=fb[pid]||{{}};
  bar.querySelectorAll('.fbtn').forEach(b=>{{ if(rec[b.dataset.k]===b.dataset.v) b.classList.add('on'); }});
  const note=bar.querySelector('.note'); if(rec.note) note.value=rec.note;
}});
document.querySelectorAll('.fb .fbtn').forEach(b=>b.addEventListener('click',()=>{{
  const bar=b.closest('.fb'), pid=bar.dataset.pid, k=b.dataset.k, o=load();
  o[pid]=o[pid]||{{}};
  if(o[pid][k]===b.dataset.v){{ delete o[pid][k]; b.classList.remove('on'); }}
  else{{ o[pid][k]=b.dataset.v; bar.querySelectorAll(`.fbtn[data-k="${{k}}"]`).forEach(x=>x.classList.remove('on')); b.classList.add('on'); }}
  save(o);
}}));
document.querySelectorAll('.fb .note').forEach(n=>n.addEventListener('input',()=>{{
  const pid=n.closest('.fb').dataset.pid, o=load(); o[pid]=o[pid]||{{}};
  if(n.value.trim()) o[pid].note=n.value.trim(); else delete o[pid].note; save(o);
}}));

// ---- poem language toggle ----
document.querySelectorAll('#lang button').forEach(b=>b.addEventListener('click',()=>{{
  document.body.classList.remove('lang-ar','lang-en','lang-both');
  document.body.classList.add('lang-'+b.dataset.l);
  document.querySelectorAll('#lang button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
}}));

// ---- agreement badge (reads active version) ----
function refreshAgreement(){{
  document.querySelectorAll('.card').forEach(c=>{{
    const sd=JSON.parse(c.dataset.sort)[VER]||{{}};
    c.querySelector('.ag').textContent='2.5:'+(sd.a25??'–')+'% · 3.6:'+(sd.a36??'–')+'%';
  }});
}}

// ---- prompt-version switch (header) ----
function setVersion(v){{
  VER=v;
  [...document.body.classList].filter(c=>c.startsWith('ver-')).forEach(c=>document.body.classList.remove(c));
  document.body.classList.add('ver-'+v);
  document.querySelectorAll('#verpick .verbtn').forEach(x=>x.classList.toggle('on',x.dataset.vid===v));
  refreshAgreement(); applySort();
}}
document.querySelectorAll('#verpick .verbtn').forEach(b=>b.addEventListener('click',()=>setVersion(b.dataset.vid)));

// ---- sort (reads active version's judge keys) ----
let sortKey='num', dir=1;
const list=document.getElementById('list');
function sortVal(c){{
  if(sortKey==='num') return parseFloat(c.dataset.num);
  const sd=JSON.parse(c.dataset.sort)[VER]||{{}};
  if(sortKey==='prim') return sd.prim||'';
  return parseFloat(sd[sortKey]||0);
}}
function applySort(){{
  const cards=[...list.querySelectorAll('.card')];
  cards.sort((a,b)=>{{ let x=sortVal(a),y=sortVal(b);
    if(sortKey==='prim') return dir*String(x).localeCompare(String(y));
    return dir*(x-y); }});
  cards.forEach(c=>list.appendChild(c));
}}
document.querySelectorAll('.sortbtn[data-s]').forEach(b=>b.addEventListener('click',()=>{{
  sortKey=b.dataset.s; document.querySelectorAll('.sortbtn[data-s]').forEach(x=>x.classList.remove('on')); b.classList.add('on'); applySort();
}}));
document.getElementById('dir').addEventListener('click',function(){{
  dir=-dir; this.dataset.dir=dir>0?'asc':'desc'; this.textContent=dir>0?'▲':'▼'; applySort();
}});

// ---- prompt sidebar: open/close, tabs, lang, version, diff A/B ----
const bar=document.getElementById('promptbar');
document.getElementById('togprompt').addEventListener('click',()=>document.body.classList.toggle('prompt-open'));
document.getElementById('closeprompt').addEventListener('click',()=>document.body.classList.remove('prompt-open'));
document.querySelectorAll('#ptab button').forEach(b=>b.addEventListener('click',()=>{{
  bar.classList.remove('tab-view','tab-diff'); bar.classList.add('tab-'+b.dataset.t);
  document.querySelectorAll('#ptab button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
}}));
document.querySelectorAll('#plang button').forEach(b=>b.addEventListener('click',()=>{{
  bar.classList.toggle('show-en', b.dataset.pl==='en');
  document.querySelectorAll('#plang button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
}}));
function setPromptView(v){{
  [...bar.classList].filter(c=>c.startsWith('pv-')).forEach(c=>bar.classList.remove(c));
  bar.classList.add('pv-'+v);
  document.querySelectorAll('#pver button').forEach(x=>x.classList.toggle('on',x.dataset.vid===v));
}}
document.querySelectorAll('#pver button').forEach(b=>b.addEventListener('click',()=>setPromptView(b.dataset.vid)));
let diffA={JS_DEFAULT_A}, diffB={JS_DEFAULT_B};
function refreshDiff(){{
  const pair=diffA+'|'+diffB;
  document.querySelectorAll('.diffwrap').forEach(d=>d.classList.toggle('on',d.dataset.pair===pair));
}}
document.querySelectorAll('#diffA button').forEach(b=>b.addEventListener('click',()=>{{
  diffA=b.dataset.vid; document.querySelectorAll('#diffA button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); refreshDiff();
}}));
document.querySelectorAll('#diffB button').forEach(b=>b.addEventListener('click',()=>{{
  diffB=b.dataset.vid; document.querySelectorAll('#diffB button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); refreshDiff();
}}));

// ---- prompt feedback ----
const PKEY='spotcheck_prompt_fb';
const pfa=document.getElementById('promptfb');
if(pfa){{ pfa.value=localStorage.getItem(PKEY)||''; pfa.addEventListener('input',()=>localStorage.setItem(PKEY,pfa.value)); }}

// ---- export ----
document.getElementById('export').addEventListener('click',()=>{{
  const o=load(); const out={{active_version:VER, active_version_name:VNAMES[VER],
    poems:o, prompt_feedback: localStorage.getItem(PKEY)||''}};
  const blob=new Blob([JSON.stringify(out,null,2)],{{type:'application/json'}});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='spotcheck_feedback.json'; a.click();
  alert('Exported feedback for '+Object.keys(o).length+' poem(s) + prompt notes (version '+VNAMES[VER]+') to spotcheck_feedback.json (check Downloads).');
}});

// ---- init ----
bar.classList.add('tab-view','pv-'+{JS_DEFAULT_PVIEW});
setVersion(VER); refreshDiff();
</script></body></html>"""

OUT.write_text(HTML, encoding="utf-8")
print("WROTE", OUT, f"({len(HTML):,} bytes, {len(POEMS)} poems, {len(VIDS)} versions)")

if __name__ == "__main__":
    pass
