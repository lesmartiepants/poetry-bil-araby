// Live implementations, filled in slice by slice. A domain flips to 'live' in
// core/sources.ts only once its methods here are real.
import type { Api } from '../contract';
import { NotFoundError } from '../contract';
import { mockApi } from '../mock';
import type { Band, Era, Explanation, FeaturedPoet, Feeling, Gloss, Poem, PoemSummary, Poet } from '../../types';

let base = '';
export function setApiBase(url: string) {
  base = url.replace(/\/$/, '');
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
    next: (exclude) => getJSON<PoemSummary>(`/api/v2/poems/next${qs({ exclude: exclude.join(',') })}`, 'poem'),
    list: (f) => getJSON<PoemSummary[]>(`/api/v2/poems${qs({ feeling: f.feeling, era: f.era, band: f.band, poet: f.poet })}`),
  },
  ai: {
    ...mockApi.ai,
    explanation: (id) => getJSON<Explanation>(`/api/v2/poems/${id}/ai?kind=explanation`),
    gloss: (id, line, word) => getJSON<Gloss>(`/api/v2/poems/${id}/ai?kind=gloss&line=${line}&word=${word}`),
  },
  poets: {
    ...mockApi.poets,
    list: () => getJSON<Poet[]>('/api/v2/poets'),
    get: (slug) => getJSON<Poet>(`/api/v2/poets/${encodeURIComponent(slug)}`, 'poet'),
    featured: () => getJSON<FeaturedPoet>('/api/v2/featured/poet'),
  },
  explore: {
    feelings: () => getJSON<Feeling[]>('/api/v2/explore/feelings'),
    eras: () => getJSON<Era[]>('/api/v2/explore/eras'),
    bands: () => getJSON<Band[]>('/api/v2/explore/bands'),
  },
};
