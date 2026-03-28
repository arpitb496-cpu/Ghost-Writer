/**
 * vite.config.ts  (OPTIMIZED)
 *
 * - credentialless COEP (required by RunAnywhere — require-corp breaks WASM loading)
 * - copyWasmPlugin: copies WASM binaries to dist/assets/ for production builds
 * - Manual chunk splitting for better browser caching
 * - optimizeDeps.exclude keeps WASM packages out of Vite pre-bundling
 */

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))

function copyWasmPlugin(): Plugin {
  const llamacppWasm = path.resolve(__dir, 'node_modules/@runanywhere/web-llamacpp/wasm')

  return {
    name: 'copy-wasm',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dir, 'dist')
      const assetsDir = path.join(outDir, 'assets')
      fs.mkdirSync(assetsDir, { recursive: true })

      for (const file of [
        'racommons-llamacpp.wasm',
        'racommons-llamacpp.js',
        'racommons-llamacpp-webgpu.wasm',
        'racommons-llamacpp-webgpu.js',
      ]) {
        const src = path.join(llamacppWasm, file)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(assetsDir, file))
        }
      }
    },
  }
}

const COEP_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig({
  plugins: [react(), copyWasmPlugin()],

  server:  { 
    headers: COEP_HEADERS,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  preview: { headers: COEP_HEADERS },

  assetsInclude: ['**/*.wasm'],
  worker: { format: 'es' },

  optimizeDeps: {
    exclude: ['@runanywhere/web', '@runanywhere/web-llamacpp'],
  },

  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':       ['react', 'react-dom'],
          'vendor-runanywhere': ['@runanywhere/web', '@runanywhere/web-llamacpp'],
          'vendor-pdfjs':       ['pdfjs-dist'],
        },
      },
    },
  },
})
