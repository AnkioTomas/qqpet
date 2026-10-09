import { windowView } from '../ui/window-view'
import FRIES from './data/fries.json'
import { addInfo, info, save, setInfo, update } from './store'

const HOUR = 3600
const FEED_PRICE = 10
/** Harvests for the 养鱼大师 achievement. */
const MASTER = 1000

/** A fish as the pond SWF reads it; ids are the purchase time (unix seconds). */
interface Fish {
  id: number
  fryid: number
  name: string
  /** 1 fry, 2 growing, 3 ripe. */
  stage: number
  /** Seconds into the current stage. */
  time: number
  interval: number
  costyb: number
  /** 元宝 per unit when harvested. */
  YB: number
  quantity: number
  basequantity: number
  avatar: number
  AIXIN: number
  growth: number
  strong: number
  iq: number
  charm: number
  born: number
  /** Feeds; each counts as an hour of growth. */
  siLiao: number
}

/** saveJsonData.fishs, in the original's shape. */
interface Pond {
  /** Pink diamond speed-ups: per day, and left today. */
  PD: { allvipcnt: number; canusecnt: number }
  fishs: Fish[]
}

type Reply = Record<string, unknown>

function load(): Pond {
  const p: Partial<Pond> = JSON.parse(save.saveJsonData.fishs || '{}')
  return { PD: p.PD ?? { allvipcnt: 0, canusecnt: 0 }, fishs: (p.fishs ?? []).filter((f) => f.id) }
}

const pond = load()
const store = (): void => update('saveJsonData', { fishs: JSON.stringify(pond) })
const now = (): number => Math.floor(Date.now() / 1000)
const ripe = (f: Fish): boolean => f.stage >= 3
const ERROR = { result: 6, msg: '使用错误~~' }

/** Stage 2 after one interval, ripe after two. */
function grow(f: Fish, t: number): void {
  if (ripe(f)) return
  const age = t - f.born + HOUR * f.siLiao
  const n = Math.min(Math.floor(age / f.interval), 2)
  f.stage = n + 1
  f.time = n === 2 ? 0 : age - n * f.interval
}

let last = 0

/** Grows every fish up to now; a clock set back empties the pond, as in the original. */
function settle(): void {
  const t = now()
  if (last > t) {
    pond.fishs = []
    pond.PD.canusecnt = 0
  } else {
    last = t
    for (const f of pond.fishs) grow(f, t)
  }
  store()
}

export function ripeFish(): number {
  const t = now()
  for (const f of pond.fishs) grow(f, t)
  return pond.fishs.filter(ripe).length
}

function harvested(n: number): void {
  const total = save.gameSaveDatas.fishing_harvestfish + n
  if (total < MASTER) return update('gameSaveDatas', { fishing_harvestfish: total })
  update('gameSaveDatas', { fishing_harvestfish: total - MASTER, yyds: save.gameSaveDatas.yyds + 1 })
  windowView({ title: '逗逗我~~', msg: '养鱼大师成就达成~~', goods: [{ url: 'pet/achievement/yyds.svg', name: '养鱼大师' }] })
}

export function pondState(): Reply {
  settle()
  return { ...pond.PD, fishes: pond.fishs, harvestfish: save.gameSaveDatas.fishing_harvestfish, yb: info.yb }
}

function feed(id: number): Reply {
  const f = pond.fishs.find((f) => f.id === id)
  if (!f) return ERROR
  if (ripe(f)) return { result: 6, msg: '当前🐟儿已成熟~' }
  if (info.yb < FEED_PRICE) return { result: 5, msg: '元宝不够啦~~' }
  setInfo('yb', info.yb - FEED_PRICE)
  f.siLiao++
  grow(f, now())
  store()
  return { result: 0 }
}

// The SWF takes 20% off prices for pink diamond members; the price charged is the listed one.
const shop = (): Reply => ({ fries: FRIES.map((f) => ({ ...f, price_yb: info.pinkDiamond ? f.price_yb / 0.8 : f.price_yb })), totalpage: 1 })

export const pondCap = (): number => (info.pinkDiamond ? 5 : 3)

export function pondRoom(): number {
  settle()
  return pondCap() - pond.fishs.length
}

function buy(paytype: number, fryid: number, n = 1): Reply {
  if (paytype !== 1) return { result: 1 }
  const room = pondRoom()
  if (room <= 0) return { result: 5, msg: '已经满了' }
  const fry = FRIES.find((f) => f.fryid === fryid)
  if (!fry) return ERROR
  n = Math.min(Math.max(n | 0, 1), room)
  const cost = fry.price_yb * n
  if (info.yb < cost) return { result: 1 }
  setInfo('yb', info.yb - cost)
  const t = now()
  const base = Date.now()
  for (let i = 0; i < n; i++) {
    pond.fishs.push({
      id: base + i,
      fryid,
      name: fry.name,
      stage: 1,
      time: 0,
      interval: fry.interval,
      costyb: fry.price_yb,
      YB: fry.sell_price,
      quantity: fry.quantity,
      basequantity: fry.quantity,
      avatar: fry.avator,
      AIXIN: 0,
      growth: 0,
      strong: 0,
      iq: 0,
      charm: 0,
      born: t,
      siLiao: 0,
    })
  }
  store()
  return { result: 0 }
}

/** A ripe fish sells; an unripe one is thrown back for half its price. */
function harvest(id: number): Reply {
  const i = pond.fishs.findIndex((f) => f.id === id)
  const f = pond.fishs[i]
  const yb = f && (ripe(f) ? f.YB * f.quantity : f.costyb / 2)
  if (!yb) return ERROR
  pond.fishs.splice(i, 1)
  addInfo('yb', yb)
  if (ripe(f)) harvested(1)
  store()
  return { result: 0, yb, msg: '收获成功!', growth: 0, strong: 0, charm: 0, iq: 0 }
}

/** Pink diamond: an hour of growth for every fish. */
function speedUp(): Reply {
  if (!pond.PD.canusecnt) return { result: 5, msg: '使用失败，当前没有次数~' }
  if (!pond.fishs.length) return { result: 5, msg: '使用失败，当前没有🐟~' }
  const t = now()
  for (const f of pond.fishs) {
    f.siLiao++
    grow(f, t)
  }
  pond.PD.canusecnt--
  store()
  return { result: 0 }
}

/** result 6 makes the SWF ask for the pond again. */
function harvestAll(): Reply {
  if (!pond.fishs.length) return { result: 5, msg: '收获失败，当前没有🐟~' }
  const sold = pond.fishs.filter(ripe)
  const yb = sold.reduce((s, f) => s + f.YB * f.quantity, 0)
  if (!yb) return { result: 5, msg: '收获失败，当前没有成熟的🐟~' }
  pond.fishs = pond.fishs.filter((f) => !ripe(f))
  addInfo('yb', yb)
  harvested(sold.length)
  store()
  return { result: 6, msg: '收获成功!' }
}

type Data = { id: number; paytype: number; fryid: number; num?: number }

/** The pond SWF's requests, by head.cmd. */
const COMMANDS: Record<number, (d: Data) => Reply> = {
  1: pondState,
  2: (d) => ({ id: d.id, ...feed(d.id) }),
  3: shop,
  4: (d) => buy(d.paytype, d.fryid, d.num),
  5: (d) => ({ id: d.id, ...harvest(d.id) }),
  7: speedUp,
  8: harvestAll,
}

export function pondCommand(cmd: number, data: Data): Reply {
  return COMMANDS[cmd]?.(data) ?? { result: 5, msg: `未知指令~ cmd:${cmd}  data:${JSON.stringify(data)}` }
}

/** 06:00, and pink diamond opened: the day's speed-ups, two per pink diamond level. */
export function resetFish(): void {
  pond.PD.allvipcnt = (info.PDiamondLevel || 1) * 2
  pond.PD.canusecnt = info.pinkDiamond ? pond.PD.allvipcnt : 0
  store()
}
