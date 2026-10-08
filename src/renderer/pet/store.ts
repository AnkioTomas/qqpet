import type { TrayState } from '../../shared/ipc'
import type { PetInfo, SaveData, SavePatch } from '../../shared/save'
import { goodOf, type TimedType } from './data/goods'
import { levelOf, stageOf, type Stage } from './level'
import type { Mood } from './router'

export const save: SaveData = await window.qqpet.load()
export const info: PetInfo = save.petInfo

let patch: Record<string, unknown> = {}
let flushTimer = 0

/** Applies a change to `save` and writes it to disk, batched like the original (200 ms). */
export function update<K extends keyof SaveData>(key: K, value: SavePatch[K]): void {
  const target = save as unknown as Record<string, unknown>
  const isGroup = typeof value === 'object' && value !== null && !Array.isArray(value)
  if (isGroup) {
    Object.assign(target[key] as object, value)
    patch[key] = { ...(patch[key] as object), ...value }
  } else {
    target[key] = value
    patch[key] = value
  }
  flushTimer ||= window.setTimeout(() => {
    window.qqpet.save(patch as SavePatch)
    patch = {}
    flushTimer = 0
  }, 200)
}

type NumKey = { [K in keyof PetInfo]: PetInfo[K] extends number ? K : never }[keyof PetInfo]
type Listener = (key: keyof PetInfo, prev: unknown) => void
const listeners: Listener[] = []

export const onInfoChange = (l: Listener): void => void listeners.push(l)

export function setInfo<K extends keyof PetInfo>(key: K, value: PetInfo[K]): void {
  const prev = info[key]
  if (prev === value) return
  update('petInfo', { [key]: value })
  for (const l of listeners) l(key, prev)
}

export const addInfo = (key: NumKey, delta: number): void => setInfo(key, info[key] + delta)

type Activity = 'work' | 'study' | 'trip' | 'ill' | 'die'
export const activity = (k: Activity): string | null => save.activeOption[k] as string | null
export const setActivity = (k: Activity, v: string | null): void => update('activeOption', { [k]: v })

const MOODS: [number, Mood, number][] = [
  [800, 'happy', 1],
  [500, 'peaceful', 0.9],
  [200, 'upset', 0.7],
  [-Infinity, 'sad', 0.5],
]
export const mood = (): Mood => MOODS.find(([min]) => info.mood >= min)![1]
export const stage = (): Stage => stageOf(save.petComputedlInfo.level)
/** The first frame of the pet's Stand.swf, framed like the original pet/info/*.svg portraits. */
export const avatar = (): string => `pet/avatar/${info.sex}${stage()}.png`

// Touch screens are small and fingers are big: there the pet scales with the short side instead.
const touch = matchMedia('(pointer: coarse)').matches

/** Base size grows from 144 (level 1) to 164 (level 10+) at 1920 px screen width, or at a 576 px short side on touch screens. */
export const petSize = (): number =>
  (144 + 2 * Math.min(save.petComputedlInfo.level, 10)) * (touch ? Math.min(innerWidth, innerHeight) / 576 : innerWidth / 1920)

export function growthPerMinute(): number {
  if (info.mood <= 0) return 10 / 60
  const rate = MOODS.find(([min]) => info.mood >= min)![2]
  let perHour = 80 * rate + (info.pinkDiamond ? 10 : 0)
  for (const [type, t] of Object.entries(save.selfGoodUseOption)) if (t) perHour += goodOf(type as TimedType, t.id).group ?? 0
  return (perHour * (info.sweetHeartOverTime ? 1.1 : 1)) / 60
}

export const busy = (): boolean => Boolean(activity('work') || activity('study') || activity('trip'))

/** 0 (fresh) and up; drives random illness and health loss. */
export function fatigue(): number {
  const c = save.petComputedlInfo
  const m = info.mood / c.moodMax
  const cl = info.clean / c.cleanMax
  const h = info.hunger / c.hungerMax
  let f = (info.health !== 5 ? 2 : 0) + (m < 0.2 ? 3 : m < 0.5 ? 2 : 0) + (cl < 0.2 ? 2 : cl < 0.5 ? 1 : 0) + (h < 0.2 ? 2 : h < 0.5 ? 1 : 0)
  if (!f) return 0
  if (busy()) f += 2
  const strong = info.strong
  const relief = c.level < 10 ? (strong > 500 ? 2 : 0) : strong > 50000 ? 4 : strong > 5000 ? 2 : 0
  return Math.max(0, f - relief)
}

/** 0..20: VIP flags, charm and intelligence help; fatigue hurts. */
export function luck(): number {
  let l = 1 + (info.pinkDiamond ? info.PDiamondLevel * 2 : 0) + (info.sweetHeart ? 2 : 0)
  l += [500, 5000, 50000].filter((v) => info.charm > v).length + [800, 8000, 80000].filter((v) => info.intel > v).length
  return Math.min(Math.max(0, l - (fatigue() >> 1)), 20)
}

/** Recomputes level and stat caps from growth; returns the previous level. */
export function syncLevel(): number {
  const c = save.petComputedlInfo
  const prev = c.level
  const l = levelOf(info.growth)
  const max = 1000 + Math.min(l.level, 70) * 100
  if (l.level !== prev || max !== c.hungerMax) update('petComputedlInfo', { ...l, hungerMax: max, cleanMax: max })
  return prev
}

let tray: TrayState | null = null

export function setTray(s: TrayState): void {
  // Hunger and dirt never replace the more urgent ill/dead icons.
  if (s === tray || ((s === 'hungry' || s === 'dirty') && (tray === 'ill' || tray === 'dead'))) return
  tray = s
  window.qqpet.setTrayState(s)
}

export function setPaused(on: boolean): void {
  update('settings', { paused: on })
  refreshTray()
}

export function refreshTray(): void {
  if (save.isBury || info.health === 0) setTray('dead')
  else if (save.settings.paused) setTray('pause')
  else if (info.health !== 5) setTray('ill')
  else if (activity('work')) setTray('work')
  else if (activity('study')) setTray('study')
  else if (activity('trip')) setTray('travel')
  else if (info.clean < 300) setTray('dirty')
  else if (info.hunger < 300) setTray('hungry')
  else setTray('normal')
}

// Load-time fixups from the original setDefaultPetInfoData: a sick pet always
// has an illness line. Unlike the original, activities survive a restart (resumeTask).
update('petInfo', { lastX: info.lastX | 0, lastY: info.lastY | 0 })
if (info.health < 5 && !activity('ill')) setActivity('ill', '1-')
syncLevel()
