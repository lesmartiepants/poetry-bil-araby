"""Generate HTML comparison report: Haiku vs Sonnet vs Opus scoring."""
import json
import os
from datetime import datetime
from pathlib import Path

import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(__file__).parent / "data"
OUTPUT = Path(__file__).parent / "scoring_comparison_report.html"
TRANSLATIONS_FILE = DATA_DIR / "report_translations.json"

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]
DIM_AR = {
    "sound": "الإيقاع", "imagery": "التصوير", "emotion": "العاطفة",
    "language": "اللغة", "cultural": "القيمة الثقافية",
}
DIM_EN = {
    "sound": "Rhythm", "imagery": "Imagery", "emotion": "Emotion",
    "language": "Language", "cultural": "Cultural Value",
}

# Load translations
TR = {}
if TRANSLATIONS_FILE.exists():
    TR = json.loads(TRANSLATIONS_FILE.read_text(encoding="utf-8"))


def i18n(ar: str, en: str = "") -> str:
    """Wrap text with bilingual spans. Poems/verses are NOT wrapped."""
    if not en:
        return ar
    return f'<span class="i18n-ar">{ar}</span><span class="i18n-en">{en}</span>'


NOTES_TRANSLATIONS_FILE = DATA_DIR / "report_notes_translations.json"


def translate_notes_and_verdicts(poems_data: list[dict]) -> dict:
    """Batch-translate notes and verdicts via Opus. Returns {poem_id: {notes: {dim: en}, verdict: en}}.

    Caches results in NOTES_TRANSLATIONS_FILE so subsequent runs skip the API call.
    """
    if NOTES_TRANSLATIONS_FILE.exists():
        cached = json.loads(NOTES_TRANSLATIONS_FILE.read_text(encoding="utf-8"))
        # Check if all poem IDs are already translated
        needed_ids = [p["poem_id"] for p in poems_data]
        if all(pid in cached for pid in needed_ids):
            print(f"Using cached note translations for {len(needed_ids)} poems")
            return cached
    else:
        cached = {}

    # Build payload: {poem_id: {notes: {...}, verdict: "..."}}
    to_translate = {}
    for p in poems_data:
        pid = p["poem_id"]
        if pid in cached:
            continue
        entry = {}
        if p.get("notes") and str(p["notes"]) != "nan":
            try:
                n = json.loads(p["notes"]) if isinstance(p["notes"], str) else p["notes"]
                entry["notes"] = {d: n[d] for d in DIMS if d in n}
            except Exception:
                pass
        if p.get("verdict") and str(p["verdict"]) != "nan":
            entry["verdict"] = str(p["verdict"])
        if entry:
            to_translate[pid] = entry

    if not to_translate:
        return cached

    print(f"Translating notes/verdicts for {len(to_translate)} poems via Opus...")
    import litellm
    prompt = json.dumps(to_translate, ensure_ascii=False)
    try:
        response = litellm.completion(
            model="openai/bedrock-opus-46",
            messages=[
                {"role": "system", "content": (
                    "You are a professional Arabic-to-English literary translator. "
                    "Translate all Arabic text values in this JSON to English. "
                    "Keep the JSON structure identical (same keys, same nesting). "
                    "These are poetry criticism notes — translate them naturally, "
                    "preserving the literary analysis tone. Return ONLY valid JSON."
                )},
                {"role": "user", "content": prompt},
            ],
            api_base=os.environ.get("ANTHROPIC_BASE_URL"),
            api_key=os.environ.get("ANTHROPIC_AUTH_TOKEN"),
            temperature=0.2,
            max_tokens=8000,
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw[: raw.rfind("```")]
        translated = json.loads(raw)
        cached.update(translated)
        NOTES_TRANSLATIONS_FILE.write_text(
            json.dumps(cached, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Translated and cached {len(translated)} poem notes")
    except Exception as e:
        print(f"Warning: Notes translation failed: {e}")

    return cached


def score_color(s):
    if s >= 80: return "#4CAF50"
    if s >= 70: return "#8BC34A"
    if s >= 60: return "#FFC107"
    if s >= 50: return "#FF9800"
    return "#F44336"


def diff_color(d):
    d = abs(d)
    if d <= 10: return "#4CAF50"
    if d <= 20: return "#FFC107"
    return "#F44336"


def format_verses(content, max_lines=4):
    if not content:
        return '<em style="color:#5A5040">لا يوجد نص</em>'
    lines = content.strip().split("\n")[:max_lines]
    html = ""
    for line in lines:
        parts = line.split("*")
        if len(parts) == 2:
            html += (
                f'<div class="verse"><span class="h1">{parts[0].strip()}</span>'
                f' <span class="sep">✦</span> '
                f'<span class="h2">{parts[1].strip()}</span></div>'
            )
        else:
            html += f'<div class="verse">{line.strip()}</div>'
    if len(content.strip().split("\n")) > max_lines:
        html += '<div class="verse" style="color:#5A5040">...</div>'
    return html


def build_poem_card(pid, h_row, cal_row, cal_model, poem_info, notes_data=None, verdict=None, notes_en=None):
    title = poem_info.get("title", "") if poem_info else ""
    poet = poem_info.get("poet", "") if poem_info else ""
    content = poem_info.get("content", "") if poem_info else ""

    h_score = int(h_row["quality_score"])
    c_score = int(cal_row["quality_score"])
    diff = h_score - c_score

    dims_html = ""
    for d in DIMS:
        hv = int(h_row[d])
        cv = int(cal_row[d])
        dd = hv - cv
        dims_html += f"""
        <tr>
            <td class="dim-name">{i18n(DIM_AR[d], DIM_EN.get(d, ""))}</td>
            <td class="dim-val"><div class="bar" style="width:{hv}%;background:{score_color(hv)}">{hv}</div></td>
            <td class="dim-val"><div class="bar" style="width:{cv}%;background:{score_color(cv)}">{cv}</div></td>
            <td class="dim-diff" style="color:{diff_color(dd)}">{dd:+d}</td>
        </tr>"""
    # Total row
    dims_html += f"""
        <tr class="total-row">
            <td class="dim-name" style="font-weight:700;color:#d4a574">{i18n("المجموع", "Total")}</td>
            <td class="dim-val"><div class="bar" style="width:{h_score}%;background:{score_color(h_score)}">{h_score}</div></td>
            <td class="dim-val"><div class="bar" style="width:{c_score}%;background:{score_color(c_score)}">{c_score}</div></td>
            <td class="dim-diff" style="color:{diff_color(diff)};font-weight:700">{diff:+d}</td>
        </tr>"""

    # Translated notes lookup
    en_notes = {}
    en_verdict = ""
    if notes_en:
        en_notes = notes_en.get("notes", {})
        en_verdict = notes_en.get("verdict", "")

    notes_html = ""
    if notes_data:
        try:
            n = json.loads(notes_data) if isinstance(notes_data, str) else notes_data
            for d in DIMS:
                if d in n:
                    note_en = en_notes.get(d, "")
                    notes_html += f'<div class="note"><strong>{i18n(DIM_AR[d], DIM_EN.get(d, ""))}:</strong> {i18n(n[d], note_en)}</div>'
        except Exception:
            pass

    verdict_html = ""
    if verdict and str(verdict) != "nan":
        verdict_html = f'<div class="verdict">{i18n(str(verdict), en_verdict)}</div>'

    return f"""
    <div class="card" style="border-right:4px solid {diff_color(diff)}">
        <div class="card-header">
            <div class="poem-info">
                <h3>{title}</h3>
                <span class="poet">{poet}</span>
            </div>
            <div class="scores-summary">
                <div class="score-pill" style="background:{score_color(h_score)};color:#000">{i18n("هايكو", "Haiku")}: {h_score}</div>
                <div class="score-pill" style="background:{score_color(c_score)};color:#000">{cal_model}: {c_score}</div>
                <div class="score-pill diff" style="background:{diff_color(diff)};color:#000">\u0394 {diff:+d}</div>
            </div>
        </div>
        <div class="card-body">
            <div class="verses">{format_verses(content)}</div>
            <table class="dims-table">
                <tr><th>{i18n("البُعد", TR.get("table_dimension", "Dimension"))}</th><th>{i18n("هايكو", "Haiku")}</th><th>{cal_model}</th><th>\u0394</th></tr>
                {dims_html}
            </table>
        </div>
        {f'<div class="card-notes">{notes_html}{verdict_html}</div>' if notes_html or verdict_html else ""}
    </div>"""


def main():
    haiku = pd.read_parquet(DATA_DIR / "scores_openai_bedrock-haiku-45.parquet")
    sonnet = pd.read_parquet(DATA_DIR / "scores_openai_bedrock-sonnet-46.parquet")
    opus = pd.read_parquet(DATA_DIR / "scores_openai_bedrock-opus-46.parquet")

    for df in [haiku, sonnet, opus]:
        df["poem_id"] = df["poem_id"].astype(str)

    # Get poem content from DB
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    # Build sample sets
    opus_ids = list(opus["poem_id"])
    # Only consider Sonnet poems that have notes (successful parses with commentary)
    sonnet_with_notes = sonnet[sonnet["notes"].notna() & (sonnet["quality_score"] > 10)]
    sonnet_merged = sonnet_with_notes.merge(
        haiku[["poem_id", "quality_score"]], on="poem_id", suffixes=("_sonnet", "_haiku")
    )
    sonnet_merged["diff"] = abs(
        sonnet_merged["quality_score_haiku"] - sonnet_merged["quality_score_sonnet"]
    )
    top_disagree = sonnet_merged.nlargest(10, "diff")
    sample_sonnet_ids = list(top_disagree["poem_id"])

    all_ids = list(set(opus_ids + sample_sonnet_ids))
    placeholders = ",".join(["%s"] * len(all_ids))
    cur.execute(
        f"""SELECT p.id, p.title, p.content, po.name as poet_name
            FROM poems p LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.id IN ({placeholders})""",
        [int(x) for x in all_ids],
    )
    db_poems = {str(r[0]): {"title": r[1], "content": r[2], "poet": r[3]} for r in cur.fetchall()}
    cur.close()
    conn.close()

    # Collect all notes/verdicts for translation
    poems_to_translate = []
    for _, row in opus.iterrows():
        poems_to_translate.append({
            "poem_id": row["poem_id"],
            "notes": row.get("notes"),
            "verdict": row.get("verdict"),
        })
    for _, mrow in top_disagree.iterrows():
        pid = mrow["poem_id"]
        s_match = sonnet[sonnet["poem_id"] == pid]
        if not s_match.empty:
            s_row = s_match.iloc[0]
            poems_to_translate.append({
                "poem_id": pid,
                "notes": s_row.get("notes"),
                "verdict": s_row.get("verdict"),
            })

    notes_translations = translate_notes_and_verdicts(poems_to_translate)

    # Build cards
    cards_html = f'<h3 class="model-section">{i18n("مقارنة أوبوس (Opus) — 10 قصائد", TR.get("opus_section", "Opus Comparison — 10 Poems"))}</h3>'
    opus_sorted = opus.copy()
    opus_sorted["_diff"] = 0
    for i, row in opus_sorted.iterrows():
        pid = row["poem_id"]
        h_match = haiku[haiku["poem_id"] == pid]
        if not h_match.empty:
            opus_sorted.at[i, "_diff"] = abs(
                int(h_match.iloc[0]["quality_score"]) - int(row["quality_score"])
            )
    opus_sorted = opus_sorted.sort_values("_diff", ascending=False)

    for _, row in opus_sorted.iterrows():
        pid = row["poem_id"]
        h_match = haiku[haiku["poem_id"] == pid]
        if h_match.empty:
            continue
        cards_html += build_poem_card(
            pid, h_match.iloc[0], row, "أوبوس", db_poems.get(pid),
            row.get("notes"), row.get("verdict"),
            notes_en=notes_translations.get(pid),
        )

    cards_html += f'<h3 class="model-section">{i18n("مقارنة سونيت (Sonnet) — أكبر 10 اختلافات", TR.get("sonnet_section", "Sonnet Comparison — Top 10 Differences"))}</h3>'
    for _, mrow in top_disagree.iterrows():
        pid = mrow["poem_id"]
        s_match = sonnet[sonnet["poem_id"] == pid]
        h_match = haiku[haiku["poem_id"] == pid]
        if s_match.empty or h_match.empty:
            continue
        s_row = s_match.iloc[0]
        cards_html += build_poem_card(
            pid, h_match.iloc[0], s_row, "سونيت", db_poems.get(pid),
            s_row.get("notes"), s_row.get("verdict"),
            notes_en=notes_translations.get(pid),
        )

    # Bias analysis
    sonnet_clean = sonnet[sonnet["quality_score"] > 10]
    s_ids = set(sonnet_clean["poem_id"])
    h_overlap = haiku[haiku["poem_id"].isin(s_ids)]
    common_ids = list(s_ids & set(h_overlap["poem_id"]))

    bias_html = ""
    dim_en_overall = {"quality_score": TR.get("dim_overall", "Overall Score")}
    for d in DIMS + ["quality_score"]:
        h_mean = h_overlap.set_index("poem_id").loc[common_ids, d].astype(float).mean()
        s_mean = sonnet_clean.set_index("poem_id").loc[common_ids, d].astype(float).mean()
        bias = h_mean - s_mean
        label_ar = DIM_AR.get(d, "الدرجة الكلية")
        label_en = DIM_EN.get(d, dim_en_overall.get(d, "Overall Score"))
        w = min(bias * 3, 100)
        bias_html += f"""
        <div class="bias-row">
            <span class="bias-label">{i18n(label_ar, label_en)}</span>
            <div class="bias-track"><div class="bias-fill" style="width:{w}%;background:{diff_color(bias)}"></div></div>
            <span class="bias-val" style="color:{diff_color(bias)}">{bias:+.1f}</span>
        </div>"""

    # Token estimates
    h_input, h_output = 84324 * 350, 84324 * 50
    s_input, s_output = 1857 * 400, 1857 * 300
    o_input, o_output = 10 * 500, 10 * 500
    h_cost = h_input * 0.80 / 1e6 + h_output * 4.0 / 1e6
    s_cost = s_input * 3.0 / 1e6 + s_output * 15.0 / 1e6
    o_cost = o_input * 15.0 / 1e6 + o_output * 75.0 / 1e6

    report_date = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Build bilingual stat labels
    h_stat_label = f'{len(haiku):,} {i18n("قصيدة", TR.get("poems_label", "poems"))} &bull; std {haiku["quality_score"].std():.1f}'
    s_stat_label = f'{len(sonnet):,} {i18n("قصيدة", TR.get("poems_label", "poems"))} &bull; std {sonnet_clean["quality_score"].std():.1f}'
    o_stat_label = f'{len(opus)} {i18n("قصائد", TR.get("poems_label_plural", "poems"))} &bull; std {opus["quality_score"].std():.1f}'

    bias_desc_ar = f"الفرق بين درجات هايكو وسونيت على {len(common_ids):,} قصيدة مشتركة. هايكو يبالغ في التقييم بمعدل ~11 نقطة."
    bias_desc_en = TR.get("bias_desc", "").replace("{count}", f"{len(common_ids):,}") if TR.get("bias_desc") else f"Difference between Haiku and Sonnet scores on {len(common_ids):,} shared poems. Haiku overestimates by ~11 points."

    token_disclaimer_ar = "* التكلفة تقديرية بأسعار Bedrock المعلنة. التكلفة الفعلية تمر عبر خادم LiteLLM الداخلي."
    token_disclaimer_en = TR.get("token_disclaimer", "* Cost is estimated based on published Bedrock pricing. Actual cost is routed through the internal LiteLLM server.")

    footer_ar = "تم إنشاء هذا التقرير تلقائياً بواسطة خط أنابيب تنسيق الشعر العربي"
    footer_en = TR.get("footer", "This report was automatically generated by the Arabic Poetry Curation Pipeline")

    color_legend_ar = f'القصائد مرتبة حسب حجم الاختلاف. اللون: <span style="color:#4CAF50">أخضر</span> (≤10) &bull; <span style="color:#FFC107">أصفر</span> (10-20) &bull; <span style="color:#F44336">أحمر</span> (&gt;20)'
    color_legend_en = f'{TR.get("color_legend", "Poems sorted by difference magnitude. Color:")} <span style="color:#4CAF50">{TR.get("color_green", "Green")}</span> (≤10) &bull; <span style="color:#FFC107">{TR.get("color_yellow", "Yellow")}</span> (10-20) &bull; <span style="color:#F44336">{TR.get("color_red", "Red")}</span> (&gt;20)'

    html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>مقارنة تقييم الشعر العربي | Arabic Poetry Evaluation Comparison</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700&display=swap');
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Tajawal',sans-serif;background:#0d0d0d;color:#e8e0d0;line-height:1.7;direction:rtl}}
body.lang-en{{direction:ltr}}
.container{{max-width:1100px;margin:0 auto;padding:40px 24px}}
header{{text-align:center;padding:50px 0 30px;border-bottom:1px solid #2a2520;margin-bottom:40px}}
header h1{{font-family:'Amiri',serif;font-size:2.2rem;color:#d4a574;margin-bottom:8px}}
header .sub{{color:#8a8070;font-size:0.95rem}}
header .sub strong{{color:#c0b090}}
.section{{margin-bottom:50px}}
.section h2{{font-family:'Amiri',serif;font-size:1.5rem;color:#d4a574;border-bottom:1px solid #2a2520;padding-bottom:8px;margin-bottom:20px}}
.stats-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}}
.stat-box{{background:#161310;border:1px solid #2a2520;border-radius:8px;padding:20px;text-align:center}}
.stat-box .model{{font-size:0.85rem;color:#8a8070;margin-bottom:8px;font-family:monospace;direction:ltr}}
.stat-box .val{{font-size:2rem;font-weight:700;color:#d4a574}}
.stat-box .label{{font-size:0.8rem;color:#6a6050}}
.token-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}}
.token-box{{background:#161310;border:1px solid #2a2520;border-radius:8px;padding:16px}}
.token-box h4{{color:#d4a574;font-size:0.9rem;margin-bottom:10px}}
.token-box p{{font-size:0.82rem;color:#8a8070;margin-bottom:4px}}
.token-box .cost{{font-size:1.1rem;color:#c0b090;font-weight:700;margin-top:8px}}
.bias-row{{display:flex;align-items:center;gap:12px;margin-bottom:10px}}
.bias-label{{min-width:120px;text-align:left;font-size:0.9rem;color:#8a8070}}
.bias-track{{flex:1;height:20px;background:#1a1714;border-radius:4px;overflow:hidden;border:1px solid #2a2520}}
.bias-fill{{height:100%;border-radius:4px;transition:width 0.3s}}
.bias-val{{min-width:60px;font-weight:700;font-size:0.9rem}}
.model-section{{font-family:'Amiri',serif;font-size:1.2rem;color:#d4a574;margin:30px 0 15px;padding-bottom:8px;border-bottom:1px solid #1e1a16}}
.card{{background:#141210;border:1px solid #2a2520;border-radius:10px;margin-bottom:20px;overflow:hidden}}
.card-header{{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #1e1a16;flex-wrap:wrap;gap:10px}}
.poem-info h3{{font-family:'Amiri',serif;font-size:1.15rem;color:#e8e0d0;margin-bottom:2px}}
.poet{{font-size:0.85rem;color:#8a8070}}
.scores-summary{{display:flex;gap:8px;flex-wrap:wrap}}
.score-pill{{padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:700}}
.card-body{{display:flex;gap:20px;padding:16px 20px;flex-wrap:wrap}}
.verses{{flex:1.2;min-width:280px}}
.verse{{text-align:center;font-family:'Amiri',serif;font-size:1.05rem;line-height:2;color:#d8d0c0;margin-bottom:6px}}
.sep{{color:#d4a574;margin:0 6px;font-size:0.6rem}}
.dims-table{{flex:1;min-width:300px;border-collapse:collapse}}
.dims-table th{{text-align:right;padding:6px 8px;font-size:0.75rem;color:#6a6050;border-bottom:1px solid #2a2520}}
.dims-table td{{padding:6px 8px;border-bottom:1px solid #1e1a16}}
.dim-name{{font-size:0.85rem;color:#8a8070;min-width:80px}}
.dim-val{{min-width:120px}}
.bar{{height:18px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;color:#000;min-width:30px}}
.dim-diff{{font-weight:700;font-size:0.85rem;text-align:center;min-width:40px}}
.total-row td{{border-top:2px solid #d4a574;padding-top:10px}}
.card-notes{{padding:12px 20px;border-top:1px solid #1e1a16;background:#0f0e0c}}
.note{{font-size:0.85rem;color:#8a8070;margin-bottom:6px;line-height:1.8}}
.note strong{{color:#c0b090}}
.verdict{{font-family:'Amiri',serif;font-size:1rem;color:#d4a574;margin-top:10px;padding-top:8px;border-top:1px solid #1e1a16;line-height:1.9}}
footer{{text-align:center;padding:30px 0;border-top:1px solid #2a2520;margin-top:30px;font-size:0.8rem;color:#4a4030}}
/* Language toggle */
.lang-toggle{{position:fixed;top:16px;left:16px;z-index:1000;display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid #2a2520;background:#161310;box-shadow:0 4px 12px rgba(0,0,0,0.4)}}
.lang-btn{{padding:8px 16px;font-size:0.82rem;font-weight:600;border:none;cursor:pointer;background:#161310;color:#8a8070;transition:all 0.2s}}
.lang-btn:hover{{background:#1e1a16;color:#c0b090}}
.lang-btn.active{{background:#d4a574;color:#0d0d0d}}
/* i18n visibility */
.i18n-en{{display:none}}
body.lang-en .i18n-ar{{display:none}}
body.lang-en .i18n-en{{display:inline}}
body.lang-both .i18n-ar{{display:inline}}
body.lang-both .i18n-en{{display:inline;color:#8a8070;font-size:0.85em}}
body.lang-both .i18n-en::before{{content:" — "}}
.note .i18n-en,.verdict .i18n-en{{display:none}}
body.lang-en .note .i18n-ar,body.lang-en .verdict .i18n-ar{{display:none}}
body.lang-en .note .i18n-en,body.lang-en .verdict .i18n-en{{display:block}}
body.lang-both .note .i18n-en,body.lang-both .verdict .i18n-en{{display:block;font-style:italic;margin-top:2px}}
body.lang-both .note .i18n-en::before,body.lang-both .verdict .i18n-en::before{{content:""}}
@media(max-width:768px){{.stats-grid,.token-grid{{grid-template-columns:1fr}}.card-body{{flex-direction:column}}.lang-toggle{{top:auto;bottom:16px;left:50%;transform:translateX(-50%)}}}}
</style>
</head>
<body>
<div class="lang-toggle">
    <button class="lang-btn active" data-lang="ar">عربي</button>
    <button class="lang-btn" data-lang="en">English</button>
    <button class="lang-btn" data-lang="both">Both</button>
</div>
<div class="container">
<header>
    <h1>{i18n("مقارنة تقييم الشعر العربي: هايكو ⟷ سونيت ⟷ أوبوس", TR.get("page_heading", "Arabic Poetry Evaluation Comparison: Haiku ⟷ Sonnet ⟷ Opus"))}</h1>
    <div class="sub"><strong>{len(haiku):,}</strong> {i18n("قصيدة (هايكو)", "poems (Haiku)")} &bull; <strong>{len(sonnet):,}</strong> {i18n("قصيدة (سونيت)", "poems (Sonnet)")} &bull; <strong>{len(opus)}</strong> {i18n("قصائد (أوبوس)", "poems (Opus)")} &bull; {report_date}</div>
</header>
<div class="section">
    <h2>{i18n("١. ملخص النتائج", TR.get("section_1", "1. Results Summary"))}</h2>
    <div class="stats-grid">
        <div class="stat-box"><div class="model">bedrock-haiku-45</div><div class="val">{haiku["quality_score"].mean():.1f}</div><div class="label">{h_stat_label}</div></div>
        <div class="stat-box"><div class="model">bedrock-sonnet-46</div><div class="val">{sonnet_clean["quality_score"].mean():.1f}</div><div class="label">{s_stat_label}</div></div>
        <div class="stat-box"><div class="model">bedrock-opus-46</div><div class="val">{opus["quality_score"].mean():.1f}</div><div class="label">{o_stat_label}</div></div>
    </div>
</div>
<div class="section">
    <h2>{i18n("٢. تحليل الانحياز (Calibration Bias)", TR.get("section_2", "2. Calibration Bias Analysis"))}</h2>
    <p style="color:#8a8070;margin-bottom:16px;font-size:0.9rem">{i18n(bias_desc_ar, bias_desc_en)}</p>
    {bias_html}
</div>
<div class="section">
    <h2>{i18n("٣. استهلاك الرموز والتكلفة", TR.get("section_3", "3. Token Usage & Cost"))}</h2>
    <div class="token-grid">
        <div class="token-box"><h4>{i18n("هايكو (Haiku 4.5)", "Haiku 4.5")}</h4><p>{i18n("الإدخال", TR.get("token_input", "Input"))}: ~{h_input:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>{i18n("الإخراج", TR.get("token_output", "Output"))}: ~{h_output:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>84,324 {i18n("قصيدة", TR.get("poems_label", "poems"))} &bull; {i18n("دفعات من", TR.get("token_batches", "batches of"))} 5</p><div class="cost">~${h_cost:.2f}</div></div>
        <div class="token-box"><h4>{i18n("سونيت (Sonnet 4.6)", "Sonnet 4.6")}</h4><p>{i18n("الإدخال", TR.get("token_input", "Input"))}: ~{s_input:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>{i18n("الإخراج", TR.get("token_output", "Output"))}: ~{s_output:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>1,857 {i18n("قصيدة", TR.get("poems_label", "poems"))} &bull; {i18n("دفعات من", TR.get("token_batches", "batches of"))} 5</p><div class="cost">~${s_cost:.2f}</div></div>
        <div class="token-box"><h4>{i18n("أوبوس (Opus 4.6)", "Opus 4.6")}</h4><p>{i18n("الإدخال", TR.get("token_input", "Input"))}: ~{o_input:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>{i18n("الإخراج", TR.get("token_output", "Output"))}: ~{o_output:,} {i18n("رمز", TR.get("token_unit", "tokens"))}</p><p>10 {i18n("قصائد", TR.get("poems_label_plural", "poems"))} &bull; {i18n("دفعات من", TR.get("token_batches", "batches of"))} 3</p><div class="cost">~${o_cost:.4f}</div></div>
    </div>
    <p style="color:#5a5040;font-size:0.8rem;margin-top:12px">{i18n(token_disclaimer_ar, token_disclaimer_en)}</p>
</div>
<div class="section">
    <h2>{i18n("٤. مقارنة تفصيلية للقصائد", TR.get("section_4", "4. Detailed Poem Comparison"))}</h2>
    <p style="color:#8a8070;margin-bottom:10px;font-size:0.9rem"><span class="i18n-ar">{color_legend_ar}</span><span class="i18n-en">{color_legend_en}</span></p>
    {cards_html}
</div>
<footer>{i18n(footer_ar, footer_en)} &bull; {report_date}</footer>
</div>
<script>
(function(){{
    const btns = document.querySelectorAll('.lang-btn');
    const body = document.body;
    btns.forEach(btn => {{
        btn.addEventListener('click', () => {{
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const lang = btn.dataset.lang;
            body.classList.remove('lang-en', 'lang-both');
            if (lang === 'en') {{
                body.classList.add('lang-en');
                body.style.direction = 'ltr';
                document.documentElement.lang = 'en';
                document.documentElement.dir = 'ltr';
            }} else if (lang === 'both') {{
                body.classList.add('lang-both');
                body.style.direction = 'rtl';
                document.documentElement.lang = 'ar';
                document.documentElement.dir = 'rtl';
            }} else {{
                body.style.direction = 'rtl';
                document.documentElement.lang = 'ar';
                document.documentElement.dir = 'rtl';
            }}
        }});
    }});
}})();
</script>
</body>
</html>"""

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Report written to {OUTPUT}")
    print(f"File size: {OUTPUT.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
