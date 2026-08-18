import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'supabase',
              priority: 20,
              test: /node_modules[\\/].*@supabase[\\/]/,
            },
            {
              name: 'vendor',
              priority: 10,
              test: /node_modules[\\/]/,
            },
          ],
        },
      },
    },
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
      },
    },
  },
  test: {
    environment: 'jsdom',
    env: {
      VITE_API_URL: '/api/v1',
      VITE_APP_ENV: 'test',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-not-used-for-network-calls',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
    },
    setupFiles: ['./src/test/setup.ts'],
  },
})
