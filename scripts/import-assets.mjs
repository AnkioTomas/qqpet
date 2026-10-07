// Extracts the original art/SWF assets from Arctic Penguin's app.asar into
// resources/pet. Usage: npm run import-assets -- [path/to/app.asar]
import { extractFile, listPackage, statFile } from '@electron/asar'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { crc32, deflateSync } from 'node:zlib'

const PREFIX = `${sep}dist${sep}pet${sep}`
const SKIP = new Set(['smallGame.zip'])
// Electron reads .ico only on Windows; tray icons get a PNG twin for macOS/Linux.
const TRAY_ICON = /^img_res[\\/]Tray[\\/].*\.ico$/

/** Decodes the deepest bitmap of an .ico file to RGBA. */
function decodeIco(buf) {
  const entries = Array.from({ length: buf.readUInt16LE(4) }, (_, i) => ({
    bpp: buf.readUInt16LE(6 + 16 * i + 6),
    offset: buf.readUInt32LE(6 + 16 * i + 12),
  }))
  const { offset } = entries.sort((a, b) => b.bpp - a.bpp)[0]
  if (buf.readUInt32BE(offset) === 0x89504e47) return { png: buf.subarray(offset) }

  const headerSize = buf.readUInt32LE(offset)
  const w = buf.readInt32LE(offset + 4)
  const h = buf.readInt32LE(offset + 8) / 2 // XOR bitmap + AND mask
  const bpp = buf.readUInt16LE(offset + 14)
  const colors = buf.readUInt32LE(offset + 32) || (bpp <= 8 ? 1 << bpp : 0)
  const palette = offset + headerSize
  const pixels = palette + colors * 4
  const rowBytes = (((w * bpp + 31) >> 5) << 2)
  const mask = pixels + rowBytes * h
  const maskRow = (((w + 31) >> 5) << 2)

  const rgba = Buffer.alloc(w * h * 4)
  let anyAlpha = false
  for (let y = 0; y < h; y++) {
    const row = h - 1 - y // DIBs are stored bottom-up
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      let p
      if (bpp === 32 || bpp === 24) p = pixels + row * rowBytes + x * (bpp / 8)
      else {
        const bits = buf[pixels + row * rowBytes + ((x * bpp) >> 3)]
        const index = bpp === 8 ? bits : bpp === 4 ? (x & 1 ? bits & 15 : bits >> 4) : (bits >> (7 - (x & 7))) & 1
        p = palette + index * 4
      }
      rgba[o] = buf[p + 2]
      rgba[o + 1] = buf[p + 1]
      rgba[o + 2] = buf[p]
      rgba[o + 3] = bpp === 32 ? buf[p + 3] : 255
      if (bpp === 32 && buf[p + 3]) anyAlpha = true
      const transparent = (buf[mask + row * maskRow + (x >> 3)] >> (7 - (x & 7))) & 1
      if (bpp !== 32 && transparent) rgba[o + 3] = 0
    }
  }
  // 32bpp icons without an alpha channel rely on the AND mask instead.
  if (bpp === 32 && !anyAlpha) {
    for (let i = 0; i < w * h; i++) {
      const x = i % w
      const row = h - 1 - Math.floor(i / w)
      rgba[i * 4 + 3] = (buf[mask + row * maskRow + (x >> 3)] >> (7 - (x & 7))) & 1 ? 0 : 255
    }
  }
  return { w, h, rgba }
}

function encodePng(w, h, rgba) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc32(body), body.length + 4)
    return out
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr.set([8, 6, 0, 0, 0], 8) // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const archive = resolve(process.argv[2] ?? '../resources/app.asar')
const outRoot = resolve('resources/pet')

let files = 0
let icons = 0
for (const entry of listPackage(archive, { isPack: false })) {
  if (!entry.startsWith(PREFIX)) continue
  const rel = entry.slice(PREFIX.length)
  if (SKIP.has(rel) || 'files' in statFile(archive, entry.slice(1))) continue
  const out = join(outRoot, rel)
  const data = extractFile(archive, entry.slice(1))
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, data)
  files++
  if (TRAY_ICON.test(rel)) {
    const ico = decodeIco(data)
    writeFileSync(out.replace(/\.ico$/, '.png'), ico.png ?? encodePng(ico.w, ico.h, ico.rgba))
    icons++
  }
}
console.log(`extracted ${files} files (${icons} tray icons converted to PNG) from ${archive} to ${outRoot}`)
