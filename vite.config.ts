import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const BRIDGE_FILES = ['shadcn-bridge.css', 'shadcn-bridge-hsl.css']
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

export default defineConfig({
  plugins: [
    vue(),
    {
      // Giriş noktaları import etmediği için köprü CSS'leri dist'e ayrıca kopyalanır (02 · shadcn-vue köprüsü).
      name: 'dt-copy-bridge-css',
      apply: 'build',
      generateBundle() {
        for (const f of BRIDGE_FILES) this.emitFile({ type: 'asset', fileName: f, source: read(`./src/styles/${f}`) })
      },
    },
  ],
  build: {
    lib: {
      entry: { index: 'src/index.ts', sheet: 'src/sheet.ts' },
      formats: ['es'],
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [/^vue$/, /^reka-ui/, /^@tanstack\//, /^@phosphor-icons\//],
    },
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})
