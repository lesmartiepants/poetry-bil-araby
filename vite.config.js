import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Unique per build. Prefer the deploy commit SHA (set by Vercel) so the id is
// stable for a given commit; fall back to the build timestamp locally. Every
// deploy changes this, which is what lets open devices detect a new release.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_BUILD_ID || String(Date.now())

// Emit dist/version.json at build time holding the same BUILD_ID baked into the
// bundle. The running app polls this file and reloads when the ids differ, so a
// new release refreshes every device that has the app open (see main.jsx).
const emitVersionJson = () => ({
  name: 'emit-version-json',
  apply: 'build',
  writeBundle() {
    writeFileSync(resolve('dist/version.json'), JSON.stringify({ buildId: BUILD_ID }))
  },
})

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    emitVersionJson(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: false, // We use our own manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-navigation-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/poems\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-poems-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/poets/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-poets-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    }),
    // Sentry source map upload — only runs during production build when auth token is present
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || 'siraj-aq',
      project: process.env.SENTRY_PROJECT || 'poetry-bil-araby',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  server: {
    watch: {
      ignored: ['**/poetry-*/**'],
    },
    fs: {
      deny: ['poetry-innovative-78ab', 'poetry-innovative-c0cf', 'poetry-splash-ci-fixes', 'poetry-database'],
    },
  },
})
