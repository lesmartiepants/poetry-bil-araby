// Query hooks over `api`, shared by features. React, but no DOM.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PoemFilter } from './api';
import type { Prefs } from './types';

export const qk = {
  poem: (id: string) => ['poem', id] as const,
  poems: (f: PoemFilter) => ['poems', f] as const,
  prefs: ['prefs'] as const,
  account: ['account'] as const,
  keeps: ['keeps'] as const,
  lists: ['lists'] as const,
};

export const usePoem = (id: string) => useQuery({ queryKey: qk.poem(id), queryFn: () => api.poems.get(id), retry: false });
export const usePoems = (f: PoemFilter) => useQuery({ queryKey: qk.poems(f), queryFn: () => api.poems.list(f) });
export const usePoets = () => useQuery({ queryKey: ['poets'], queryFn: () => api.poets.list() });
export const usePoet = (slug: string) => useQuery({ queryKey: ['poet', slug], queryFn: () => api.poets.get(slug), retry: false });
export const useFeaturedPoet = () => useQuery({ queryKey: ['featured-poet'], queryFn: () => api.poets.featured() });
export const useAppearsIn = (slug: string) => useQuery({ queryKey: ['appears-in', slug], queryFn: () => api.poets.appearsIn(slug) });
export const useFeelings = () => useQuery({ queryKey: ['feelings'], queryFn: () => api.explore.feelings() });
export const useEras = () => useQuery({ queryKey: ['eras'], queryFn: () => api.explore.eras() });
export const useBands = () => useQuery({ queryKey: ['bands'], queryFn: () => api.explore.bands() });
export const useExplanation = (id: string, on = true) => useQuery({ queryKey: ['explanation', id], queryFn: () => api.ai.explanation(id), enabled: on, retry: false });
export const useGloss = (id: string, line: number, word: number, on = true) =>
  useQuery({ queryKey: ['gloss', id, line, word], queryFn: () => api.ai.gloss(id, line, word), enabled: on && line >= 0 });
export const useDoors = (id: string) => useQuery({ queryKey: ['doors', id], queryFn: () => api.ai.doors(id) });
export const useTonight = () => useQuery({ queryKey: ['tonight'], queryFn: () => api.journey.tonight() });
export const useCollections = (kind?: 'collection' | 'journey') => useQuery({ queryKey: ['collections', kind], queryFn: () => api.collections.all(kind) });
export const useCollection = (slug: string) => useQuery({ queryKey: ['collection', slug], queryFn: () => api.collections.get(slug), retry: false });
export const useProgress = () => useQuery({ queryKey: ['progress'], queryFn: () => api.collections.progress() });
export const useSearch = (q: string) => useQuery({ queryKey: ['search', q], queryFn: () => api.search.search(q), enabled: q.trim().length > 1 });
export const useAccount = () => useQuery({ queryKey: qk.account, queryFn: () => api.profile.account() });
export const useKeeps = () => useQuery({ queryKey: qk.keeps, queryFn: () => api.keeps.list() });
export const useLists = () => useQuery({ queryKey: qk.lists, queryFn: () => api.lists.all() });
export const useFollows = () => useQuery({ queryKey: ['follows'], queryFn: () => api.library.follows() });
export const useReads = () => useQuery({ queryKey: ['reads'], queryFn: () => api.library.reads() });

export function usePrefs() {
  return useQuery({ queryKey: qk.prefs, queryFn: () => api.profile.get(), staleTime: Infinity });
}
export function useSetPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Prefs>) => api.profile.set(patch),
    onMutate: (patch) => {
      const prev = qc.getQueryData<Prefs>(qk.prefs);
      if (prev) qc.setQueryData(qk.prefs, { ...prev, ...patch });
    },
    onSuccess: (p) => qc.setQueryData(qk.prefs, p),
  });
}
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: (readonly unknown[])[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}
