import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The new app is served at /new on the main deploy until cut-over.
export default defineConfig({
  base: '/new/',
  plugins: [react()],
  // Pre-bundle up front: a mid-session dependency re-optimisation reloads the page (and breaks journeys).
  optimizeDeps: { include: ['react', 'react-dom', 'wouter', '@tanstack/react-query', 'zustand', '@supabase/supabase-js'] },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./core', import.meta.url)),
      '@ds': fileURLToPath(new URL('./src/design-system', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
  server: {
    port: 5180,
    // API_PROXY points the dev proxy elsewhere without changing the app's own API base.
    proxy: { '/api': process.env.API_PROXY || process.env.VITE_API_URL || 'http://localhost:3001' },
  },
  build: {
    outDir: '../dist/new',
    emptyOutDir: true,
    // The shareable preview build keeps stable file names so it can be republished in place.
    rollupOptions: process.env.VITE_HASH_ROUTER === '1'
      ? { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/app[extname]' } }
      : undefined,
  },
});
