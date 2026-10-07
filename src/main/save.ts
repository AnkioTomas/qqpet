import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SaveData, SavePatch } from '../shared/save'

const FILE = join(app.getPath('userData'), 'save.json')
// Arctic Penguin T800 kept the same data under `petInfoData` in electron-store.
const LEGACY_FILE = join(app.getPath('appData'), 'Arctic Penguin', 'config.json')

const now = (): number => Math.floor(Date.now() / 1000)
const rand = (min: number, max: number) => (): number => Math.round(Math.random() * (max - min) + min)

type Rule = (v: unknown) => unknown
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v)
const num =
  (min: number, max: number, fallback: number | (() => number)): Rule =>
  (v) =>
    isNum(v) && v >= min && v <= max ? v : typeof fallback === 'function' ? fallback() : fallback
const bool: Rule = (v) => (typeof v === 'boolean' ? v : false)
const list: Rule = (v) => (Array.isArray(v) ? v : [])
const nullable: Rule = (v) => (v === undefined ? null : v)
const ANY = Infinity

// Field repairs ported from the original main process: an invalid value is
// replaced by the same fallback the original used.
const RULES: Record<string, Record<string, Rule>> = {
  petInfo: {
    name: (v) => v || '宠宝~',
    host: (v) => v || '主人~',
    sex: (v) => (v === 'GG' || v === 'MM' ? v : 'GG'),
    growth: num(-ANY, ANY, 0),
    hunger: num(0, ANY, 0),
    clean: num(0, ANY, 0),
    health: num(0, 5, 0),
    mood: num(0, 1000, 0),
    birthDay: num(1, ANY, now),
    intel: num(-ANY, ANY, rand(5, 50)),
    charm: num(-ANY, ANY, rand(5, 50)),
    strong: num(-ANY, ANY, rand(5, 50)),
    // The original defaulted this to the string "0".
    onLineTime: (v) => (isNum(v) ? v : Number(v) || 0),
    lastX: num(0, ANY, -1),
    lastY: num(0, ANY, -1),
    yb: (v) => (isNum(v) ? v | 0 : 5000),
    lastLoginTime: num(0, ANY, 0),
    onlineDataTime: num(0, ANY, 0),
    pinkDiamond: bool,
    PDgrowth: num(0, ANY, 0),
    PDgrowthValue: num(0, ANY, 0),
    PDgrowthValue_next: num(0, ANY, 0),
    PDiamondLevel: num(0, ANY, 0),
    PDiamondBeginDate: num(0, ANY, 0),
    PDiamondExpirationDate: num(0, ANY, 0),
    sweetHeart: bool,
    sweetHeartOverTime: num(0, ANY, 0),
  },
  petComputedlInfo: {
    level: num(1, ANY, 1),
    upGrowth: num(0, ANY, 0),
    nextGrowth: num(125, ANY, 125),
    hungerMax: num(1000, ANY, 1000),
    cleanMax: num(1000, ANY, 1000),
    healthMax: num(5, 5, 5),
    moodMax: num(1000, 1000, 1000),
  },
  studyInfo: Object.fromEntries(
    ['chinese', 'mathematics', 'politics', 'music', 'art', 'manner', 'pe', 'labouring', 'wushu'].map((k) => [k, num(0, ANY, 0)]),
  ),
  activeOption: { work: nullable, study: nullable, trip: nullable, ill: nullable, die: nullable },
  selfGoodDatas: {
    ...Object.fromEntries(['food', 'clean', 'medicine', 'background', 'nums', 'service', 'work', 'study', 'trip'].map((k) => [k, list])),
    // Toys whose id contains "__" were removed from the game; drop them in place.
    toy: (v) => {
      if (!Array.isArray(v)) return []
      for (let i = v.length - 1; i >= 0; i--) if (String(v[i]).includes('__')) v.splice(i, 1)
      return v
    },
  },
  selfGoodUseOption: { background: nullable, food: nullable, clean: nullable, toy: nullable },
  gameSaveDatas: {
    fishing_harvestfish: num(0, ANY, 0),
    travel_china: list,
    travel_china_num: num(0, ANY, 0),
    ddw: num(0, ANY, 0),
    yyds: num(0, ANY, 0),
  },
  settings: {
    opacity: num(0, 1, 1),
    faceClick: (v) => (v === 0 || v === 1 || v === 2 ? v : 2),
    quiet: bool,
    autoStart: bool,
    paused: bool,
    hidden: bool,
    hd: bool,
  },
}

function fresh(): SaveData {
  return {
    havePet: false,
    isBury: false,
    saveNum: 0,
    nowTimeLine: 0,
    petInfo: {
      name: '宠宝~',
      host: '主人~',
      sex: 'GG',
      growth: 0,
      hunger: 1100,
      clean: 1100,
      health: 5,
      mood: 1000,
      birthDay: now(),
      intel: rand(5, 50)(),
      charm: rand(5, 50)(),
      strong: rand(5, 50)(),
      onLineTime: 0,
      lastX: -1,
      lastY: -1,
      yb: 5000,
      lastLoginTime: 0,
      onlineDataTime: 0,
      pinkDiamond: false,
      PDgrowth: 0,
      PDgrowthValue: 0,
      PDgrowthValue_next: 0,
      PDiamondLevel: 0,
      PDiamondBeginDate: 0,
      PDiamondExpirationDate: 0,
      sweetHeart: false,
      sweetHeartOverTime: 0,
    },
    petComputedlInfo: { level: 1, upGrowth: 0, nextGrowth: 125, hungerMax: 1100, cleanMax: 1100, healthMax: 5, moodMax: 1000 },
    studyInfo: { chinese: 0, mathematics: 0, politics: 0, music: 0, art: 0, manner: 0, pe: 0, labouring: 0, wushu: 0 },
    activeOption: { work: null, study: null, trip: null, ill: null, die: null },
    selfGoodDatas: {
      food: ['_10013006*2', '_102010001*3'],
      clean: ['_10021008*2', '_10021005*2'],
      medicine: ['_60001*2', '_50001*1'],
      background: ['_b0000000*1', '_b0000001*1'],
      service: [],
      work: [],
      study: [],
      trip: [],
      toy: ['_t0002*1'],
      nums: [],
    },
    selfGoodUseOption: { background: null, food: null, clean: null, toy: null },
    gameSaveDatas: { fishing_harvestfish: 0, travel_china: [], travel_china_num: 0, ddw: 0, yyds: 0 },
    illustrated: [],
    saveJsonData: { email: '{}', task: '{}', signin: '{}', fishs: '{}' },
    settings: { opacity: 1, faceClick: 2, quiet: false, autoStart: false, paused: false, hidden: false, hd: false },
  }
}

function repair(data: Record<string, any>): string[] {
  const fixed: string[] = []
  for (const [group, rules] of Object.entries(RULES)) {
    data[group] ??= {}
    for (const [field, rule] of Object.entries(rules)) {
      const v = rule(data[group][field])
      if (v === data[group][field]) continue
      data[group][field] = v
      fixed.push(`${group}.${field}`)
    }
  }
  data.illustrated ??= []
  data.saveJsonData ??= {}
  return fixed
}

function read(): Record<string, any> | null {
  if (existsSync(FILE)) {
    try {
      return JSON.parse(readFileSync(FILE, 'utf8'))
    } catch (e) {
      // Keep the broken file for manual recovery instead of silently losing the pet.
      const backup = `${FILE}.corrupt-${Date.now()}`
      renameSync(FILE, backup)
      console.error(`save file is corrupt, moved to ${backup}:`, e)
      return null
    }
  }
  if (existsSync(LEGACY_FILE)) {
    const legacy = JSON.parse(readFileSync(LEGACY_FILE, 'utf8')).petInfoData
    if (legacy) {
      delete legacy.machineId
      delete legacy.oId
      console.log(`migrated save from ${LEGACY_FILE}`)
      return legacy
    }
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
  const stored = read()
  if (stored?.havePet) {
    const fixed = repair(stored)
    if (fixed.length) console.warn('repaired save fields:', fixed.join(', '))
    save = stored as SaveData
  } else {
    // A new pet keeps the owner's preferences, but not the old pet's pause or hiding.
    save = fresh()
    if (stored?.settings) Object.assign(save.settings, stored.settings, { paused: false, hidden: false })
  }
  write(save)
  return save
}

export function getSave(): SaveData {
  return save
}

export function patchSave(patch: SavePatch): void {
  const target = save as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    const current = target[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object') Object.assign(current, value)
    else target[key] = value
  }
  save.saveNum++
  write(save)
}

/** Buries the pet: the next launch starts with egg selection. */
export function resetSave(): void {
  save.havePet = false
  save.isBury = false
  write(save)
}
