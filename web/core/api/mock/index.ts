// Mock implementation of every domain. Per-user state lives in the storage
// interface so it survives a reload, like the real thing.
import type { Api, PoemFilter } from '../contract';
import { NotFoundError } from '../contract';
import type { Poem, PoemSummary, Prefs, Progress, UserList } from '../../types';
import { BANDS, COLLECTIONS, ERAS, FEATURED_NOTE, FEELINGS, POEMS, POETS } from './fixtures';
import { DEFAULT_PREFS, mergePrefs } from '../../logic/prefs';
import { normalizeArabic, stripMarks } from '../../logic/arabic';
import { readJSON, writeJSON } from '../../storage';

const wait = <T>(v: T, ms = 60): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));
const summary = ({ lines: _l, feelingKeys: _f, band: _b, readingMinutes: _r, ...s }: Poem): PoemSummary => s;
const findPoem = (idOrSlug: string) => POEMS.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
const K = { prefs: 'mock.prefs', account: 'mock.account', keeps: 'mock.keeps', lists: 'mock.lists', follows: 'mock.follows', reads: 'mock.reads', progress: 'mock.progress' };

function lists(): UserList[] {
  return readJSON<UserList[]>(K.lists, []);
}
function saveLists(l: UserList[]) {
  writeJSON(K.lists, l);
}
function ensureFavorites(): UserList[] {
  const l = lists();
  if (!l.some((x) => x.isDefault)) {
    l.unshift({ id: 'favorites', name: 'Favorites', colour: '#4A1620', iconLetter: '', isDefault: true, poemIds: [], updatedAt: Date.now() });
    saveLists(l);
  }
  return l;
}

function filterPoems(f: PoemFilter): Poem[] {
  return POEMS.filter((p) =>
    (!f.feeling || p.feelingKeys.includes(f.feeling)) && (!f.era || p.eraKey === f.era) && (!f.band || p.band === f.band) && (!f.poet || p.poetSlug === f.poet));
}

export const mockApi: Api = {
  poems: {
    async get(idOrSlug) {
      const p = findPoem(idOrSlug);
      if (!p) throw new NotFoundError('poem');
      return wait(p);
    },
    async next(exclude) {
      const pool = POEMS.filter((p) => !exclude.includes(p.id));
      return wait(summary(pool[0] ?? POEMS[0]));
    },
    async list(f) {
      return wait(filterPoems(f).map(summary));
    },
  },
  ai: {
    async explanation(poemId) {
      const p = findPoem(poemId);
      if (!p) throw new NotFoundError('poem');
      const poet = POETS.find((x) => x.slug === p.poetSlug);
      return wait({
        meaning: `${p.poetEn} turns an ordinary act into the whole of love. The speaker kisses the walls not for the stones but for the one who lived behind them, and the poem's second half says so plainly. The repetition of “dwellings” and “wall” is the point: devotion spills over onto everything she touched.`,
        poet: poet?.bio ?? '',
      }, 200);
    },
    async gloss(poemId, line, word) {
      const p = findPoem(poemId);
      const w = p?.lines[line]?.ar.split(/\s+/)[word] ?? '';
      return wait({
        word: w, translit: 'al-jidāra', root: 'ج د ر', partOfSpeech: 'noun · object of “kiss”',
        meaning: 'the wall: here, the walls of Layla’s empty home, which he kisses one after another.',
        otherSenses: 'an enclosure; a partition. From the same root, جدير: worthy, fit for.',
      }, 150);
    },
    async doors(poemId) {
      return wait(POEMS.filter((p) => p.id !== poemId).slice(0, 3).map((p, i) => ({
        poem: summary(p),
        hook: ['Another lover at a ruined house', 'Grief that will not stop', 'Pride in the face of fate'][i],
        reason: ['Because you stayed with longing', 'The same desert, a sister’s voice', 'Shorter, and fiercer'][i],
      })), 150);
    },
  },
  poets: {
    async list() {
      return wait([...POETS].sort((a, b) => a.nameEn.localeCompare(b.nameEn)));
    },
    async get(slug) {
      const p = POETS.find((x) => x.slug === slug);
      if (!p) throw new NotFoundError('poet');
      return wait(p);
    },
    async featured() {
      return wait({ poet: POETS.find((p) => p.slug === 'al-khansa')!, note: FEATURED_NOTE });
    },
    async appearsIn(slug) {
      const ids = POEMS.filter((p) => p.poetSlug === slug).map((p) => p.id);
      return wait(COLLECTIONS.filter((c) => c.poemIds.some((id) => ids.includes(id))));
    },
  },
  explore: {
    feelings: async () => wait(FEELINGS),
    eras: async () => wait(ERAS),
    bands: async () => wait(BANDS),
  },
  profile: {
    async get() {
      return wait(mergePrefs(DEFAULT_PREFS, readJSON<Partial<Prefs>>(K.prefs, {})), 10);
    },
    async set(patch) {
      const next = mergePrefs(DEFAULT_PREFS, { ...readJSON<Partial<Prefs>>(K.prefs, {}), ...patch });
      writeJSON(K.prefs, next);
      return wait(next, 10);
    },
    async account() {
      return wait(readJSON(K.account, { signedIn: false }), 10);
    },
    async signIn(provider) {
      writeJSON(K.account, { signedIn: true, provider, name: 'Reader' });
    },
    async signOut() {
      writeJSON(K.account, { signedIn: false });
    },
  },
  keeps: {
    async list() {
      return wait(readJSON<string[]>(K.keeps, []), 20);
    },
    async keep(poemId) {
      const k = readJSON<string[]>(K.keeps, []).filter((x) => x !== poemId);
      writeJSON(K.keeps, [poemId, ...k]);
      const l = ensureFavorites();
      const fav = l.find((x) => x.isDefault)!;
      if (!fav.poemIds.includes(poemId)) fav.poemIds.unshift(poemId);
      fav.updatedAt = Date.now();
      saveLists(l);
    },
    async unkeep(ids) {
      writeJSON(K.keeps, readJSON<string[]>(K.keeps, []).filter((x) => !ids.includes(x)));
      saveLists(lists().map((l) => ({ ...l, poemIds: l.poemIds.filter((x) => !ids.includes(x)) })));
    },
  },
  lists: {
    async all() {
      return wait(ensureFavorites().sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : b.updatedAt - a.updatedAt)), 20);
    },
    async create(input) {
      const l = ensureFavorites();
      const item: UserList = { id: `l${Date.now()}`, ...input, isDefault: false, poemIds: [], updatedAt: Date.now() };
      l.push(item);
      saveLists(l);
      return item;
    },
    async update(id, patch) {
      const l = lists();
      const i = l.findIndex((x) => x.id === id);
      if (i < 0) throw new NotFoundError('list');
      if (l[i].isDefault && (patch.name !== undefined)) throw new Error('Favorites can’t be renamed');
      l[i] = { ...l[i], ...patch };
      saveLists(l);
      return l[i];
    },
    async remove(id) {
      const l = lists();
      if (l.find((x) => x.id === id)?.isDefault) throw new Error('Favorites can’t be deleted');
      // Deleting a list never un-keeps its poems.
      saveLists(l.filter((x) => x.id !== id));
    },
    async setPoemLists(poemId, listIds) {
      saveLists(ensureFavorites().map((l) => {
        const has = l.poemIds.includes(poemId);
        const want = listIds.includes(l.id);
        if (has === want) return l;
        return { ...l, poemIds: want ? [poemId, ...l.poemIds] : l.poemIds.filter((x) => x !== poemId), updatedAt: Date.now() };
      }));
    },
  },
  library: {
    follows: async () => wait(readJSON<string[]>(K.follows, ['al-khansa', 'al-mutanabbi']), 20),
    async follow(slug, on) {
      const f = readJSON<string[]>(K.follows, ['al-khansa', 'al-mutanabbi']).filter((x) => x !== slug);
      writeJSON(K.follows, on ? [slug, ...f] : f);
    },
    reads: async () => wait(readJSON<Record<string, number>>(K.reads, {}), 20),
    async markRead(poemId) {
      const r = readJSON<Record<string, number>>(K.reads, {});
      r[poemId] = (r[poemId] ?? 0) + 1;
      writeJSON(K.reads, r);
    },
  },
  journey: {
    async tonight() {
      const j = COLLECTIONS[0];
      return wait({
        poem: summary(POEMS[0]),
        reason: 'A poem about loving a place for the person who lived there. Short, and easy to hear aloud.',
        journeyStep: { slug: j.slug, stepEn: j.stepEn, index: 3, of: j.poemIds.length, titleEn: j.titleEn },
      });
    },
    journeys: async () => wait(COLLECTIONS.filter((c) => c.kind === 'journey')),
  },
  collections: {
    all: async (kind) => wait(COLLECTIONS.filter((c) => !kind || c.kind === kind)),
    async get(slug) {
      const c = COLLECTIONS.find((x) => x.slug === slug);
      if (!c) throw new NotFoundError('collection');
      return wait(c);
    },
    progress: async () => wait(readJSON<Progress[]>(K.progress, [{ slug: 'your-first-seven', position: 2, saved: true }]), 20),
    async setProgress(p) {
      const all = readJSON<Progress[]>(K.progress, [{ slug: 'your-first-seven', position: 2, saved: true }]).filter((x) => x.slug !== p.slug);
      writeJSON(K.progress, [p, ...all]);
    },
  },
  search: {
    async search(q) {
      const n = normalizeArabic(q);
      const nl = q.toLowerCase().trim();
      const poets = POETS.filter((p) => p.nameEn.toLowerCase().includes(nl) || normalizeArabic(p.nameAr).includes(n));
      const poems = POEMS.filter((p) => p.titleEn.toLowerCase().includes(nl) || normalizeArabic(p.titleAr).includes(n)).map(summary);
      const lines = POEMS.flatMap((p) => p.lines.map((l, i) => ({ p, l, i })))
        .filter(({ l }) => n && (normalizeArabic(l.ar).includes(n) || l.en.toLowerCase().includes(nl)))
        .map(({ p, l, i }) => ({ poem: summary(p), line: stripMarks(l.ar), lineIndex: i }));
      const collections = COLLECTIONS.filter((c) => c.titleEn.toLowerCase().includes(nl));
      const empty = !poets.length && !poems.length && !lines.length && !collections.length;
      return wait({ poets, poems, lines, collections, nearest: empty ? { poets: POETS.slice(0, 3), feelings: FEELINGS.slice(0, 3) } : undefined }, 120);
    },
  },
  share: {
    cardUrl: ({ poemId, card }) => `/api/og/${poemId}?card=${card}`,
    link: (poem) => `https://bilaraby.app/p/${poem.slug}`,
  },
};
