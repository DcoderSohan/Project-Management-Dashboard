import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Vite automatically handles client-side routing in dev mode
  },
  // Preview server configuration for testing production builds
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1000kb
  },
})
