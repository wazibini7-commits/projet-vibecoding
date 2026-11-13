/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Les appels à /api sont redirigés vers le serveur Vanlife (backend/, port 3100) :
// le navigateur ne voit qu'une seule adresse, ce qui marche aussi depuis un smartphone (npm run dev -- --host).
const proxyApi = { '/api': { target: 'http://127.0.0.1:3100', changeOrigin: false } }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: proxyApi },
  preview: { proxy: proxyApi },
  test: {
    // .test.ts : logique métier (node) ; .test.tsx : interface (jsdom, déclaré dans le fichier).
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 15_000, // parcours complets dans jsdom : marge si la machine est chargée
  },
})
