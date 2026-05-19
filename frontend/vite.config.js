import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000', 10),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
