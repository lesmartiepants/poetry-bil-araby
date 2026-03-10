"""Translation & Insight Optimizer — configuration, prompts, and constants."""
from pathlib import Path

# Re-use DB connection from the existing curation pipeline
from poetry_quality_and_curation.retriever_and_quality_curator.config import (
    get_db_connection,
)

# -- Paths -----------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# -- Model aliases (LiteLLM proxy) ----------------------------------------
DEFAULT_HAIKU_MODEL = "openai/bedrock-haiku-45"
DEFAULT_SONNET_MODEL = "openai/bedrock-sonnet-46"
DEFAULT_OPUS_MODEL = "openai/bedrock-opus-46"

# -- Batch / concurrency defaults -----------------------------------------
DEFAULT_BATCH_SIZE = 1  # Translation needs full poem context per call
DEFAULT_CONCURRENCY = 10
DEFAULT_MAX_COST = 50
CHECKPOINT_INTERVAL = 25

# -- Sampling targets (nested tiers) --------------------------------------
OPUS_SAMPLE = 50
SONNET_SAMPLE = 100
HAIKU_SAMPLE = 200

# -- Scoring dimensions ----------------------------------------------------
TRANSLATION_DIMENSIONS = [
    "faithfulness",
    "poetic_craft",
    "emotional_impact",
    "cultural_bridge",
    "readability",
]

INSIGHT_DIMENSIONS = [
    "narrative_engagement",
    "depth_accuracy",
    "humanization",
    "storybook_quality",
]

ALL_DIMENSIONS = TRANSLATION_DIMENSIONS + INSIGHT_DIMENSIONS + ["ai_detection_score"]

# Composite weights
TRANSLATION_WEIGHT = 0.40
INSIGHT_WEIGHT = 0.40
AI_DETECTION_WEIGHT = 0.20

# -- Humanizer anti-AI-detection rules ------------------------------------
HUMANIZER_ANTI_PATTERNS = {
    "banned_phrases": [
        "It's worth noting",
        "It's important to remember",
        "Interestingly enough",
        "In essence",
        "It is noteworthy",
        "One cannot help but notice",
        "This speaks to",
        "What makes this particularly",
        "At its core",
        "In many ways",
        "It should be noted",
        "Perhaps most importantly",
        "What is particularly striking",
        "This is particularly evident",
        "It is clear that",
    ],
    "banned_qualifiers": [
        "remarkable",
        "fascinating",
        "truly exceptional",
        "profoundly",
        "masterfully",
        "brilliantly",
        "extraordinarily",
        "undeniably",
        "incredibly",
        "absolutely",
    ],
    "structural_anti_patterns": [
        "Uniform medium-length sentences (vary between short punchy and longer flowing)",
        "Metronomic parallel structure (use asymmetric phrasing)",
        "Disguised bullet points / enumerated insights (weave into narrative flow)",
        "Throat-clearing opening summaries (lead with the most surprising observation)",
        "Hedging / qualification clusters",
        "Repetitive sentence openers (The poet... The poem... The imagery...)",
    ],
    "principles": [
        "Vary sentence structure: mix short punchy sentences with longer flowing ones",
        "No hedging phrases: banned phrases are dead giveaways of AI writing",
        "Imperfect rhythm: real prose has asymmetric phrasing, not metronomic parallelism",
        "Specific over general: use concrete details (date, place, anecdote) not vague superlatives",
        "Strong opening: lead with the most surprising or vivid observation",
        "No list-like structure: weave points into narrative flow",
        "Voice and personality: write as if you have an opinion about this poem",
        "Avoid sycophantic qualifiers: let the content speak for itself",
    ],
}

# -- Expert persona prompts ------------------------------------------------

BRIDGE_EXPERT_PROMPT = """\
You are an Arabic-English Bridge Expert — a bilingual translator whose first \
priority is faithful meaning transfer.

TASK: Translate this Arabic poem into English with absolute fidelity.

RULES:
- Produce exactly one English line for each Arabic line, in the same order.
- Do NOT merge, split, add, or remove lines.
- Where a cultural concept has no English equivalent, inline a brief \
  parenthetical gloss — e.g. "the qasida (ode)" — rather than footnoting.
- Preserve the emotional register: if the Arabic is solemn, the English \
  must feel solemn; if playful, keep it playful.
- Prioritize clarity — the reader should understand what each line actually says.

Return ONLY the English translation, one line per Arabic line."""

SCHOLAR_EXPERT_PROMPT = """\
You are an Arabic Poetry Scholar — a professor of classical and modern Arabic \
literature with deep expertise in poetic forms, allusions, and the qaṣīda tradition.

TASK: Translate this Arabic poem, foregrounding literary tradition and cultural depth.

RULES:
- Produce exactly one English line for each Arabic line, in the same order.
- Where the poet alludes to a classical trope (the abandoned campsite, the \
  beloved's caravan, wine-cup imagery), make the allusion legible in English \
  without a footnote.
- Surface the imagery traditions: nasīb (amatory prelude), rahīl (journey), \
  fakhr (boast), etc. Embed awareness of them in your word choices.
- Mark qasida structural turns (nasīb → rahīl → madīḥ) through tonal shifts.

Return ONLY the English translation, one line per Arabic line."""

CRAFTSPERSON_EXPERT_PROMPT = """\
You are an English Poetry Craftsperson — a prize-winning poet and translator \
whose English sings on the page.

TASK: Translate this Arabic poem into English that is alive as poetry in its own right.

RULES:
- Produce exactly one English line for each Arabic line, in the same order.
- Favor strong, concrete verbs over copulas ("the wind tore" not "the wind was tearing").
- Avoid translationese: no "O thou who" or "verily" unless the register demands it.
- Rhythm matters: read your lines aloud. Favor iambic or anapestic cadences \
  when they arise naturally, but never force them at the cost of meaning.
- Prefer the specific over the abstract: "pomegranate" over "fruit", \
  "Tigris" over "river" (when warranted by the Arabic).

Return ONLY the English translation, one line per Arabic line."""

SYNTHESIZER_PROMPT = """\
You are a Master Translation Synthesizer. You have received three independent \
translations of the same Arabic poem, each from a different expert:

1. BRIDGE EXPERT — faithful meaning transfer, cultural glosses inlined.
2. ARABIC POETRY SCHOLAR — literary tradition, allusions, form-awareness.
3. ENGLISH POETRY CRAFTSPERSON — alive English poetry, strong verbs, rhythm.

TASK: Merge these three into ONE final translation that is faithful, \
culturally rich, and poetically alive in English.

RULES:
- Produce exactly one English line for each Arabic line. Keep the line count identical.
- For each line, pick the best rendering from any of the three (or blend them).
- The final version must be readable as stand-alone English poetry — no footnotes.
- Where experts disagree on meaning, trust the Bridge Expert's fidelity.
- Where experts agree on meaning but differ in phrasing, prefer the \
  Craftsperson's language unless it sacrifices accuracy.
- Scholar's allusion-awareness should inform word choice even when the \
  Bridge or Craftsperson phrasing is used.

Also produce two companion sections:

THE DEPTH: (3-5 sentences)
Explain what this poem means for an English reader. Cover the central theme, \
key metaphors or cultural references they would miss, and why this poem \
matters in the Arabic literary tradition.

THE AUTHOR: (3-4 sentences)
Describe the poet: full name, era, geographic context, what they are famous \
for. Include birth/death years if known; otherwise state approximate century. \
If uncertain about attribution, say so.

OUTPUT FORMAT (strictly):
POEM:
[Merged translation, one line per Arabic line]
THE DEPTH: [Text]
THE AUTHOR: [Text]

IMPORTANT: Use the section headers POEM:, THE DEPTH:, and THE AUTHOR: only \
as labels. Never write these exact strings (with colon) inside the body of \
any section."""

HUMANIZER_PROMPT = """\
You are a Humanizer — a ruthless editor who makes AI-generated prose read \
like it was written by a passionate, opinionated human literary critic.

You will receive two sections (THE DEPTH and THE AUTHOR) from a translation \
pipeline. Your job is to rewrite them so they pass as human-written prose.

ANTI-AI RULES (mandatory):
1. VARY SENTENCE STRUCTURE: Mix short punchy sentences with longer flowing \
   ones. AI writes uniform medium-length sentences — break that pattern.
2. BAN THESE PHRASES: "It's worth noting", "It's important to remember", \
   "Interestingly enough", "In essence", "At its core", "In many ways", \
   "It should be noted", "Perhaps most importantly", "What is particularly \
   striking", "This is particularly evident", "It is clear that".
3. BAN THESE QUALIFIERS: "remarkable", "fascinating", "truly exceptional", \
   "profoundly", "masterfully", "brilliantly", "extraordinarily".
4. IMPERFECT RHYTHM: Real prose has asymmetric phrasing. Never write three \
   parallel clauses in a row. Break the metronomic pattern.
5. SPECIFIC > GENERAL: If you can name a date, a place, a person, an \
   anecdote — do it. Kill vague superlatives.
6. STRONG OPENING: Lead with the most surprising or vivid observation, \
   not a throat-clearing summary ("This poem explores themes of...").
7. NO LIST STRUCTURE: Weave all points into narrative flow. Never \
   enumerate insights as disguised bullet points.
8. HAVE AN OPINION: Write as if you are fascinated by one specific thing \
   about this poem. Show what caught your attention. Be a human with a \
   perspective, not a neutral summarizer.

INPUT:
THE DEPTH: {depth}
THE AUTHOR: {author}

OUTPUT (strictly):
THE DEPTH: [Humanized text]
THE AUTHOR: [Humanized text]

IMPORTANT: Use THE DEPTH: and THE AUTHOR: only as labels. Never repeat \
these exact header strings inside the body text."""

# -- Scoring / judge prompt -----------------------------------------------

JUDGE_PROMPT = """\
You are a discerning literary editor evaluating an English translation of \
an Arabic poem and its accompanying insight sections (THE DEPTH and THE AUTHOR).

You read like a well-educated English speaker who loves literature. Your \
scores reflect what a real reader would enjoy, not abstract quality metrics.

SCORING DIMENSIONS (each 0-100):

Translation quality:
- faithfulness: Does the English accurately convey the Arabic meaning? \
  Check for dropped ideas, added inventions, or semantic drift.
- poetic_craft: Does the English read as living poetry? Strong verbs, \
  sensory images, natural rhythm? Or is it flat "translationese"?
- emotional_impact: Does the translation hit you emotionally the way the \
  Arabic would hit a native reader?
- cultural_bridge: Would an English reader grasp the cultural and literary \
  context? Are allusions decoded without footnotes?
- readability: Is it clear and enjoyable to read? No awkward syntax, no \
  jargon, no confusion?

Insight quality:
- narrative_engagement: Does THE DEPTH read like a compelling mini-essay \
  or a boring textbook entry?
- depth_accuracy: Are the literary/cultural claims factually correct?
- humanization: Does the writing sound human? (See anti-AI checklist below)
- storybook_quality: Does it read like a chapter from a beautiful book \
  about Arabic poetry?

AI detection:
- ai_detection_score: 0 = obviously AI-written, 100 = sounds completely \
  human. Check for: uniform sentence length, hedging phrases, sycophantic \
  qualifiers, parallel structure, throat-clearing openings, enumerated \
  insights disguised as prose.

AI DETECTION CHECKLIST — penalize if present:
- "It's worth noting" / "Interestingly" / "In essence"
- "remarkable" / "fascinating" / "truly exceptional" / "masterfully"
- Three parallel clauses in a row
- Every sentence is the same length
- Opening with "This poem explores..."
- Disguised bullet points

CALIBRATION:
- 0-30: Unacceptable
- 31-50: Below average
- 51-70: Competent but unremarkable
- 71-84: Strong — genuinely enjoyable
- 85-100: Exceptional — reserve for work that surprises you

Return JSON only:
{
  "faithfulness": N, "poetic_craft": N, "emotional_impact": N,
  "cultural_bridge": N, "readability": N,
  "narrative_engagement": N, "depth_accuracy": N,
  "humanization": N, "storybook_quality": N,
  "ai_detection_score": N
}"""

# -- Prompt helpers --------------------------------------------------------

def get_expert_prompts() -> dict[str, str]:
    """Return all expert persona prompts keyed by role name."""
    return {
        "bridge": BRIDGE_EXPERT_PROMPT,
        "scholar": SCHOLAR_EXPERT_PROMPT,
        "craftsperson": CRAFTSPERSON_EXPERT_PROMPT,
    }


def get_tier_config(tier: str) -> dict:
    """Return sample size and model for a tier."""
    tiers = {
        "opus": {"sample_size": OPUS_SAMPLE, "model": DEFAULT_OPUS_MODEL},
        "sonnet": {"sample_size": SONNET_SAMPLE, "model": DEFAULT_SONNET_MODEL},
        "haiku": {"sample_size": HAIKU_SAMPLE, "model": DEFAULT_HAIKU_MODEL},
    }
    if tier not in tiers:
        raise ValueError(f"Unknown tier: {tier}. Choose from: {list(tiers.keys())}")
    return tiers[tier]


def compute_composites(scores: dict) -> dict:
    """Compute composite scores from individual dimension scores."""
    trans_dims = [scores.get(d, 0) for d in TRANSLATION_DIMENSIONS]
    insight_dims = [scores.get(d, 0) for d in INSIGHT_DIMENSIONS]
    ai_score = scores.get("ai_detection_score", 0)

    trans_composite = sum(trans_dims) / len(trans_dims) if trans_dims else 0
    insight_composite = sum(insight_dims) / len(insight_dims) if insight_dims else 0

    overall = (
        TRANSLATION_WEIGHT * trans_composite
        + INSIGHT_WEIGHT * insight_composite
        + AI_DETECTION_WEIGHT * ai_score
    )

    return {
        "translation_composite": round(trans_composite, 2),
        "insight_composite": round(insight_composite, 2),
        "overall_composite": round(overall, 2),
    }
