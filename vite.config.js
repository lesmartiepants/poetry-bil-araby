import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/poetry-*/**'],
    },
    fs: {
      deny: ['poetry-innovative-78ab', 'poetry-innovative-c0cf', 'poetry-splash-ci-fixes', 'poetry-database'],
    },
  },
})
