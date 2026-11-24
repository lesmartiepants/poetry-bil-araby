// The one switch per data domain. A slice is real when its domains say 'live'.
export type Domain =
  | 'poems' | 'ai' | 'tts' | 'poets' | 'explore' | 'profile' | 'keeps' | 'lists'
  | 'share' | 'library' | 'journey' | 'collections' | 'search';

export type Source = 'mock' | 'live';

// V1.2 reader, V1.3 tap a word, V1.5 Explore and V1.6 poet pages are live (server/redesign2.js).
// V2.2 share cards render on the server. V3 Tonight, journeys, collections and search are live; collection progress stays on the device until auth.
// tts flips when a Gemini key is configured for live recitation; profile when Supabase auth is wired.
export const SOURCES: Record<Domain, Source> = {
  poems: 'live',
  ai: 'live',
  tts: 'mock',
  poets: 'live',
  explore: 'live',
  profile: 'mock',
  keeps: 'mock',
  lists: 'mock',
  share: 'live',
  library: 'mock',
  journey: 'live',
  collections: 'live',
  search: 'live',
};

/** Turns domains live at boot when their backend is configured (e.g. Supabase for per-user data). */
export function configureSources(patch: Partial<Record<Domain, Source>>) {
  Object.assign(SOURCES, patch);
}

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
