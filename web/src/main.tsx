import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setStore } from '@core/storage';
import { SOURCES, configureSources, setShowMocks, setSourceOverride, type Domain } from '@core/sources';
import { setApiBase, setAppUrl, setPerUser } from '@core/api/live';
import { makeSupabaseApi } from '@core/api/supabase';
import { createClient } from '@supabase/supabase-js';
import { App } from './app/App';
import { authReturnUrl, moveSavedSessionToSharedKey } from './components/signInIntent';
import { restoreDevTab } from './features/shell/devPanelState';
import { DEV_PANEL_ENABLED, installDevLog } from './components/devlog';
import './design-system/base.css';
import './components/components.css';

// Browser storage behind core's storage interface.
setStore({
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
});
// Production hides mocked areas; dev and preview builds show them.
setShowMocks(import.meta.env.DEV || import.meta.env.VITE_SHOW_MOCKS === '1');
if (DEV_PANEL_ENABLED) {
  restoreDevTab();
  installDevLog();
}
setApiBase(import.meta.env.VITE_API_URL ?? '');
setAppUrl(location.origin + import.meta.env.BASE_URL);

// Per-user data goes live when Supabase is configured; otherwise those domains stay on mocks.
const sbUrl = import.meta.env.VITE_SUPABASE_URL;
const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (sbUrl && sbKey) moveSavedSessionToSharedKey(sbUrl);
export const supabase = sbUrl && sbKey ? createClient(sbUrl, sbKey, {
  auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
}) : null;
if (supabase) {
  setPerUser(makeSupabaseApi(supabase, { redirectTo: authReturnUrl }));
  configureSources({ profile: 'live', keeps: 'live', lists: 'live', library: 'live' });
}
// VITE_SOURCES=mock forces every domain onto mocks (journey tests on mock data).
if (import.meta.env.VITE_SOURCES === 'mock') {
  setSourceOverride(Object.fromEntries(Object.keys(SOURCES).map((d) => [d, 'mock'])) as Record<Domain, 'mock'>);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App supabase={supabase} /></StrictMode>);
