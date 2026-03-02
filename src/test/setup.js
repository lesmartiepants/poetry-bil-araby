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
// Properly calls onsuccess via microtask so Promise-based cache operations resolve
const makeMockIDBRequest = (result = null) => {
  const req = { result, error: null }
  Object.defineProperty(req, 'onsuccess', {
    set(handler) { queueMicrotask(() => handler?.()) },
    get() { return null },
  })
  Object.defineProperty(req, 'onerror', {
    set() {},
    get() { return null },
  })
  return req
}

global.indexedDB = {
  open: vi.fn(() => {
    const db = {
      objectStoreNames: { contains: vi.fn(() => true) },
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => makeMockIDBRequest(null)),    // always cache miss
          put: vi.fn(() => makeMockIDBRequest(undefined)),
          delete: vi.fn(() => makeMockIDBRequest(undefined)),
        })),
      })),
      close: vi.fn(),
    }
    const openReq = makeMockIDBRequest(db)
    Object.defineProperty(openReq, 'onupgradeneeded', {
      set() {},
      get() { return null },
    })
    return openReq
  }),
  deleteDatabase: vi.fn(),
}
