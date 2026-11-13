/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: true,
    // Los tests que montan tableros y cartas completas (SVG, catálogo de 139 cartas) pasan en 2-3 s solos, pero en la suite
    // completa, con la carga en paralelo, rebasaban los 5 s por defecto.
    testTimeout: 20_000,
  },
})
