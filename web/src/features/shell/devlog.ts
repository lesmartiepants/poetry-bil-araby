// One timeline of front-end and server events and errors for the developer panel.
export interface DevEvent {
  at: number;
  kind: 'request' | 'error' | 'event';
  source: 'app' | 'server';
  text: string;
  detail?: string;
}

type Listener = (events: DevEvent[]) => void;
const events: DevEvent[] = [];
const listeners = new Set<Listener>();
let seenErrors = 0;

export function logEvent(e: Omit<DevEvent, 'at'>) {
  events.unshift({ ...e, at: Date.now() });
  if (events.length > 200) events.pop();
  listeners.forEach((l) => l([...events]));
}
export function subscribe(l: Listener) {
  listeners.add(l);
  l([...events]);
  return () => void listeners.delete(l);
}
export const errorCount = () => events.filter((e) => e.kind === 'error').length - seenErrors;
export const markErrorsSeen = () => {
  seenErrors = events.filter((e) => e.kind === 'error').length;
  listeners.forEach((l) => l([...events]));
};

/** Wrap fetch and window errors once, at boot. */
export function installDevLog() {
  window.addEventListener('error', (e) => logEvent({ kind: 'error', source: 'app', text: e.message }));
  window.addEventListener('unhandledrejection', (e) => logEvent({ kind: 'error', source: 'app', text: String(e.reason?.message ?? e.reason) }));
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    try {
      const res = await orig(input, init);
      logEvent({ kind: res.ok ? 'request' : 'error', source: 'server', text: `${init?.method ?? 'GET'} ${url} ${res.status}` });
      return res;
    } catch (err) {
      logEvent({ kind: 'error', source: 'server', text: `${init?.method ?? 'GET'} ${url} failed`, detail: String(err) });
      throw err;
    }
  };
}
