import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const raw = resolve('harmony/entry/src/main/resources/rawfile')
const web = resolve('out/harmony')
const pet = resolve('resources/pet')
if (!existsSync(web)) throw new Error('out/harmony missing; run npm run build:harmony-web')
if (!existsSync(pet)) throw new Error('resources/pet missing; git lfs pull')

rmSync(raw, { recursive: true, force: true })
mkdirSync(raw, { recursive: true })
cpSync(web, raw, { recursive: true })
cpSync(pet, resolve(raw, 'pet'), { recursive: true })
