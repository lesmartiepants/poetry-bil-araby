import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePoemStore } from '../stores/poemStore';

// Mock dependencies
const mockAddLog = vi.fn();
const mockTrack = vi.fn();
const mockEmitEvent = vi.fn();
const mockNavigate = vi.fn();
const mockMarkPoemSeen = vi.fn();

const dbPoem = {
  id: 42,
  poet: 'Nizar Qabbani',
  poetArabic: 'نزار قباني',
  title: 'Test Poem',
  arabic: 'بيت شعر عربي',
  english: 'An Arabic verse',
  tags: ['Modern', 'Romantic'],
};

describe('fetchPoem action', () => {
  beforeEach(() => {
    usePoemStore.getState().reset();
    vi.clearAllMocks();
    // Mock global fetch for DB mode
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => dbPoem,
    });
  });

  it('should be importable', async () => {
    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    expect(typeof fetchPoem).toBe('function');
  });

  it('sets isFetching true during fetch', async () => {
    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    expect(usePoemStore.getState().isFetching).toBe(false);

    const promise = fetchPoem({
      addLog: mockAddLog,
      track: mockTrack,
      emitEvent: mockEmitEvent,
      navigate: mockNavigate,
      markPoemSeen: mockMarkPoemSeen,
    });

    expect(usePoemStore.getState().isFetching).toBe(true);
    await promise;
    expect(usePoemStore.getState().isFetching).toBe(false);
  });

  it('adds the fetched poem to the poems array (DB mode)', async () => {
    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    const initialCount = usePoemStore.getState().poems.length;

    await fetchPoem({
      addLog: mockAddLog,
      track: mockTrack,
      emitEvent: mockEmitEvent,
      navigate: mockNavigate,
      markPoemSeen: mockMarkPoemSeen,
    });

    expect(usePoemStore.getState().poems.length).toBe(initialCount + 1);
    expect(usePoemStore.getState().poems[initialCount].id).toBe(42);
  });

  it('calls track and emitEvent with correct args', async () => {
    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    await fetchPoem({
      addLog: mockAddLog,
      track: mockTrack,
      emitEvent: mockEmitEvent,
      navigate: mockNavigate,
      markPoemSeen: mockMarkPoemSeen,
    });

    expect(mockTrack).toHaveBeenCalledWith(
      'poem_discovered',
      expect.objectContaining({ source: 'database' })
    );
    expect(mockEmitEvent).toHaveBeenCalledWith(42, 'serve', { source: 'database' });
    expect(mockMarkPoemSeen).toHaveBeenCalledWith(42);
  });

  it('skips when already fetching', async () => {
    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    usePoemStore.getState().setFetching(true);

    await fetchPoem({
      addLog: mockAddLog,
      track: mockTrack,
      emitEvent: mockEmitEvent,
      navigate: mockNavigate,
      markPoemSeen: mockMarkPoemSeen,
    });

    // Should not have added any poems
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('sets autoExplainPending when poem has no cachedTranslation', async () => {
    // Override the fetch mock to return a poem without any translation fields.
    // normalizeDbPoem maps `english` → `cachedTranslation`, so we must omit
    // both `english` and `cachedTranslation` to get cachedTranslation: undefined.
    const poemWithoutTranslation = {
      id: 42,
      poet: 'Nizar Qabbani',
      poetArabic: 'نزار قباني',
      title: 'Test Poem',
      arabic: 'بيت شعر عربي',
      tags: ['Modern', 'Romantic'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => poemWithoutTranslation,
    });

    const { fetchPoem } = await import('../stores/actions/fetchPoem');
    await fetchPoem({
      addLog: mockAddLog,
      track: mockTrack,
      emitEvent: mockEmitEvent,
      navigate: mockNavigate,
      markPoemSeen: mockMarkPoemSeen,
    });

    expect(usePoemStore.getState().autoExplainPending).toBe(true);
  });
});
