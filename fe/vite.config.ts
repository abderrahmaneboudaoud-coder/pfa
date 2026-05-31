import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker the api service is reachable via its service name.
// Locally it's on localhost. Override with API_TARGET env var.
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
