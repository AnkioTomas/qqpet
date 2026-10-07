import { info, setInfo } from './store'

const DAY = 86400
/** PDgrowth at which pink diamond levels 1..7 start. */
const LEVELS = [0, 100, 300, 800, 1200, 2800, 5800, 99999999]

/** Today's 06:00 (yesterday's before 06:00) in unix seconds: days, and VIP periods, turn over then. */
export function dayStart(now = Date.now() / 1000): number {
  const d = new Date(now * 1000)
  d.setHours(6, 0, 0, 0)
  if (d.getTime() > now * 1000) d.setDate(d.getDate() - 1)
  return d.getTime() / 1000
}

/** Expiry, then level and the growth the next level needs. */
function settle(today: number): void {
  const active = info.PDiamondExpirationDate > today
  setInfo('pinkDiamond', active)
  if (!active) {
    setInfo('PDiamondBeginDate', 0)
    setInfo('PDiamondExpirationDate', 0)
  }
  const level = Math.max(LEVELS.filter((g) => info.PDgrowth >= g).length, 1)
  setInfo('PDiamondLevel', level)
  setInfo('PDgrowthValue_next', LEVELS[level])
}

/** Opens pink diamond for `days` from today's 06:00, or extends a running one. */
export function openPinkDiamond(days: number): void {
  const today = dayStart()
  if (info.pinkDiamond) {
    setInfo('PDiamondExpirationDate', info.PDiamondExpirationDate + days * DAY)
  } else {
    setInfo('PDiamondExpirationDate', today + days * DAY)
    setInfo('PDiamondBeginDate', today)
  }
  setInfo('PDgrowthValue', 20)
  settle(today)
}

/** 06:00 accounting: pink diamond growth for the days since it was last counted, and VIP expiry. */
export function newDay(today: number): void {
  if (info.pinkDiamond) {
    setInfo('PDgrowth', info.PDgrowth + (info.PDgrowthValue * (today - info.PDiamondBeginDate)) / DAY)
    setInfo('PDiamondBeginDate', today)
    settle(today)
  }
  if (info.sweetHeartOverTime <= today) {
    setInfo('sweetHeartOverTime', 0)
    setInfo('sweetHeart', false)
  }
}
