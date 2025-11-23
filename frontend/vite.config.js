import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Explicitly set base path to root to prevent resource loading errors on nested routes
  base: '/',
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
    chunkSizeWarningLimit: 2000, // Increase chunk size warning limit to suppress warnings
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts', 'dhtmlx-gantt'],
        },
      },
    },
  },
})
