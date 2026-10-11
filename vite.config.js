import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // same-origin API so SameSite=Strict cookies work
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/movies': 'http://localhost:4000',
      '/theatres': 'http://localhost:4000',
      '/screens': 'http://localhost:4000',
    },
  },
})
