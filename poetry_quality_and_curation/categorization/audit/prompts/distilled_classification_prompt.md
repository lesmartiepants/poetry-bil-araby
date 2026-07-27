# Proposed DISTILLED classification prompt

This is the prompt used in the live 3-poem illustrative pass (see
`../samples/before_after.json`). It is the concrete proposal from the audit
(`ideas/categorization-audit.md`, §5c). It has **not** been wired into
`config.py` or run on the corpus — that is the pending, approval-gated change.

## What changed vs. the current prompt
1. **Tight caps: mood 2 / topic 2 / motif 2** (was 4 / 4 / 5). Hard ceiling drops 13 → 6.
2. **Dominant-concept framing.** Name the ONE dominant mood (`mood_primary`); add a
   second mood only if genuinely distinct, not a shade of the first.
3. **One-per-synonym-family.** From the sadness family
   (melancholy/grief/despair/bittersweet) pick exactly one; from the desire family
   (amorous/passion/yearning) pick exactly one. This kills the redundant stacking
   the audit measured (2,191 poems carry ≥2 sadness synonyms; 524 carry all three
   desire synonyms).
4. **Confidence floor 65.** Do not emit any label with confidence < 65.
5. **`rationale` field.** One Arabic line naming the poem's core concept, forcing a
   coherent read instead of a scatter of plausible tags.

## Tradeoff
Trades recall for precision. A multi-theme poem surfaces under its dominant
theme(s), not four topics. For a discovery UX, precision is the right bet — a
filter that returns ~half the corpus (today `love` is on 46% of poems) is the
worse failure.

---

## Prompt (verbatim, as run)

```text
أنت ناقد أدبي عربي خبير. صنّف القصيدة بأقل عدد من التصنيفات التي تعبّر عن جوهرها، لا كل ما هو محتمل.

القوائم المغلقة (استخدم الرمز الإنجليزي key فقط):
■ mood: melancholy, nostalgia, joy, amorous, passion, contemplation, serenity, defiance, pride, grief, hope, despair, satire, reverence, bittersweet, yearning
■ topic: love, loss-death, exile-longing, homeland, nature, war-conflict, faith-spirit, wine-pleasure, friendship, time-mortality, wisdom-ethics, justice-oppression, freedom, beauty, honor-pride, women-feminine
■ motif: night, desert-ruins, moon-stars, sea-water, garden-flowers, wine-cup, sword-battle, birds, fire-light, tears, journey, dawn

قواعد التقطير (مهمة):
1) mood: اختر مزاجاً مهيمناً واحداً (mood_primary)، وأضف مزاجاً ثانوياً واحداً فقط إن كان مختلفاً جوهرياً عنه. لا تكدّس مرادفات: من عائلة الحزن (melancholy/grief/despair/bittersweet) اختر الأدق واحداً؛ ومن عائلة الهوى (amorous/passion/yearning) اختر الأدق واحداً.
2) topic: 1 موضوع، أو 2 إن حمل النص موضوعين متمايزين حقاً.
3) motif: 0 إلى 2، فقط الصور الحسية الحاضرة فعلاً وبقوة في النص. إن لم تبرز صورة، اترك القائمة فارغة.
4) لكل رمز تختاره، أعطِ ثقة 0-100، ولا تُدرج أي رمز ثقته دون 65.
5) أضف حقلاً "rationale": جملة عربية قصيرة تسمّي المفهوم الجوهري للقصيدة تبرّر بها اختيارك.

أجب بJSON فقط:
{"id":"...","mood_primary":"...","moods":["..."],"topics":["..."],"motifs":["..."],"emotional_intensity":N,"accessibility_level":N,"confidences":{"<key>":N},"rationale":"..."}
```

## Generation config used
- model: `gemini-3.6-flash` (via the app proxy `POST /api/ai/:model/generateContent`)
- temperature: 0.2
- responseMimeType: `application/json`
- maxOutputTokens: 1400 (needs headroom for the Arabic rationale + JSON; 800 truncated)
