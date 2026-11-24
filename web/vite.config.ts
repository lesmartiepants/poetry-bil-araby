import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The new app is served at /new on the main deploy until cut-over.
export default defineConfig({
  base: '/new/',
  plugins: [react()],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./core', import.meta.url)),
      '@ds': fileURLToPath(new URL('./src/design-system', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
  server: {
    port: 5180,
    proxy: { '/api': process.env.VITE_API_URL || 'http://localhost:3001' },
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
