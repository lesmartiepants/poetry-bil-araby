import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiwanApp from '../app.jsx';

// Mock Supabase client as configured with a logged-in user session
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
                user_metadata: { full_name: 'Test User' },
              },
            },
          },
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

describe('Auth Controls Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Save/Unsave poem button when Supabase is configured', async () => {
    render(<DiwanApp />);
    // Save/Unsave poem button should be rendered when Supabase is configured
    await waitFor(() => {
      expect(screen.getByLabelText(/save poem|unsave poem/i)).toBeInTheDocument();
    });
  });

  it('shows Account/User Menu button when user is logged in', async () => {
    render(<DiwanApp />);
    // After auth session is restored, AuthButton should show the logged-in state
    await waitFor(
      () => {
        expect(screen.getByLabelText('User Menu')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('does not show Sign In button when user is already logged in', async () => {
    render(<DiwanApp />);
    // Wait for auth state to load (user is logged in, so "Sign In" should not appear)
    await waitFor(
      () => {
        expect(screen.queryByLabelText('Sign In')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows core vertical controls (Listen, Explain, Discover) regardless of auth state', async () => {
    render(<DiwanApp />);
    // Primary controls are always visible regardless of auth/login state
    expect(screen.getByLabelText(/play recitation|pause recitation/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Explain poem meaning')).toBeInTheDocument();
    expect(screen.getByLabelText('Discover new poem')).toBeInTheDocument();
  });
});
