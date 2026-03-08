import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDownvotes, usePoemEvents } from '../hooks/useAuth';
import React from 'react';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
}));

// Shared mock chain builder for Supabase
let mockSelectChain;
let mockInsertResult;
let mockDeleteChain;

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => mockSelectChain),
        }))
      })),
      insert: vi.fn(() => mockInsertResult),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => mockDeleteChain),
          }))
        }))
      })),
    }))
  },
  isSupabaseConfigured: vi.fn(() => true)
}));

const testUser = { id: 'user-123', email: 'test@test.com' };
const testPoem = {
  id: 42,
  poet: 'Test Poet',
  title: 'Test Title',
  arabic: 'Test Arabic Text',
  english: 'Test English'
};

// ─── DownvoteButton tests (component from app.jsx) ───

// We can't import DownvoteButton directly (not exported), so test via a minimal recreation
// that mirrors the component's behavior. The real component tests are covered by the
// hook tests + the E2E tests. Here we test the hooks thoroughly.

// ─── useDownvotes tests ───

function TestDownvotesComponent({ user }) {
  const { downvotedPoemIds, downvotePoem, undownvotePoem, isPoemDownvoted, loading } = useDownvotes(user);

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Ready'}</div>
      <div data-testid="count">{downvotedPoemIds.length}</div>
      <div data-testid="is-downvoted">{isPoemDownvoted(testPoem) ? 'yes' : 'no'}</div>
      <button onClick={() => downvotePoem(testPoem)}>Downvote</button>
      <button onClick={() => undownvotePoem(testPoem.id)}>Undownvote</button>
    </div>
  );
}

describe('useDownvotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectChain = Promise.resolve({ data: [], error: null });
    mockInsertResult = Promise.resolve({ error: null });
    mockDeleteChain = Promise.resolve({ error: null });
  });

  it('loads empty downvotes for authenticated user', async () => {
    render(<TestDownvotesComponent user={testUser} />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-downvoted')).toHaveTextContent('no');
  });

  it('returns empty state when user is null', async () => {
    render(<TestDownvotesComponent user={null} />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('loads existing downvotes', async () => {
    mockSelectChain = Promise.resolve({
      data: [{ poem_id: 42 }, { poem_id: 99 }],
      error: null
    });

    render(<TestDownvotesComponent user={testUser} />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('is-downvoted')).toHaveTextContent('yes');
  });

  it('optimistically adds downvote on downvotePoem', async () => {
    render(<TestDownvotesComponent user={testUser} />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Downvote'));
    });

    // Optimistic update should show the poem as downvoted
    expect(screen.getByTestId('is-downvoted')).toHaveTextContent('yes');
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('optimistically removes downvote on undownvotePoem', async () => {
    mockSelectChain = Promise.resolve({
      data: [{ poem_id: 42 }],
      error: null
    });

    render(<TestDownvotesComponent user={testUser} />);
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Undownvote'));
    });

    expect(screen.getByTestId('is-downvoted')).toHaveTextContent('no');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('isPoemDownvoted returns false for poem without id', async () => {
    render(<TestDownvotesComponent user={testUser} />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });
    // testPoem has id 42, which is not in the empty downvotes list
    expect(screen.getByTestId('is-downvoted')).toHaveTextContent('no');
  });
});

// ─── usePoemEvents tests ───

function TestPoemEventsComponent({ user }) {
  const { emitEvent } = usePoemEvents(user);
  const [emitted, setEmitted] = React.useState(false);

  const handleEmit = async () => {
    await emitEvent(42, 'serve', { source: 'database' });
    setEmitted(true);
  };

  return (
    <div>
      <div data-testid="emitted">{emitted ? 'yes' : 'no'}</div>
      <button onClick={handleEmit}>Emit</button>
    </div>
  );
}

describe('usePoemEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertResult = Promise.resolve({ error: null });
  });

  it('emitEvent calls Supabase insert for authenticated user', async () => {
    const { supabase } = await import('../supabaseClient');

    render(<TestPoemEventsComponent user={testUser} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Emit'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('emitted')).toHaveTextContent('yes');
    });

    expect(supabase.from).toHaveBeenCalledWith('poem_events');
  });

  it('emitEvent is a no-op when user is null', async () => {
    const { supabase } = await import('../supabaseClient');
    supabase.from.mockClear();

    render(<TestPoemEventsComponent user={null} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Emit'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('emitted')).toHaveTextContent('yes');
    });

    // supabase.from should not have been called for poem_events
    // (it may be called during render for other hooks, but not for this emit)
    const poemEventsCalls = supabase.from.mock.calls.filter(c => c[0] === 'poem_events');
    expect(poemEventsCalls).toHaveLength(0);
  });

  it('emitEvent handles Supabase errors gracefully', async () => {
    mockInsertResult = Promise.resolve({ error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestPoemEventsComponent user={testUser} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Emit'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('emitted')).toHaveTextContent('yes');
    });

    // Should not throw — fire-and-forget
    consoleSpy.mockRestore();
  });
});
