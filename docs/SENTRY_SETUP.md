# Sentry Error Tracking Setup

This guide walks through configuring Sentry for Poetry Bil-Araby. The integration is already wired into both the frontend and backend -- you just need to provide a DSN.

## Architecture

| Layer | File | What it does |
|-------|------|-------------|
| Frontend init | `src/sentry.js` | Calls `Sentry.init()` with browser tracing + session replay when `VITE_SENTRY_DSN` is set |
| React errors | `src/main.jsx` | Wraps app in `Sentry.ErrorBoundary` to catch render errors |
| Frontend capture | `src/app.jsx` | `Sentry.captureException()` in catch blocks for discovery, insights, audio, bug reports |
| Backend init | `server.js:1-15` | Calls `Sentry.init()` when `SENTRY_DSN` is set |
| Express handler | `server.js:~1483` | `Sentry.setupExpressErrorHandler(app)` catches unhandled route errors |
| Backend capture | `server.js` | `Sentry.captureException()` in all API route catch blocks |
| Source maps | `vite.config.js` | `@sentry/vite-plugin` uploads source maps during production builds |

## Step 1: Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up or log in
2. Click **Create Project**
3. Select platform: **React** (for frontend) or **Node.js Express** (for backend)
   - You can use a single project for both (we use `poetry-bil-araby`)
4. Copy the **DSN** from **Project Settings > Client Keys (DSN)**
   - It looks like: `https://abc123@o456.ingest.us.sentry.io/789`

## Step 2: Configure Environment Variables

### Vercel (frontend)

Add these in **Settings > Environment Variables**:

| Variable | Description |
|----------|-------------|
| `VITE_SENTRY_DSN` | Frontend DSN |
| `SENTRY_AUTH_TOKEN` | Auth token for source map uploads (generate at sentry.io > Settings > Auth Tokens) |
| `SENTRY_ORG` | `siraj-aq` |
| `SENTRY_PROJECT` | `poetry-bil-araby` |

**Auth token scopes required:** `project:releases`, `org:read`, `project:write`

### Render (backend)

Add in **Environment**:

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Backend DSN |

### GitHub Actions (CI/CD)

Add as repository secrets:

| Secret | Description |
|--------|-------------|
| `SENTRY_AUTH_TOKEN` | For source map upload during production builds |

The org and project are hardcoded in `.github/workflows/deploy.yml`.

### Local development

Add to your `.env` file:

```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx
SENTRY_ORG=siraj-aq
SENTRY_PROJECT=poetry-bil-araby
SENTRY_AUTH_TOKEN=sntrys_...  # Only needed for source map uploads during local builds
```

If you use the same Sentry project for both frontend and backend, the DSNs can be the same.

## Step 3: Verify It Works

### Frontend

1. Deploy with `VITE_SENTRY_DSN` configured
2. Open the browser console and run:
   ```js
   throw new Error('test sentry frontend');
   ```
3. Go to your Sentry dashboard > **Issues** -- the error should appear within a few seconds

### Backend

1. Deploy with `SENTRY_DSN` configured
2. Hit a non-existent endpoint:
   ```bash
   curl -X POST https://your-api.onrender.com/api/nonexistent
   ```
3. Check Sentry dashboard > **Issues** for the unhandled error

## Configuration Details

### Sample Rates

| Feature | Production | Development |
|---------|-----------|-------------|
| `tracesSampleRate` | 0.2 (20%) | 1.0 (100%) |
| `replaysSessionSampleRate` | 0.1 (10%) | 0.1 (10%) |
| `replaysOnErrorSampleRate` | 1.0 (100%) | 1.0 (100%) |

### Distributed Tracing

Frontend traces are propagated to the backend via the `sentry-trace` and `baggage` headers. The CORS config in `server.js` already allows these headers. Trace propagation targets:
- `localhost` (development)
- `*.onrender.com` (production backend)

### Session Replay

Session Replay is enabled on the frontend (`src/sentry.js`):
- 10% of normal sessions are recorded
- 100% of sessions with errors are recorded

This provides full DOM replay for debugging user-reported issues.

### Source Maps

Source maps are uploaded during production builds via `@sentry/vite-plugin` in `vite.config.js`. The plugin:
- Uploads maps to Sentry for readable stack traces
- Deletes `.map` files from the build output (`filesToDeleteAfterUpload`)
- Is disabled when `SENTRY_AUTH_TOKEN` is not set (local dev without token)

### Explicit Error Capture

Both frontend and backend use `Sentry.captureException(error)` in catch blocks to ensure errors that are handled (and would otherwise be swallowed) still get reported to Sentry. This covers:

**Backend (`server.js`):** All API route errors including health check, poems, poets, search, translation, events, AI proxy, design review, and bug reports.

**Frontend (`src/app.jsx`):** Discovery errors, analysis/insight errors, audio system errors, bug report submission errors, and daily poem loading errors.
