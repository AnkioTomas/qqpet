import { app } from 'electron'
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SaveData, SavePatch, Sex } from '../shared/save'
import { applyPatch, buried, petOf, startSave } from '../shared/save-logic'

const FILE = join(app.getPath('userData'), 'save.json')
// Arctic Penguin T800 kept the same data under `petInfoData` in electron-store.
const LEGACY_FILE = join(app.getPath('appData'), 'Arctic Penguin', 'config.json')

const readJson = (file: string): Record<string, any> => JSON.parse(readFileSync(file, 'utf8'))

function read(): Record<string, any> | null {
  if (existsSync(FILE)) {
    try {
      return readJson(FILE)
    } catch (e) {
      // Keep the broken file for manual recovery instead of silently losing the pet.
      const backup = `${FILE}.corrupt-${Date.now()}`
      renameSync(FILE, backup)
      console.error(`save file is corrupt, moved to ${backup}:`, e)
      return null
    }
  }
  if (existsSync(LEGACY_FILE)) {
    console.log(`migrating save from ${LEGACY_FILE}`)
    return petOf(readJson(LEGACY_FILE))
  }
  return null
}

function write(data: SaveData): void {
  const tmp = `${FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(data))
  renameSync(tmp, FILE)
}

let save: SaveData

export function loadSave(): SaveData {
  save = startSave(read())
  write(save)
  return save
}

export function getSave(): SaveData {
  return save
}

export function patchSave(patch: SavePatch): void {
  applyPatch(save, patch)
  write(save)
}

export function exportSave(file: string): void {
  writeFileSync(file, JSON.stringify(save, null, 2))
}

/**
 * Replaces the save with the pet in `file`, keeping the current one as save.json.bak;
 * the next launch repairs it. Throws when the file holds no pet.
 */
export function importSave(file: string): void {
  const pet = petOf(readJson(file))
  if (pet.havePet !== true) throw new Error('no pet in this file')
  copyFileSync(FILE, `${FILE}.bak`)
  writeFileSync(FILE, JSON.stringify(pet))
}

/** Buries the pet: the next launch starts with egg selection, or with a newborn of `sex`. */
export function resetSave(sex?: Sex): void {
  save = buried(save, sex)
  write(save)
}
