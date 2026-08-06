import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Node's experimental `localStorage` global shadows happy-dom's and is undefined
// unless the runner was started with --localstorage-file, so this suite installs
// its own in-memory store rather than depending on the environment. Scoped to
// this file; nothing shared is touched.
const store = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  },
});

// ---------------------------------------------------------------------------
// Supabase stub. `from('user_settings')` returns a builder whose select chain
// resolves to whatever the current test set as the remote row, and whose upsert
// records what was written. The real client returns a thenable builder, so the
// select chain terminates in `.single()` and `upsert()` is awaited directly.
// ---------------------------------------------------------------------------
const remote = { row: null, error: null };
const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
const configured = { value: true };

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: remote.row, error: remote.error }),
        }),
      }),
      upsert: (...args) => upsertSpy(...args),
    })),
  },
  isSupabaseConfigured: () => configured.value,
}));

import { useOnboardingPrefs } from '../hooks/useOnboardingPrefs';
import {
  readPrefs,
  writePrefs,
  mergePrefs,
  sanitizePrefs,
  PREFS_STORAGE_KEY,
  PREFS_VERSION,
  EMPTY_PREFS,
} from '../services/preferences.js';
import { hasPreferences } from '../services/preferenceWeighting.js';

const USER = { id: 'user-1' };

const prefsAt = (completedAt, overrides = {}) => ({
  version: PREFS_VERSION,
  family: 'love-desire',
  moods: ['pride'],
  motifs: ['night'],
  era: 'c9-9',
  difficulty: 'gentle',
  completedAt,
  ...overrides,
});

const storedPrefs = () => JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY));

beforeEach(() => {
  localStorage.removeItem(PREFS_STORAGE_KEY);
  remote.row = null;
  remote.error = null;
  configured.value = true;
  upsertSpy.mockClear();
  upsertSpy.mockImplementation(() => Promise.resolve({ error: null }));
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Signed out is untouched
// ---------------------------------------------------------------------------
describe('signed out', () => {
  it('never reads or writes the account', async () => {
    writePrefs(prefsAt('2026-08-01T00:00:00.000Z'));

    const { result } = renderHook(() => useOnboardingPrefs(null));
    await act(async () => {
      await result.current.persist(prefsAt('2026-08-02T00:00:00.000Z'));
    });

    expect(upsertSpy).not.toHaveBeenCalled();
    // localStorage remains the whole story, and persist still wrote it.
    expect(storedPrefs().completedAt).toBe('2026-08-02T00:00:00.000Z');
  });

  it('leaves localStorage as the sole path when Supabase is unconfigured', async () => {
    configured.value = false;
    const { result } = renderHook(() => useOnboardingPrefs(USER));
    await act(async () => {
      await result.current.persist(prefsAt('2026-08-02T00:00:00.000Z'));
    });

    expect(upsertSpy).not.toHaveBeenCalled();
    expect(readPrefs().family).toBe('love-desire');
  });

  it('reads the same prefs the feed reads, synchronously, with no user present', () => {
    writePrefs(prefsAt('2026-08-01T00:00:00.000Z'));
    renderHook(() => useOnboardingPrefs(null));

    // fetchPoem.js does exactly this, outside any await.
    const prefs = readPrefs();
    expect(hasPreferences(prefs)).toBe(true);
    expect(prefs.moods).toEqual(['pride']);
  });
});

// ---------------------------------------------------------------------------
// 2. Write-through on completion
// ---------------------------------------------------------------------------
describe('write-through on completion', () => {
  it('mirrors completed answers to the account and to localStorage', async () => {
    const { result } = renderHook(() => useOnboardingPrefs(USER));
    const answers = prefsAt('2026-08-03T14:01:45.000Z');

    await act(async () => {
      await result.current.persist(answers);
    });

    expect(storedPrefs()).toMatchObject({ family: 'love-desire', motifs: ['night'] });
    const [payload, options] = upsertSpy.mock.calls.at(-1);
    expect(payload.user_id).toBe('user-1');
    expect(payload.onboarding_preferences).toMatchObject({
      family: 'love-desire',
      completedAt: '2026-08-03T14:01:45.000Z',
    });
    // Only the one column, so it composes with useUserSettings' theme/font write
    // on the same row instead of clobbering it.
    expect(Object.keys(payload).sort()).toEqual(['onboarding_preferences', 'user_id']);
    expect(options).toEqual({ onConflict: 'user_id' });
  });

  it('keeps the local answers when the account write fails', async () => {
    upsertSpy.mockImplementation(() => Promise.resolve({ error: { message: 'offline' } }));
    const { result } = renderHook(() => useOnboardingPrefs(USER));

    let outcome;
    await act(async () => {
      outcome = await result.current.persist(prefsAt('2026-08-03T00:00:00.000Z'));
    });

    expect(outcome.error).toBeTruthy();
    expect(readPrefs().family).toBe('love-desire');
  });
});

// ---------------------------------------------------------------------------
// 3. Read-back on login
// ---------------------------------------------------------------------------
describe('read-back on login', () => {
  it('hydrates a fresh device from the account', async () => {
    remote.row = { onboarding_preferences: prefsAt('2026-07-01T00:00:00.000Z') };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(storedPrefs()).not.toBeNull());
    expect(readPrefs()).toMatchObject({ family: 'love-desire', era: 'c9-9' });
    // Remote already matched; nothing to push back.
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('pushes local answers up when the account has none', async () => {
    writePrefs(prefsAt('2026-08-02T00:00:00.000Z'));
    remote.row = null; // PGRST116-equivalent: no row yet

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(upsertSpy).toHaveBeenCalled());
    expect(upsertSpy.mock.calls.at(-1)[0].onboarding_preferences.completedAt).toBe(
      '2026-08-02T00:00:00.000Z'
    );
  });

  it('does nothing when neither side has answers', async () => {
    renderHook(() => useOnboardingPrefs(USER));
    await waitFor(() => expect(upsertSpy).not.toHaveBeenCalled());
    expect(localStorage.getItem(PREFS_STORAGE_KEY)).toBeNull();
  });

  it('leaves local answers alone when the account read errors', async () => {
    writePrefs(prefsAt('2026-08-02T00:00:00.000Z'));
    remote.error = { code: '500', message: 'boom' };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(readPrefs().completedAt).toBe('2026-08-02T00:00:00.000Z');
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. The merge rule, both directions
// ---------------------------------------------------------------------------
describe('mergePrefs — most recent completedAt wins, whole', () => {
  it('local wins when local is newer', () => {
    const local = prefsAt('2026-08-02T00:00:00.000Z');
    const rem = prefsAt('2026-07-01T00:00:00.000Z', { family: 'grief-loss' });
    expect(mergePrefs(local, rem)).toEqual({ winner: local, source: 'local' });
  });

  it('remote wins when remote is newer', () => {
    const local = prefsAt('2026-07-01T00:00:00.000Z');
    const rem = prefsAt('2026-08-02T00:00:00.000Z', { family: 'grief-loss' });
    expect(mergePrefs(local, rem)).toEqual({ winner: rem, source: 'remote' });
  });

  it('takes the winner whole rather than blending fields', () => {
    const local = prefsAt('2026-08-02T00:00:00.000Z', { family: 'valor-defiance', motifs: [] });
    const rem = prefsAt('2026-07-01T00:00:00.000Z', { moods: ['grief'], motifs: ['sea'] });
    const { winner } = mergePrefs(local, rem);
    // Not a union: the older side's motifs do not survive into the newer answer.
    expect(winner.motifs).toEqual([]);
    expect(winner.moods).toEqual(['pride']);
  });

  it('prefers the answered side regardless of timestamps', () => {
    const answered = prefsAt('2026-01-01T00:00:00.000Z');
    expect(mergePrefs({ ...EMPTY_PREFS }, answered).source).toBe('remote');
    expect(mergePrefs(answered, { ...EMPTY_PREFS }).source).toBe('local');
    expect(mergePrefs({ ...EMPTY_PREFS }, null).source).toBe('neither');
  });

  it('breaks an exact tie toward remote so the common no-op stays a no-op', () => {
    const at = '2026-08-02T00:00:00.000Z';
    expect(mergePrefs(prefsAt(at), prefsAt(at)).source).toBe('remote');
  });

  it('prefers a stamped completion over an unstamped one, either direction', () => {
    expect(mergePrefs(prefsAt(null), prefsAt('2026-01-01T00:00:00.000Z')).source).toBe('remote');
    expect(mergePrefs(prefsAt('2026-01-01T00:00:00.000Z'), prefsAt(null)).source).toBe('local');
  });

  it('treats an unparseable completedAt as absent instead of throwing', () => {
    expect(mergePrefs(prefsAt('not-a-date'), prefsAt('2026-01-01T00:00:00.000Z')).source).toBe(
      'remote'
    );
    expect(mergePrefs(prefsAt('not-a-date'), prefsAt(null)).source).toBe('local');
  });

  it('resolves the signed-out-then-sign-in case in favour of the fresh answers', async () => {
    // The flow this feature exists for: answered while signed out, then signs in
    // to an account holding older answers.
    writePrefs(prefsAt('2026-08-03T12:00:00.000Z', { family: 'nature-cosmos' }));
    remote.row = { onboarding_preferences: prefsAt('2026-02-01T00:00:00.000Z') };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(upsertSpy).toHaveBeenCalled());
    expect(upsertSpy.mock.calls.at(-1)[0].onboarding_preferences.family).toBe('nature-cosmos');
    expect(readPrefs().family).toBe('nature-cosmos');
  });

  it('overwrites this device when the account is the newer side', async () => {
    writePrefs(prefsAt('2026-02-01T00:00:00.000Z', { family: 'nature-cosmos' }));
    remote.row = { onboarding_preferences: prefsAt('2026-08-03T12:00:00.000Z') };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(readPrefs().family).toBe('love-desire'));
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Version mismatch
// ---------------------------------------------------------------------------
describe('version mismatch', () => {
  it('discards a v1 payload rather than half-applying it', () => {
    // v1 keys were written against a schema that never shipped ('anger', 'sea').
    const { prefs, versionMismatch } = sanitizePrefs({
      version: 1,
      family: 'love',
      moods: ['anger'],
    });
    expect(versionMismatch).toBe(true);
    expect(prefs).toEqual(EMPTY_PREFS);
    expect(hasPreferences(prefs)).toBe(false);
  });

  it('treats an unversioned payload as v1', () => {
    expect(sanitizePrefs({ family: 'love', moods: ['anger'] }).versionMismatch).toBe(true);
  });

  it('discards a future v3 payload without crashing', () => {
    const { prefs, versionMismatch } = sanitizePrefs({
      version: 3,
      family: 'love-desire',
      forms: ['ghazal'],
    });
    expect(versionMismatch).toBe(true);
    expect(prefs).toEqual(EMPTY_PREFS);
    expect(prefs.forms).toBeUndefined();
  });

  it('readPrefs returns empty prefs for a mismatched stored payload', () => {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ version: 3, family: 'x' }));
    expect(readPrefs()).toEqual(EMPTY_PREFS);
  });

  it('survives corrupt JSON and non-object payloads', () => {
    localStorage.setItem(PREFS_STORAGE_KEY, '{not json');
    expect(readPrefs()).toEqual(EMPTY_PREFS);
    expect(sanitizePrefs([1, 2, 3]).prefs).toEqual(EMPTY_PREFS);
    expect(sanitizePrefs(null).prefs).toEqual(EMPTY_PREFS);
    expect(sanitizePrefs('nope').prefs).toEqual(EMPTY_PREFS);
  });

  it("does not overwrite a newer client's remote payload", async () => {
    writePrefs(prefsAt('2026-08-03T00:00:00.000Z'));
    remote.row = { onboarding_preferences: { version: 3, family: 'unknown-shape' } };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(console.info).toHaveBeenCalled());
    expect(upsertSpy).not.toHaveBeenCalled();
    // And this device keeps its own answers.
    expect(readPrefs().completedAt).toBe('2026-08-03T00:00:00.000Z');
  });

  it("does not overwrite a newer client's local payload", async () => {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ version: 3, family: 'unknown' }));
    remote.row = { onboarding_preferences: prefsAt('2026-01-01T00:00:00.000Z') };

    renderHook(() => useOnboardingPrefs(USER));

    await waitFor(() => expect(console.info).toHaveBeenCalled());
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY)).version).toBe(3);
  });

  it('normalises a mismatched payload on persist instead of storing it', async () => {
    const { result } = renderHook(() => useOnboardingPrefs(USER));
    await act(async () => {
      await result.current.persist({ version: 99, family: 'love-desire' });
    });
    expect(upsertSpy.mock.calls.at(-1)[0].onboarding_preferences).toEqual(EMPTY_PREFS);
  });
});
