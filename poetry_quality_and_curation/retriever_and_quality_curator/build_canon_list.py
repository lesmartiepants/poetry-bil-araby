"""Build comprehensive Arabic poetry canon list and match against scored dataset.

Outputs canon_poems.json with match results and fame tiers.
"""
import json
import re
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def remove_diacritics(text):
    if not isinstance(text, str):
        return ''
    return re.sub(r'[\u064B-\u065F\u0670]', '', text)

# ============================================================
# CANON LIST
# ============================================================

CANON = [
    # ---- TIER 1: Absolute Must-Include ----
    # Mu'allaqat
    {"title": "قفا نبك من ذكرى حبيب ومنزل", "alt_titles": ["قفا نبك من ذكرى حبيب وعرفان", "معلقة امرئ القيس"], "poet": "امرؤ القيس", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة امرئ القيس - أشهر قصيدة في الشعر العربي"},
    {"title": "لخولة أطلال ببرقة ثهمد", "alt_titles": ["لخولة بالأجزاع من إضم طلل", "معلقة طرفة"], "poet": "طرفة بن العبد", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة طرفة بن العبد"},
    {"title": "أمن أم أوفى دمنة لم تكلم", "alt_titles": ["معلقة زهير"], "poet": "زهير بن أبي سلمى", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة زهير - حكيم الشعراء"},
    {"title": "عفت الديار محلها فمقامها", "alt_titles": ["معلقة لبيد"], "poet": "لبيد بن ربيعة", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة لبيد بن ربيعة"},
    {"title": "هل غادر الشعراء من متردم", "alt_titles": ["معلقة عنترة"], "poet": "عنترة بن شداد", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة عنترة - من أشهر الشعر الجاهلي"},
    {"title": "ألا هبي بصحنك فاصبحينا", "alt_titles": ["معلقة عمرو بن كلثوم"], "poet": "عمرو بن كلثوم", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة عمرو بن كلثوم"},
    {"title": "آذنتنا ببينها أسماء", "alt_titles": ["معلقة الحارث بن حلزة"], "poet": "الحارث بن حلزة", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة الحارث بن حلزة"},
    {"title": "يا دار مية بالعلياء فالسند", "alt_titles": ["معلقة النابغة"], "poet": "النابغة الذبياني", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة النابغة الذبياني"},
    {"title": "ودع هريرة إن الركب مرتحل", "alt_titles": ["معلقة الأعشى"], "poet": "الأعشى", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة الأعشى - صناجة العرب"},
    {"title": "أقفر من أهله ملحوب", "alt_titles": ["معلقة عبيد"], "poet": "عبيد بن الأبرص", "fame_tier": 1, "category": "المعلقات", "fame_reason": "معلقة عبيد بن الأبرص"},

    # Classical masterpieces
    {"title": "بانت سعاد فقلبي اليوم متبول", "alt_titles": ["البردة", "قصيدة البردة"], "poet": "كعب بن زهير", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "بانت سعاد - أول قصيدة مدح نبوي"},
    {"title": "أمن تذكر جيران بذي سلم", "alt_titles": ["البردة", "قصيدة البردة", "الكواكب الدرية"], "poet": "البوصيري", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "بردة البوصيري - أشهر قصيدة مديح نبوي"},
    {"title": "على قدر أهل العزم تأتي العزائم", "alt_titles": [], "poet": "المتنبي", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "من أشهر قصائد المتنبي - تُدرّس في كل مناهج العربية"},
    {"title": "واحر قلباه ممن قلبه شبم", "alt_titles": [], "poet": "المتنبي", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "تتضمن أنا الذي نظر الأعمى - أشهر بيت شعر عربي"},
    {"title": "الخيل والليل والبيداء تعرفني", "alt_titles": [], "poet": "المتنبي", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "من أكثر أبيات المتنبي اقتباساً"},
    {"title": "أضحى التنائي بديلا من تدانينا", "alt_titles": ["نونية ابن زيدون"], "poet": "ابن زيدون", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "نونية ابن زيدون - أجمل قصائد الحب في الأندلس"},
    {"title": "دع الأيام تفعل ما تشاء", "alt_titles": [], "poet": "الإمام الشافعي", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "أشهر قصائد الشافعي - تُحفظ وتُردد عالمياً"},
    {"title": "لامية العرب", "alt_titles": ["أقيموا بني أمي صدور مطيكم"], "poet": "الشنفرى", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "لامية العرب - من أجود الشعر الجاهلي"},
    {"title": "أصالة الرأي صانتني عن الخطل", "alt_titles": ["لامية العجم"], "poet": "الطغرائي", "fame_tier": 1, "category": "كلاسيكي", "fame_reason": "لامية العجم - من أشهر لاميات العرب"},

    # Modern absolute canon
    {"title": "بطاقة هوية", "alt_titles": ["سجل أنا عربي"], "poet": "محمود درويش", "fame_tier": 1, "category": "حديث", "fame_reason": "أيقونة الشعر الفلسطيني - يحفظها كل عربي"},
    {"title": "إلى أمي", "alt_titles": ["أحن إلى خبز أمي"], "poet": "محمود درويش", "fame_tier": 1, "category": "حديث", "fame_reason": "من أشهر قصائد درويش - رمز الحنين للوطن والأم"},
    {"title": "إرادة الحياة", "alt_titles": ["إذا الشعب يوماً أراد الحياة"], "poet": "أبو القاسم الشابي", "fame_tier": 1, "category": "حديث", "fame_reason": "نشيد الثورات العربية - تُدرّس في كل المناهج"},
    {"title": "أنشودة المطر", "alt_titles": ["عيناك غابتا نخيل"], "poet": "بدر شاكر السياب", "fame_tier": 1, "category": "حديث", "fame_reason": "أيقونة الشعر الحر العربي"},
    {"title": "قم للمعلم وفه التبجيلا", "alt_titles": ["قم للمعلم"], "poet": "أحمد شوقي", "fame_tier": 1, "category": "حديث", "fame_reason": "أشهر قصيدة عن المعلم - تُنشد في كل مدرسة عربية"},
    {"title": "ولد الهدى فالكائنات ضياء", "alt_titles": ["الهمزية النبوية"], "poet": "أحمد شوقي", "fame_tier": 1, "category": "حديث", "fame_reason": "أشهر قصائد أمير الشعراء في المديح النبوي"},
    {"title": "الأطلال", "alt_titles": ["يا فؤادي لا تسل أين الهوى"], "poet": "إبراهيم ناجي", "fame_tier": 1, "category": "حديث", "fame_reason": "غنتها أم كلثوم - من أشهر القصائد المغناة"},
    {"title": "موطني الجلال والجمال", "alt_titles": ["موطني"], "poet": "ابراهيم طوقان", "fame_tier": 1, "category": "حديث", "fame_reason": "النشيد الوطني العراقي سابقاً - رمز القومية العربية"},
    {"title": "أعطني الناي وغنِّ", "alt_titles": ["المواكب"], "poet": "جبران خليل جبران", "fame_tier": 1, "category": "حديث", "fame_reason": "غنتها فيروز - من أشهر القصائد المغناة"},
    {"title": "الطلاسم", "alt_titles": ["جئت لا أعلم من أين"], "poet": "إيليا أبو ماضي", "fame_tier": 1, "category": "حديث", "fame_reason": "من أشهر قصائد المهجر - فلسفة وجودية"},
    {"title": "قارئة الفنجان", "alt_titles": ["جلست والخوف بعينيها"], "poet": "نزار قباني", "fame_tier": 1, "category": "حديث", "fame_reason": "غناها عبد الحليم - من أيقونات الشعر العربي الحديث"},
    {"title": "في القدس", "alt_titles": [], "poet": "تميم البرغوثي", "fame_tier": 1, "category": "حديث", "fame_reason": "ظاهرة شعرية معاصرة - ملايين المشاهدات"},

    # ---- TIER 2: Highly Famous ----
    # Darwish
    {"title": "على هذه الأرض", "alt_titles": ["على هذه الأرض ما يستحق الحياة"], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "من أشهر قصائد درويش"},
    {"title": "عابرون في كلام عابر", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "قصيدة سياسية شهيرة"},
    {"title": "جدارية", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "آخر أعمال درويش الكبرى"},
    {"title": "ريتا والبندقية", "alt_titles": ["ريتا"], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "غناها مارسيل خليفة"},
    {"title": "حالة حصار", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "من أهم قصائد المقاومة"},
    {"title": "لاعب النرد", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "من آخر قصائد درويش"},
    {"title": "فكر بغيرك", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "من أشهر قصائد درويش القصيرة"},
    {"title": "أنا من هناك", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 2, "category": "حديث", "fame_reason": "قصيدة الهوية والمنفى"},

    # Qabbani
    {"title": "بلقيس", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "رثاء زوجته - من أشهر قصائد الرثاء الحديث"},
    {"title": "هوامش على دفتر النكسة", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "أهم قصيدة سياسية لقباني"},
    {"title": "إني خيرتك فاختاري", "alt_titles": ["إني خيرتك"], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "من أشهر قصائد الحب العربي"},
    {"title": "زيديني عشقاً زيديني", "alt_titles": ["زيديني عشقا"], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "من أيقونات شعر الحب"},
    {"title": "رسالة من تحت الماء", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "من أجمل قصائد قباني"},
    {"title": "من مفكرة عاشق دمشقي", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "حب دمشق"},

    # Mutanabbi more
    {"title": "أرق على أرق ومثلي يأرق", "alt_titles": [], "poet": "المتنبي", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "من عيون شعر المتنبي"},
    {"title": "الرأي قبل شجاعة الشجعان", "alt_titles": [], "poet": "المتنبي", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "من حكم المتنبي الشهيرة"},

    # Other classical tier 2
    {"title": "أراك عصي الدمع شيمتك الصبر", "alt_titles": ["الروميات"], "poet": "أبو فراس الحمداني", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "الروميات - شعر الأسر الشهير"},
    {"title": "أقول وقد ناحت بقربي حمامة", "alt_titles": [], "poet": "أبو فراس الحمداني", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "من روميات أبي فراس"},
    {"title": "دع عنك لومي فإن اللوم إغراء", "alt_titles": [], "poet": "أبو نواس", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "أشهر خمرية في الشعر العربي"},
    {"title": "أنا من أهوى ومن أهوى أنا", "alt_titles": [], "poet": "الحلاج", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "أشهر أبيات التصوف"},
    {"title": "غير مجد في ملتي واعتقادي", "alt_titles": ["رهين المحبسين"], "poet": "أبو العلاء المعري", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "رهين المحبسين - فيلسوف الشعراء"},
    {"title": "السيف أصدق إنباء من الكتب", "alt_titles": ["فتح عمورية"], "poet": "أبو تمام", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "فتح عمورية - من أشهر قصائد الحماسة"},
    {"title": "ألا يا عين فانهمري بغدر", "alt_titles": [], "poet": "الخنساء", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "من أشهر مراثي الخنساء في أخيها صخر"},
    {"title": "أمن تذكر جيران", "alt_titles": ["نونية ابن الفارض", "الخمرية"], "poet": "ابن الفارض", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "سلطان العاشقين - أعظم شعر صوفي"},

    # Other modern tier 2
    {"title": "ريم على القاع بين البان والعلم", "alt_titles": ["نهج البردة"], "poet": "أحمد شوقي", "fame_tier": 2, "category": "حديث", "fame_reason": "نهج البردة - معارضة لبردة البوصيري"},
    {"title": "مضناك جفاه مرقده", "alt_titles": [], "poet": "أحمد شوقي", "fame_tier": 2, "category": "حديث", "fame_reason": "غناها محمد عبد الوهاب"},
    {"title": "الجندول", "alt_titles": [], "poet": "علي محمود طه", "fame_tier": 2, "category": "حديث", "fame_reason": "غناها محمد عبد الوهاب - من أجمل الشعر الرومانسي"},
    {"title": "كن بلسماً إن صار دهرك أرقماً", "alt_titles": ["كن بلسما"], "poet": "إيليا أبو ماضي", "fame_tier": 2, "category": "حديث", "fame_reason": "من أشهر قصائد التفاؤل"},
    {"title": "قال السماء كئيبة وتجهما", "alt_titles": [], "poet": "إيليا أبو ماضي", "fame_tier": 2, "category": "حديث", "fame_reason": "فلسفة الحياة والتفاؤل"},
    {"title": "المساء", "alt_titles": [], "poet": "خليل مطران", "fame_tier": 2, "category": "حديث", "fame_reason": "أشهر قصائد شاعر القطرين"},
    {"title": "ما في المقام لذي عقل وذي أدب", "alt_titles": ["سافر تجد عوضاً"], "poet": "الإمام الشافعي", "fame_tier": 2, "category": "كلاسيكي", "fame_reason": "حكم الشافعي في السفر"},
    {"title": "لا تسألوني", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 2, "category": "حديث", "fame_reason": "من أشهر قصائد قباني"},

    # ---- TIER 3: Well-Known ----
    # Classical
    {"title": "قذى بعينك أم بالعين عوار", "alt_titles": [], "poet": "الخنساء", "fame_tier": 3, "category": "كلاسيكي", "fame_reason": "من مراثي الخنساء الشهيرة"},
    {"title": "لهفي على صخر فإني أرى له", "alt_titles": [], "poet": "الخنساء", "fame_tier": 3, "category": "كلاسيكي", "fame_reason": "رثاء صخر"},
    {"title": "باد هواك صبرت أم لم تصبرا", "alt_titles": [], "poet": "المتنبي", "fame_tier": 3, "category": "كلاسيكي", "fame_reason": "من عيون المتنبي"},
    {"title": "لخولة بالأجزاع من إضم طلل", "alt_titles": [], "poet": "طرفة بن العبد", "fame_tier": 3, "category": "كلاسيكي", "fame_reason": "من معلقات طرفة"},

    # Modern
    {"title": "ونحن نحب الحياة", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 3, "category": "حديث", "fame_reason": "من قصائد درويش الشهيرة"},
    {"title": "الكمنجات", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 3, "category": "حديث", "fame_reason": "غناها مارسيل خليفة"},
    {"title": "البنت / الصرخة", "alt_titles": ["البنت الصرخة"], "poet": "محمود درويش", "fame_tier": 3, "category": "حديث", "fame_reason": "من قصائد درويش"},
    {"title": "تحد", "alt_titles": [], "poet": "محمود درويش", "fame_tier": 3, "category": "حديث", "fame_reason": "قصيدة المقاومة"},
    {"title": "أطفال سنة 1948", "alt_titles": [], "poet": "سميح القاسم", "fame_tier": 3, "category": "حديث", "fame_reason": "شعر المقاومة الفلسطيني"},
    {"title": "يا دجلة الخير", "alt_titles": [], "poet": "محمد مهدي الجواهري", "fame_tier": 3, "category": "حديث", "fame_reason": "أشهر قصائد الجواهري"},
    {"title": "غرناطة", "alt_titles": [], "poet": "نزار قباني", "fame_tier": 3, "category": "حديث", "fame_reason": "حنين الأندلس"},
    {"title": "هكذا أغنى", "alt_titles": [], "poet": "جبران خليل جبران", "fame_tier": 3, "category": "حديث", "fame_reason": "من شعر جبران"},
    {"title": "معين الدمع لن يبقى معينا", "alt_titles": ["معين الدمع"], "poet": "تميم البرغوثي", "fame_tier": 3, "category": "حديث", "fame_reason": "من قصائد تميم الشهيرة"},
]


def match_poems(canon_list, df):
    """Match canon poems against the scored dataset."""
    df['title_clean'] = df['title'].apply(remove_diacritics)
    df['content_clean'] = df['content'].apply(remove_diacritics)

    results = []
    for entry in canon_list:
        title = entry["title"]
        poet = entry["poet"]
        alt_titles = entry.get("alt_titles", [])
        all_titles = [title] + alt_titles

        match = None
        match_type = None

        # Strategy 1: exact title + poet match
        for t in all_titles:
            t_clean = remove_diacritics(t)
            candidates = df[
                (df['title_clean'].str.contains(t_clean[:20], na=False, regex=False)) &
                (df['poet_name'].str.contains(poet[:10], na=False, regex=False))
            ]
            if len(candidates) > 0:
                best = candidates.sort_values('quality_score', ascending=False).iloc[0]
                match = best
                match_type = "title+poet"
                break

        # Strategy 2: content search for opening line
        if match is None:
            for t in all_titles:
                t_clean = remove_diacritics(t)
                # Use first 15 chars of title as opening line proxy
                candidates = df[
                    (df['content_clean'].str.contains(t_clean[:15], na=False, regex=False)) &
                    (df['poet_name'].str.contains(poet[:10], na=False, regex=False))
                ]
                if len(candidates) > 0:
                    best = candidates.sort_values('quality_score', ascending=False).iloc[0]
                    match = best
                    match_type = "content"
                    break

        # Strategy 3: best poem by this poet (fallback)
        if match is None:
            poet_poems = df[df['poet_name'].str.contains(poet[:10], na=False, regex=False)]
            if len(poet_poems) > 0:
                best = poet_poems.sort_values('quality_score', ascending=False).iloc[0]
                match = best
                match_type = "poet_best"

        result = {
            "canon_title": title,
            "poet": poet,
            "fame_tier": entry["fame_tier"],
            "category": entry["category"],
            "fame_reason": entry["fame_reason"],
            "found": match is not None,
            "match_type": match_type,
        }

        if match is not None:
            result["matched_title"] = match["title"]
            result["matched_poet"] = match["poet_name"]
            result["matched_id"] = str(match["poem_id"])
            result["quality_score"] = int(match["quality_score"])
            result["source"] = match.get("source", "unknown")
        else:
            result["matched_title"] = None
            result["matched_id"] = None
            result["quality_score"] = None

        results.append(result)

    return results


def main():
    # Load scored dataset
    scores_path = DATA_DIR / "scores_all_combined.parquet"
    if not scores_path.exists():
        print(f"Error: {scores_path} not found")
        return

    df = pd.read_parquet(scores_path)
    print(f"Loaded {len(df)} scored poems")

    # Match
    results = match_poems(CANON, df)

    # Save
    output_path = DATA_DIR / "canon_poems.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(results)} canon entries to {output_path}")

    # Report
    found = [r for r in results if r["found"]]
    not_found = [r for r in results if not r["found"]]
    exact_match = [r for r in found if r["match_type"] == "title+poet"]
    content_match = [r for r in found if r["match_type"] == "content"]
    poet_fallback = [r for r in found if r["match_type"] == "poet_best"]

    print(f"\n{'='*60}")
    print(f"CANON MATCHING REPORT")
    print(f"{'='*60}")
    print(f"Total canon poems: {len(results)}")
    print(f"  Found (title+poet):  {len(exact_match)}")
    print(f"  Found (content):     {len(content_match)}")
    print(f"  Found (poet best):   {len(poet_fallback)}")
    print(f"  NOT found at all:    {len(not_found)}")

    # By tier
    for tier in [1, 2, 3]:
        tier_entries = [r for r in results if r["fame_tier"] == tier]
        tier_found = [r for r in tier_entries if r["found"] and r["match_type"] in ("title+poet", "content")]
        tier_fallback = [r for r in tier_entries if r["found"] and r["match_type"] == "poet_best"]
        tier_missing = [r for r in tier_entries if not r["found"]]
        print(f"\n--- Tier {tier} ---")
        print(f"  Total: {len(tier_entries)} | Exact/Content: {len(tier_found)} | Poet fallback: {len(tier_fallback)} | Missing: {len(tier_missing)}")
        if tier_fallback:
            for r in tier_fallback:
                print(f"    FALLBACK: {r['canon_title'][:40]} -> {r['matched_title'][:40]} (S:{r['quality_score']})")
        if tier_missing:
            for r in tier_missing:
                print(f"    MISSING:  {r['canon_title'][:40]} ({r['poet']})")

    # Score threshold analysis
    print(f"\n--- Score Threshold Analysis ---")
    for threshold in [80, 75, 70, 60]:
        found_with_score = [r for r in found if r["quality_score"] is not None]
        would_miss = [r for r in found_with_score if r["quality_score"] < threshold]
        tier1_miss = [r for r in would_miss if r["fame_tier"] == 1]
        print(f"  At threshold >= {threshold}: would miss {len(would_miss)} canon poems ({len(tier1_miss)} tier-1)")
        if tier1_miss:
            for r in tier1_miss:
                print(f"    TIER-1 MISS: {r['canon_title'][:40]} ({r['poet']}) S:{r['quality_score']}")


if __name__ == "__main__":
    main()
