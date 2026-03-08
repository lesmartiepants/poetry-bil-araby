import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Only send errors, no performance monitoring (planned for v1.2)
    tracesSampleRate: 0,
  });
}

export default Sentry;
