import { avatar, info, save, setInfo, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { readSol, writeSol, type Sol } from '../swf/sol'
import { openBox } from './box'
import './css/farm.css'
import { div, img } from './dom'

// Farm.swf keeps everything in SharedObject.getLocal("test", "/"); Ruffle names it after the SWF's host.
const KEY = `${location.hostname}//test`
const MIGRATED = 'farm:migrated'

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
      window.qqpet.setFocusable(false)
      open = false
    },
  })
  void new SwfPlayer(host).load('pet/qqfarm/Farm.swf', 'pet/qqfarm/')
}
