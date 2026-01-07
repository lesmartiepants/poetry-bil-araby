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
global.fetch = vi.fn()

// Mock document.execCommand for copy functionality
document.execCommand = vi.fn(() => true)
