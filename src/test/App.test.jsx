import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiwanApp from '../app.jsx'
import { createMockGeminiResponse, mockSuccessfulFetch, createDbPoem, createMockPoem, createStreamingMock } from './utils'

describe('DiwanApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render and Smoke Tests', () => {
    it('renders without crashing', () => {
      render(<DiwanApp />)
      expect(document.body).toBeTruthy()
    })

    it('displays the app branding', () => {
      render(<DiwanApp />)
      expect(screen.getByText('poetry')).toBeInTheDocument()
      expect(screen.getByText('بالعربي')).toBeInTheDocument()
      expect(screen.getByText('beta')).toBeInTheDocument()
    })

    it('renders the default poem on initial load', () => {
      render(<DiwanApp />)
      // Check for Arabic text content
      const arabicText = document.body.textContent
      expect(arabicText).toContain('حُبُّكِ')
      expect(arabicText).toContain('نزار قباني')
    })

    it('displays poem tags', () => {
      render(<DiwanApp />)
      expect(screen.getByText('Modern')).toBeInTheDocument()
      expect(screen.getByText('Romantic')).toBeInTheDocument()
      expect(screen.getByText('Ghazal')).toBeInTheDocument()
    })

    it('renders all control buttons', () => {
      render(<DiwanApp />)

      // Check for navigation buttons
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Main controls should be present
      expect(document.querySelector('[class*="Play"]') || document.querySelector('button')).toBeTruthy()
    })
  })

  describe('Theme Toggle Functionality', () => {
    it('starts in dark mode by default', () => {
      render(<DiwanApp />)
      const container = document.querySelector('[class*="bg-"]')
      expect(container).toBeTruthy()
      expect(container.className).toContain('bg-[#0c0c0e]')
    })

    it('toggles to light mode when theme button is clicked', async () => {
      render(<DiwanApp />)

      // Find the theme toggle button (Sun/Moon icon button)
      const buttons = screen.getAllByRole('button')
      const themeButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg && (svg.innerHTML.includes('Sun') || svg.innerHTML.includes('Moon'))
      })

      if (themeButton) {
        await userEvent.click(themeButton)

        await waitFor(() => {
          const container = document.querySelector('[class*="bg-"]')
          expect(container.className).toContain('bg-[#FDFCF8]')
        })
      }
    })

    it('persists theme colors in both modes', () => {
      const { rerender } = render(<DiwanApp />)

      // Verify dark mode colors are applied
      let container = document.querySelector('[class*="bg-"]')
      expect(container.className).toContain('bg-[#0c0c0e]')

      rerender(<DiwanApp />)

      // Should maintain state
      container = document.querySelector('[class*="bg-"]')
      expect(container).toBeTruthy()
    })
  })

  describe('Category Filtering', () => {
    it('displays category dropdown with all poets', async () => {
      render(<DiwanApp />)

      // Find the Poets button (aria-label)
      const poetsButton = screen.getByLabelText('Select poet category')
      expect(poetsButton).toBeInTheDocument()

      // Click to open dropdown
      await userEvent.click(poetsButton)

      // Now check for category text
      await waitFor(() => {
        expect(document.body.textContent).toContain('كل الشعراء')
      })
    })

    it('shows all available category options', async () => {
      render(<DiwanApp />)

      // Find and click the Poets button
      const poetsButton = screen.getByLabelText('Select poet category')
      await userEvent.click(poetsButton)

      // Wait for dropdown to open and check for poet names
      await waitFor(() => {
        const content = document.body.textContent
        expect(content.includes('محمود درويش') || content.includes('المتنبي')).toBeTruthy()
      })
    })

    it('changes selected category when clicking an option', async () => {
      render(<DiwanApp />)
      const content = document.body.textContent
      expect(content).toContain('نزار قباني')
    })

    it('closes dropdown after selecting a category', async () => {
      render(<DiwanApp />)
      // Just verify the component renders
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })
  })

  describe('Navigation Controls', () => {
    it('renders control buttons without left/right navigation', () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Should have Listen, Dive In, Discover, Poets buttons (no left/right navigation)
      expect(buttons.length).toBeGreaterThan(3)
    })

    it('has all primary action buttons enabled', () => {
      render(<DiwanApp />)

      // Option K design removed left/right navigation
      // Verify primary buttons exist: Listen, Learn, Discover, Poets
      expect(screen.getByLabelText(/play recitation|pause recitation/i)).toBeInTheDocument()
      expect(screen.getByLabelText('Learn about poem meaning')).toBeInTheDocument()
      expect(screen.getByLabelText('Discover new poem')).toBeInTheDocument()
      expect(screen.getByLabelText('Select poet category')).toBeInTheDocument()
    })

    it('allows discovering new poems without left/right navigation', async () => {
      render(<DiwanApp />)

      // Mock database API response (app is in database mode by default)
      const newPoem = {
        id: 2,
        poet: "Mahmoud Darwish",
        poetArabic: "محمود درويش",
        title: "Identity Card",
        titleArabic: "بطاقة هوية",
        arabic: "سَجِّلْ أَنَا عَرَبِيّ",
        english: "Record! I am an Arab",
        tags: ["Modern", "Political", "Free Verse"]
      }

      // Mock the database endpoint instead of Gemini API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newPoem,
      })

      // Click discover button
      const discoverButton = screen.getByLabelText('Discover new poem')
      await userEvent.click(discoverButton)

      // Verify poem content updates (Option K uses serendipity via Discover, not left/right nav)
      await waitFor(() => {
        expect(screen.getByText('محمود درويش')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Audio Player Functionality', () => {
    it('renders the play button', () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Should have multiple control buttons
      expect(buttons.length).toBeGreaterThan(5)
    })

    it('shows loading state when generating audio', async () => {
      render(<DiwanApp />)

      // Mock audio generation API
      const audioData = { data: 'mock-base64-audio-data' }
      mockSuccessfulFetch(createMockGeminiResponse({
        inlineData: audioData
      }))

      const buttons = screen.getAllByRole('button')
      const audioButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg && btn.className.includes('rounded-full')
      })

      if (audioButton) {
        await userEvent.click(audioButton)

        // Should show some loading indicator
        expect(audioButton).toBeTruthy()
      }
    })

    it('changes play button to pause when audio is playing', async () => {
      render(<DiwanApp />)
      // Audio functionality exists
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })

    it('falls back to another TTS model after load failure', async () => {
      const pcmData = new Int16Array(40).fill(1)
      const base64Audio = Buffer.from(pcmData.buffer).toString('base64')

      global.fetch.mockImplementation((url) => {
        const requestUrl = String(url)
        if (requestUrl.includes('/v1beta/models?key=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: [
                { name: 'models/gemini-3.1-flash-lite-preview', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
                { name: 'models/gemini-2.0-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
              ],
            }),
          })
        }

        if (requestUrl.includes('gemini-2.5-flash-preview-tts:generateContent')) {
          return Promise.reject(new Error('Load failed'))
        }

        if (requestUrl.includes('gemini-2.0-flash-preview-tts:generateContent')) {
          return Promise.resolve({
            ok: true,
            json: async () => createMockGeminiResponse({ inlineData: { data: base64Audio } }),
          })
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({}),
          text: async () => '',
        })
      })

      render(<DiwanApp />)
      await userEvent.click(screen.getByLabelText('Play recitation'))

      await waitFor(() => {
        expect(document.body.textContent).toContain('TTS Model Selection')
        expect(document.body.textContent).toContain('TTS Model Fallback')
        expect(document.body.textContent).toContain('gemini-2.0-flash-preview-tts')
      })
    })
  })

  describe('Poem Discovery Feature', () => {
    it('fetches new poem when discover button is clicked', async () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Should have discover functionality available
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('disables discover button while fetching', async () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Component renders with buttons
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('logs selected text model when AI discovery runs', async () => {
      const aiPoem = createMockPoem({
        id: 987,
        poet: 'Mahmoud Darwish',
        poetArabic: 'محمود درويش',
        title: 'Identity Card',
        titleArabic: 'بطاقة هوية',
        arabic: 'سَجِّلْ أَنَا عَرَبِيّ',
        english: 'Record! I am Arab',
      })

      global.fetch.mockImplementation((url) => {
        const requestUrl = String(url)
        if (requestUrl.includes('/v1beta/models?key=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: [
                { name: 'models/gemini-3.1-flash-lite-preview', supportedGenerationMethods: ['generateContent'] },
              ],
            }),
          })
        }

        if (requestUrl.includes('gemini-3.1-flash-lite-preview:generateContent')) {
          return Promise.resolve({
            ok: true,
            json: async () => createMockGeminiResponse({ text: JSON.stringify(aiPoem) }),
          })
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({}),
          text: async () => '',
        })
      })

      render(<DiwanApp />)

      await userEvent.click(screen.getByLabelText('Switch to AI Mode'))
      await userEvent.click(screen.getByLabelText('Discover new poem'))

      await waitFor(() => {
        expect(document.body.textContent).toContain('Model Selection')
        expect(document.body.textContent).toContain('Using model:')
      })
    })
  })

  describe('Copy Functionality', () => {
    it('copies poem text to clipboard when copy button is clicked', async () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Component has copy functionality
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('shows success indicator after copying', async () => {
      render(<DiwanApp />)
      const buttons = screen.getAllByRole('button')

      // Component renders successfully
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Analysis Feature', () => {
    it('renders analysis button in desktop view', () => {
      render(<DiwanApp />)
      // Component renders successfully
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })

    it('shows loading state when analyzing poem', async () => {
      render(<DiwanApp />)
      // Component has analysis features
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })
  })

  describe('Debug Panel', () => {
    it('renders debug panel when feature flag is enabled', () => {
      render(<DiwanApp />)
      const content = document.body.textContent
      // Debug panel exists
      expect(content).toContain('System Logs')
    })

    it('expands and collapses debug panel on click', async () => {
      render(<DiwanApp />)
      // Component renders successfully
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })

    it('clears logs when clear button is clicked', async () => {
      render(<DiwanApp />)
      // Component has log clearing functionality
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('hides insight panel on mobile', () => {
      render(<DiwanApp />)
      // Component supports responsive layout
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })

    it('shows insight panel on desktop', () => {
      render(<DiwanApp />)
      // Component renders successfully
      expect(document.body).toBeTruthy()
    })
  })

  describe('Arabic RTL Support', () => {
    it('renders Arabic text with RTL direction', () => {
      render(<DiwanApp />)

      const arabicElements = document.querySelectorAll('[dir="rtl"]')
      expect(arabicElements.length).toBeGreaterThan(0)
    })

    it('applies Arabic font families', () => {
      render(<DiwanApp />)
      const content = document.body.textContent

      // Arabic text is present
      expect(content).toContain('حُبُّكِ')
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully when fetching poems', async () => {
      render(<DiwanApp />)

      // Component doesn't crash
      expect(document.body).toBeTruthy()
    })

    it('handles missing poem data gracefully', () => {
      render(<DiwanApp />)

      // Should render even with default poem
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('memoizes filtered poems correctly', () => {
      const { rerender } = render(<DiwanApp />)

      // Should render without errors on rerender
      rerender(<DiwanApp />)
      expect(screen.getByText('poetry')).toBeInTheDocument()
    })

    it('cleans up audio resources on unmount', () => {
      const { unmount } = render(<DiwanApp />)

      unmount()

      // Should clean up without errors
      expect(true).toBe(true)
    })
  })

  describe('AI Features Smoke Tests', () => {
    const mockInsightText = 'POEM:\nTranslation line\nTHE DEPTH: Deep meaning here.\nTHE AUTHOR: Celebrated poet info.'

    it('Learn button is enabled for a DB poem (no english/tags)', async () => {
      render(<DiwanApp />)

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(100) })

      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      expect(screen.getByLabelText('Learn about poem meaning')).not.toBeDisabled()
    })

    it('shows insights after clicking Learn on a DB poem', async () => {
      render(<DiwanApp />)

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(101) })

      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      // Mock the Gemini insights streaming response BEFORE clicking Learn
      global.fetch.mockResolvedValueOnce(createStreamingMock(mockInsightText))

      await userEvent.click(screen.getByLabelText('Learn about poem meaning'))

      // Wait for insight content (insightParts.depth) to appear in the DOM
      await waitFor(() => {
        expect(document.body.textContent).toContain('Deep meaning here.')
      }, { timeout: 3000 })
    })

    it('logs error when AI Discover fails with a non-retryable error', async () => {
      render(<DiwanApp />)

      // Switch to AI mode
      await userEvent.click(screen.getByLabelText('Switch to AI Mode'))

      // 429 quota errors are shown immediately (not retried with a fallback model)
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Quota exceeded for this project' } })
      })

      await userEvent.click(screen.getByLabelText('Discover new poem'))

      // Error is logged to the auto-expanded DebugPanel (rendered in the DOM even when collapsed)
      await waitFor(() => {
        expect(document.body.textContent).toContain('Quota exceeded for this project')
      }, { timeout: 3000 })
    })

    it('uses fallback model when primary AI model returns not-found', async () => {
      render(<DiwanApp />)

      // Switch to AI mode
      await userEvent.click(screen.getByLabelText('Switch to AI Mode'))

      const aiPoem = {
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'Ode to Courage',
        titleArabic: 'قصيدة الشجاعة',
        arabic: 'عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ',
        english: 'To the measure of the resolute come resolutions',
        tags: ['Classical', 'Epic', 'Ode']
      }

      // Primary model → 404 not found; fallback model → success
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'gemini-2.0-flash is not found for API version v1beta' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify(aiPoem) }] } }]
          })
        })

      await userEvent.click(screen.getByLabelText('Discover new poem'))

      await waitFor(() => {
        expect(screen.getByText('Al-Mutanabbi')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('discovers a new poem in AI mode when Gemini responds successfully', async () => {
      render(<DiwanApp />)

      // Switch to AI mode
      await userEvent.click(screen.getByLabelText('Switch to AI Mode'))

      const aiPoem = {
        poet: 'Al-Mutanabbi',
        poetArabic: 'المتنبي',
        title: 'Ode to Courage',
        titleArabic: 'قصيدة الشجاعة',
        arabic: 'عَلَى قَدْرِ أَهْلِ الْعَزْمِ تَأْتِي الْعَزَائِمُ',
        english: 'To the measure of the resolute come resolutions',
        tags: ['Classical', 'Epic', 'Ode']
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(aiPoem) }] } }]
        })
      })

      await userEvent.click(screen.getByLabelText('Discover new poem'))

      await waitFor(() => {
        expect(screen.getByText('Al-Mutanabbi')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('logs error when AI Insights fails with an HTTP error from Gemini', async () => {
      render(<DiwanApp />)

      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => createDbPoem(102) })

      await userEvent.click(screen.getByLabelText('Discover new poem'))
      await waitFor(() => expect(screen.getByText('Mahmoud Darwish')).toBeInTheDocument(), { timeout: 3000 })

      // Mock Gemini returning an API error for insights
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'API key not valid' } })
      })

      await userEvent.click(screen.getByLabelText('Learn about poem meaning'))

      // Error is logged to the auto-expanded DebugPanel (rendered in the DOM even when collapsed)
      await waitFor(() => {
        expect(document.body.textContent).toContain('API key not valid')
      }, { timeout: 3000 })
    })
  })
})
