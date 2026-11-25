// Storage interface so core never touches localStorage or IndexedDB directly.
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const memory = new Map<string, string>();
let store: KeyValueStore = {
  get: (k) => memory.get(k) ?? null,
  set: (k, v) => void memory.set(k, v),
  remove: (k) => void memory.delete(k),
};

export function setStore(s: KeyValueStore) {
  store = s;
}
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = store.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON(key: string, value: unknown) {
  try {
    store.set(key, JSON.stringify(value));
  } catch {
    /* storage can be full or blocked; the app still works for this session */
  }
}
