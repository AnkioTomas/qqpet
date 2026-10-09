import { app, net, protocol } from 'electron'
import { join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { hidpiSvg } from './hidpi'

// The renderer and every SWF are served from app://bundle/. Ruffle loads SWFs,
// XML configs and wasm through fetch(), which file:// does not support.
export const APP_ORIGIN = 'app://bundle'

const rendererRoot = join(import.meta.dirname, '../renderer')
// resources/{pet,icons} live next to the app in production (extraResources).
export const resourcesRoot = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')

export function registerScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ])
}

export function handleScheme(): void {
  protocol.handle('app', (req) => {
    const path = decodeURIComponent(new URL(req.url).pathname).replace(/\/pet\/petsoc\/data(?=\/)/i, '/pet/petsoc/Data')
    const root = path.startsWith('/pet/') ? resourcesRoot : rendererRoot
    const file = normalize(join(root, path))
    if (!file.startsWith(root + sep)) return new Response(null, { status: 403 })
    // X-HD: the hd setting is on. Only <img>/CSS image loads accept SVG; Ruffle's fetch() must get the original bytes.
    const svg = req.headers.has('x-hd') && req.headers.get('accept')?.includes('image/svg+xml') && hidpiSvg(file)
    if (svg) return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } })
    return net.fetch(pathToFileURL(file).toString())
  })
}
