import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // same-origin API so SameSite=Strict cookies work
  server: {
    proxy: {
      '/api': {
        target: 'https://avalanche-task.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/movies': {
        target: 'https://avalanche-task.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/theatres': {
        target: 'https://avalanche-task.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/screens': {
        target: 'https://avalanche-task.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
