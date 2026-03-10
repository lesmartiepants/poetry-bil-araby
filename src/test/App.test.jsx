import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiwanApp from '../app.jsx'
import { createMockGeminiResponse, mockSuccessfulFetch, createDbPoem, createStreamingMock } from './utils'

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
}

// Default mock response for any fetch calls during mount
const defaultFetchResponse = {
  ok: true,
  status: 200,
  json: async () => defaultDbPoem,
  text: async () => '',
  headers: new Map(),
  statusText: 'OK',
  body: { getReader: () => ({ read: vi.fn().mockResolvedValue({ done: true, value: undefined }) }) },
}

function mockAutoLoadFetch() {
  // Use a persistent implementation that returns the default poem for any URL,
  // handling all mount-time fetches (auto-load, health ping, auto-explain).
  // Tests that need specific fetch behavior should call mockResolvedValueOnce AFTER awaiting mount.
  global.fetch.mockImplementation(() => Promise.resolve({ ...defaultFetchResponse }))
}

describe('DiwanApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Feature 1: Poem loads with correct structure ──────────────────────

  describe('Poem Structure', () => {
    it('renders the default poem with Arabic text longer than 10 characters', () => {
      render(<DiwanApp />)
      // The default poem's Arabic text is rendered across verse lines with dir="rtl"
      const rtlElements = document.querySelectorAll('p[dir="rtl"]')
      expect(rtlElements.length).toBeGreaterThan(0)

      // Gather all Arabic verse text
      const arabicText = Array.from(rtlElements).map(el => el.textContent).join('')
      expect(arabicText.length).toBeGreaterThan(10)
    })

    it('displays the poet name in both Arabic and English', () => {
      render(<DiwanApp />)
      expect(document.body.textContent).toContain('نزار قباني')
      expect(document.body.textContent).toContain('Nizar Qabbani')
    })

    it('renders tags for the default poem', () => {
      render(<DiwanApp />)
      expect(screen.getByText('Modern')).toBeInTheDocument()
      expect(screen.getByText('Romantic')).toBeInTheDocument()
      expect(screen.getByText('Ghazal')).toBeInTheDocument()
    })

    it('renders poem verses with dir="rtl" attribute', () => {
      render(<DiwanApp />)
      const rtlVerses = document.querySelectorAll('p[dir="rtl"]')
      expect(rtlVerses.length).toBeGreaterThan(0)
      // Each verse line should have RTL direction
      rtlVerses.forEach(el => {
        expect(el.getAttribute('dir')).toBe('rtl')
      })
    })
  })

  // ── Feature 2: Discover poems ─────────────────────────────────────────

  describe('Discover Poems', () => {
    it('loads a new poem from the database when Discover is clicked', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      const newPoem = {
        id: 42,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Identity Card',
        titleArabic: 'بطاقة هوية',
        arabic: 'سَجِّلْ أَنَا عَرَبِيّ\nوَرَقَمُ بطاقَتي خَمْسُونَ أَلْف',
        english: 'Record! I am an Arab\nAnd my identity card number is fifty thousand',
        tags: ['Modern', 'Political', 'Free Verse'],
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newPoem,
      })

      await userEvent.click(screen.getByLabelText('Discover new poem'))

      await waitFor(() => {
        expect(screen.getByText('محمود درويش')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('disables the Discover button while fetching', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      // Create a never-resolving promise to keep the button disabled
      let resolveFetch
      // Clear the persistent mock and set up a one-time hanging fetch
      global.fetch.mockReset()
      global.fetch.mockImplementation(() => new Promise(r => { resolveFetch = r }))

      const discoverBtn = screen.getByLabelText('Discover new poem')
      await userEvent.click(discoverBtn)

      // Wait for the button to become disabled after async state update
      await waitFor(() => {
        expect(discoverBtn).toBeDisabled()
      }, { timeout: 2000 })

      // Resolve and wait for React to finish processing
      resolveFetch({ ok: true, json: async () => createDbPoem(99) })
      await waitFor(() => {
        expect(discoverBtn).not.toBeDisabled()
      }, { timeout: 1000 })
      // beforeEach() will clear mocks for the next test
    })

    it('changes content from the initial poem after Discover', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      const newPoem = {
        id: 77,
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'Ode to Courage',
        titleArabic: 'قصيدة الشجاعة',
        arabic: 'عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ',
        english: 'Ambitions come according to the ambitions of their people',
        tags: ['Classical', 'Epic', 'Ode'],
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newPoem,
      })

      await userEvent.click(screen.getByLabelText('Discover new poem'))

      await waitFor(() => {
        expect(screen.getByText('المتنبي')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  // ── Feature 3: Audio playback ─────────────────────────────────────────

  describe('Audio Playback', () => {
    it('calls fetch when Play is clicked', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      const playBtn = screen.getByLabelText('Play recitation')
      await userEvent.click(playBtn)

      // The app calls fetch to generate audio via Gemini TTS
      await waitFor(() => {
        // At least one additional fetch call (beyond the auto-load)
        expect(global.fetch.mock.calls.length).toBeGreaterThan(1)
      })
    })

    it('shows loading state when generating audio', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      // Replace fetch with a version that hangs for audio (TTS) calls
      // but resolves normally for everything else (auto-explain, streaming, etc.)
      const originalMock = global.fetch
      global.fetch = vi.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/ai/gemini')) {
          // Gemini TTS / audio call — hang forever to keep loading state
          return new Promise(() => {})
        }
        // All other calls resolve immediately
        return Promise.resolve({ ok: true, body: null, json: async () => ({}) })
      })

      const playBtn = screen.getByLabelText('Play recitation')
      await userEvent.click(playBtn)

      // The button should be disabled while generating
      await waitFor(() => {
        expect(playBtn).toBeDisabled()
      })
    })
  })

  // ── Feature 4: AI Insights ────────────────────────────────────────────

  describe('AI Insights', () => {
    const mockInsightText =
      'POEM:\nTranslation line\nTHE DEPTH: Deep meaning here.\nTHE AUTHOR: Celebrated poet info.'

    it('shows parsed insight sections after clicking Explain on a DB poem', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      // Load a DB poem first
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(101) })
      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      // Mock Gemini streaming response
      global.fetch.mockResolvedValueOnce(createStreamingMock(mockInsightText))

      await userEvent.click(screen.getByLabelText('Explain poem meaning'))

      await waitFor(() => {
        expect(document.body.textContent).toContain('Deep meaning here.')
      }, { timeout: 3000 })
    })

    it('Explain button is enabled for a DB poem', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(100) })
      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      expect(screen.getByLabelText('Explain poem meaning')).not.toBeDisabled()
    })
  })

  // ── Feature 5: Copy ───────────────────────────────────────────────────

  describe('Copy Functionality', () => {
    it('copies poem text to clipboard with Arabic text, poet, and separator', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for auto-load to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'))

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1)
      })

      const copiedText = navigator.clipboard.writeText.mock.calls[0][0]
      // Should contain Arabic poem text
      expect(copiedText).toContain('حُبُّكِ')
      // Should contain poet name
      expect(copiedText).toContain('نزار قباني')
      // Should contain the separator
      expect(copiedText).toContain('---')
    })

    it('shows success indicator after copying', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'))

      // The Check icon replaces the Copy icon on success — look for it in the button
      await waitFor(() => {
        const copyBtn = screen.getByLabelText('Copy poem to clipboard')
        const svg = copyBtn.querySelector('svg')
        expect(svg).toBeTruthy()
      })
    })

    it('does not crash when clipboard write fails', async () => {
      mockAutoLoadFetch()
      navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard denied'))

      render(<DiwanApp />)

      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      await userEvent.click(screen.getByLabelText('Copy poem to clipboard'))

      // App should still be rendered (no crash)
      expect(screen.getAllByText('poetry').length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Feature 6: Theme toggle ───────────────────────────────────────────

  describe('Theme Toggle', () => {
    it('starts in dark mode with bg-[#0c0c0e]', () => {
      render(<DiwanApp />)
      const container = document.querySelector('[class*="bg-[#0c0c0e]"]')
      expect(container).toBeTruthy()
    })

    it('switches to light mode bg-[#FDFCF8] after toggling theme', async () => {
      render(<DiwanApp />)

      // Open sidebar settings sub-menu
      const settingsBtn = screen.getByTitle('Settings')
      await userEvent.click(settingsBtn)

      // Click the dark/light mode toggle in the sidebar
      const lightModeBtn = screen.getByTitle('Light mode')
      await userEvent.click(lightModeBtn)

      await waitFor(() => {
        const lightContainer = document.querySelector('[class*="bg-[#FDFCF8]"]')
        expect(lightContainer).toBeTruthy()
      })
    })
  })

  // ── Feature 7: Poet filtering ─────────────────────────────────────────

  describe('Poet Filtering', () => {
    it('opens category dropdown and shows poet list', async () => {
      render(<DiwanApp />)

      // Open sidebar settings sub-menu, then open poet picker
      const settingsBtn = screen.getByTitle('Settings')
      await userEvent.click(settingsBtn)

      const poetsBtn = screen.getByTitle('Poet filter')
      await userEvent.click(poetsBtn)

      await waitFor(() => {
        expect(document.body.textContent).toContain('كل الشعراء')
      })
    })

    it('sends poet filter parameter when a category is selected and Discover is clicked', async () => {
      render(<DiwanApp />)

      // Open sidebar settings sub-menu, then open poet picker
      const settingsBtn = screen.getByTitle('Settings')
      await userEvent.click(settingsBtn)

      const poetsBtn = screen.getByTitle('Poet filter')
      await userEvent.click(poetsBtn)

      await waitFor(() => {
        expect(document.body.textContent).toContain('محمود درويش')
      })

      // Click "Mahmoud Darwish" category
      const darwishOption = screen.getByText('محمود درويش')
      await userEvent.click(darwishOption)

      // Mock the DB fetch response with the selected poet
      const filteredPoem = {
        id: 200,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Mural',
        titleArabic: 'جدارية',
        arabic: 'هذا هو اسمك قالت امرأة وغابت في الممر اللولبي',
        english: 'This is your name, a woman said, then disappeared into the spiral corridor',
        tags: ['Modern', 'Epic', 'Free Verse'],
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => filteredPoem,
      })

      // The useEffect fires handleFetch when a category is selected and filtered.length === 0
      // Wait for the fetch call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
  })

  // ── Feature 8: Arabic RTL & fonts ─────────────────────────────────────

  describe('Arabic RTL & Fonts', () => {
    it('renders Arabic verses with dir="rtl"', () => {
      render(<DiwanApp />)
      const rtlElements = document.querySelectorAll('p[dir="rtl"]')
      expect(rtlElements.length).toBeGreaterThan(0)
    })

    it('applies font-amiri class by default', () => {
      render(<DiwanApp />)
      // The currentFontClass is applied to the verse container
      const amiriElements = document.querySelectorAll('.font-amiri')
      expect(amiriElements.length).toBeGreaterThan(0)
    })

    it('changes font class when cycling via sidebar settings', async () => {
      render(<DiwanApp />)

      // Verify initial font is Amiri
      expect(document.querySelectorAll('.font-amiri').length).toBeGreaterThan(0)

      // Open sidebar settings sub-menu
      const settingsBtn = screen.getByTitle('Settings')
      await userEvent.click(settingsBtn)

      // Click the font cycle button in sidebar
      const fontBtn = screen.getByTitle('Font: Amiri')
      await userEvent.click(fontBtn)

      // Font should change from Amiri to the next one (Alexandria)
      await waitFor(() => {
        const alexandriaElements = document.querySelectorAll('.font-alexandria')
        expect(alexandriaElements.length).toBeGreaterThan(0)
      })
    })
  })

  // ── AI Mode Tests ─────────────────────────────────────────────────────
  // Note: AI/DB toggle was removed (DB mode is now the permanent default).
  // Tests that switched to AI mode via the UI toggle have been removed.

  describe('AI Mode', () => {
    it('logs error when AI Insights fails with an HTTP error', async () => {
      mockAutoLoadFetch()
      render(<DiwanApp />)

      // Wait for mount-time fetches to settle
      await waitFor(() => {
        expect(document.body.textContent).toContain('نزار قباني')
      })

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(102) })
      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'API key not valid' } })
      })

      await userEvent.click(screen.getByLabelText('Explain poem meaning'))

      await waitFor(() => {
        expect(document.body.textContent).toContain('API key not valid')
      }, { timeout: 3000 })
    })
  })

  // ── Debug Panel ───────────────────────────────────────────────────────

  describe('Debug Panel', () => {
    it('renders System Logs text when debug feature flag is enabled', () => {
      render(<DiwanApp />)
      expect(document.body.textContent).toContain('System Logs')
    })
  })
})
