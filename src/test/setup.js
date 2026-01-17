import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key')

// Mock Web Audio API
global.Audio = class MockAudio {
  constructor() {
    this.play = vi.fn().mockResolvedValue(undefined)
    this.pause = vi.fn()
    this.addEventListener = vi.fn()
    this.removeEventListener = vi.fn()
    this.load = vi.fn()
    this.src = ''
  }
}

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock atob for base64 decoding
global.atob = vi.fn((str) => {
  try {
    return Buffer.from(str, 'base64').toString('binary')
  } catch {
    return ''
  }
})

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
    statusText: 'OK',
  })
)

// Mock document.execCommand for copy functionality
document.execCommand = vi.fn(() => true)

// Mock IndexedDB for caching functionality
global.indexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          put: vi.fn(() => ({ onsuccess: null, onerror: null })),
          delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
      close: vi.fn(),
    },
  })),
  deleteDatabase: vi.fn(),
}
