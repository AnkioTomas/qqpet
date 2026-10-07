import { existsSync, readFileSync } from 'node:fs'

/**
 * Redrawn art ships as `name@2x.png` (PNG or APNG, exactly twice the size)
 * next to the original `name.png|gif|bmp|jpg`. A plain image file cannot
 * tell the browser its density, so image requests get an SVG with the 1x size
 * that embeds the 2x bitmap: layouts stay the same, HiDPI screens get the real
 * pixels. Undefined when the file has no @2x twin.
 */
export function hidpiSvg(file: string): string | undefined {
  const hi = file.replace(/\.(png|gif|bmp|jpg)$/i, '@2x.png')
  if (hi === file || !existsSync(hi)) return undefined
  const png = readFileSync(hi)
  const w = png.readUInt32BE(16) / 2
  const h = png.readUInt32BE(20) / 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    `<image href="data:image/png;base64,${png.toString('base64')}" width="${w}" height="${h}" preserveAspectRatio="none"/></svg>`
  )
}
