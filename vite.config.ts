import { resolve } from 'path'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'
import emscriptenStaticWorkerOptions from './vite-fixup-plugin.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['manifold-3d']
  },
  build: {
    target: 'esnext',
  }
})
