// The one switch per data domain. A slice is real when its domains say 'live'.
export type Domain =
  | 'poems' | 'ai' | 'tts' | 'poets' | 'explore' | 'profile' | 'keeps' | 'lists'
  | 'share' | 'library' | 'journey' | 'collections' | 'search';

export type Source = 'mock' | 'live';

export const SOURCES: Record<Domain, Source> = {
  poems: 'mock',
  ai: 'mock',
  tts: 'mock',
  poets: 'mock',
  explore: 'mock',
  profile: 'mock',
  keeps: 'mock',
  lists: 'mock',
  share: 'mock',
  library: 'mock',
  journey: 'mock',
  collections: 'mock',
  search: 'mock',
};

let override: Partial<Record<Domain, Source>> = {};
/** Tests and the dev panel can force a source; e.g. journeys run all-mock. */
export function setSourceOverride(o: Partial<Record<Domain, Source>>) {
  override = o;
}
export function sourceOf(d: Domain): Source {
  return override[d] ?? SOURCES[d];
}

let showMocks = true;
/** Production builds hide screens whose domain is still mocked. */
export function setShowMocks(v: boolean) {
  showMocks = v;
}
export function isAvailable(...domains: Domain[]): boolean {
  return showMocks || domains.every((d) => sourceOf(d) === 'live');
}
