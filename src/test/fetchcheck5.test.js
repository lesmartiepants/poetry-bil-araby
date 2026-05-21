import { vi, test, beforeEach } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, signInWithGoogle: vi.fn(), signInWithApple: vi.fn(), signOut: vi.fn() }),
  useUserSettings: () => ({ settings: { theme: 'dark', font_id: 'Amiri' }, saveSettings: vi.fn(), loading: false }),
  useSavedPoems: () => ({ savedPoems: [], savePoem: vi.fn(), unsavePoem: vi.fn(), isPoemSaved: vi.fn(() => false), loading: false, reload: vi.fn() }),
  useDownvotes: () => ({ downvotedPoemIds: [], downvotePoem: vi.fn(), undownvotePoem: vi.fn(), isPoemDownvoted: vi.fn(() => false) }),
  usePoemEvents: () => ({ emitEvent: vi.fn() }),
}));

console.log('top-level before import:', vi.isMockFunction(global.fetch));
const { default: DiwanApp } = await import('../app.jsx');
console.log('top-level after import:', vi.isMockFunction(global.fetch));

beforeEach(() => {
  vi.clearAllMocks();
  console.log('beforeEach after clearAllMocks:', vi.isMockFunction(global.fetch));
});

test('test 1', () => {
  console.log('test 1:', vi.isMockFunction(global.fetch));
});
