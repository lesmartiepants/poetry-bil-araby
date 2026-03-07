"""Generate an HTML scoring report for the Arabic Poetry Curation pipeline.

Reads scored data from Parquet and poem content from PostgreSQL,
then writes a self-contained HTML report to scoring_report.html.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.generate_report
"""
import os
import sys
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CURATION_DIR = Path(__file__).parent
DATA_DIR = CURATION_DIR / "data"
PARQUET_PATH = DATA_DIR / "scores_openai_bedrock-haiku-45.parquet"
OUTPUT_PATH = CURATION_DIR / "scoring_report.html"
ENV_PATH = Path(__file__).parent.parent.parent / ".env"
TOTAL_POEMS_IN_DB = 84_329

DIMENSIONS = {
    "sound":    "الإيقاع والموسيقى",
    "imagery":  "التصوير",
    "emotion":  "العاطفة",
    "language":  "اللغة",
    "cultural": "القيمة الثقافية",
}

TIERS = [
    ("elite",     "نخبة",       90, 100, "#D4AF37"),
    ("excellent", "ممتاز",      80, 89,  "#2ECC71"),
    ("good",      "جيد",        70, 79,  "#3498DB"),
    ("average",   "متوسط",      60, 69,  "#95A5A6"),
    ("below",     "دون المتوسط", 50, 59,  "#E67E22"),
    ("poor",      "ضعيف",       0,  49,  "#E74C3C"),
]

# How many sample poems to pick per tier for the report
SAMPLE_COUNTS = {"elite": 3, "good": 3, "average": 2, "below": 2}

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_scores() -> pd.DataFrame:
    """Load scored poems from Parquet."""
    print(f"Loading scores from {PARQUET_PATH} ...")
    df = pd.read_parquet(PARQUET_PATH)
    print(f"  {len(df):,} scores loaded.")
    return df


def load_poem_content(poem_ids: list[str]) -> dict:
    """Fetch poem content from PostgreSQL for the given IDs."""
    load_dotenv(ENV_PATH)
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("WARNING: DATABASE_URL not set -- poem content will be unavailable.")
        return {}

    print(f"Fetching poem content for {len(poem_ids)} poems ...")
    conn = psycopg2.connect(db_url, keepalives=1, keepalives_idle=30,
                            keepalives_interval=10, keepalives_count=5)
    try:
        cur = conn.cursor()
        int_ids = [int(pid) for pid in poem_ids]
        cur.execute(
            """SELECT p.id, p.title, p.content, po.name AS poet_name
               FROM poems p
               LEFT JOIN poets po ON p.poet_id = po.id
               WHERE p.id = ANY(%s)""",
            (int_ids,),
        )
        rows = cur.fetchall()
        poems = {}
        for row in rows:
            poems[str(row[0])] = {
                "title": row[1] or "",
                "content": row[2] or "",
                "poet_name": row[3] or "شاعر غير معروف",
            }
        print(f"  {len(poems)} poems fetched from DB.")
        return poems
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_tier(score: int) -> tuple:
    """Return (key, arabic_name, color) for a score."""
    for key, ar, lo, hi, color in TIERS:
        if lo <= score <= hi:
            return key, ar, color
    return "poor", "ضعيف", "#E74C3C"


def pick_sample_poems(df: pd.DataFrame) -> list[str]:
    """Pick representative poem IDs from different tiers."""
    selected = []
    for key, _, lo, hi, _ in TIERS:
        n = SAMPLE_COUNTS.get(key, 0)
        if n == 0:
            continue
        tier_df = df[(df["quality_score"] >= lo) & (df["quality_score"] <= hi)]
        if len(tier_df) == 0:
            continue
        sampled = tier_df.sample(n=min(n, len(tier_df)), random_state=42)
        selected.extend(sampled["poem_id"].tolist())
    return selected


def format_verse_html(content: str, max_verses: int = 6) -> str:
    """Format Arabic verse content as HTML.

    The DB stores poems as hemistich1*hemistich2*hemistich3*hemistich4*...
    Each pair of hemistichs forms one verse (bayt).
    Returns at most max_verses verses.
    """
    # Split on * to get all hemistichs
    raw = content.strip()
    hemistichs = [h.strip() for h in raw.split("*") if h.strip()]

    parts = []
    i = 0
    while i < len(hemistichs) and len(parts) < max_verses:
        h1 = hemistichs[i]
        if i + 1 < len(hemistichs):
            h2 = hemistichs[i + 1]
            parts.append(
                f'<div class="verse">'
                f'<span class="hemistich">{h1}</span>'
                f'<span class="hemistich-sep">&bull;</span>'
                f'<span class="hemistich">{h2}</span>'
                f'</div>'
            )
            i += 2
        else:
            parts.append(f'<div class="verse"><span class="hemistich-full">{h1}</span></div>')
            i += 1
    return "\n".join(parts)


def dim_bar_html(label: str, value: int, color: str) -> str:
    """Small inline bar for a dimension score."""
    return (
        f'<div class="dim-row">'
        f'  <span class="dim-label">{label}</span>'
        f'  <div class="dim-bar-track">'
        f'    <div class="dim-bar-fill" style="width:{value}%;background:{color};"></div>'
        f'  </div>'
        f'  <span class="dim-value">{value}</span>'
        f'</div>'
    )


def pct(n: int, total: int) -> str:
    if total == 0:
        return "0.0"
    return f"{n / total * 100:.1f}"


# ---------------------------------------------------------------------------
# HTML Generation
# ---------------------------------------------------------------------------

def generate_html(df: pd.DataFrame, poems: dict) -> str:
    """Build the full HTML report string."""

    total_scored = len(df)
    model_name = df["model_used"].iloc[0] if len(df) > 0 else "N/A"
    report_date = datetime.now().strftime("%Y-%m-%d %H:%M")

    # --- Statistics ---
    qs = df["quality_score"]
    stats = {
        "mean": f"{qs.mean():.1f}",
        "median": f"{qs.median():.0f}",
        "std": f"{qs.std():.1f}",
        "min": f"{qs.min():.0f}",
        "max": f"{qs.max():.0f}",
        "p10": f"{np.percentile(qs, 10):.0f}",
        "p25": f"{np.percentile(qs, 25):.0f}",
        "p75": f"{np.percentile(qs, 75):.0f}",
        "p90": f"{np.percentile(qs, 90):.0f}",
    }

    # --- Tier breakdown ---
    tier_rows = []
    max_count = 0
    for key, ar, lo, hi, color in TIERS:
        count = int(((qs >= lo) & (qs <= hi)).sum())
        if count > max_count:
            max_count = count
        tier_rows.append((key, ar, lo, hi, color, count))

    tier_bars_html = ""
    for key, ar, lo, hi, color, count in tier_rows:
        bar_w = (count / max_count * 100) if max_count > 0 else 0
        tier_bars_html += f"""
        <div class="tier-row">
          <div class="tier-label">
            <span class="tier-badge" style="background:{color};">{ar}</span>
            <span class="tier-range">{lo}&ndash;{hi}</span>
          </div>
          <div class="tier-bar-track">
            <div class="tier-bar-fill" style="width:{bar_w:.1f}%;background:{color};"></div>
          </div>
          <div class="tier-count">{count:,} <span class="tier-pct">({pct(count, total_scored)}%)</span></div>
        </div>"""

    # --- Dimension analysis ---
    dim_table_rows = ""
    dim_colors = ["#D4AF37", "#2ECC71", "#3498DB", "#9B59B6", "#E67E22"]
    for i, (dim_key, dim_ar) in enumerate(DIMENSIONS.items()):
        col = df[dim_key]
        c = dim_colors[i % len(dim_colors)]
        bar_w = col.mean()
        dim_table_rows += f"""
        <tr>
          <td class="dim-name">{dim_ar}</td>
          <td class="dim-en">({dim_key})</td>
          <td class="dim-stat">{col.mean():.1f}</td>
          <td class="dim-stat">{col.median():.0f}</td>
          <td class="dim-stat">{col.std():.1f}</td>
          <td class="dim-visual">
            <div class="dim-bar-track-table">
              <div class="dim-bar-fill" style="width:{bar_w}%;background:{c};"></div>
            </div>
          </td>
        </tr>"""

    # --- Sample poems ---
    sample_ids = pick_sample_poems(df)
    poem_cards_html = ""
    for pid in sample_ids:
        row = df[df["poem_id"] == str(pid)].iloc[0]
        poem = poems.get(str(pid), {})
        title = poem.get("title", f"قصيدة #{pid}")
        poet = poem.get("poet_name", "غير معروف")
        content = poem.get("content", "")
        score = int(row["quality_score"])
        _, tier_ar, tier_color = get_tier(score)

        verse_html = format_verse_html(content) if content else '<div class="no-content">لا يوجد نص</div>'

        dim_bars = ""
        for j, (dk, dar) in enumerate(DIMENSIONS.items()):
            dc = dim_colors[j % len(dim_colors)]
            dim_bars += dim_bar_html(dar, int(row[dk]), dc)

        poem_cards_html += f"""
        <div class="poem-card">
          <div class="poem-header">
            <div class="poem-title-block">
              <h3 class="poem-title">{title}</h3>
              <span class="poem-poet">{poet}</span>
            </div>
            <div class="poem-score-block">
              <div class="score-badge" style="background:{tier_color};">{score}</div>
              <span class="score-tier">{tier_ar}</span>
            </div>
          </div>
          <div class="poem-body">
            <div class="poem-verses">
              {verse_html}
            </div>
            <div class="poem-dims">
              {dim_bars}
            </div>
          </div>
          <div class="poem-footer">
            <span class="model-tag">{row['model_used']}</span>
          </div>
        </div>"""

    # --- Progress bar ---
    progress_pct = total_scored / TOTAL_POEMS_IN_DB * 100

    # --- Assemble HTML ---
    html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تقرير تقييم جودة الشعر العربي</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Tajawal:wght@300;400;500;700;800&display=swap');

  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    font-family: 'Tajawal', sans-serif;
    background: #0D0D0D;
    color: #E8E0D0;
    line-height: 1.7;
    direction: rtl;
    min-height: 100vh;
  }}

  .container {{
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 24px;
  }}

  /* ---- Header ---- */
  .report-header {{
    text-align: center;
    padding: 60px 20px 40px;
    border-bottom: 1px solid #2A2520;
    margin-bottom: 50px;
    position: relative;
  }}
  .report-header::before {{
    content: '';
    position: absolute;
    top: 0; left: 50%;
    transform: translateX(-50%);
    width: 80px; height: 3px;
    background: linear-gradient(90deg, transparent, #D4AF37, transparent);
  }}
  .report-header h1 {{
    font-family: 'Amiri', serif;
    font-size: 2.6rem;
    color: #D4AF37;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: 0.02em;
  }}
  .report-header .subtitle {{
    font-size: 1.05rem;
    color: #8A8070;
    margin-bottom: 8px;
  }}
  .report-header .subtitle strong {{
    color: #C0B090;
  }}

  /* Progress bar */
  .progress-wrapper {{
    max-width: 500px;
    margin: 20px auto 0;
  }}
  .progress-label {{
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #8A8070;
    margin-bottom: 6px;
  }}
  .progress-track {{
    width: 100%;
    height: 10px;
    background: #1E1A16;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #2A2520;
  }}
  .progress-fill {{
    height: 100%;
    background: linear-gradient(90deg, #D4AF37, #B8962A);
    border-radius: 5px;
    transition: width 0.5s ease;
  }}

  /* ---- Sections ---- */
  .section {{
    margin-bottom: 60px;
  }}
  .section-title {{
    font-family: 'Amiri', serif;
    font-size: 1.6rem;
    color: #D4AF37;
    margin-bottom: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid #2A2520;
  }}
  .section-subtitle {{
    font-size: 0.9rem;
    color: #6A6050;
    margin-bottom: 24px;
  }}

  /* ---- Tier Distribution ---- */
  .tier-row {{
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 10px;
  }}
  .tier-label {{
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 180px;
    justify-content: flex-end;
  }}
  .tier-badge {{
    display: inline-block;
    padding: 2px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #0D0D0D;
    min-width: 80px;
    text-align: center;
  }}
  .tier-range {{
    font-size: 0.8rem;
    color: #6A6050;
    min-width: 48px;
    text-align: center;
  }}
  .tier-bar-track {{
    flex: 1;
    height: 26px;
    background: #1A1714;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #2A2520;
  }}
  .tier-bar-fill {{
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
    min-width: 2px;
  }}
  .tier-count {{
    min-width: 120px;
    text-align: left;
    font-size: 0.9rem;
    font-weight: 500;
    color: #C0B090;
  }}
  .tier-pct {{
    color: #6A6050;
    font-size: 0.8rem;
  }}

  /* ---- Stats table ---- */
  .stats-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-top: 30px;
  }}
  .stat-card {{
    background: #161310;
    border: 1px solid #2A2520;
    border-radius: 8px;
    padding: 16px 14px;
    text-align: center;
  }}
  .stat-value {{
    font-size: 1.6rem;
    font-weight: 700;
    color: #D4AF37;
    display: block;
    margin-bottom: 4px;
  }}
  .stat-label {{
    font-size: 0.78rem;
    color: #6A6050;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }}

  /* ---- Dimension Analysis ---- */
  .dim-table {{
    width: 100%;
    border-collapse: collapse;
  }}
  .dim-table th {{
    text-align: right;
    padding: 10px 14px;
    font-size: 0.8rem;
    color: #6A6050;
    border-bottom: 1px solid #2A2520;
    font-weight: 500;
  }}
  .dim-table td {{
    padding: 12px 14px;
    border-bottom: 1px solid #1E1A16;
    vertical-align: middle;
  }}
  .dim-name {{
    font-family: 'Amiri', serif;
    font-size: 1.1rem;
    color: #E8E0D0;
    font-weight: 700;
  }}
  .dim-en {{
    font-size: 0.8rem;
    color: #5A5040;
    font-family: 'Tajawal', sans-serif;
  }}
  .dim-stat {{
    text-align: center;
    font-size: 0.95rem;
    color: #C0B090;
    font-weight: 500;
  }}
  .dim-visual {{
    min-width: 200px;
  }}
  .dim-bar-track-table {{
    width: 100%;
    height: 14px;
    background: #1A1714;
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid #2A2520;
  }}
  .dim-bar-fill {{
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }}

  /* ---- Poem Cards ---- */
  .poems-grid {{
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }}
  .poem-card {{
    background: #141210;
    border: 1px solid #2A2520;
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.2s;
  }}
  .poem-card:hover {{
    border-color: #3A3530;
  }}
  .poem-header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 24px 14px;
    border-bottom: 1px solid #1E1A16;
  }}
  .poem-title-block {{
    flex: 1;
  }}
  .poem-title {{
    font-family: 'Amiri', serif;
    font-size: 1.3rem;
    color: #E8E0D0;
    margin-bottom: 4px;
    line-height: 1.5;
  }}
  .poem-poet {{
    font-size: 0.88rem;
    color: #8A8070;
  }}
  .poem-score-block {{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 20px;
  }}
  .score-badge {{
    width: 54px;
    height: 54px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 800;
    color: #0D0D0D;
  }}
  .score-tier {{
    font-size: 0.75rem;
    color: #8A8070;
    margin-top: 4px;
  }}
  .poem-body {{
    display: flex;
    gap: 24px;
    padding: 20px 24px;
  }}
  .poem-verses {{
    flex: 1.5;
    direction: rtl;
  }}
  .verse {{
    text-align: center;
    margin-bottom: 10px;
    font-family: 'Amiri', serif;
    font-size: 1.15rem;
    line-height: 2;
    color: #D8D0C0;
  }}
  .hemistich {{
    display: inline-block;
    padding: 0 12px;
  }}
  .hemistich-sep {{
    color: #D4AF37;
    margin: 0 6px;
    font-size: 0.6rem;
    vertical-align: middle;
  }}
  .hemistich-full {{
    display: block;
    text-align: center;
  }}
  .poem-dims {{
    flex: 1;
    min-width: 260px;
  }}
  .dim-row {{
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 0.82rem;
  }}
  .dim-label {{
    min-width: 100px;
    text-align: right;
    color: #8A8070;
    font-size: 0.78rem;
  }}
  .dim-bar-track {{
    flex: 1;
    height: 10px;
    background: #1A1714;
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid #2A2520;
  }}
  .dim-value {{
    min-width: 28px;
    text-align: left;
    color: #C0B090;
    font-weight: 600;
    font-size: 0.82rem;
  }}
  .poem-footer {{
    padding: 10px 24px;
    border-top: 1px solid #1E1A16;
    display: flex;
    justify-content: flex-start;
  }}
  .model-tag {{
    font-size: 0.72rem;
    color: #5A5040;
    background: #1A1714;
    padding: 2px 10px;
    border-radius: 3px;
    border: 1px solid #2A2520;
    font-family: monospace;
    direction: ltr;
  }}
  .no-content {{
    color: #5A5040;
    font-style: italic;
    text-align: center;
    padding: 20px;
  }}

  /* ---- Methodology ---- */
  .method-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }}
  .method-card {{
    background: #141210;
    border: 1px solid #2A2520;
    border-radius: 8px;
    padding: 20px;
  }}
  .method-card h4 {{
    color: #D4AF37;
    font-size: 0.95rem;
    margin-bottom: 10px;
    font-family: 'Amiri', serif;
  }}
  .method-card p, .method-card ul {{
    font-size: 0.88rem;
    color: #8A8070;
    line-height: 1.8;
  }}
  .method-card ul {{
    padding-right: 18px;
  }}
  .method-card li {{
    margin-bottom: 4px;
  }}
  .method-card code {{
    background: #1A1714;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.82rem;
    color: #C0B090;
    direction: ltr;
    display: inline-block;
  }}

  /* ---- Footer ---- */
  .report-footer {{
    text-align: center;
    padding: 30px 0;
    border-top: 1px solid #2A2520;
    margin-top: 40px;
    font-size: 0.8rem;
    color: #4A4030;
  }}

  /* ---- Responsive ---- */
  @media (max-width: 768px) {{
    .poem-body {{ flex-direction: column; }}
    .method-grid {{ grid-template-columns: 1fr; }}
    .tier-label {{ min-width: 130px; }}
    .report-header h1 {{ font-size: 1.8rem; }}
  }}
</style>
</head>
<body>
<div class="container">

  <!-- ============ HEADER ============ -->
  <div class="report-header">
    <h1>تقرير تقييم جودة الشعر العربي</h1>
    <div class="subtitle">Arabic Poetry Quality Scoring Report</div>
    <div class="subtitle">
      <strong>{total_scored:,}</strong> قصيدة تم تقييمها &bull;
      نموذج التقييم: <strong style="direction:ltr;display:inline-block;">bedrock-haiku-45</strong> &bull;
      {report_date}
    </div>
    <div class="progress-wrapper">
      <div class="progress-label">
        <span>التقدم الكلي</span>
        <span>{total_scored:,} / {TOTAL_POEMS_IN_DB:,} ({progress_pct:.1f}%)</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:{progress_pct:.1f}%;"></div>
      </div>
    </div>
  </div>

  <!-- ============ SECTION 1: SCORE DISTRIBUTION ============ -->
  <div class="section">
    <h2 class="section-title">&#x2160;. توزيع الدرجات</h2>
    <p class="section-subtitle">Score Distribution &mdash; تصنيف القصائد حسب مستوى الجودة</p>

    {tier_bars_html}

    <div class="stats-grid">
      <div class="stat-card"><span class="stat-value">{stats['mean']}</span><span class="stat-label">المتوسط Mean</span></div>
      <div class="stat-card"><span class="stat-value">{stats['median']}</span><span class="stat-label">الوسيط Median</span></div>
      <div class="stat-card"><span class="stat-value">{stats['std']}</span><span class="stat-label">الانحراف Std</span></div>
      <div class="stat-card"><span class="stat-value">{stats['p10']}</span><span class="stat-label">P10</span></div>
      <div class="stat-card"><span class="stat-value">{stats['p25']}</span><span class="stat-label">P25</span></div>
      <div class="stat-card"><span class="stat-value">{stats['p75']}</span><span class="stat-label">P75</span></div>
      <div class="stat-card"><span class="stat-value">{stats['p90']}</span><span class="stat-label">P90</span></div>
      <div class="stat-card"><span class="stat-value">{stats['min']}</span><span class="stat-label">الأدنى Min</span></div>
      <div class="stat-card"><span class="stat-value">{stats['max']}</span><span class="stat-label">الأعلى Max</span></div>
    </div>
  </div>

  <!-- ============ SECTION 2: DIMENSION ANALYSIS ============ -->
  <div class="section">
    <h2 class="section-title">&#x2161;. تحليل أبعاد التقييم</h2>
    <p class="section-subtitle">Dimension Analysis &mdash; مقارنة الأبعاد الخمسة لجودة الشعر</p>

    <table class="dim-table">
      <thead>
        <tr>
          <th>البُعد</th>
          <th></th>
          <th>المتوسط</th>
          <th>الوسيط</th>
          <th>الانحراف</th>
          <th>المقارنة البصرية</th>
        </tr>
      </thead>
      <tbody>
        {dim_table_rows}
      </tbody>
    </table>
  </div>

  <!-- ============ SECTION 3: SELECTED POEMS ============ -->
  <div class="section">
    <h2 class="section-title">&#x2162;. نماذج مختارة</h2>
    <p class="section-subtitle">Selected Poems &mdash; عينة من القصائد من مستويات الجودة المختلفة</p>

    <div class="poems-grid">
      {poem_cards_html}
    </div>
  </div>

  <!-- ============ SECTION 4: METHODOLOGY ============ -->
  <div class="section">
    <h2 class="section-title">&#x2163;. المنهجية</h2>
    <p class="section-subtitle">Methodology &mdash; كيف تم تقييم القصائد</p>

    <div class="method-grid">
      <div class="method-card">
        <h4>النموذج المستخدم</h4>
        <p>Claude Haiku 4.5 عبر Amazon Bedrock، بوساطة خادم LiteLLM proxy.
           يُستدعى النموذج بمعرّف <code>openai/bedrock-haiku-45</code>.</p>
      </div>
      <div class="method-card">
        <h4>أبعاد التقييم</h4>
        <ul>
          <li><strong>الإيقاع والموسيقى</strong> &mdash; جمال الوزن، تناسق القوافي، الموسيقى الداخلية</li>
          <li><strong>التصوير</strong> &mdash; قوة الصور الشعرية، الاستعارات، حيوية المشاهد</li>
          <li><strong>العاطفة</strong> &mdash; صدق المشاعر، عمق الوجدان، التأثير</li>
          <li><strong>اللغة</strong> &mdash; فصاحة الألفاظ، جزالة التراكيب، البلاغة</li>
          <li><strong>القيمة الثقافية</strong> &mdash; الأهمية الأدبية، الأصالة، المكانة في التراث</li>
        </ul>
      </div>
      <div class="method-card">
        <h4>آلية التقييم</h4>
        <p>كل بُعد يُقيَّم من 0 إلى 100. درجة الجودة الكلية هي متوسط الأبعاد الخمسة.
           يعمل الذكاء الاصطناعي كناقد أدبي عربي متخصص يقيّم القصائد من منظور أكاديمي وذوق معاصر.</p>
      </div>
      <div class="method-card">
        <h4>إعدادات المعالجة</h4>
        <ul>
          <li>حجم الدفعة: <code>5</code> قصائد لكل طلب</li>
          <li>التزامن: <code>20</code> طلباً متوازياً</li>
          <li>نقاط حفظ كل <code>1,000</code> قصيدة بصيغة Parquet</li>
          <li>النتائج مخزنة في: <code>scores_openai_bedrock-haiku-45.parquet</code></li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ============ FOOTER ============ -->
  <div class="report-footer">
    تم إنشاء هذا التقرير تلقائياً بواسطة خط أنابيب تنسيق الشعر العربي &bull; {report_date}
  </div>

</div>
</body>
</html>"""

    return html


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Load scores
    df = load_scores()

    # 2. Pick sample poems, then fetch their content from DB
    sample_ids = pick_sample_poems(df)
    poems = load_poem_content(sample_ids)

    # 3. Generate HTML
    html = generate_html(df, poems)

    # 4. Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"\nReport written to {OUTPUT_PATH}")
    print(f"  File size: {OUTPUT_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
