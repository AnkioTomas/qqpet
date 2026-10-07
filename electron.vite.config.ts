import { join, normalize, resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { hidpiSvg } from './src/main/hidpi'

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
      rollupOptions: { input: { index: resolve('src/renderer/index.html'), game: resolve('src/renderer/game.html') } },
    },
    plugins: [
      // Dev counterpart of the @2x handling in src/main/protocol.ts.
      {
        name: 'hidpi',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = decodeURIComponent((req.url ?? '').split('?')[0])
            const svg =
              req.headers['x-hd'] && req.headers.accept?.includes('image/svg+xml') && url.startsWith('/pet/') && hidpiSvg(join(resolve('resources'), normalize(url)))
            if (!svg) return next()
            res.setHeader('Content-Type', 'image/svg+xml')
            res.end(svg)
          })
        },
      },
      viteStaticCopy({
        targets: [{ src: resolve('node_modules/@ruffle-rs/ruffle') + '/*', dest: 'ruffle', rename: { stripBase: true } }],
      }),
    ],
  },
})
