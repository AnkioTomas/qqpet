import { avatar, info, save, setInfo, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { readSol, writeSol, type Sol } from '../swf/sol'
import { openBox } from './box'
import './css/farm.css'
import { div, img } from './dom'

// Farm.swf keeps everything in SharedObject.getLocal("test", "/"); Ruffle names it after the SWF's host.
const KEY = `${location.hostname}//test`
const MIGRATED = 'farm:migrated'
/** InstallFace.PEST_TIME: each disaster strikes a growing plot about once in this many seconds. */
const PEST_TIME = 14400

/** A plot as Farm.swf saves it: `time` is when it was sown, `harvest` marks one already picked. */
interface Land {
  farmland: string
  crop?: string
  time?: number
  harvest?: unknown
  grass?: number
  worm?: number
}

// Farms used to live only in localStorage; adopt one once, at startup, so a later reset or import can't pick up a stale one.
if (localStorage.getItem(MIGRATED) === null) {
  const legacy = readSol(KEY)?.user
  if (legacy && !save.saveJsonData.farm) update('saveJsonData', { farm: JSON.stringify(legacy) })
  localStorage.setItem(MIGRATED, '1')
}

let open = false

/** The save Farm.swf writes on its first run (FarmMain.locationInit). */
function fresh(): Sol {
  return {
    house: 'house',
    kennel: 'kennel',
    fence: 'fence',
    experience: '1',
    rank: '01',
    burden: [],
    warehouse: [],
    farmland: Array.from({ length: 18 }, (_, i) => ({ farmland: i < 6 ? 'FarmlandS' : 'Wasteland' })),
    weather: 'Sunny',
  }
}

/**
 * QQ 农场 (pet/qqfarm/Farm.swf). The farm is kept in saveJsonData.farm so it
 * follows the pet through export, import and reset; localStorage only feeds
 * the running SWF. Its 金币 are the pet's 元宝: the save gets the current yb
 * before the SWF reads it, and every change the SWF flushes is settled as a
 * delta, so yb earned or spent elsewhere meanwhile is kept.
 * Ruffle assigns localStorage[key] directly, so writes can only be polled.
 */
export function openFarm(): void {
  if (open) return
  open = true
  const stored = save.saveJsonData.farm
  const user: Sol = { ...(stored ? JSON.parse(stored) : fresh()), username: info.name, wealth: String(info.yb) }
  writeSol(KEY, 'test', { user })

  let last = info.yb
  let raw = localStorage.getItem(KEY)
  const settle = (): void => {
    if (localStorage.getItem(KEY) === raw) return
    raw = localStorage.getItem(KEY)
    const user = readSol(KEY)!.user as Sol
    const w = Number(user.wealth)
    // The SWF only knows the yb it started with; spending elsewhere meanwhile can overdraw.
    setInfo('yb', Math.max(0, info.yb + w - last))
    last = w
    update('saveJsonData', { farm: JSON.stringify(user) })
  }
  const timer = setInterval(settle, 500)

  const host = div('farm', div('avatar', img('penguin_breathe', avatar())))
  window.qqpet.setFocusable(true)
  openBox(div('ui-farm', host), {
    vip: info.pinkDiamond,
    onClose: () => {
      clearInterval(timer)
      settle()
      // The SWF rolls disasters up to its last tick but only saves when one strikes.
      const checked = Math.floor(Date.now() / 1000)
      update('saveJsonData', { farm: JSON.stringify({ ...(readSol(KEY)!.user as Sol), checked }) })
      window.qqpet.setFocusable(false)
      open = false
    },
  })
  void new SwfPlayer(host).load('pet/qqfarm/Farm.swf', 'pet/qqfarm/')
}

let ripening: Promise<Record<string, number>> | undefined

/** Seconds each seed takes to ripen. */
async function ripeTimes(): Promise<Record<string, number>> {
  const xml = await (await fetch('pet/qqfarm/com/MyFarm/data/xml/Crop.xml')).text()
  const items = new DOMParser().parseFromString(xml, 'text/xml').querySelectorAll('items')
  return Object.fromEntries([...items].map((e) => [e.getAttribute('seed'), Number(e.getAttribute('time'))]))
}

/**
 * The closed farm as the pet sees it: ripe plots, and growing plots hit by
 * weeds, insects or drought. Farm.swf only rolls disasters while it runs, so
 * this rolls them for the time since it last did, the same way
 * (InstallFace.tick). Null while the farm is open or was never started.
 */
export async function farmNews(): Promise<{ ripe: number; pests: number } | null> {
  ripening ??= ripeTimes()
  const times = await ripening
  const stored = save.saveJsonData.farm
  if (open || !stored) return null
  const user: Sol = JSON.parse(stored)
  const now = Math.floor(Date.now() / 1000)
  const chance = 1 - Math.exp(-(now - Number(user.checked ?? now)) / PEST_TIME)
  const roll = (): boolean => Math.random() < chance
  let ripe = 0
  let pests = 0
  for (const land of user.farmland as Land[]) {
    if (!land.crop || land.harvest !== undefined) continue
    if (now - Number(land.time) >= times[land.crop]) {
      ripe++
      continue
    }
    if (land.grass === undefined && roll()) land.grass = 1
    if (land.worm === undefined && roll()) land.worm = 1
    if (land.farmland === 'FarmlandS' && roll()) land.farmland = 'FarmlandG'
    if (land.grass !== undefined || land.worm !== undefined || land.farmland === 'FarmlandG') pests++
  }
  user.checked = now
  update('saveJsonData', { farm: JSON.stringify(user) })
  return { ripe, pests }
}
