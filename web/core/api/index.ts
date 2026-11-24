// `api` routes each domain to its mock or live implementation per sources.ts.
import type { Api } from './contract';
import { mockApi } from './mock';
import { liveApi } from './live';
import { sourceOf, type Domain } from '../sources';

function route<K extends keyof Api>(key: K, domain: Domain): Api[K] {
  return new Proxy({} as Api[K], {
    get: (_t, prop) => {
      const impl = sourceOf(domain) === 'live' ? liveApi[key] : mockApi[key];
      return (impl as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

export const api: Api = {
  poems: route('poems', 'poems'),
  ai: route('ai', 'ai'),
  poets: route('poets', 'poets'),
  explore: route('explore', 'explore'),
  profile: route('profile', 'profile'),
  keeps: route('keeps', 'keeps'),
  lists: route('lists', 'lists'),
  library: route('library', 'library'),
  journey: route('journey', 'journey'),
  collections: route('collections', 'collections'),
  search: route('search', 'search'),
  share: route('share', 'share'),
};
export * from './contract';
