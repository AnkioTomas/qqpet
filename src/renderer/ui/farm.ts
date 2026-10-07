import { avatar, info, setInfo } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { readSol, writeSol, type Sol } from '../swf/sol'
import { openBox } from './box'
import './css/farm.css'
import { div, img } from './dom'

// Farm.swf keeps everything in SharedObject.getLocal("test", "/"); Ruffle names it after the SWF's host.
const KEY = `${location.hostname}//test`

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

const wealth = (): number => Number((readSol(KEY)!.user as Sol).wealth)

/**
 * QQ 农场 (pet/qqfarm/Farm.swf). Its 金币 are the pet's 元宝: the save gets the
 * current yb before the SWF reads it, and every change the SWF flushes is
 * settled as a delta, so yb earned or spent elsewhere meanwhile is kept.
 * Ruffle assigns localStorage[key] directly, so writes can only be polled.
 */
export function openFarm(): void {
  if (open) return
  open = true
  const sol = readSol(KEY) ?? {}
  sol.user = { ...((sol.user as Sol | undefined) ?? fresh()), username: info.name, wealth: String(info.yb) }
  writeSol(KEY, 'test', sol)

  let last = info.yb
  let raw = localStorage.getItem(KEY)
  const settle = (): void => {
    if (localStorage.getItem(KEY) === raw) return
    raw = localStorage.getItem(KEY)
    const w = wealth()
    // The SWF only knows the yb it started with; spending elsewhere meanwhile can overdraw.
    setInfo('yb', Math.max(0, info.yb + w - last))
    last = w
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
