// Live implementations, filled in slice by slice. A domain flips to 'live' in
// core/sources.ts only once its methods here are real.
import type { Api } from '../contract';
import { NotFoundError } from '../contract';
import { mockApi } from '../mock';
import { steerQuery } from '../../logic/guide';
import type { Band, Collection, Door, Era, Explanation, FeaturedPoet, Feeling, Gloss, Poem, PoemSummary, Poet, SearchResults, Tonight } from '../../types';

let base = '';
type PerUser = ReturnType<typeof import('../supabase').makeSupabaseApi>;
let perUser: PerUser | null = null;
/** Per-user domains (profile, keeps, lists, library, progress) come from Supabase when it is configured. */
export function setPerUser(api: PerUser) {
  perUser = api;
  Object.assign(liveApi, { profile: api.profile, keeps: api.keeps, lists: api.lists, library: api.library });
}
export function setApiBase(url: string) {
  base = url.replace(/\/$/, '');
}
let appUrl = 'https://bilaraby.app/';
/** Where shared links point: this app's own address (e.g. https://…/new/ until cut-over). */
export function setAppUrl(url: string) {
  appUrl = url.endsWith('/') ? url : `${url}/`;
}
export async function getJSON<T>(path: string, what = 'item'): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (res.status === 404) throw new NotFoundError(what);
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${path}`), { status: res.status });
  return (await res.json()) as T;
}
const qs = (o: Record<string, string | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v);
  return p.length ? `?${new URLSearchParams(p as [string, string][])}` : '';
};

export const liveApi: Api = {
  ...mockApi,
  poems: {
    get: (id) => getJSON<Poem>(`/api/v2/poems/${encodeURIComponent(id)}`, 'poem'),
    next: (exclude, prefs) => getJSON<PoemSummary>(`/api/v2/poems/next?${new URLSearchParams([['exclude', exclude.join(',')], ...new URLSearchParams(steerQuery(prefs))])}`, 'poem'),
    list: (f) => getJSON<PoemSummary[]>(`/api/v2/poems${qs({ feeling: f.feeling, era: f.era, band: f.band, poet: f.poet })}`),
  },
  ai: {
    ...mockApi.ai,
    explanation: (id) => getJSON<Explanation>(`/api/v2/poems/${id}/ai?kind=explanation`),
    gloss: (id, line, word) => getJSON<Gloss>(`/api/v2/poems/${id}/ai?kind=gloss&line=${line}&word=${word}`),
    doors: (id, prefs) => getJSON<Door[]>(`/api/v2/poems/${id}/doors?${steerQuery(prefs)}`),
  },
  poets: {
    ...mockApi.poets,
    list: () => getJSON<Poet[]>('/api/v2/poets'),
    get: (slug) => getJSON<Poet>(`/api/v2/poets/${encodeURIComponent(slug)}`, 'poet'),
    featured: () => getJSON<FeaturedPoet>('/api/v2/featured/poet'),
    appearsIn: (slug) => getJSON<Collection[]>(`/api/v2/poets/${encodeURIComponent(slug)}/appears-in`),
  },
  explore: {
    feelings: () => getJSON<Feeling[]>('/api/v2/explore/feelings'),
    eras: () => getJSON<Era[]>('/api/v2/explore/eras'),
    bands: () => getJSON<Band[]>('/api/v2/explore/bands'),
  },
  journey: {
    tonight: () => getJSON<Tonight>('/api/v2/tonight'),
    journeys: () => getJSON<Collection[]>('/api/v2/collections?kind=journey'),
  },
  collections: {
    // Progress is per user: Supabase when configured (signed out: this device), else the mock.
    ...mockApi.collections,
    progress: () => (perUser ? perUser.progress.progress() : mockApi.collections.progress()),
    setProgress: (p) => (perUser ? perUser.progress.setProgress(p) : mockApi.collections.setProgress(p)),
    all: (kind) => getJSON<Collection[]>(`/api/v2/collections${kind ? `?kind=${kind}` : ''}`),
    get: (slug) => getJSON<Collection>(`/api/v2/collections/${encodeURIComponent(slug)}`, 'collection'),
  },
  share: {
    cardUrl: ({ poemId, lines, en, colourway, dedication, card, link }) =>
      `${base}/api/v2/poems/${poemId}/card.png${qs({ lines: lines?.join(','), en: en ? '1' : undefined, cw: colourway, for: dedication, card: String(card), link })}`,
    link: (poem) => `${appUrl}p/${poem.slug}`,
  },
  search: {
    search: (q) => getJSON<SearchResults>(`/api/v2/search?q=${encodeURIComponent(q)}`),
  },
};
