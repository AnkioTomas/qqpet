import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const listings = new Map<string, string[]>()

function list(dir: string): string[] {
  let names = listings.get(dir)
  if (!names) {
    // ENOTDIR/ENOENT: the request walks through a file or a missing folder.
    try {
      names = readdirSync(dir)
    } catch {
      names = []
    }
    listings.set(dir, names)
  }
  return names
}

/**
 * PetSoc is a Windows dump: its SWFs ask for `data/ui/effect/cursoreffect.png`
 * while the file is `Data/UI/Effect/cursorEffect.png`. Map a URL path under
 * /pet/petsoc/ to the on-disk casing; other paths, and misses, pass through.
 */
export function petsocPath(root: string, path: string): string {
  if (!path.startsWith('/pet/petsoc/')) return path
  let dir = root
  let out = ''
  for (const part of path.split('/').filter(Boolean)) {
    const names = list(dir)
    const want = part.toLowerCase()
    const hit = names.includes(part) ? part : names.find((n) => n.toLowerCase() === want)
    if (!hit) return path
    dir = join(dir, hit)
    out += '/' + hit
  }
  return out
}
