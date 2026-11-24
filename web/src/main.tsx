import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setStore } from '@core/storage';
import { SOURCES, setShowMocks, setSourceOverride, type Domain } from '@core/sources';
import { setApiBase } from '@core/api/live';
import { App } from './app/App';
import { installDevLog } from './features/shell/devlog';
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
installDevLog();
setApiBase(import.meta.env.VITE_API_URL ?? '');
// VITE_SOURCES=mock forces every domain onto mocks (journey tests on mock data).
if (import.meta.env.VITE_SOURCES === 'mock') {
  setSourceOverride(Object.fromEntries(Object.keys(SOURCES).map((d) => [d, 'mock'])) as Record<Domain, 'mock'>);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
