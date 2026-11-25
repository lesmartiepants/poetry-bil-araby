import type { SignInAction } from './overlays';

const key = 'pba.sign-in-intent';
const maxAge = 15 * 60 * 1000;

interface SignInIntent {
  returnTo: string;
  startedAt: number;
  then?: SignInAction;
}

export function authReturnUrl() {
  return window.location.origin;
}

export function rememberSignIn(then?: SignInAction) {
  const { pathname, search, hash } = window.location;
  const intent: SignInIntent = { returnTo: pathname + search + hash, startedAt: Date.now(), then };
  sessionStorage.setItem(key, JSON.stringify(intent));
}

export function forgetSignIn() {
  try { sessionStorage.removeItem(key); } catch { /* blocked storage */ }
}

export function readSignIn(): SignInIntent | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const intent = JSON.parse(raw) as SignInIntent;
    if (typeof intent.returnTo !== 'string' || !Number.isFinite(intent.startedAt) ||
        Date.now() - intent.startedAt > maxAge) return null;
    const url = new URL(intent.returnTo, window.location.origin);
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    if (url.origin !== window.location.origin ||
        (url.pathname !== base && !url.pathname.startsWith(base + '/'))) return null;
    const action = intent.then;
    if (action && !(
      (action.type === 'keep' && typeof action.poemId === 'string' && /^\d+$/.test(action.poemId)) ||
      (action.type === 'follow' && typeof action.poetSlug === 'string' && action.poetSlug.length > 0)
    )) return null;
    return intent;
  } catch {
    return null;
  }
}

// Earlier /new builds kept their own session. Move it to Supabase’s shared
// project key once, without replacing a session the main app already holds.
export function moveSavedSessionToSharedKey(supabaseUrl: string) {
  try {
    const previous = localStorage.getItem('pba-auth');
    if (!previous) return;
    const project = new URL(supabaseUrl).hostname.split('.')[0];
    const shared = `sb-${project}-auth-token`;
    if (!localStorage.getItem(shared)) localStorage.setItem(shared, previous);
    localStorage.removeItem('pba-auth');
  } catch {
    // Storage may be unavailable in some browser contexts.
  }
}
