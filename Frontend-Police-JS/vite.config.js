import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow GOOGLE_* vars (alongside default VITE_*) to reach import.meta.env
  envPrefix: ['VITE_', 'GOOGLE_'],
})
