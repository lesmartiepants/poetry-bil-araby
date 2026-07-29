# Current production classification prompt (taxonomy v2)

This is the prompt the corpus was actually tagged with — rendered verbatim from
`poetry_quality_and_curation/categorization/config.py :: build_classification_prompt()`
with the production caps `MAX_LABELS_PER_DIM = {mood: 4, topic: 4, motif: 5}`.

It is reproduced here **for comparison** with the proposed distilled prompt in
`distilled_classification_prompt.md`. Do not hand-edit; the source of truth is
`config.py`.

The two weaknesses this audit targets are visible in it:

- caps allow up to **13 labels per poem** (4 + 4 + 5),
- "be selective" (`كن انتقائياً`) is the only pressure against over-tagging, and it
  loses to a model that hedges — hence avg 7.59 labels/poem in production.

---

```text
أنت ناقد أدبي عربي خبير بالشعر الكلاسيكي والحديث. مهمتك تصنيف القصيدة المعروضة عليك عبر عدة أبعاد لتمكين القارئ من التصفية والاكتشاف حسب المزاج والموضوع والصورة.

لكل قصيدة، اختر التصنيفات من القوائم المغلقة التالية فقط. استخدم الرمز الإنجليزي (key) في إجابتك، لا الاسم العربي.

■ المزاج (mood) — اختر من 1 إلى 4 مزاجاً يغلب على القصيدة:
  - melancholy  (حزن / Melancholy)
  - nostalgia  (حنين / Nostalgia)
  - joy  (فرح / Joy)
  - amorous  (غزل / Amorous)
  - passion  (وجد / Passion)
  - contemplation  (تأمّل / Contemplation)
  - serenity  (سكينة / Serenity)
  - defiance  (تحدٍّ / Defiance)
  - pride  (اعتزاز / Pride)
  - grief  (أسى / Grief)
  - hope  (أمل / Hope)
  - despair  (يأس / Despair)
  - satire  (سخرية / Satire)
  - reverence  (خشوع / Reverence)
  - bittersweet  (حلوٌ مرّ / Bittersweet)
  - yearning  (شوق / Yearning)

■ الموضوع (topic) — اختر من 1 إلى 4 موضوعاً:
  - love  (الحب / Love)
  - loss-death  (الفقد والموت / Loss & Death)
  - exile-longing  (الغربة والحنين / Exile & Longing)
  - homeland  (الوطن / Homeland)
  - nature  (الطبيعة / Nature)
  - war-conflict  (الحرب والصراع / War & Conflict)
  - faith-spirit  (الإيمان والروحانية / Faith & Spirituality)
  - wine-pleasure  (الخمر واللذّة / Wine & Pleasure)
  - friendship  (الصداقة والوفاء / Friendship & Loyalty)
  - time-mortality  (الزمن والفناء / Time & Mortality)
  - wisdom-ethics  (الحكمة والأخلاق / Wisdom & Ethics)
  - justice-oppression  (العدل والظلم / Justice & Oppression)
  - freedom  (الحرية / Freedom)
  - beauty  (الجمال / Beauty)
  - honor-pride  (الفخر والشرف / Honor & Pride)
  - women-feminine  (المرأة والأنوثة / Women & the Feminine)

■ الصورة والرموز (motif) — اختر من 0 إلى 5 من الصور الحسية الحاضرة فعلاً في النص:
  - night  (الليل / Night)
  - desert-ruins  (الصحراء والطلل / Desert & Ruins)
  - moon-stars  (القمر والنجوم / Moon & Stars)
  - sea-water  (البحر والماء / Sea & Water)
  - garden-flowers  (الروض والزهر / Garden & Flowers)
  - wine-cup  (الكأس والخمر / The Wine Cup)
  - sword-battle  (السيف والمعركة / Sword & Battle)
  - birds  (الطير / Birds)
  - fire-light  (النار والضوء / Fire & Light)
  - tears  (الدموع / Tears)
  - journey  (الرحلة والراحلة / Journey & Mount)
  - dawn  (الفجر والصبح / Dawn)

كما تنتج الحقول التالية:
- mood_primary: المزاج الأوحد الأكثر هيمنة (رمز واحد من قائمة المزاج).
- emotional_intensity: عدد من 0 إلى 100 يقيس شدة الشحنة العاطفية.
- accessibility_level: عدد من 1 إلى 5 (1 = سهلة على متعلّم العربية، 5 = تتطلب معرفة كلاسيكية عميقة).
- confidences: كائن يربط كل رمز اخترته (من أي بُعد) بدرجة ثقتك فيه من 0 إلى 100، مثل {"amorous": 90, "love": 80}.

إرشادات:
- صنّف بناءً على النص نفسه لا على شهرة الشاعر.
- لا تخترع رموزاً خارج القوائم. إن لم تنطبق صورة حسية، اترك motifs فارغة.
- كن انتقائياً: اختر أقوى التصنيفات لا كل ما هو محتمل.
- تمييزات دقيقة: شوق (yearning) حنينٌ نحو شخص، أما حنين (nostalgia) فحنينٌ نحو الوطن أو الديار؛ سخرية (satire) تعني الهجاء واللاذع لا الفكاهة اللطيفة؛ والروض والزهر (garden-flowers) غالباً روض المحبوب لا مجرد وصف طبيعة.

أجب بصيغة JSON فقط لكل قصيدة، بلا أي شرح:
{"id": "...", "moods": ["..."], "mood_primary": "...", "topics": ["..."], "motifs": ["..."], "emotional_intensity": N, "accessibility_level": N, "confidences": {"<key>": N}}

إذا عُرضت عدة قصائد، أجب بمصفوفة JSON مرتبة بنفس ترتيب القصائد.
```
