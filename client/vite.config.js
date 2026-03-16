import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 5173,
    proxy: {
      // Only used in local dev — in production VITE_API_URL env var is used
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
