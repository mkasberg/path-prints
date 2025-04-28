import { resolve } from 'path'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'
import emscriptenStaticWorkerOptions from './vite-fixup-plugin.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

console.log(emscriptenStaticWorkerOptions);

export default defineConfig({
  worker: {
    format: 'es',
    // plugins: () => [emscriptenStaticWorkerOptions() as Plugin]
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    exclude: ['manifold-3d']
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: {
        manifoldCAD: resolve(__dirname, 'index.html'),
        makeManifold: resolve(__dirname, 'make-manifold.html'),
        modelViewer: resolve(__dirname, 'model-viewer.html'),
        three: resolve(__dirname, 'three.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
  },
})
