import { resolve } from 'node:path'
import { defineConfig, normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// The renderer for android/: the same pages, with window.qqpet provided by
// src/android/bridge.ts instead of the Electron preload. resources/ is packed
// into the APK as assets by Gradle, not copied here.
export default defineConfig({
  root: 'src/renderer',
  base: './',
  publicDir: false,
  build: {
    outDir: resolve('out/android'),
    emptyOutDir: true,
    rollupOptions: { input: { index: resolve('src/renderer/index.html'), game: resolve('src/renderer/game.html'), swf: resolve('src/renderer/swf.html') } },
  },
  plugins: [
    {
      name: 'android-bridge',
      transformIndexHtml: {
        order: 'pre',
        handler: (html, ctx) =>
          ctx.filename.endsWith('index.html') ? html.replace('<script type="module" src="./main.ts">', '<script type="module" src="../android/bridge.ts"></script>\n    $&') : html,
      },
    },
    viteStaticCopy({
      targets: [{ src: normalizePath(resolve('node_modules/@ruffle-rs/ruffle')) + '/*', dest: 'ruffle', rename: { stripBase: true } }],
    }),
  ],
})
