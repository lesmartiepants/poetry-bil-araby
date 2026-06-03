import './sentry.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import DiwanApp from './app.jsx';
import './index.css';

const SentryErrorBoundary = Sentry.ErrorBoundary;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#0c0c0e',
            color: '#e7e5e4',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--gold)' }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              marginBottom: '2rem',
              maxWidth: '500px',
              lineHeight: 1.6,
            }}
          >
            The app encountered an unexpected error. Please refresh to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#4f46e5')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#6366f1')}
          >
            Refresh Page
          </button>
        </div>
      )}
      showDialog
    >
      <DiwanApp />
      <Analytics />
      <Toaster
        position="top-center"
        theme="dark"
        gap={8}
        toastOptions={{
          duration: 2500,
          className: 'poetry-toast',
          style: {
            background: 'rgba(12,12,14,0.88)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid rgba(197,160,89,0.25)',
            borderRadius: '1rem',
            color: '#e7e5e4',
            fontFamily: "'Forum', serif",
            boxShadow: '0 0 40px rgba(197,160,89,0.08), 0 8px 32px rgba(0,0,0,0.6)',
            padding: '0.75rem 1rem',
          },
        }}
      />
    </SentryErrorBoundary>
  </React.StrictMode>
);

// ── New-release auto-refresh ────────────────────────────────────────────────
// Every build bakes a unique __BUILD_ID__ and ships a matching /version.json.
// We poll that file; when its id differs from the one baked into this running
// bundle, a newer release is live, so we reload to pick it up. This is the
// general mechanism that keeps every open phone/device current after a deploy —
// it does not depend on the service worker firing (iOS Safari is unreliable
// there). The SW path below stays as a second layer.
/* global __BUILD_ID__ */
const CURRENT_BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

async function checkForNewRelease() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { buildId } = await res.json();
    if (!buildId || buildId === CURRENT_BUILD) return;
    // Guard against reload loops if the new bundle somehow still reports the old id.
    if (sessionStorage.getItem('reloaded-for-build') === buildId) return;
    sessionStorage.setItem('reloaded-for-build', buildId);
    window.location.reload();
  } catch {
    /* offline or version.json missing (e.g. dev) — ignore */
  }
}

// Check on an interval, and immediately whenever the app is brought to the
// foreground (the common case for an installed PWA reopened after a deploy).
setInterval(checkForNewRelease, 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForNewRelease();
});
checkForNewRelease();

// Second layer: nudge the service worker to update, and reload when a new one
// takes control so the precached assets are fresh too.
if ('serviceWorker' in navigator) {
  setInterval(() => {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(r => r.update()));
  }, 60 * 1000);

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
