import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests the initAPI logic from design-review/index.html.
 * Validates that session creation failures are properly surfaced
 * (the bug that caused "Send to Backend" to silently fail).
 */

// Simulate the core initAPI logic extracted from design-review/index.html
function createInitAPI(fetchFn) {
  let apiAvailable = false;
  let currentSession = null;
  const API_BASE = 'http://localhost:3001';

  async function initAPI() {
    try {
      const r = await fetchFn(API_BASE + '/api/design-review/items', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(`Items endpoint returned ${r.status}`);
      apiAvailable = true;

      // Skip CATALOG sync for test — just session handling
      const sessRes = await fetchFn(API_BASE + '/api/design-review/sessions');
      const sess = await sessRes.json();
      const active = sess.find(s => s.status === 'in_progress');

      if (active) {
        currentSession = active;
      } else {
        const cr = await fetchFn(API_BASE + '/api/design-review/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer: 'owner', branch: 'main', total_designs: 57 })
        });
        if (!cr.ok) {
          const errBody = await cr.json().catch(() => ({}));
          throw new Error(errBody.error || `Session creation failed (${cr.status})`);
        }
        currentSession = await cr.json();
      }
    } catch {
      apiAvailable = false;
    }
  }

  return {
    initAPI,
    getState: () => ({ apiAvailable, currentSession })
  };
}

describe('Design Review initAPI', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set apiAvailable=false when items endpoint returns 503', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    expect(api.getState().apiAvailable).toBe(false);
    expect(api.getState().currentSession).toBe(null);
  });

  it('should set apiAvailable=false when items endpoint times out', async () => {
    mockFetch.mockRejectedValueOnce(new Error('AbortError: signal timed out'));

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    expect(api.getState().apiAvailable).toBe(false);
    expect(api.getState().currentSession).toBe(null);
  });

  it('should set apiAvailable=false when session creation returns 503', async () => {
    // Items endpoint succeeds
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Sessions list returns empty
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    // Session creation fails (design tables not created)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Design tables not created yet' })
    });

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    // The bug: before fix, apiAvailable would be true but currentSession null
    // After fix, the throw propagates and sets apiAvailable=false
    expect(api.getState().apiAvailable).toBe(false);
    expect(api.getState().currentSession).toBe(null);
  });

  it('should create session successfully when backend is healthy', async () => {
    const mockSession = { id: 'abc-123', round_number: 1, status: 'in_progress' };

    // Items endpoint succeeds
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Sessions list returns empty
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    // Session creation succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockSession
    });

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    expect(api.getState().apiAvailable).toBe(true);
    expect(api.getState().currentSession).toEqual(mockSession);
  });

  it('should resume an existing active session', async () => {
    const activeSession = { id: 'existing-session', round_number: 2, status: 'in_progress' };

    // Items endpoint succeeds
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Sessions list returns one active session
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [activeSession, { id: 'old', round_number: 1, status: 'completed' }]
    });

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    expect(api.getState().apiAvailable).toBe(true);
    expect(api.getState().currentSession).toEqual(activeSession);
    // Should NOT have tried to create a new session (only 2 fetch calls)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should set apiAvailable=false when session creation returns 500 with no JSON body', async () => {
    // Items endpoint succeeds
    mockFetch.mockResolvedValueOnce({ ok: true });
    // Sessions list returns empty
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    // Session creation fails with non-JSON response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); }
    });

    const api = createInitAPI(mockFetch);
    await api.initAPI();

    expect(api.getState().apiAvailable).toBe(false);
    expect(api.getState().currentSession).toBe(null);
  });
});
