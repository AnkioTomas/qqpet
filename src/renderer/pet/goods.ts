import { goodOf, type Good, type GoodType, type TimedType } from './data/goods'
import { save, update } from './store'

type Listener = (type: GoodType) => void
const listeners: Listener[] = []
/** Inventory or timed goods of `type` changed. */
export const onGoodsChange = (l: Listener): void => void listeners.push(l)
const changed = (type: GoodType): void => listeners.forEach((l) => l(type))

/** Entries are `_<id>*<count>`; returns the index of `id` or -1. */
const indexOf = (type: GoodType, id: string): number => save.selfGoodDatas[type].findIndex((e) => e.startsWith(`_${id}*`))

export interface Page {
  list: Good[]
  /** 0 when empty. */
  totalPage: number
}

export const pageOf = (all: Good[], page: number, size: number): Page => ({
  list: all.slice((page - 1) * size, page * size),
  totalPage: Math.ceil(all.length / size),
})

/** One page of the inventory. */
export function listGoods(type: GoodType, page: number, size: number): Page {
  const all = save.selfGoodDatas[type].map((e) => {
    const [id, n] = e.slice(1).split('*')
    return goodOf(type, id, +n)
  })
  return pageOf(all, page, size)
}

export const hasGood = (type: GoodType, id: string): boolean => indexOf(type, id) >= 0

/** Adds (or with a negative n removes) n of a good; also records it as seen. */
export function addGood(type: GoodType, id: string, n: number): void {
  if (!save.illustrated.includes(id)) update('illustrated', [...save.illustrated, id])
  const list = [...save.selfGoodDatas[type]]
  const i = indexOf(type, id)
  const count = (i >= 0 ? +list[i].split('*')[1] : 0) + n
  if (i < 0 && count > 0) list.push(`_${id}*${count}`)
  else if (count > 0) list[i] = `_${id}*${count}`
  else if (i >= 0) list.splice(i, 1)
  update('selfGoodDatas', { [type]: list })
  changed(type)
}

/** Takes n of a good from the inventory; false when not owned. */
export function takeGood(good: Good, n = 1): boolean {
  if (!hasGood(good.type, good.id)) return false
  addGood(good.type, good.id, -n)
  return true
}

/** Puts a timed good in effect for its full duration, replacing the previous one of its type. */
export function startTimed(good: Good & { type: TimedType }): void {
  update('selfGoodUseOption', { [good.type]: { id: good.id, left: good.useTimeing! } })
  changed(good.type)
}

/** Counts the timed goods down; returns the types that ran out. */
export function tickTimed(minutes: number): TimedType[] {
  const over: TimedType[] = []
  for (const [type, t] of Object.entries(save.selfGoodUseOption) as [TimedType, { id: string; left: number } | null][]) {
    if (!t) continue
    const left = t.left - minutes
    update('selfGoodUseOption', { [type]: left > 0 ? { id: t.id, left } : null })
    if (left <= 0) over.push(type)
    changed(type)
  }
  return over
}
