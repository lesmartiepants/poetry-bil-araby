import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: true,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],

    // Performance: sample 20% of transactions in production
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Connect frontend traces to backend
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/.*\.onrender\.com/,
    ],

    // Session Replay: 10% baseline, 100% on errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export default Sentry;
