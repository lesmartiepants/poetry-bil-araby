import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock seed-poems module so tests use a predictable seed poem
vi.mock('../data/seed-poems.json', () => ({
  default: [
    {
      id: 999,
      poet: 'Nizar Qabbani',
      poetArabic: 'نزار قباني',
      title: 'My Beloved',
      titleArabic: 'حبيبتي',
      arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة',
      english: 'Your love, O woman of deep eyes,\nIs radicalism... is Sufism... is worship.',
      tags: ['Modern', 'Romantic', 'Ghazal'],
      cachedTranslation:
        'Your love, O woman of deep eyes,\nIs radicalism... is Sufism... is worship.',
      isSeedPoem: true,
    },
  ],
}));

// Default fetch implementation — used on init and after each reset
const defaultFetchImpl = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map(),
    statusText: 'OK',
  });

// Cleanup after each test — reset mocks so nothing leaks between files
afterEach(() => {
  cleanup();
  // Reset URL so deep-link detection doesn't fire in subsequent tests
  if (typeof window !== 'undefined' && window.history) {
    window.history.replaceState({}, '', '/');
  }
  // Reset fetch to a fresh default mock so per-test mockResolvedValueOnce chains don't leak
  if (global.fetch?.mockReset) global.fetch.mockReset();
  if (global.fetch?.mockImplementation) global.fetch.mockImplementation(defaultFetchImpl);
  // Reset clipboard mocks
  navigator.clipboard.writeText.mockReset();
  navigator.clipboard.writeText.mockResolvedValue(undefined);
  navigator.clipboard.readText.mockReset();
  navigator.clipboard.readText.mockResolvedValue('');
  // Clear storage between tests (guarded for non-DOM environments like server tests)
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function')
    localStorage.clear();
  if (typeof sessionStorage !== 'undefined' && typeof sessionStorage.clear === 'function')
    sessionStorage.clear();
});

// Mock HTMLCanvasElement.getContext so canvas-based components (MysticalConsultationEffect,
// ShareCardModal/shareCardDesigns) don't crash in jsdom.
// jsdom does not implement canvas 2D rendering; without this mock any canvas method call
// throws and leaves pending React work that corrupts subsequent tests.
const mockCanvas2DContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  measureText: vi.fn(() => ({ width: 100 })),
  get fillStyle() {
    return '';
  },
  set fillStyle(_) {},
  get strokeStyle() {
    return '';
  },
  set strokeStyle(_) {},
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
  direction: '',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
  letterSpacing: '',
};
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvas2DContext);

// Mock Web Audio API
global.Audio = class MockAudio {
  constructor() {
    this.play = vi.fn().mockResolvedValue(undefined);
    this.pause = vi.fn();
    this.addEventListener = vi.fn();
    this.removeEventListener = vi.fn();
    this.load = vi.fn();
    this.src = '';
    this.muted = false;
  }
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock atob for base64 decoding
global.atob = vi.fn((str) => {
  try {
    return Buffer.from(str, 'base64').toString('binary');
  } catch {
    return '';
  }
});

// Mock fetch for API calls (initial)
global.fetch = vi.fn(defaultFetchImpl);

// Re-establish fetch mock before each test in case module-level imports (e.g. Sentry)
// replaced global.fetch with a non-mock wrapper during test file loading.
beforeEach(() => {
  if (!vi.isMockFunction(global.fetch)) {
    global.fetch = vi.fn(defaultFetchImpl);
  }
});

// Mock navigator.clipboard for copy tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
});

// Mock document.execCommand for copy functionality
document.execCommand = vi.fn(() => true);

// Mock IndexedDB for caching functionality
// Properly calls onsuccess via microtask so Promise-based cache operations resolve
const makeMockIDBRequest = (result = null) => {
  const req = { result, error: null };
  Object.defineProperty(req, 'onsuccess', {
    set(handler) {
      queueMicrotask(() => handler?.());
    },
    get() {
      return null;
    },
  });
  Object.defineProperty(req, 'onerror', {
    set() {},
    get() {
      return null;
    },
  });
  return req;
};

global.indexedDB = {
  open: vi.fn(() => {
    const db = {
      objectStoreNames: { contains: vi.fn(() => true) },
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => makeMockIDBRequest(null)), // always cache miss
          put: vi.fn(() => makeMockIDBRequest(undefined)),
          delete: vi.fn(() => makeMockIDBRequest(undefined)),
        })),
      })),
      close: vi.fn(),
    };
    const openReq = makeMockIDBRequest(db);
    Object.defineProperty(openReq, 'onupgradeneeded', {
      set() {},
      get() {
        return null;
      },
    });
    return openReq;
  }),
  deleteDatabase: vi.fn(),
};
