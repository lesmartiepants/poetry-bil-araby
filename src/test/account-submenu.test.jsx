import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the auth hooks to simulate a signed-in user
const mockUser = {
  id: 'user-123',
  email: 'sara@example.com',
  user_metadata: { full_name: 'Sara' },
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    signOut: vi.fn(),
  }),
  useUserSettings: () => ({
    settings: { theme: 'dark', font_id: 'Amiri' },
    saveSettings: vi.fn(),
    loading: false,
  }),
  useSavedPoems: () => ({
    savedPoems: [
      {
        id: 1,
        poem_id: 101,
        poet: 'Nizar Qabbani',
        poem_text: 'حبيبتي',
        saved_at: new Date().toISOString(),
      },
      {
        id: 2,
        poem_id: 102,
        poet: 'Mahmoud Darwish',
        poem_text: 'سجل أنا عربي',
        saved_at: new Date().toISOString(),
      },
    ],
    savePoem: vi.fn().mockResolvedValue({ error: null }),
    unsavePoem: vi.fn().mockResolvedValue({ error: null }),
    isPoemSaved: vi.fn(() => false),
    loading: false,
    reload: vi.fn(),
  }),
  useDownvotes: () => ({
    downvotedPoemIds: [],
    downvotePoem: vi.fn().mockResolvedValue({ error: null }),
    undownvotePoem: vi.fn().mockResolvedValue({ error: null }),
    isPoemDownvoted: vi.fn(() => false),
  }),
  usePoemEvents: () => ({
    emitEvent: vi.fn(),
  }),
}));

// Must be imported AFTER vi.mock so the mock takes effect
const { default: DiwanApp } = await import('../app.jsx');

const defaultFetchResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    id: 999,
    poet: 'Nizar Qabbani',
    poetArabic: 'نزار قباني',
    title: 'My Beloved',
    titleArabic: 'حبيبتي',
    arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة',
    english: 'Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.',
    tags: ['Modern', 'Romantic', 'Ghazal'],
  }),
  text: async () => '',
  headers: new Map(),
  statusText: 'OK',
  body: {
    getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true, value: undefined }) }),
  },
};

function mockAutoLoadFetch() {
  global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }));
}

describe('Account Submenu - Signed In', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Account avatar button instead of Sign In when user is signed in', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    // Avatar button should exist with aria-label containing Account menu (no visible "Account" label — labels removed in redesign)
    const accountBtn = screen.getByLabelText(/Account menu/);
    expect(accountBtn).toBeTruthy();
    // Should NOT show "Sign In" — user is logged in
    expect(screen.queryByLabelText('Sign in')).toBeNull();
  });

  it('shows user initial in the avatar', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    // The avatar should display the first letter of the email ('s' from 'sara@example.com')
    const accountBtn = screen.getByLabelText(/Account menu/);
    expect(accountBtn.textContent).toContain('S');
  });

  it('shows saved poems count badge', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    // Saved poems count is in the aria-label (badge is inside popover, not trigger)
    const accountBtn = screen.getByLabelText(/Account menu.*2 saved poems/);
    expect(accountBtn).toBeTruthy();
  });

  it('includes saved poems count in aria-label for accessibility', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    const accountBtn = screen.getByLabelText(/Account menu.*2 saved poems/);
    expect(accountBtn).toBeTruthy();
  });

  it('reveals My Poems and Sign Out submenu when Account is clicked', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    const accountBtn = screen.getByLabelText(/Account menu/);
    await userEvent.click(accountBtn);

    // Submenu items should now be in the DOM
    expect(screen.getByLabelText('View saved poems')).toBeTruthy();
    expect(screen.getByLabelText('Sign out')).toBeTruthy();
  });

  it('opens SavedPoemsView when My Poems is clicked in the submenu', async () => {
    mockAutoLoadFetch();
    render(<DiwanApp />);

    await waitFor(() => {
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    const accountBtn = screen.getByLabelText(/Account menu/);
    await userEvent.click(accountBtn);

    const myPoemsBtn = screen.getByLabelText('View saved poems');
    await userEvent.click(myPoemsBtn);

    // SavedPoemsView modal should open — it shows the header text
    await waitFor(() => {
      expect(document.body.textContent).toContain('قصائدي المحفوظة');
    });
  });
});
