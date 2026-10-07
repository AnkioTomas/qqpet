import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: resolve('src/main/index.ts') } },
  },
  preload: {
    // Sandboxed preload scripts must be CommonJS.
    build: {
      rollupOptions: {
        input: resolve('src/preload/index.ts'),
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    // resources/ holds pet/ (235MB). Served as-is in dev, shipped via
    // extraResources in production, never copied into the renderer bundle.
    publicDir: resolve('resources'),
    build: {
      copyPublicDir: false,
      rollupOptions: { input: resolve('src/renderer/index.html') },
    },
    plugins: [
      viteStaticCopy({
        targets: [{ src: resolve('node_modules/@ruffle-rs/ruffle') + '/*', dest: 'ruffle', rename: { stripBase: true } }],
      }),
    ],
  },
})
