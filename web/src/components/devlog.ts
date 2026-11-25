// One session timeline for front-end activity and the API calls it makes.
export const DEV_PANEL_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEV_PANEL === '1';
export const EVENT_LIMIT = 200;

export interface DevEvent {
  id: number;
  at: number;
  elapsedMs: number;
  kind: 'request' | 'reply' | 'error' | 'warning' | 'user' | 'success' | 'event';
  label?: string;
  requestId?: number;
  apiPath?: string;
  source: 'app' | 'server';
  text: string;
  detail?: string;
}

let sequence = 0;
let requestSequence = 0;
let startedAt: number | null = null;
let startTick = 0;
let unseenErrors = 0;
let open = false;
let snapshot: { events: DevEvent[]; unseenErrors: number; startedAt: number | null } = {
  events: [],
  unseenErrors,
  startedAt,
};
const listeners = new Set<() => void>();

function publish(events: DevEvent[]) {
  snapshot = { events, unseenErrors, startedAt };
  listeners.forEach((listener) => listener());
}

export function logEvent(event: Omit<DevEvent, 'id' | 'at' | 'elapsedMs'>) {
  if (!DEV_PANEL_ENABLED) return;
  const at = Date.now();
  const tick = performance.now();
  if (startedAt === null) {
    startedAt = at;
    startTick = tick;
  }
  if (event.kind === 'error' && !open) unseenErrors++;
  publish([
    ...snapshot.events.slice(1 - EVENT_LIMIT),
    {
      ...event,
      id: ++sequence,
      at,
      elapsedMs: tick - startTick,
      apiPath: event.apiPath?.slice(0, 400),
      text: event.text.slice(0, 400),
      detail: event.detail?.slice(0, 400),
    },
  ]);
}
export const getDevLog = () => snapshot;
export function subscribeDevLog(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function setDevLogOpen(value: boolean) {
  open = value;
  if (!value || unseenErrors === 0) return;
  unseenErrors = 0;
  publish(snapshot.events);
}

export const apiFetch = globalThis.fetch.bind(globalThis);
export function devApiUrl(path: string) {
  return `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}${path}`;
}

export function installDevLog() {
  window.addEventListener('error', (e) =>
    logEvent({ kind: 'error', source: 'app', label: 'Browser', text: e.message })
  );
  window.addEventListener('unhandledrejection', (e) =>
    logEvent({
      kind: 'error',
      source: 'app',
      label: 'Browser',
      text: String(e.reason?.message ?? e.reason),
    })
  );
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, document.baseURI);
    if (!url.pathname.startsWith('/api/')) return apiFetch(input, init);

    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const requestId = ++requestSequence;
    // Keep query values and request bodies out of logs and reports.
    const apiPath = `${method.toUpperCase()} ${url.pathname}`;
    const start = performance.now();
    logEvent({ kind: 'request', source: 'app', requestId, apiPath, text: '' });
    try {
      const res = await apiFetch(input, init);
      const elapsed = Math.round(performance.now() - start);
      logEvent({
        kind: res.ok ? 'reply' : 'error',
        source: 'server',
        requestId,
        apiPath,
        text: `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''} · ${elapsed} ms`,
      });
      return res;
    } catch (err) {
      const canceled = err instanceof Error && err.name === 'AbortError';
      logEvent({
        kind: canceled ? 'event' : 'error',
        source: 'app',
        requestId,
        apiPath,
        text: canceled ? 'Request canceled' : 'No response received',
        detail: canceled ? undefined : String(err),
      });
      throw err;
    }
  };
}
