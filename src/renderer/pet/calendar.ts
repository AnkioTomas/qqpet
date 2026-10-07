import type { CalendarDay } from '../../shared/ipc'
import { GREET } from './data/greet'
import type { Line } from './data/talk'
import { rand } from './rand'

const WEEK = '日一二三四五六'

/** Today first; empty while offline. */
let days: CalendarDay[] = []

/** Refreshes the calendar; today's entry, or undefined while offline. */
export async function loadCalendar(): Promise<CalendarDay | undefined> {
  days = await window.qqpet.calendar()
  return days[0]
}

const pick = <T>(list: T[]): T => list[rand(0, list.length - 1)]

/** A launch greeting for the time of day. */
export function greeting(): Line {
  const h = new Date().getHours()
  return pick(GREET.findLast(([from]) => h >= from)![1])
}

/** What the pet says about a holiday, make-up working day or solar term. */
export function festival(d: CalendarDay): string | null {
  if (d.holiday?.off) return `[host]，今天是${d.holiday.name}，放假啦！祝你${d.holiday.name}快乐，今天要好好玩哦~`
  if (d.holiday) return `[host]，今天${d.holiday.name}调休要上班，辛苦啦，我给你加油！`
  if (d.term) return `[host]，今天是${d.term}，换季了要注意身体哦~`
  return null
}

/** A small-talk line about the date; null while offline. */
export function dateTalk(): string | null {
  const [today] = days
  if (!today) return null
  const now = new Date()
  const lines = [`[host]，今天是农历${today.lunar}，星期${WEEK[now.getDay()]}~`]
  const i = days.findIndex((d, i) => i > 0 && d.holiday?.off && d.holiday.name !== today.holiday?.name)
  if (i > 0) lines.push(`[host]，再过${i}天就是${days[i].holiday!.name}啦，放假有什么计划吗？`)
  if ((now.getDay() === 0 || now.getDay() === 6) && !today.holiday) lines.push('周末啦，[host]今天好好休息一下吧~')
  const f = festival(today)
  if (f) lines.push(f)
  return pick(lines)
}
