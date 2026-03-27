import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth, useUserSettings, useSavedPoems } from '../hooks/useAuth';
import React from 'react';

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Test component that uses the auth hook
function TestAuthComponent() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Ready'}</div>
      <div data-testid="user">{user ? user.email : 'Not signed in'}</div>
      <button onClick={signInWithGoogle}>Sign In with Google</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

// Test component for user settings
function TestSettingsComponent({ user }) {
  const { settings, saveSettings, loading } = useUserSettings(user);

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Ready'}</div>
      <div data-testid="theme">{settings?.theme || 'No theme'}</div>
      <button onClick={() => saveSettings({ theme: 'dark', font_id: 'Amiri' })}>
        Save Settings
      </button>
    </div>
  );
}

// Test component for saved poems
function TestSavedPoemsComponent({ user }) {
  const { savedPoems, savePoem, unsavePoem, isPoemSaved, loading } = useSavedPoems(user);
  const testPoem = {
    id: 1,
    poet: 'Test Poet',
    title: 'Test Title',
    arabic: 'Test Arabic Text',
    english: 'Test English',
  };

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Ready'}</div>
      <div data-testid="count">{savedPoems.length}</div>
      <div data-testid="is-saved">{isPoemSaved(testPoem) ? 'Saved' : 'Not saved'}</div>
      <button onClick={() => savePoem(testPoem)}>Save Poem</button>
      <button onClick={() => unsavePoem(testPoem.id, testPoem.arabic)}>Unsave Poem</button>
    </div>
  );
}

describe('useAuth Hook', () => {
  it('should initialize with no user and not loading after mount', async () => {
    render(<TestAuthComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Not signed in');
  });

  it('should call signInWithGoogle when button clicked', async () => {
    const { supabase } = await import('../supabaseClient');
    render(<TestAuthComponent />);

    const signInButton = screen.getByText('Sign In with Google');
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
    });
  });

  it('should call signOut when sign out button clicked', async () => {
    const { supabase } = await import('../supabaseClient');
    render(<TestAuthComponent />);

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});

describe('useUserSettings Hook', () => {
  it('should initialize with no settings when no user', async () => {
    render(<TestSettingsComponent user={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('No theme');
  });

  it('should clear settings when user becomes null (sign-out)', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { rerender } = render(<TestSettingsComponent user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    // Simulate sign-out by setting user to null
    rerender(<TestSettingsComponent user={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('No theme');
    });
  });

  it('should call saveSettings when button clicked', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { supabase } = await import('../supabaseClient');

    render(<TestSettingsComponent user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('user_settings');
    });
  });
});

describe('useSavedPoems Hook', () => {
  it('should initialize with empty saved poems when no user', async () => {
    render(<TestSavedPoemsComponent user={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('Not saved');
  });

  it('should clear saved poems when user becomes null (sign-out)', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { rerender } = render(<TestSavedPoemsComponent user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    // Simulate sign-out by setting user to null
    rerender(<TestSavedPoemsComponent user={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-saved')).toHaveTextContent('Not saved');
    });
  });

  it('should call savePoem when save button clicked', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { supabase } = await import('../supabaseClient');

    render(<TestSavedPoemsComponent user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    const saveButton = screen.getByText('Save Poem');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('saved_poems');
    });
  });

  it('should call unsavePoem when unsave button clicked', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const { supabase } = await import('../supabaseClient');

    render(<TestSavedPoemsComponent user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Ready');
    });

    const unsaveButton = screen.getByText('Unsave Poem');
    fireEvent.click(unsaveButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('saved_poems');
    });
  });
});
