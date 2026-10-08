import type { CalendarDay } from '../../shared/ipc'
import { isBuddy, type Shot } from './album'
import { allGoods, goodOf, type Good } from './data/goods'
import { rand } from './rand'
import { info, save, update } from './store'

/** saveJsonData.email entries, keyed by `d` (unix seconds); a deleted mail keeps only its keys. */
export interface Live {
  d: number
  /** Title. */
  l: string
  glb: Good[]
  /** Claimed. */
  r?: boolean
  /** What the pet says on claiming. */
  m?: string
  /** Mails generated here are sent once per key. */
  k?: string
  /** A travel photo, by album id. */
  p?: string
  e?: undefined
}
export type Mail = Live | { d: number; e: true; k?: string }

export const readMails = (): Record<string, Mail> => JSON.parse(save.saveJsonData.email || '{}')
export const writeMails = (mails: Record<string, Mail>): void => update('saveJsonData', { email: JSON.stringify(mails) })

/** n different goods of a type, 1-3 of each. */
function some(type: 'food' | 'toy', n: number): Good[] {
  const all = allGoods(type)
  return Array.from({ length: n }, () => ({ ...all.splice(rand(0, all.length - 1), 1)[0], num: rand(1, 3) }))
}

/** A free key from now on; mails are keyed by their time. */
function slot(mails: Record<string, Mail>): number {
  let d = Math.floor(Date.now() / 1000)
  while (mails[d]) d++
  return d
}

/** Random food and toys plus `yb` 元宝, unless a mail with key `k` was ever sent. */
function send(mails: Record<string, Mail>, k: string, l: string, yb: number, m: string): boolean {
  if (Object.values(mails).some((x) => x.k === k)) return false
  const d = slot(mails)
  mails[d] = { d, k, l, m, glb: [...some('food', 3), ...some('toy', 2), goodOf('nums', 'yb', yb)] }
  return true
}

/** The photo from a trip, as a mail without goods. */
export function mailPhoto(s: Shot): void {
  const mails = readMails()
  const d = slot(mails)
  const l = isBuddy(s.id) ? `在${s.city}遇到了旅游搭子！` : `来自${s.city}的明信片`
  mails[d] = { d, l, p: s.id, m: '[host]，照片我收进「旅游-相簿」啦，随时可以翻看哦~', glb: [] }
  writeMails(mails)
}

/** Welcome, birthday and holiday mails due today; true when any arrived. */
export function deliverMails(today?: CalendarDay): boolean {
  const mails = readMails()
  const now = new Date()
  const born = new Date(info.birthDay * 1000)
  const years = now.getFullYear() - born.getFullYear()
  const due: [k: string, l: string, yb: number, m: string][] = []
  if (!Object.values(mails).some((m) => !m.e)) due.push(['welcome', '欢迎来到QQ宠物~', 100, '[host]，欢迎回家！右键（手机上长按）我或者点我脚下的标签，有好多好玩的哦~'])
  if (years > 0 && now.getMonth() === born.getMonth() && now.getDate() === born.getDate())
    due.push([`birthday-${now.getFullYear()}`, `${info.name}的${years}周岁生日快乐！`, 300, '[host]，今天是我的生日，谢谢你一直陪着我！'])
  const h = today?.holiday
  if (h?.off) due.push([`${now.getFullYear()}-${h.name}`, `${h.name}快乐！`, 200, `[host]，${h.name}快乐！收到节日礼物啦~`])
  const sent = due.filter((m) => send(mails, ...m)).length > 0
  if (sent) writeMails(mails)
  return sent
}
