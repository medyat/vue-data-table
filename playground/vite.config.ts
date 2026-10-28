import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { mockApi } from './server/mock-api.ts'

const src = (rel: string) => fileURLToPath(new URL(`../src/${rel}`, import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue(), mockApi()],
  resolve: {
    // Paket kaynaktan: uygulama nasıl import ediyorsa playground da öyle.
    alias: [
      { find: '@medyat/vue-data-table/sheet', replacement: src('sheet.ts') },
      { find: '@medyat/vue-data-table', replacement: src('index.ts') },
    ],
  },
  server: { port: 5174 },
})
