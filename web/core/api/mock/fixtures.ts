// Mock content for the walking skeleton. Taken from the App flow frames so the
// app and the mocks can be compared side by side.
import type { Band, Collection, Era, Feeling, Poem, Poet } from '../../types';

export const POETS: Poet[] = [
  { slug: 'majnun-layla', nameAr: 'قيس بن الملوّح', nameEn: 'Majnun Layla', eraKey: 'umayyad', region: 'Najd', years: 'd. c. 688', initial: 'ق', poemCount: 9,
    bio: 'Qays ibn al-Mulawwah, called Majnun Layla, “mad for Layla”. His love for his cousin Layla, kept from him, made his verse the Arab world’s model of longing.' },
  { slug: 'imru-al-qais', nameAr: 'امرؤ القيس', nameEn: "Imru' al-Qais", eraKey: 'pre-islamic', region: 'Najd', years: 'c. 501–544', initial: 'ا', poemCount: 14,
    bio: 'The wandering prince of Kinda, whose ode opens the Mu‘allaqat. He set the pattern of the ruined campsite and the remembered beloved.' },
  { slug: 'al-khansa', nameAr: 'الخنساء', nameEn: 'Al-Khansa', eraKey: 'pre-islamic', region: 'Najd', years: 'c. 575–646', initial: 'خ', poemCount: 9,
    bio: 'Tumadir bint Amr, the greatest elegist in Arabic. Her laments for her brothers Sakhr and Mu‘awiya were recited for centuries.' },
  { slug: 'abu-firas', nameAr: 'أبو فراس الحمداني', nameEn: 'Abu Firas', eraKey: 'abbasid', region: 'Levant', years: '932–968', initial: 'ف', poemCount: 22,
    bio: 'A Hamdanid prince and knight who wrote his finest poems as a prisoner of Byzantium, the Rumiyyat.' },
  { slug: 'kab-ibn-zuhayr', nameAr: 'كعب بن زهير', nameEn: 'Kaʿb ibn Zuhayr', eraKey: 'pre-islamic', region: 'Hijaz', years: 'd. c. 662', initial: 'ك', poemCount: 6,
    bio: 'Son of the poet Zuhayr, remembered for “Su‘ad has gone”, the ode he recited before the Prophet, who gave him his mantle.' },
  { slug: 'al-mutanabbi', nameAr: 'المتنبي', nameEn: 'Al-Mutanabbi', eraKey: 'abbasid', region: 'Iraq', years: '915–965', initial: 'م', poemCount: 41,
    bio: 'The proudest voice in Arabic poetry. His lines on courage, fate and himself are still quoted daily.' },
  { slug: 'al-sayyab', nameAr: 'بدر شاكر السياب', nameEn: 'Al-Sayyab', eraKey: 'modern', region: 'Iraq', years: '1926–1964', initial: 'س', poemCount: 12,
    bio: 'The Iraqi poet who broke the old metres open. “Rain Song” made free verse the voice of modern Arabic.' },
  { slug: 'gibran', nameAr: 'جبران خليل جبران', nameEn: 'Gibran', eraKey: 'modern', region: 'Levant', years: '1883–1931', initial: 'ج', poemCount: 15,
    bio: 'Poet and painter of the Mahjar. “The Processions” sets the city against the forest and its reed flute.' },
];

const L = (ar: string, en: string) => ({ ar, en });

export const POEMS: Poem[] = [
  {
    id: '87201', slug: 'amurru', titleAr: 'أمرُّ على الديار', titleEn: 'I pass by the dwellings', firstLineAr: 'أمر على الديار ديار ليلى',
    poetSlug: 'majnun-layla', poetAr: 'قيس بن الملوّح', poetEn: 'Majnun Layla', eraKey: 'umayyad', feelingKeys: ['longing', 'love'], band: 'gentle', readingMinutes: 1,
    lines: [
      L('أَمُرُّ عَلى الدِيارِ دِيارِ لَيلى', "I pass by the dwellings, Layla's dwellings,"),
      L('أُقَبِّلُ ذا الجِدارَ وَذا الجِدارا', 'and kiss this wall, and then that wall.'),
      L('وَما حُبُّ الدِيارِ شَغَفنَ قَلبي', 'It is not love of the dwellings that took my heart,'),
      L('وَلَكِن حُبُّ مَن سَكَنَ الدِيارا', 'but love of the one who lived in them.'),
    ],
  },
  {
    id: '1001', slug: 'qifa', titleAr: 'قفا نبكِ', titleEn: 'Stop, let us weep', firstLineAr: 'قفا نبك من ذكرى حبيب ومنزل',
    poetSlug: 'imru-al-qais', poetAr: 'امرؤ القيس', poetEn: "Imru' al-Qais", eraKey: 'pre-islamic', feelingKeys: ['longing', 'home'], band: 'demanding', readingMinutes: 2,
    lines: [
      L('قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ', 'Stop, let us weep at the memory of a love and a home'),
      L('بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ', 'where the sands end, between al-Dakhul and Hawmal.'),
    ],
  },
  {
    id: '1002', slug: 'qadhan', titleAr: 'قذى بعينك', titleEn: 'A mote in your eye', firstLineAr: 'قذى بعينك أم بالعين عوار',
    poetSlug: 'al-khansa', poetAr: 'الخنساء', poetEn: 'Al-Khansa', eraKey: 'pre-islamic', feelingKeys: ['grief'], band: 'measured', readingMinutes: 1,
    lines: [
      L('قَذىً بِعَينِكِ أَم بِالعَينِ عُوّارُ', 'Is it a mote in your eye, or is the eye sore,'),
      L('أَم ذَرَّفَت إِذ خَلَت مِن أَهلِها الدارُ', 'or does it weep because the house stands empty of its people?'),
    ],
  },
  {
    id: '1003', slug: 'araka', titleAr: 'أراك عصيّ الدمع', titleEn: 'Dry-eyed, I see', firstLineAr: 'أراك عصي الدمع شيمتك الصبر',
    poetSlug: 'abu-firas', poetAr: 'أبو فراس الحمداني', poetEn: 'Abu Firas', eraKey: 'abbasid', feelingKeys: ['love', 'pride'], band: 'measured', readingMinutes: 1,
    lines: [
      L('أَراكَ عَصِيَّ الدَمعِ شيمَتُكَ الصَبرُ', 'I see you hold back your tears; patience is your nature.'),
      L('أَما لِلهَوى نَهيٌ عَلَيكَ وَلا أَمرُ', 'Has love no say over you, no command at all?'),
    ],
  },
  {
    id: '1004', slug: 'banat-suad', titleAr: 'بانت سعاد', titleEn: 'Suʿad has gone', firstLineAr: 'بانت سعاد فقلبي اليوم متبول',
    poetSlug: 'kab-ibn-zuhayr', poetAr: 'كعب بن زهير', poetEn: 'Kaʿb ibn Zuhayr', eraKey: 'pre-islamic', feelingKeys: ['longing', 'the-divine'], band: 'demanding', readingMinutes: 1,
    lines: [
      L('بانَت سُعادُ فَقَلبي اليَومَ مَتبولُ', 'Suʿad has gone, and today my heart is sick,'),
      L('مُتَيَّمٌ إِثرَها لَم يُفدَ مَكبولُ', 'enslaved in her wake, a captive no one ransoms.'),
    ],
  },
  {
    id: '1005', slug: 'al-khayl', titleAr: 'الخيل والليل', titleEn: 'The horses and the night', firstLineAr: 'الخيل والليل والبيداء تعرفني',
    poetSlug: 'al-mutanabbi', poetAr: 'المتنبي', poetEn: 'Al-Mutanabbi', eraKey: 'abbasid', feelingKeys: ['pride', 'defiance'], band: 'gentle', readingMinutes: 1,
    lines: [
      L('الخَيلُ وَاللَيلُ وَالبَيداءُ تَعرِفُني', 'The horses, the night and the desert know me,'),
      L('وَالسَيفُ وَالرُمحُ وَالقِرطاسُ وَالقَلَمُ', 'and the sword, the spear, the page and the pen.'),
    ],
  },
];

export const FEELINGS: Feeling[] = [
  { key: 'longing', en: 'Longing', ar: 'حنين', line: 'Absence, distance, the empty house. The oldest feeling in Arabic poetry.', poemCount: 62, poetCount: 17 },
  { key: 'grief', en: 'Grief', ar: 'رثاء', line: 'Elegies for the dead, from Al-Khansa on.', poemCount: 48, poetCount: 14 },
  { key: 'pride', en: 'Pride', ar: 'فخر', line: 'The self, the tribe, the sword and the pen.', poemCount: 55, poetCount: 19 },
  { key: 'love', en: 'Love', ar: 'غزل', line: 'Desire, devotion and the beloved’s cruelty.', poemCount: 91, poetCount: 26 },
  { key: 'wonder', en: 'Wonder', ar: 'تأمّل', line: 'Time, the stars and what lasts.', poemCount: 37, poetCount: 12 },
  { key: 'home', en: 'Home', ar: 'وطن', line: 'Lost cities and the country carried in the heart.', poemCount: 29, poetCount: 11 },
  { key: 'defiance', en: 'Defiance', ar: 'تحدٍّ', line: 'Standing up to fate, kings and exile.', poemCount: 24, poetCount: 9 },
  { key: 'the-divine', en: 'The divine', ar: 'تصوّف', line: 'Mystic love and the search for God.', poemCount: 33, poetCount: 10 },
  { key: 'wit', en: 'Wit', ar: 'هجاء', line: 'Satire, mockery and the sharp tongue.', poemCount: 18, poetCount: 7 },
];

export const ERAS: Era[] = [
  { slug: 'pre-islamic', nameEn: 'Pre-Islamic', nameAr: 'الجاهلية', years: 'c. 500–622', place: 'Arabia', line: 'Desert odes of honour, raids and abandoned campsites.', colour: '#4A1620', poemCount: 410 },
  { slug: 'umayyad', nameEn: 'Umayyad', nameAr: 'الأموي', years: '661–750', place: 'Damascus', line: 'Chaste love, court satire and great lovers.', colour: '#2F6B5A', poemCount: 520 },
  { slug: 'abbasid', nameEn: 'Abbasid', nameAr: 'العباسي', years: '750–1258', place: 'Baghdad', line: 'Wine, wit and the proudest poets of the court.', colour: '#22406E', poemCount: 1810 },
  { slug: 'andalusian', nameEn: 'Andalusian', nameAr: 'الأندلسي', years: '756–1492', place: 'Córdoba', line: 'Gardens, muwashshahat and the cities that were lost.', colour: '#2F6B5A', poemCount: 640 },
  { slug: 'modern', nameEn: 'Modern', nameAr: 'الحديث', years: '1850–today', place: 'Cairo, Beirut, Baghdad', line: 'Free verse, exile and the nation.', colour: '#22406E', poemCount: 1387 },
];

export const BANDS: Band[] = [
  { key: 'gentle', en: 'Gentle', ar: 'سهل', line: 'Plain words and direct images: a good place to start, in any era.', min: 0, max: 1.6, poemCount: 1590 },
  { key: 'measured', en: 'Measured', ar: 'متوسّط', line: 'Richer rhetoric and some allusion.', min: 1.6, max: 2.9, poemCount: 1588 },
  { key: 'demanding', en: 'Demanding', ar: 'عميق', line: 'Classical vocabulary and dense allusion.', min: 2.9, max: 8.3, poemCount: 1589 },
];

export const COLLECTIONS: Collection[] = [
  { slug: 'your-first-seven', kind: 'journey', titleEn: 'Your first seven', titleAr: 'سبع سماوات', intro: 'Seven heavens, one poem each: the shapes Arabic poetry takes.', stepEn: 'Heaven', stepAr: 'سماء', colour: '#22406E', pattern: 'seljuk', poemIds: ['87201', '1001', '1002', '1003', '1004', '1005', '87201'] },
  { slug: 'home', kind: 'journey', titleEn: 'Home', titleAr: 'الوطن', intro: 'Five poems about the places we leave and carry.', stepEn: 'Home', stepAr: 'وطن', colour: '#2F6B5A', pattern: 'ogee', poemIds: ['1001', '87201', '1003', '1004', '1005'] },
  { slug: 'women-who-wrote-the-canon', kind: 'collection', titleEn: 'Women who wrote the canon', titleAr: 'نساء كتبن الديوان', intro: 'From Al-Khansa to Wallada, the women Arabic poetry was built on.', stepEn: 'Poem', stepAr: 'قصيدة', colour: '#4A1620', pattern: 'laceria', poemIds: ['1002', '87201', '1004'] },
  { slug: 'start-here-gibran-to-darwish', kind: 'collection', titleEn: 'Start here: Gibran to Darwish', titleAr: 'من جبران إلى درويش', intro: 'Nine modern poems that read easily in translation.', stepEn: 'Poem', stepAr: 'قصيدة', colour: '#22406E', pattern: 'starcross', poemIds: ['1005', '87201', '1003'] },
];

export const FEATURED_NOTE = 'The greatest elegist in Arabic. 7th c.';
