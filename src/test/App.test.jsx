import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiwanApp from '../app.jsx';
import { usePoemStore } from '../stores/poemStore';
import { useAudioStore } from '../stores/audioStore';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import {
  createMockGeminiResponse,
  mockSuccessfulFetch,
  createDbPoem,
  createStreamingMock,
} from './utils';

// Mock Vaul so its Portal renders inline in jsdom (no real DOM portals)
vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open, ...props }) => open ? <div data-testid="drawer-root">{children}</div> : null,
    Portal: ({ children }) => <div>{children}</div>,
    Overlay: (props) => <div data-testid="drawer-overlay" {...props} />,
    Content: ({ children, ...props }) => <div data-testid="drawer-content">{children}</div>,
    Handle: (props) => <div data-testid="drawer-handle" {...props} />,
    Close: ({ children }) => children,
  },
}));

// The app auto-loads a poem from the DB on mount (handleFetch in useEffect).
// This helper pre-mocks that initial fetch so the default poem stays current.
const defaultDbPoem = {
  id: 999,
  poet: 'Nizar Qabbani',
  poetArabic: 'نزار قباني',
  title: 'My Beloved',
  titleArabic: 'حبيبتي',
  arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة',
  english: 'Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.',
  tags: ['Modern', 'Romantic', 'Ghazal'],
};

// Default mock response for any fetch calls during mount
const defaultFetchResponse = {
  ok: true,
  status: 200,
  json: async () => defaultDbPoem,
  text: async () => '',
  headers: new Map(),
  statusText: 'OK',
  body: {
    getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true, value: undefined }) }),
  },
};

function mockAutoLoadFetch() {
  // Use a persistent implementation that returns the default poem for any URL,
  // handling all mount-time fetches (auto-load, health ping, auto-explain).
  // Tests that need specific fetch behavior should call mockResolvedValueOnce AFTER awaiting mount.
  global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }));
}

describe('DiwanApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all stores between tests (poemStore.reset() re-initializes poems from seeds)
    usePoemStore.getState().reset();
    useAudioStore.getState().reset();
    useUIStore.getState().reset();
    useModalStore.getState().reset();
  });

  // ── Feature 1: Poem loads with correct structure ──────────────────────

  describe('Poem Structure', () => {
    it('renders the default poem with Arabic text longer than 10 characters', () => {
      render(<DiwanApp />);
      // The default poem's Arabic text is rendered across verse lines with dir="rtl"
      const rtlElements = document.querySelectorAll('p[dir="rtl"]');
      expect(rtlElements.length).toBeGreaterThan(0);

      // Gather all Arabic verse text
      const arabicText = Array.from(rtlElements)
        .map((el) => el.textContent)
        .join('');
      expect(arabicText.length).toBeGreaterThan(10);
    });

    it('displays the poet name in English', () => {
      render(<DiwanApp />);
      expect(document.body.textContent).toContain('Nizar Qabbani');
    });

    it('renders tags for the default poem', () => {
      render(<DiwanApp />);
      expect(screen.getByText('Modern')).toBeInTheDocument();
      expect(screen.getByText('Romantic')).toBeInTheDocument();
      expect(screen.getByText('Ghazal')).toBeInTheDocument();
    });

    it('renders poem verses with dir="rtl" attribute', () => {
      render(<DiwanApp />);
      const rtlVerses = document.querySelectorAll('p[dir="rtl"]');
      expect(rtlVerses.length).toBeGreaterThan(0);
      // Each verse line should have RTL direction
      rtlVerses.forEach((el) => {
        expect(el.getAttribute('dir')).toBe('rtl');
      });
    });
  });

  // ── Feature 2: Discover poems ─────────────────────────────────────────

  describe('Discover Poems', () => {
    it('loads a new poem from the database when Discover is clicked', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      const newPoem = {
        id: 42,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Identity Card',
        titleArabic: 'بطاقة هوية',
        arabic: 'سَجِّلْ أَنَا عَرَبِيّ\nوَرَقَمُ بطاقَتي خَمْسُونَ أَلْف',
        english: 'Record! I am an Arab\nAnd my identity card number is fifty thousand',
        tags: ['Modern', 'Political', 'Free Verse'],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newPoem,
      });

      // Open the discover drawer, then click Surprise Me
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      await waitFor(
        () => {
          expect(document.body.textContent).toContain('Mahmoud Darwish');
        },
        { timeout: 3000 }
      );
    });

    it('disables the Discover button while fetching', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      // Create a never-resolving promise to keep the button disabled
      let resolveFetch;
      // Clear the persistent mock and set up a one-time hanging fetch
      global.fetch.mockReset();
      global.fetch.mockImplementation(
        () =>
          new Promise((r) => {
            resolveFetch = r;
          })
      );

      // Open discover drawer, click Surprise Me (starts fetch, drawer closes)
      const fireBtn = screen.getByLabelText('Open discover');
      await userEvent.click(fireBtn);
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      // Fire button should be disabled during fetch — use waitFor because
      // setIsFetching(true) is a React state update that may not have
      // flushed to the DOM by the time userEvent.click resolves
      await waitFor(() => {
        expect(fireBtn).toBeDisabled();
      });

      // Resolve and wait for React to finish processing
      resolveFetch({ ok: true, json: async () => createDbPoem(99) });
      await waitFor(
        () => {
          expect(fireBtn).not.toBeDisabled();
        },
        { timeout: 1000 }
      );
      // beforeEach() will clear mocks for the next test
    });

    it('changes content from the initial poem after Discover', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      const newPoem = {
        id: 77,
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'Ode to Courage',
        titleArabic: 'قصيدة الشجاعة',
        arabic: 'عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ',
        english: 'Ambitions come according to the ambitions of their people',
        cachedTranslation: 'Ambitions come according to the ambitions of their people',
        tags: ['Classical', 'Epic', 'Ode'],
      };

      // URL-aware mock: return new poem only for DB endpoint, default for everything else
      global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/poems/random')) {
          return Promise.resolve({ ok: true, json: async () => newPoem, text: async () => '' });
        }
        return Promise.resolve({ ...defaultFetchResponse });
      });

      // Open discover drawer, click Surprise Me
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      await waitFor(
        () => {
          expect(document.body.textContent).toContain('Al-Mutanabbi');
        },
        { timeout: 3000 }
      );
    });
  });

  // ── Feature 3: Audio playback ─────────────────────────────────────────

  describe('Audio Playback', () => {
    it('calls fetch when Play is clicked', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      const playBtn = screen.getByLabelText('Play recitation');
      await userEvent.click(playBtn);

      // The app calls fetch to generate audio via Gemini TTS
      await waitFor(() => {
        // At least one additional fetch call (beyond the auto-load)
        expect(global.fetch.mock.calls.length).toBeGreaterThan(1);
      });
    });

    it('shows loading state when generating audio', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      // Replace fetch with a version that hangs for audio (TTS) calls
      // but resolves normally for everything else (auto-explain, streaming, etc.)
      const originalMock = global.fetch;
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/ai/gemini')) {
          // Gemini TTS / audio call — hang forever to keep loading state
          return new Promise(() => {});
        }
        // All other calls resolve immediately
        return Promise.resolve({ ok: true, body: null, json: async () => ({}) });
      });

      const playBtn = screen.getByLabelText('Play recitation');
      await userEvent.click(playBtn);

      // The button should be disabled while generating
      await waitFor(() => {
        expect(playBtn).toBeDisabled();
      });
    });
    it('mutes and pauses audio element immediately on Play to prevent audible blip during iOS Safari unlock', async () => {
      // Capture the Audio instance the component creates so we can assert on it.
      // The component uses `useRef(new Audio())` — React re-evaluates `new Audio()` on
      // every render, but useRef only stores the FIRST value. We capture the first
      // instance created (which is the one stored in audioRef.current) by checking
      // whether audioInstance is still null before setting it.
      let audioInstance = null;
      const OriginalAudio = global.Audio;
      global.Audio = class extends OriginalAudio {
        constructor(...args) {
          super(...args);
          if (audioInstance === null) audioInstance = this; // first instance = audioRef.current
        }
      };

      try {
        // Keep TTS fetch hanging so audioUrl never resolves — this ensures the
        // unlock code path (deferred-play branch) is what we're exercising.
        global.fetch = vi.fn((url) => {
          if (typeof url === 'string' && url.includes('/api/ai/')) {
            return new Promise(() => {});
          }
          return Promise.resolve({
            ok: true,
            json: async () => defaultDbPoem,
            text: async () => '',
            body: {
              getReader: () => ({
                read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
              }),
            },
          });
        });

        render(<DiwanApp />);

        await waitFor(() => {
          expect(document.body.textContent).toContain('Nizar Qabbani');
        });

        const playCallsBefore = audioInstance.play.mock.calls.length;
        const pauseCallsBefore = audioInstance.pause.mock.calls.length;

        await userEvent.click(screen.getByLabelText('Play recitation'));

        // The iOS unlock block must call play() then pause() synchronously within the
        // tap handler — before any async work starts — so the gesture context is held.
        expect(audioInstance.play.mock.calls.length).toBeGreaterThan(playCallsBefore);
        expect(audioInstance.pause.mock.calls.length).toBeGreaterThan(pauseCallsBefore);

        // muted must be restored to its original value (false) after the unlock sequence.
        expect(audioInstance.muted).toBe(false);
      } finally {
        global.Audio = OriginalAudio;
      }
    });
  });

  // ── Feature 4: Insights ──────────────────────────────────────────────

  describe('Insights', () => {
    const mockInsightText =
      'POEM:\nTranslation line\nTHE DEPTH: Deep meaning here.\nTHE AUTHOR: Celebrated poet info.';

    it(
      'shows parsed insight sections after auto-explain on a DB poem without cached translation',
      { timeout: 10000 },
      async () => {
        // Mount with seed poem (has cachedTranslation — no auto-explain fires on init)
        mockAutoLoadFetch();
        render(<DiwanApp />);

        await waitFor(() => {
          expect(document.body.textContent).toContain('Nizar Qabbani');
        });

        // Set URL-aware mock: DB poem without cachedTranslation triggers auto-explain;
        // streaming insight mock answers the Gemini call fired by auto-explain.
        global.fetch.mockImplementation((url) => {
          if (typeof url === 'string' && url.includes('/api/poems/')) {
            return Promise.resolve({
              ok: true,
              json: async () => createDbPoem(101, { cachedTranslation: undefined }),
              text: async () => '',
            });
          }
          if (typeof url === 'string' && url.includes('/api/ai/')) {
            return Promise.resolve(createStreamingMock(mockInsightText));
          }
          return Promise.resolve({ ...defaultFetchResponse });
        });

        // Discover a poem with no cachedTranslation → auto-explain fires automatically
        await userEvent.click(screen.getByLabelText('Open discover'));
        await userEvent.click(screen.getByLabelText('Discover new poem'));

        // Auto-explain pre-fetches insight in background; open overlay to view it
        await waitFor(() => expect(screen.getByLabelText('Explain poem meaning')).toBeInTheDocument(), {
          timeout: 5000,
        });
        await userEvent.click(screen.getByLabelText('Explain poem meaning'));
        await waitFor(
          () => {
            expect(document.body.textContent).toContain('Deep meaning here.');
          },
          { timeout: 8000 }
        );
      }
    );

    it('Explain button is enabled for a DB poem', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(100) });
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      expect(screen.getByLabelText('Explain poem meaning')).not.toBeDisabled();
    });

    it('shows cached insight sections for a DB poem with pre-existing analysis', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      // Load a DB poem with all cached insight fields (depth + author)
      // Use URL-based mock so fetchPoets (/api/poets) uses the default mock
      // and fetchRandomPoem (/api/poems/random) gets the poem with cached analysis.
      const poemWithInsights = createDbPoem(101, {
        cachedExplanation: 'Deep meaning here.',
        cachedAuthorBio: 'Celebrated poet info.',
      });
      global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/poems/random')) {
          global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }));
          return Promise.resolve({ ok: true, json: async () => poemWithInsights });
        }
        return Promise.resolve({ ...defaultFetchResponse });
      });
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      // Cached insight available — open overlay via Explain button to view it
      const explainBtn = screen.getByLabelText('Explain poem meaning');
      await userEvent.click(explainBtn);

      await waitFor(
        () => {
          expect(document.body.textContent).toContain('Deep meaning here.');
        },
        { timeout: 3000 }
      );
    });
  });

  // ── Feature 5: Copy ───────────────────────────────────────────────────

  describe('Copy Functionality', () => {
    it('copies poem text to clipboard with Arabic text, poet, and separator', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for auto-load to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      });

      const copiedText = navigator.clipboard.writeText.mock.calls[0][0];
      // Should contain Arabic poem text
      expect(copiedText).toContain('حُبُّكِ');
      // Should contain poet name
      expect(copiedText).toContain('نزار قباني');
      // Should contain the separator
      expect(copiedText).toContain('---');
    });

    it('shows success indicator after copying', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'));

      // The Check icon replaces the Copy icon on success — look for it in the button
      await waitFor(() => {
        const copyBtn = screen.getByLabelText('Copy poem to clipboard');
        const svg = copyBtn.querySelector('svg');
        expect(svg).toBeTruthy();
      });
    });

    it('does not crash when clipboard write fails', async () => {
      mockAutoLoadFetch();
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard denied'));

      render(<DiwanApp />);

      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'));

      // App should still be rendered (no crash)
      expect(screen.getAllByText('poetry').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Feature 6: Theme toggle ───────────────────────────────────────────

  describe('Theme Toggle', () => {
    it('starts in dark mode with bg-[#0c0c0e]', () => {
      render(<DiwanApp />);
      const container = document.querySelector('[class*="bg-[#0c0c0e]"]');
      expect(container).toBeTruthy();
    });

    it('switches to light mode bg-[#FDFCF8] after toggling theme', async () => {
      render(<DiwanApp />);

      // Open sidebar settings sub-menu
      const settingsBtn = screen.getByTitle('Settings');
      await userEvent.click(settingsBtn);

      // Click the dark/light mode toggle in the sidebar
      const lightModeBtn = screen.getByTitle('Light mode');
      await userEvent.click(lightModeBtn);

      await waitFor(() => {
        const lightContainer = document.querySelector('[class*="bg-[#FDFCF8]"]');
        expect(lightContainer).toBeTruthy();
      });
    });
  });

  // ── Feature 7: Poet filtering ─────────────────────────────────────────

  describe('Poet Filtering', () => {
    it('opens category dropdown and shows poet list', async () => {
      render(<DiwanApp />);

      // Open poet picker from bottom control bar
      const poetsBtn = screen.getByLabelText('Open discover');
      await userEvent.click(poetsBtn);

      await waitFor(() => {
        expect(document.body.textContent).toContain('كل الشعراء');
      });
    });

    it('sends poet filter parameter when a category is selected and Discover is clicked', async () => {
      render(<DiwanApp />);

      // Open poet picker from bottom control bar
      const poetsBtn = screen.getByLabelText('Open discover');
      await userEvent.click(poetsBtn);

      await waitFor(() => {
        expect(document.body.textContent).toContain('محمود درويش');
      });

      // Queue the DB fetch response BEFORE clicking the category.
      // The selectedCategory useEffect fires handleFetch() synchronously during the click,
      // so the mock must be ready before userEvent.click resolves.
      const filteredPoem = {
        id: 200,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Mural',
        titleArabic: 'جدارية',
        arabic: 'هذا هو اسمك قالت امرأة وغابت في الممر اللولبي',
        english: 'This is your name, a woman said, then disappeared into the spiral corridor',
        cachedTranslation:
          'This is your name, a woman said, then disappeared into the spiral corridor',
        tags: ['Modern', 'Epic', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => filteredPoem,
      });

      // Click "Mahmoud Darwish" category — triggers handleFetch via selectedCategory effect
      const darwishOption = screen.getByText('محمود درويش');
      await userEvent.click(darwishOption);

      // The useEffect fires handleFetch when a category is selected and filtered.length === 0.
      // Verify the discovered poem is actually displayed (filter now checks poetArabic too).
      await waitFor(
        () => {
          // Poet name visible (Arabic category ID matched via poetArabic → English display name)
          expect(document.body.textContent).toContain('Mahmoud Darwish');
          // Poem title also shown, confirming the full poem card is rendered
          expect(document.body.textContent).toContain('Mural');
        },
        { timeout: 3000 }
      );
    });

    it('clicking Discover after poet selection fetches and shows a poem from that poet', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for the mount-time auto-load to settle
      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // Open poet picker and select Mahmoud Darwish
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('محمود درويش'));

      // Queue a mock for the auto-fetch triggered by the selectedCategory effect
      const darwishPoem = {
        id: 201,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'On This Earth',
        titleArabic: 'على هذه الأرض',
        arabic: 'على هذه الأرض ما يستحق الحياة',
        cachedTranslation: 'On this earth is what makes life worth living',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => darwishPoem,
      });
      await userEvent.click(screen.getByText('محمود درويش'));

      // Wait for auto-fetch to complete and show the Darwish poem
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      // Queue a second poem for when the user manually clicks Discover
      const darwishPoem2 = {
        id: 202,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Identity Card',
        titleArabic: 'بطاقة هوية',
        arabic: 'سجّل أنا عربي',
        cachedTranslation: 'Record: I am an Arab',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => darwishPoem2,
      });

      // Click Discover — should fetch the next Darwish poem while filter remains active
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      // The new poem is shown and still matches the poet filter (correct filtered index)
      await waitFor(
        () => {
          expect(document.body.textContent).toContain('Identity Card');
          expect(document.body.textContent).toContain('Mahmoud Darwish');
        },
        { timeout: 3000 }
      );
    });

    it('switching from one poet to another fetches and shows the new poet poem', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for the mount-time auto-load to settle
      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // ── Step 1: select Mahmoud Darwish ──────────────────────────────────
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('محمود درويش'));

      const darwishPoem = {
        id: 201,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'On This Earth',
        titleArabic: 'على هذه الأرض',
        arabic: 'على هذه الأرض ما يستحق الحياة',
        cachedTranslation: 'On this earth is what makes life worth living',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => darwishPoem });
      await userEvent.click(screen.getByText('محمود درويش'));

      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      // ── Step 2: open picker and switch to Al-Mutanabbi ──────────────────
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('المتنبي'));

      const mutanabbiPoem = {
        id: 301,
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'To the King',
        titleArabic: 'إلى الملك',
        arabic: 'على قدر أهل العزم تأتي العزائم',
        cachedTranslation: 'Great deeds come to those with great resolve',
        tags: ['Classical', 'Heroic', 'Qasida'],
      };
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mutanabbiPoem });
      await userEvent.click(screen.getByText('المتنبي'));

      // The Mutanabbi poem should now be displayed
      await waitFor(() => expect(document.body.textContent).toContain('Al-Mutanabbi'), {
        timeout: 3000,
      });
      expect(document.body.textContent).toContain('To the King');
    });

    it('shows search input when poet picker opens', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => {
        expect(screen.getByLabelText('Search poets')).toBeInTheDocument();
      });
    });

    it('shows Surprise Me button and Featured tiles in poet picker', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => {
        expect(screen.getByLabelText('Discover new poem')).toBeInTheDocument();
        expect(screen.getAllByTestId('poet-picker-button').length).toBeGreaterThan(0);
      });
    });

    it('filters poets by search query', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));

      // Type in the search input to filter
      const searchInput = screen.getByLabelText('Search poets');
      await userEvent.type(searchInput, 'نزار');

      // Nizar Qabbani should still be visible
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني');
      });

      // Al-Mutanabbi should be filtered out (textContent check needed for absence)
      expect(document.body.textContent).not.toContain('المتنبي');
    });

    it('shows no results message for non-matching search', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));

      const searchInput = screen.getByLabelText('Search poets');
      await userEvent.type(searchInput, 'xyznonexistent');

      await waitFor(() => {
        expect(screen.getByText('No matching poets')).toBeInTheDocument();
      });
    });

    it('filters poets by English label search', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));

      const searchInput = screen.getByLabelText('Search poets');
      await userEvent.type(searchInput, 'Darwish');

      // Mahmoud Darwish should match the English label
      await waitFor(() => {
        expect(document.body.textContent).toContain('محمود درويش');
      });

      // Al-Mutanabbi should not match
      expect(document.body.textContent).not.toContain('المتنبي');
    });

    it('filters poets by partial English label search', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));

      const searchInput = screen.getByLabelText('Search poets');
      await userEvent.type(searchInput, 'Al-');

      // Al-Mutanabbi and Al-Ma'arri should both match
      await waitFor(() => {
        expect(document.body.textContent).toContain('المتنبي');
        expect(document.body.textContent).toContain('أبو العلاء المعري');
      });
    });

    it('search input is accessible when discover drawer opens', async () => {
      render(<DiwanApp />);
      await userEvent.click(screen.getByLabelText('Open discover'));

      // Drawer should open and search input should be accessible
      await waitFor(() => {
        expect(screen.getByLabelText('Search poets')).toBeInTheDocument();
      });
    });

    it('fetches dynamic poets from API when picker opens', async () => {
      const mockPoets = [
        { name: 'أحمد شوقي', name_en: 'Ahmed Shawqi', poem_count: '5000' },
        { name: 'إيليا أبو ماضي', name_en: 'Elia Abu Madi', poem_count: '2000' },
      ];
      const originalImpl = global.fetch.getMockImplementation();
      global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/poets')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockPoets,
          });
        }
        return Promise.resolve({ ...defaultFetchResponse });
      });

      try {
        render(<DiwanApp />);
        await userEvent.click(screen.getByLabelText('Open discover'));

        // Should show dynamic poets in the list
        await waitFor(
          () => {
            expect(screen.getByText('أحمد شوقي')).toBeInTheDocument();
          },
          { timeout: 3000 }
        );
      } finally {
        // Restore original mock so subsequent tests aren't affected
        if (originalImpl) {
          global.fetch.mockImplementation(originalImpl);
        } else {
          global.fetch.mockReset();
        }
      }
    });

    it('shows clear filter button when a poet is selected', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // Open poet picker and select a poet
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(screen.getByText('المتنبي')).toBeInTheDocument());

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 300,
          poet: 'Al-Mutanabbi',
          poetArabic: 'المتنبي',
          title: 'Test',
          arabic: 'على قدر أهل العزم',
          tags: [],
        }),
      });
      await userEvent.click(screen.getByText('المتنبي'));

      // Re-open picker to check for clear filter
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => {
        expect(screen.getByText('Clear filter')).toBeInTheDocument();
      });
    });

    it('re-selecting the same poet fetches and shows a new poem', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // ── First selection: Mahmoud Darwish ────────────────────────────────
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('محمود درويش'));

      const darwishPoem1 = {
        id: 201,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'On This Earth',
        titleArabic: 'على هذه الأرض',
        arabic: 'على هذه الأرض ما يستحق الحياة',
        cachedTranslation: 'On this earth is what makes life worth living',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      // Use URL-based mock instead of mockResolvedValueOnce so that background
      // Gemini/prefetch calls (audio prefetch timer, health ping, etc.) cannot
      // accidentally consume the poem response before handleFetch does.
      global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/poems/random')) {
          global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }));
          return Promise.resolve({ ok: true, json: async () => darwishPoem1 });
        }
        return Promise.resolve({ ...defaultFetchResponse });
      });
      await userEvent.click(screen.getByText('محمود درويش'));

      await waitFor(() => expect(document.body.textContent).toContain('On This Earth'), {
        timeout: 8000,
      });

      // ── Re-select the same poet: should fetch a new poem ─────────────────
      await userEvent.click(screen.getByLabelText('Open discover'));
      // Wait for the picker to actually be open. After the Darwish poem loaded, the poem
      // card already contains 'محمود درويش', so checking textContent would pass immediately
      // before the picker re-renders. Instead, wait for the picker-specific 'Clear filter'
      // button which only appears inside the picker when a poet filter is active.
      await waitFor(() => expect(screen.getByText('Clear filter')).toBeInTheDocument());

      const darwishPoem2 = {
        id: 202,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Identity Card',
        titleArabic: 'بطاقة هوية',
        arabic: 'سجّل أنا عربي',
        cachedTranslation: 'Record: I am an Arab',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      // Same URL-based approach: route the poem fetch to darwishPoem2, revert
      // to default after the first /api/poems/random response so that any
      // background prefetch timers get the neutral default instead of this mock.
      global.fetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/poems/random')) {
          global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }));
          return Promise.resolve({ ok: true, json: async () => darwishPoem2 });
        }
        return Promise.resolve({ ...defaultFetchResponse });
      });
      // Re-click the same poet — should trigger a new fetch.
      // When the picker is open after a Darwish selection, both the poem card and the
      // picker dropdown show "محمود درويش". Target the picker button using data-testid.
      const pickerDarwishBtn = screen
        .getAllByTestId('poet-picker-button')
        .find((btn) => btn.textContent.includes('محمود درويش'));
      await userEvent.click(pickerDarwishBtn);

      await waitFor(() => expect(document.body.textContent).toContain('Identity Card'), {
        timeout: 8000,
      });
    });

    it('selecting "All" after a poet and then a different poet fetches the new poet poem', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // Select Darwish
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('محمود درويش'));
      const darwishPoem = {
        id: 201,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'On This Earth',
        titleArabic: 'على هذه الأرض',
        arabic: 'على هذه الأرض ما يستحق الحياة',
        cachedTranslation: 'On this earth is what makes life worth living',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => darwishPoem });
      await userEvent.click(screen.getByText('محمود درويش'));
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      // Switch to "All"
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('كل الشعراء'));
      await userEvent.click(screen.getByText('كل الشعراء'));

      // Switch to Mutanabbi — should fetch a new poem (no Mutanabbi poems cached)
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('المتنبي'));
      const mutanabbiPoem = {
        id: 301,
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'To the King',
        titleArabic: 'إلى الملك',
        arabic: 'على قدر أهل العزم تأتي العزائم',
        cachedTranslation: 'Great deeds come to those with great resolve',
        tags: ['Classical', 'Heroic', 'Qasida'],
      };
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mutanabbiPoem });
      await userEvent.click(screen.getByText('المتنبي'));

      await waitFor(() => expect(document.body.textContent).toContain('Al-Mutanabbi'), {
        timeout: 3000,
      });
      expect(document.body.textContent).toContain('To the King');
    });

    it('picker closes after poet selection and can be reopened', async () => {
      render(<DiwanApp />);

      // Open picker
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('كل الشعراء'));

      // Select a poet — closes the picker
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 201,
          poet: 'Mahmoud Darwish',
          poetArabic: 'محمود درويش',
          title: 'On This Earth',
          arabic: 'على هذه الأرض ما يستحق الحياة',
          cachedTranslation: 'On this earth is what makes life worth living',
          tags: ['Modern', 'Political', 'Free Verse'],
        }),
      });
      await userEvent.click(screen.getByText('محمود درويش'));

      // Picker should close (no longer visible after animation completes)
      await waitFor(() => {
        // The dropdown should not be visible — the button "Filter by poet" still exists but not the dropdown
        expect(document.body.textContent).not.toContain('كل الشعراء');
      });

      // User can reopen the picker
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('كل الشعراء'));
    });

    it('currently selected poet is visually indicated in the picker', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      await waitFor(() => expect(document.body.textContent).toContain('Nizar Qabbani'), {
        timeout: 3000,
      });

      // Select Darwish
      await userEvent.click(screen.getByLabelText('Open discover'));
      const darwishPoem = {
        id: 201,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'On This Earth',
        arabic: 'على هذه الأرض ما يستحق الحياة',
        cachedTranslation: 'On this earth is what makes life worth living',
        tags: ['Modern', 'Political', 'Free Verse'],
      };
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => darwishPoem });
      await userEvent.click(screen.getByText('محمود درويش'));
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      // Reopen picker — the Darwish entry should be highlighted (selected styling)
      await userEvent.click(screen.getByLabelText('Open discover'));
      await waitFor(() => expect(document.body.textContent).toContain('محمود درويش'));

      // The selected picker button should have the active styling class
      const darwishPickerBtn = screen
        .getAllByTestId('poet-picker-button')
        .find((btn) => btn.textContent.includes('محمود درويش'));
      expect(darwishPickerBtn).toBeDefined();
      expect(darwishPickerBtn.className).toContain('bg-gold/12');
    });
  });

  // ── Feature 8: Arabic RTL & fonts ─────────────────────────────────────

  describe('Arabic RTL & Fonts', () => {
    it('renders Arabic verses with dir="rtl"', () => {
      render(<DiwanApp />);
      const rtlElements = document.querySelectorAll('p[dir="rtl"]');
      expect(rtlElements.length).toBeGreaterThan(0);
    });

    it('applies font-amiri class by default', () => {
      render(<DiwanApp />);
      // The currentFontClass is applied to the verse container
      const amiriElements = document.querySelectorAll('.font-amiri');
      expect(amiriElements.length).toBeGreaterThan(0);
    });

    it('changes font class when cycling via sidebar settings', async () => {
      render(<DiwanApp />);

      // Verify initial font is Amiri
      expect(document.querySelectorAll('.font-amiri').length).toBeGreaterThan(0);

      // Open sidebar settings sub-menu
      const settingsBtn = screen.getByTitle('Settings');
      await userEvent.click(settingsBtn);

      // Click the font cycle button in sidebar
      const fontBtn = screen.getByTitle('Font: Amiri');
      await userEvent.click(fontBtn);

      // Font should change from Amiri to the next one (Alexandria)
      await waitFor(() => {
        const alexandriaElements = document.querySelectorAll('.font-alexandria');
        expect(alexandriaElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ── AI Mode Tests ─────────────────────────────────────────────────────
  // Note: AI/DB toggle was removed (DB mode is now the permanent default).
  // Tests that switched to AI mode via the UI toggle have been removed.

  describe('AI Mode', () => {
    it('logs error when AI Insights fails with an HTTP error', async () => {
      mockAutoLoadFetch();
      render(<DiwanApp />);

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('Nizar Qabbani');
      });

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(102) });
      await userEvent.click(screen.getByLabelText('Open discover'));
      await userEvent.click(screen.getByLabelText('Discover new poem'));
      await waitFor(() => expect(document.body.textContent).toContain('Mahmoud Darwish'), {
        timeout: 3000,
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'API key not valid' } }),
      });

      await userEvent.click(screen.getByLabelText('Explain poem meaning'));

      await waitFor(
        () => {
          expect(document.body.textContent).toContain('API key not valid');
        },
        { timeout: 3000 }
      );
    });
  });

  // ── Debug Panel ───────────────────────────────────────────────────────

  describe('Debug Panel', () => {
    it('renders debug log toggle button when debug feature flag is enabled', () => {
      render(<DiwanApp />);
      const btn = document.querySelector('[aria-label="Toggle developer log panel"]');
      expect(btn).toBeTruthy();
    });
  });

  // ── Account Submenu (Signed Out) ─────────────────────────────────────

  describe('Account Submenu - Signed Out', () => {
    it('shows Sign In button (not Account avatar) when user is not signed in', () => {
      render(<DiwanApp />);
      // The sidebar should show "Sign In" label, not "Account"
      expect(document.body.textContent).toContain('Sign In');
      expect(document.body.textContent).not.toContain('Account');
    });
  });

  // ── Ratchet Mode Easter Egg (Fire) ────────────────────────────────────

  describe('Ratchet Mode Easter Egg', () => {
    it('fire button is accessible inside the settings menu after opening sidebar and settings', async () => {
      render(<DiwanApp />);

      // Open sidebar
      await userEvent.click(screen.getByLabelText('Open sidebar controls'));

      // Open settings sub-panel
      await userEvent.click(screen.getByTitle('Settings'));

      // Now the fire button should be present and interactive in the settings panel
      const fireBtn = screen.getByLabelText('Enable Ratchet Mode');
      expect(fireBtn).toBeInTheDocument();
      // It should be a button that can be pressed
      expect(fireBtn.getAttribute('aria-pressed')).toBe('false');
    });

    it('clicking the fire button in settings enables ratchet mode and shows glow overlay', async () => {
      render(<DiwanApp />);

      // Glow overlay should NOT be present initially
      expect(screen.queryByTestId('ratchet-glow')).toBeNull();

      // Open sidebar → settings
      await userEvent.click(screen.getByLabelText('Open sidebar controls'));
      await userEvent.click(screen.getByTitle('Settings'));

      // Enable ratchet mode
      await userEvent.click(screen.getByLabelText('Enable Ratchet Mode'));

      // Glow overlay should now appear
      expect(screen.getByTestId('ratchet-glow')).toBeInTheDocument();

      // Button label should reflect active state
      expect(screen.getByLabelText('Disable Ratchet Mode')).toBeInTheDocument();
    });

    it('clicking the fire button again disables ratchet mode and removes glow overlay', async () => {
      render(<DiwanApp />);

      // Open sidebar → settings → enable ratchet
      await userEvent.click(screen.getByLabelText('Open sidebar controls'));
      await userEvent.click(screen.getByTitle('Settings'));
      await userEvent.click(screen.getByLabelText('Enable Ratchet Mode'));
      expect(screen.getByTestId('ratchet-glow')).toBeInTheDocument();

      // Disable ratchet mode
      await userEvent.click(screen.getByLabelText('Disable Ratchet Mode'));

      // Glow should be gone
      expect(screen.queryByTestId('ratchet-glow')).toBeNull();
    });

    it('survives multiple enable/disable cycles without breaking', async () => {
      render(<DiwanApp />);

      await userEvent.click(screen.getByLabelText('Open sidebar controls'));
      await userEvent.click(screen.getByTitle('Settings'));

      for (let i = 0; i < 3; i++) {
        // Enable
        await userEvent.click(screen.getByLabelText('Enable Ratchet Mode'));
        expect(screen.getByTestId('ratchet-glow')).toBeInTheDocument();
        // Disable
        await userEvent.click(screen.getByLabelText('Disable Ratchet Mode'));
        expect(screen.queryByTestId('ratchet-glow')).toBeNull();
      }
    });

    it('glow overlay is still present after discovering a new poem', async () => {
      render(<DiwanApp />);

      // Enable ratchet mode
      await userEvent.click(screen.getByLabelText('Open sidebar controls'));
      await userEvent.click(screen.getByTitle('Settings'));
      await userEvent.click(screen.getByLabelText('Enable Ratchet Mode'));
      expect(screen.getByTestId('ratchet-glow')).toBeInTheDocument();

      // Open the discover drawer, then discover a new poem
      await userEvent.click(screen.getByLabelText('Open discover'));
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(200) });
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      await waitFor(() => {
        expect(document.body.textContent).toContain('Mahmoud Darwish');
      });

      // Glow should persist after poem change
      expect(screen.getByTestId('ratchet-glow')).toBeInTheDocument();
    });

    it('app still functions normally (discover new poem) while ratchet mode is active', async () => {
      render(<DiwanApp />);

      // Enable ratchet mode via settings
      await userEvent.click(screen.getByLabelText('Open sidebar controls'));
      await userEvent.click(screen.getByTitle('Settings'));
      await userEvent.click(screen.getByLabelText('Enable Ratchet Mode'));

      // App should still display poem content
      const rtlElements = document.querySelectorAll('p[dir="rtl"]');
      expect(rtlElements.length).toBeGreaterThan(0);

      // Should still be able to discover a new poem — open drawer first
      await userEvent.click(screen.getByLabelText('Open discover'));
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(201) });
      await userEvent.click(screen.getByLabelText('Discover new poem'));

      await waitFor(() => {
        expect(document.body.textContent).toContain('Mahmoud Darwish');
      });
    });
  });
});
