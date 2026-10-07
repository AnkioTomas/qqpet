// Extracts the original art/SWF assets from Arctic Penguin's app.asar into
// resources/pet. Usage: npm run import-assets -- [path/to/app.asar]
import { extractFile, listPackage, statFile } from '@electron/asar'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

const PREFIX = `${sep}dist${sep}pet${sep}`
const SKIP = new Set(['smallGame.zip'])

const archive = resolve(process.argv[2] ?? '../resources/app.asar')
const outRoot = resolve('resources/pet')

let count = 0
for (const entry of listPackage(archive, { isPack: false })) {
  if (!entry.startsWith(PREFIX)) continue
  const rel = entry.slice(PREFIX.length)
  if (SKIP.has(rel) || 'files' in statFile(archive, entry.slice(1))) continue
  const out = join(outRoot, rel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, extractFile(archive, entry.slice(1)))
  count++
}
console.log(`extracted ${count} files from ${archive} to ${outRoot}`)
