import { net } from 'electron'
import type { CalendarDay } from '../shared/ipc'

const API = 'https://api.ankio.net/day?ymd='
const DAYS = 31

const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The fields used from the API's reply; `holidays` is an empty array on ordinary days. */
interface Reply {
  data: { lunar_month_chinese: string; lunar_day_chinese: string; term: string | null; holidays: { name: string; isOffDay: boolean } | [] }
}

async function fetchDay(date: string): Promise<CalendarDay> {
  // The day's tasks and mail wait for this; a stalled network must not hold them back.
  const { data: d } = (await (await net.fetch(API + date, { signal: AbortSignal.timeout(10_000) })).json()) as Reply
  const h = Array.isArray(d.holidays) ? null : d.holidays
  return { date, lunar: `${d.lunar_month_chinese}${d.lunar_day_chinese}`, term: d.term, holiday: h && { name: h.name, off: h.isOffDay } }
}

let cache: { date: string; days: Promise<CalendarDay[]> } | null = null

/** Today and the next 30 days, fetched once per date; empty while offline, retried on the next call. */
export function calendar(): Promise<CalendarDay[]> {
  const now = new Date()
  const date = ymd(now)
  if (cache?.date !== date) {
    const days = Array.from({ length: DAYS }, (_, i) => fetchDay(ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))))
    cache = {
      date,
      days: Promise.all(days).catch(() => {
        cache = null
        return []
      }),
    }
  }
  return cache.days
}
