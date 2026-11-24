// The data contract every source implements. Features call `api` only.
import type {
  Band, Collection, Door, Era, Explanation, FeaturedPoet, Feeling, Gloss, Poem, PoemSummary, Poet, Prefs,
  Progress, SearchResults, Tonight, UserList,
} from '../types';

export interface PoemFilter {
  feeling?: string;
  era?: string;
  band?: string;
  poet?: string;
}

export interface PoemsApi {
  get(idOrSlug: string): Promise<Poem>;
  next(excludeIds: string[]): Promise<PoemSummary>;
  list(filter: PoemFilter): Promise<PoemSummary[]>;
}
export interface AiApi {
  explanation(poemId: string): Promise<Explanation>;
  gloss(poemId: string, line: number, word: number): Promise<Gloss>;
  doors(poemId: string): Promise<Door[]>;
}
export interface PoetsApi {
  list(): Promise<Poet[]>;
  get(slug: string): Promise<Poet>;
  featured(): Promise<FeaturedPoet>;
  appearsIn(slug: string): Promise<Collection[]>;
}
export interface ExploreApi {
  feelings(): Promise<Feeling[]>;
  eras(): Promise<Era[]>;
  bands(): Promise<Band[]>;
}
export interface ProfileApi {
  get(): Promise<Prefs>;
  set(patch: Partial<Prefs>): Promise<Prefs>;
  account(): Promise<{ signedIn: boolean; provider?: 'apple' | 'google'; name?: string }>;
  signIn(provider: 'apple' | 'google'): Promise<void>;
  signOut(): Promise<void>;
}
export interface KeepsApi {
  list(): Promise<string[]>; // kept poem ids, most recent first
  keep(poemId: string): Promise<void>;
  unkeep(poemIds: string[]): Promise<void>;
}
export interface ListsApi {
  all(): Promise<UserList[]>;
  create(input: { name: string; colour: string; iconLetter: string }): Promise<UserList>;
  update(id: string, patch: Partial<Pick<UserList, 'name' | 'colour' | 'iconLetter'>>): Promise<UserList>;
  remove(id: string): Promise<void>;
  setPoemLists(poemId: string, listIds: string[]): Promise<void>;
}
export interface LibraryApi {
  follows(): Promise<string[]>;
  follow(slug: string, on: boolean): Promise<void>;
  reads(): Promise<Record<string, number>>;
  markRead(poemId: string): Promise<void>;
}
export interface JourneyApi {
  tonight(): Promise<Tonight>;
  journeys(): Promise<Collection[]>;
}
export interface CollectionsApi {
  all(kind?: 'collection' | 'journey'): Promise<Collection[]>;
  get(slug: string): Promise<Collection>;
  progress(): Promise<Progress[]>;
  setProgress(p: Progress): Promise<void>;
}
export interface SearchApi {
  search(q: string): Promise<SearchResults>;
}
export interface ShareApi {
  cardUrl(input: { poemId: string; lines: number[]; ground: string; dedication?: string; card: number }): string;
  link(poem: { slug: string }): string;
}

export interface Api {
  poems: PoemsApi;
  ai: AiApi;
  poets: PoetsApi;
  explore: ExploreApi;
  profile: ProfileApi;
  keeps: KeepsApi;
  lists: ListsApi;
  library: LibraryApi;
  journey: JourneyApi;
  collections: CollectionsApi;
  search: SearchApi;
  share: ShareApi;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = 'NotFoundError';
  }
}
