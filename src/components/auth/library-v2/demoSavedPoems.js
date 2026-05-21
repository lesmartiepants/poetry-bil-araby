// Demo saved poems used by the library-v2 tester so the three variants
// (A · Majlis, B · Diwan Grid, C · Khazana) can be evaluated visually
// even when the signed-in user has no real saved poems yet.
//
// Shape mirrors `useSavedPoems` rows: { id, poet, title, poem_text, english,
// category, saved_at }.  Dates are computed at import time so "Just now",
// "2h ago", "3d ago" stay accurate while testing.

const now = Date.now();
const ago = (mins) => new Date(now - mins * 60_000).toISOString();

export const DEMO_SAVED_POEMS = [
  {
    id: 'demo-1',
    poem_id: 'demo-1',
    poet: 'المتنبي',
    title: 'على قَدرِ أهلِ العَزمِ',
    poem_text:
      'عَلى قَدرِ أَهلِ العَزمِ تَأتي العَزائِمُ\nوَتَأتي عَلى قَدرِ الكِرامِ المَكارِمُ\nوَتَعظُمُ في عَينِ الصَغيرِ صِغارُها\nوَتَصغُرُ في عَينِ العَظيمِ العَظائِمُ',
    english: 'Resolutions come measured to the resolute, and gifts to the generous.',
    category: 'المديح',
    saved_at: ago(120),
  },
  {
    id: 'demo-2',
    poem_id: 'demo-2',
    poet: 'المتنبي',
    title: 'أَعَزُّ مَكان',
    poem_text: 'أَعَزُّ مَكانٍ في الدُنى سَرجُ سابِحٍ\nوَخَيرُ جَليسٍ في الزَمانِ كِتابُ',
    english:
      'The noblest place in the world is the saddle of a swift steed; the best companion of all time is a book.',
    category: 'الحكمة',
    saved_at: ago(60 * 26),
  },
  {
    id: 'demo-3',
    poem_id: 'demo-3',
    poet: 'ابن الرومي',
    title: 'وَطَني',
    poem_text:
      'وَلي وَطَنٌ آلَيتُ أَلّا أَبيعَهُ\nوَأَلّا أَرى غَيري لَهُ الدَهرَ مالِكا\nعَهِدتُ بِهِ شَرخَ الشَبابِ وَنِعمَةً\nكَنُعمى صِبا أَيّامِها لي ضَواحِكا',
    english:
      'I have a homeland I have sworn never to sell, nor see another own it for as long as I live.',
    category: 'الوطن',
    saved_at: ago(60 * 24 * 3),
  },
  {
    id: 'demo-4',
    poem_id: 'demo-4',
    poet: 'نزار قباني',
    title: 'حَبيبَتي',
    poem_text:
      'في كُلِّ زاوِيَةٍ مِنَ الدُنيا أَراكِ\nوَفي كُلِّ نَجمٍ ساطِعٍ ألقاكِ\nأَنتِ القَصيدَةُ كُلُّها وَأَنا الَّذي\nقَد ضِعتُ بَينَ سُطورِها وَهَواكِ',
    english: 'In every corner of the world I see you; in every shining star I find you.',
    category: 'الغزل',
    saved_at: ago(60 * 24 * 5),
  },
  {
    id: 'demo-5',
    poem_id: 'demo-5',
    poet: 'جبران خليل جبران',
    title: 'النَفسُ تَبكي',
    poem_text:
      'النَفسُ تَبكي عَلى الدُنيا وَقَد عَلِمَت\nأَنَّ السَعادَةَ فيها تَركُ ما فيها\nوَلا يَدومُ سُرورٌ ما سُرِرتَ بِهِ\nوَلا يَرُدُّ عَلَيكَ الدَهرُ ما فيها',
    english: 'The soul weeps over a world whose joy is found only in leaving what it holds.',
    category: 'الزهد',
    saved_at: ago(60 * 24 * 7),
  },
  {
    id: 'demo-6',
    poem_id: 'demo-6',
    poet: 'المتنبي',
    title: 'إِذا غامَرتَ',
    poem_text:
      'إِذا غامَرتَ في شَرَفٍ مَرومِ\nفَلا تَقنَع بِما دونَ النُجومِ\nفَطَعمُ المَوتِ في أَمرٍ حَقيرٍ\nكَطَعمِ المَوتِ في أَمرٍ عَظيمِ',
    english: 'If you venture for a noble aim, settle for nothing less than the stars.',
    category: 'الحكمة',
    saved_at: ago(60 * 24 * 14),
  },
  {
    id: 'demo-7',
    poem_id: 'demo-7',
    poet: 'أبو العلاء المعري',
    title: 'غَيرُ مُجدٍ',
    poem_text:
      'غَيرُ مُجدٍ في مِلَّتي وَاعتِقادي\nنَوحُ باكٍ وَلا تَرَنُّمُ شادي\nوَشَبيهٌ صَوتُ النَعِيِّ إِذا قي\nسَ بِصَوتِ البَشيرِ في كُلِّ نادي',
    english: 'In my creed, the wail of a mourner avails no more than the song of a singer.',
    category: 'الفلسفة',
    saved_at: ago(60 * 24 * 22),
  },
  {
    id: 'demo-8',
    poem_id: 'demo-8',
    poet: 'محمود درويش',
    title: 'سَجِّل أَنا عَرَبي',
    poem_text:
      'سَجِّل\nأَنا عَرَبي\nوَرَقمُ بِطاقَتي خَمسونَ أَلف\nوَأَطفالي ثَمانِيَةٌ\nوَتاسِعُهُم سَيَأتي بَعدَ صَيف\nفَهَل تَغضَب؟',
    english: 'Record! I am an Arab. My ID number is fifty thousand…',
    category: 'الوطن',
    saved_at: ago(60 * 24 * 40),
  },
];

export default DEMO_SAVED_POEMS;
