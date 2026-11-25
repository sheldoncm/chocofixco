import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// FF04: FRONTEND AND BACKEND INTEGRATION
//
// Vite runs the React frontend on port 5173.
// Express runs the backend on port 3001.
//
// The development proxy forwards API, image and CSS requests
// to Express, avoiding cross-origin issues during development.
//
// Existing images and stylesheets remain in the backend.

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,

    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
      '/images': 'http://127.0.0.1:3001',
      '/css': 'http://127.0.0.1:3001',
    },
  },
})
