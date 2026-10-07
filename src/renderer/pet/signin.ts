import { goodOf, parseGood, type Good } from './data/goods'
import { give } from './items'
import { loot } from './loot'
import { rand } from './rand'
import { info, save, update } from './store'
import { dayStart } from './vip'

const GIFT_MINUTES = 20
const BIRTHDAY_FOODS =
  '100010496 100010497 10011014 100010033 100010100 100010106 100010109 100010110 100010123 100010197 100010241 100010298 100010305 100010337 100010338 100010461 100010489 100010491 100010494'.split(
    ' ',
  )

/** saveJsonData.signin, in the original's shape. */
interface SignIn {
  /** year → month → the 06:00 timestamps of the days signed. */
  collectionList: Record<string, Record<string, number[]>>
  /** Digits of today's growth draws: the free one, then a pink diamond's extra. */
  getGrowth: [number[], number[] | null] | null
  /** Online gifts taken today; all but the first cost 元宝. */
  onlineGiftNum: number
  /** Online minutes until the next gift. */
  isOnlineLastTime: number
  getBirthDayGift: boolean
}

function load(): SignIn {
  const s: Partial<SignIn> = JSON.parse(save.saveJsonData.signin || '{}')
  return {
    collectionList: s.collectionList ?? {},
    getGrowth: s.getGrowth ?? null,
    onlineGiftNum: s.onlineGiftNum ?? 0,
    isOnlineLastTime: s.isOnlineLastTime ?? GIFT_MINUTES,
    getBirthDayGift: s.getBirthDayGift ?? true,
  }
}

export const signin = load()
const store = (): void => update('saveJsonData', { signin: JSON.stringify(signin) })

export const monthSigns = (y: number, m: number): number[] => signin.collectionList[y]?.[m] ?? []

export function signedToday(): boolean {
  const today = dayStart()
  const d = new Date(today * 1000)
  return monthSigns(d.getFullYear(), d.getMonth() + 1).includes(today)
}

export function signToday(): Good[] {
  const today = dayStart()
  const d = new Date(today * 1000)
  const year = (signin.collectionList[d.getFullYear()] ??= {})
  ;(year[d.getMonth() + 1] ??= []).push(today)
  store()
  const goods = loot(1).map((g) => (g.type === 'nums' ? { ...g, num: 20 } : g))
  give(goods, '今日签到成功哦！~')
  return goods
}

export const canDrawGrowth = (): boolean => !signin.getGrowth || (info.pinkDiamond && !signin.getGrowth[1])

/** Draws today's growth digits; a draw of 0 is not counted and returns no goods. */
export function drawGrowth(): { digits: number[]; goods: Good[] } {
  let e0 = rand(0, 5)
  e0 = rand(0, e0)
  e0 = rand(0, e0)
  const digits = [e0, rand(0, rand(0, 9)), rand(0, 9)]
  const value = +digits.join('')
  if (!value) return { digits, goods: [] }
  if (signin.getGrowth) signin.getGrowth[1] = digits
  else signin.getGrowth = [digits, null]
  store()
  const goods = [parseGood(`_growth*${value}`)]
  give(goods, '[host],抽取成长值成功哦~~')
  return { digits, goods }
}

export const giftCost = (): number => signin.onlineGiftNum * 100

/** Takes the online gift; the countdown must be over and any cost already paid. */
export function takeOnlineGift(): Good[] {
  const tier = rand(0, info.pinkDiamond ? 1000 : 10000) < 2 ? 0 : signin.onlineGiftNum % 10 === 0 ? 1 : 2
  const goods = loot(info.pinkDiamond ? 2 : 1, tier)
  signin.onlineGiftNum++
  signin.isOnlineLastTime = GIFT_MINUTES
  store()
  give(goods, '[host],成功领取在线时长奖励哦~~')
  return goods
}

export function tickGift(minutes: number): void {
  if (!signin.isOnlineLastTime) return
  signin.isOnlineLastTime = Math.max(signin.isOnlineLastTime - minutes, 0)
  store()
}

/** Once a day, on the birthday's day of the month: a random food. */
export function birthdayGift(): Good[] {
  if (signin.getBirthDayGift) return []
  signin.getBirthDayGift = true
  store()
  if (new Date().getDate() !== new Date(info.birthDay * 1000).getDate()) return []
  const g = goodOf('food', BIRTHDAY_FOODS[rand(0, BIRTHDAY_FOODS.length - 1)])
  give([g], `我领取了我的生日礼物哦，是${g.name}`)
  return [g]
}

export function resetSignIn(): void {
  signin.getGrowth = null
  if (info.onLineTime > 10) signin.getBirthDayGift = false
  signin.isOnlineLastTime = GIFT_MINUTES
  signin.onlineGiftNum = 0
  store()
}
