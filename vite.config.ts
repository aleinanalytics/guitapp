import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Carga VITE_* desde .claude/.env (misma carpeta que usa Claude Code)
  envDir: '.claude',
})
