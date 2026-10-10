import { util } from '@kit.ArkTS'
import { common } from '@kit.AbilityKit'
import { display } from '@kit.ArkUI'
import { webview } from '@kit.ArkWeb'
import { hilog } from '@kit.PerformanceAnalysisKit'

export const ORIGIN = 'http://local.qqpet'
const VIEWPORT = 480

const TYPES: Record<string, string> = {
  'html': 'text/html',
  'js': 'text/javascript',
  'css': 'text/css',
  'json': 'application/json',
  'xml': 'text/xml',
  'txt': 'text/plain',
  'wasm': 'application/wasm',
  'swf': 'application/x-shockwave-flash',
  'png': 'image/png',
  'gif': 'image/gif',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'bmp': 'image/bmp',
  'svg': 'image/svg+xml',
  'mp3': 'audio/mpeg',
  'ttf': 'font/ttf',
}

class Asset {
  mime: string = 'text/plain'
  html: string = ''
  body: ArrayBuffer = new ArrayBuffer(0)
  code: number = 200
}

function u32(b: Uint8Array, i: number): number {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
}

function extOf(path: string): string {
  const i = path.lastIndexOf('.')
  return i < 0 ? '' : path.substring(i + 1).toLowerCase()
}

function textOf(bytes: Uint8Array): string {
  return new util.TextDecoder('utf-8').decodeToString(bytes)
}

function bufOf(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer
  }
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

function encode(s: string): ArrayBuffer {
  return bufOf(new util.TextEncoder().encodeInto(s))
}

function fileOf(mime: string, body: ArrayBuffer, html: string, code: number): Asset {
  const f = new Asset()
  f.mime = mime
  f.body = body
  f.html = html
  f.code = code
  return f
}

function hidpiSvg(ctx: common.UIAbilityContext, path: string): Asset | null {
  const hi = path.replace(/\.(png|gif|bmp|jpg|jpeg)$/i, '@2x.png')
  if (hi === path) {
    return null
  }
  try {
    const png = ctx.resourceManager.getRawFileContentSync(hi)
    const w = u32(png, 16) / 2
    const h = u32(png, 20) / 2
    const b64 = new util.Base64Helper().encodeToStringSync(png)
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
        `<image href="data:image/png;base64,${b64}" width="${w}" height="${h}" preserveAspectRatio="none"/></svg>`
    return fileOf('image/svg+xml', encode(svg), svg, 200)
  } catch (_e) {
    return null
  }
}

function dropCors(html: string): string {
  let out = html
  while (out.indexOf(' crossorigin') >= 0) {
    out = out.replace(' crossorigin', '')
  }
  return out
}

function indexHtml(ctx: common.UIAbilityContext): Asset {
  const html = dropCors(textOf(ctx.resourceManager.getRawFileContentSync('index.html')))
  const d = display.getDefaultDisplaySync()
  const shortVp = Math.min(d.width, d.height) / d.densityPixels
  const scale = shortVp / VIEWPORT
  const meta =
    `<meta name="viewport" content="width=device-width, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=${scale}, user-scalable=no">` +
    `<script>console.log('boot', typeof QQPetNative)</script>`
  const out = html.replace('<head>', `<head>${meta}`)
  return fileOf('text/html', encode(out), out, 200)
}

const listings = new Map<string, string[]>()

function listOf(ctx: common.UIAbilityContext, dir: string): string[] {
  let names = listings.get(dir)
  if (!names) {
    try {
      names = ctx.resourceManager.getRawFileListSync(dir)
    } catch (_e) {
      // A file, or a missing folder.
      names = []
    }
    listings.set(dir, names)
  }
  return names
}

/**
 * PetSoc is a Windows dump: its SWFs ask for `data/moduleconfig.xml` while the rawfile is
 * `Data/moduleconfig.xml`. Maps a path under pet/petsoc/ to the rawfile's casing, like src/main/nocase.ts.
 */
function petsocPath(ctx: common.UIAbilityContext, path: string): string {
  if (!path.startsWith('pet/petsoc/')) {
    return path
  }
  let dir = ''
  for (const part of path.split('/')) {
    const names = listOf(ctx, dir)
    const want = part.toLowerCase()
    const hit = names.includes(part) ? part : names.find((n: string) => n.toLowerCase() === want)
    if (!hit) {
      return path
    }
    dir = dir.length > 0 ? `${dir}/${hit}` : hit
  }
  return dir
}

function load(ctx: common.UIAbilityContext, url: string, accept: string, hd: boolean): Asset | null {
  if (!url.startsWith(ORIGIN)) {
    return null
  }
  const raw = decodeURIComponent(url.substring(ORIGIN.length).split('?')[0])
  const path = petsocPath(ctx, raw.split('/').filter((s: string) => s.length > 0).join('/'))
  if (path === 'index.html' || path.length === 0) {
    hilog.info(0x4e50, 'qqpet', 'asset index.html')
    return indexHtml(ctx)
  }
  if (hd && path.startsWith('pet/') && accept.indexOf('image/svg+xml') >= 0) {
    const svg = hidpiSvg(ctx, path)
    if (svg) {
      hilog.info(0x4e50, 'qqpet', 'asset %{public}s svg', path)
      return svg
    }
  }
  try {
    const bytes = ctx.resourceManager.getRawFileContentSync(path)
    const mime = TYPES[extOf(path)] ?? 'application/octet-stream'
    hilog.info(0x4e50, 'qqpet', 'asset %{public}s %{public}d', path, bytes.byteLength)
    if (mime === 'text/html') {
      const html = dropCors(textOf(bytes))
      return fileOf(mime, encode(html), html, 200)
    }
    return fileOf(mime, bufOf(bytes), '', 200)
  } catch (_e) {
    hilog.error(0x4e50, 'qqpet', 'asset miss %{public}s', path)
    return fileOf('text/plain', new ArrayBuffer(0), '', 404)
  }
}

interface RespHeader {
  headerKey: string
  headerValue: string
}

export function serve(ctx: common.UIAbilityContext, url: string, accept: string, hd: boolean): WebResourceResponse | null {
  const f = load(ctx, url, accept, hd)
  if (!f) {
    return null
  }
  const r = new WebResourceResponse()
  const text = f.mime.startsWith('text/') || f.mime === 'application/json' || f.mime === 'image/svg+xml'
  r.setResponseMimeType(f.mime)
  if (text) {
    r.setResponseEncoding('utf-8')
  }
  const headers: RespHeader[] = [
    { headerKey: 'Access-Control-Allow-Origin', headerValue: '*' },
    { headerKey: 'Access-Control-Allow-Methods', headerValue: 'GET' },
    { headerKey: 'Connection', headerValue: 'keep-alive' },
    { headerKey: 'Content-Type', headerValue: text ? `${f.mime}; charset=utf-8` : f.mime }
  ]
  r.setResponseHeader(headers)
  r.setResponseData(f.html.length > 0 ? f.html : f.body)
  r.setResponseCode(f.code)
  r.setReasonMessage(f.code === 200 ? 'OK' : 'Not Found')
  r.setResponseIsReady(true)
  return r
}

function reply(rh: webview.WebResourceHandler, f: Asset): void {
  const resp = new webview.WebSchemeHandlerResponse()
  const text = f.mime.startsWith('text/') || f.mime === 'application/json' || f.mime === 'image/svg+xml'
  resp.setStatus(f.code)
  resp.setStatusText(f.code === 200 ? 'OK' : 'Not Found')
  resp.setMimeType(f.mime)
  if (text) {
    resp.setEncoding('utf-8')
  }
  resp.setHeaderByName('Access-Control-Allow-Origin', '*', true)
  resp.setHeaderByName('Access-Control-Allow-Methods', 'GET', true)
  resp.setHeaderByName('Content-Type', text ? `${f.mime}; charset=utf-8` : f.mime, true)
  rh.didReceiveResponse(resp)
  rh.didReceiveResponseBody(f.body)
  rh.didFinish()
}

function acceptOf(request: webview.WebSchemeHandlerRequest): string {
  const headers = request.getHeader()
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].headerKey.toLowerCase() === 'accept') {
      return headers[i].headerValue
    }
  }
  return ''
}

export function attach(controller: webview.WebviewController, ctx: common.UIAbilityContext, hd: boolean): void {
  const handler = new webview.WebSchemeHandler()
  handler.onRequestStart((request: webview.WebSchemeHandlerRequest, rh: webview.WebResourceHandler): boolean => {
    const f = load(ctx, request.getRequestUrl(), acceptOf(request), hd)
    if (!f) {
      return false
    }
    reply(rh, f)
    return true
  })
  controller.setWebSchemeHandler('http', handler)
  try {
    webview.WebviewController.setServiceWorkerWebSchemeHandler('http', handler)
  } catch (_e) {
    // Service-worker scheme hook is optional; page requests still go through the controller handler.
  }
}
