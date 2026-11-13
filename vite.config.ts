/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Application 100 % frontend : aucun proxy, aucun appel à un serveur.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    // .test.ts : logique métier (node) ; .test.tsx : interface (jsdom, déclaré dans le fichier).
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
})
