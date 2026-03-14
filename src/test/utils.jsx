import { render } from '@testing-library/react';
import { vi } from 'vitest';

// Custom render function with common providers
export function renderWithProviders(ui, options = {}) {
  return render(ui, { ...options });
}

// Helper to create mock poem data
export function createMockPoem(overrides = {}) {
  return {
    id: 1,
    poet: 'Nizar Qabbani',
    poetArabic: 'نزار قباني',
    title: 'My Beloved',
    titleArabic: 'حبيبتي',
    arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة',
    english: 'Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.',
    tags: ['Modern', 'Romantic', 'Ghazal'],
    ...overrides,
  };
}

// Helper to create mock Gemini API response
export function createMockGeminiResponse(data = {}) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: data.text || JSON.stringify(createMockPoem()),
              inlineData: data.inlineData || undefined,
            },
          ],
        },
      },
    ],
  };
}

// Helper to wait for async operations
export function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options;
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, interval);
        }
      }
    };
    check();
  });
}

// Helper to mock successful API calls
export function mockSuccessfulFetch(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

// Helper to mock failed API calls
export function mockFailedFetch(error = 'Network error') {
  global.fetch.mockRejectedValueOnce(new Error(error));
}

// Helper to create a minimal DB poem (matches real backend response structure)
export function createDbPoem(id, overrides = {}) {
  return {
    id,
    poet: 'Mahmoud Darwish',
    poetArabic: 'محمود درويش',
    title: 'Identity Card',
    titleArabic: 'بطاقة هوية',
    arabic: 'سَجِّلْ أَنَا عَرَبِيّ',
    // Include a cached translation by default so tests don't trigger auto-analyze
    cachedTranslation: 'Record! I am an Arab.',
    ...overrides,
  };
}

// Helper to create a mock Gemini SSE streaming response for insights/generation
export function createStreamingMock(text) {
  const sseData = `data: ${JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  })}\n\n`;
  const encoded = new TextEncoder().encode(sseData);
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: encoded })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      }),
    },
    json: async () => ({}),
  };
}
