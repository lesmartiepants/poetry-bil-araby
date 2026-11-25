// Shared shapes for every data domain. UI code only ever sees these.

export type PageColour = 'night' | 'parchment' | 'indigo';
export type ArabicFont = 'amiri' | 'naskh' | 'scheherazade';
export type UnderArabic = 'english' | 'sounds' | 'nothing';
export type BandKey = 'gentle' | 'measured' | 'demanding';

export interface Line {
  ar: string; // with vowel marks
  plain?: string; // without vowel marks, when known
  en: string;
}

export interface PoemSummary {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  firstLineAr: string;
  poetSlug: string;
  poetAr: string;
  poetEn: string;
  eraKey: string;
}

export interface Poem extends PoemSummary {
  lines: Line[];
  feelingKeys: string[];
  band: BandKey;
  readingMinutes: number;
  fullPoemId?: string;
}

export interface Poet {
  slug: string;
  nameAr: string;
  nameEn: string;
  eraKey: string;
  region: string;
  years: string;
  bio: string;
  poemCount: number;
  initial: string; // Ruq'ah initial for the avatar
}

export interface Era {
  slug: string;
  nameEn: string;
  nameAr: string;
  years: string;
  place: string;
  line: string;
  colour: string;
  poemCount: number;
}

export interface Feeling {
  key: string;
  en: string;
  ar: string;
  line: string;
  poemCount: number;
  poetCount: number;
}

export interface Band {
  key: BandKey;
  en: string;
  ar: string;
  line: string;
  min: number;
  max: number;
  poemCount: number;
}

export interface FeaturedPoet {
  poet: Poet;
  note: string;
}

export interface Explanation {
  meaning: string;
  poet: string;
}

export interface Gloss {
  word: string;
  translit: string;
  root: string;
  partOfSpeech: string;
  meaning: string; // the sense in this line
  otherSenses: string;
}

export interface Voice {
  name: string; // Gemini voice name
  descriptor: string;
  gender: 'f' | 'm';
}

export interface Prefs {
  page: PageColour;
  font: ArabicFont;
  textSize: 1 | 2 | 3 | 4 | 5;
  vowelMarks: boolean;
  under: UnderArabic;
  voice: string;
  // V3 guide settings
  feelings: string[];
  learnFromKeeps: boolean;
  classicalModern: number; // 0 = classical, 1 = modern
  difficulty: 'any' | BandKey;
  length: 'short' | 'any' | 'long';
  tapWord: boolean;
  // 12.6 listening
  silentMode: boolean; // play through the phone's silent switch (native app; the web always plays)
  pauseLines: boolean; // a breath after each bayt
  displayName?: string;
}

export interface UserList {
  id: string;
  name: string;
  colour: string;
  iconLetter: string; // '' = automatic from the name
  isDefault: boolean;
  poemIds: string[];
  updatedAt: number;
}

export interface Collection {
  slug: string;
  kind: 'collection' | 'journey';
  titleEn: string;
  titleAr: string;
  intro: string;
  stepEn: string;
  stepAr: string;
  colour: string;
  /** A pattern-library name (laceria, seljuk…); the card picks one when unset. */
  pattern?: string;
  poemIds: string[];
  /** Each step's theme (Pride, Longing…), aligned with poemIds; null where unnamed. */
  themes?: (string | null)[];
  /** Editorial one-line subtitle: the arc or promise of the journey. Absent when unwritten. */
  subtitle?: string;
  subtitleAr?: string;
}

export interface Progress {
  slug: string;
  position: number; // poems read in order
  saved: boolean;
  completedAt?: number;
}

export interface Tonight {
  poem: PoemSummary;
  reason: string;
  journeyStep?: { slug: string; stepEn: string; index: number; of: number; titleEn: string };
}

export interface Door {
  poem: PoemSummary;
  hook: string;
  reason: string;
}

export interface SearchResults {
  poets: Poet[];
  poems: PoemSummary[];
  lines: { poem: PoemSummary; line: string; lineIndex: number }[];
  collections: Collection[];
  nearest?: { poets: Poet[]; feelings: Feeling[] };
}
