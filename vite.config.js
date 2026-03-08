import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: false, // We use our own manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/design-review/],
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
          }
        ]
      }
    }),
    // Sentry source map upload — only runs during production build when auth token is present
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || 'siraj-aq',
      project: process.env.SENTRY_PROJECT || 'node',
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
