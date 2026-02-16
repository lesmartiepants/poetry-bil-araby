import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Prevent Vite from scanning static design artifact HTML files.
    entries: ['index.html'],
  },
})
