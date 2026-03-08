# Sentry Error Tracking Setup

This guide walks through configuring Sentry for Poetry Bil-Araby. The integration is already wired into both the frontend and backend -- you just need to provide a DSN.

## Step 1: Create a Sentry Project

1. Go to [sentry.io](https://sentry.io) and sign up or log in
2. Click **Create Project**
3. Select platform: **React** (for frontend) or **Node.js Express** (for backend)
   - You can use a single project for both, or separate projects for independent dashboards
4. Name it (e.g., `poetry-bil-araby`) and click **Create Project**
5. Copy the **DSN** from **Project Settings > Client Keys (DSN)**
   - It looks like: `https://abc123@o456.ingest.sentry.io/789`

## Step 2: Configure Environment Variables

### Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) > your project > **Settings** > **Environment Variables**
2. Add:
   - **Name**: `VITE_SENTRY_DSN`
   - **Value**: your frontend DSN
3. Redeploy for the change to take effect

### Render (backend)

1. Go to [render.com](https://render.com) > your service > **Environment**
2. Add:
   - **Key**: `SENTRY_DSN`
   - **Value**: your backend DSN

### Local development

Add both to your `.env` file:

```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

If you use the same Sentry project for both, these can be the same DSN.

## Step 3: Verify -- Nothing Else to Code

The integration is already in place:

| Layer | File | What it does |
|-------|------|-------------|
| Frontend init | `src/sentry.js` | Calls `Sentry.init()` when `VITE_SENTRY_DSN` is set |
| React errors | `src/ErrorBoundary.jsx` | Catches render errors and calls `Sentry.captureException()` |
| Backend init | `server.js:16-22` | Calls `Sentry.init()` when `SENTRY_DSN` is set |
| Express errors | `server.js:1076` | `Sentry.setupExpressErrorHandler(app)` captures unhandled route errors |

Both frontend and backend set `tracesSampleRate: 0` (performance monitoring disabled, planned for v1.2).

## Step 4: Verify It Works

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

## Step 5 (Optional): Source Maps

For readable stack traces in production, upload source maps during the Vite build:

1. Install the plugin:
   ```bash
   npm install @sentry/vite-plugin --save-dev
   ```

2. Add to `vite.config.js`:
   ```js
   import { sentryVitePlugin } from '@sentry/vite-plugin';

   export default defineConfig({
     build: { sourcemap: true },
     plugins: [
       // ... existing plugins
       sentryVitePlugin({
         org: 'your-sentry-org',
         project: 'your-sentry-project',
         authToken: process.env.SENTRY_AUTH_TOKEN,
       }),
     ],
   });
   ```

3. Add `SENTRY_AUTH_TOKEN` to your Vercel environment variables (generate at sentry.io > Settings > Auth Tokens)

This uploads source maps on every build so Sentry can show original file names and line numbers in error reports.
