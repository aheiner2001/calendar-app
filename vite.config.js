import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: https://aheiner2001.github.io/calendar-app/
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    open: true,
  },
})
