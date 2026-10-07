import type { Weather } from '../../shared/ipc'
import { save, update } from './store'
import { dayStart } from './vip'

/** wttr.in weather codes. */
const CODES: Record<number, string> = {
  113: '晴',
  116: '多云',
  119: '阴',
  122: '阴',
  143: '薄雾',
  146: '霾',
  149: '霾',
  176: '零星小雨',
  179: '零星小雪',
  182: '雨夹雪',
  185: '冻毛毛雨',
  200: '雷阵雨',
  227: '吹雪',
  230: '暴风雪',
  248: '浓雾',
  260: '冻雾',
  263: '毛毛雨',
  266: '毛毛雨',
  281: '冻毛毛雨',
  284: '冻毛毛雨',
  293: '小雨',
  296: '小雨',
  299: '中雨',
  302: '中雨',
  305: '大雨',
  308: '暴雨',
  311: '冻雨',
  314: '冻雨',
  317: '雨夹雪',
  320: '雨夹雪',
  323: '小雪',
  326: '小雪',
  329: '中雪',
  332: '中雪',
  335: '大雪',
  338: '暴雪',
  350: '冰粒',
  353: '阵雨',
  356: '大阵雨',
  359: '暴雨',
  362: '阵雨夹雪',
  365: '雨夹雪',
  368: '阵雪',
  371: '大阵雪',
  374: '冰粒',
  377: '冰粒',
  386: '雷阵雨',
  389: '雷阵雨',
  392: '雷阵雪',
  395: '雷阵雪',
}
/** Weather worth a warning, matched on its name. */
const SEVERE = /雷|暴|大|冻|冰|浓雾/
/** The first key found in a severe weather's name picks its tip; together they cover every severe name. */
const TIPS: [string, string][] = [
  ['雷', '打雷的时候别待在外面，记得关好窗户~'],
  ['冻', '路面会结冰，走路慢一点别摔倒~'],
  ['冰', '路面会结冰，走路慢一点别摔倒~'],
  ['雾', '外面雾蒙蒙的，过马路要看清楚哦~'],
  ['雪', '记得穿厚一点，路上小心滑~'],
  ['雨', '出门一定要带伞，别淋湿啦~'],
]
const WINDY = 39
const HOT = 35
const FREEZING = -5
const CHILL = 8

const name = (code: number): string => CODES[code] ?? ''
const when = (hour: number): string => (hour <= new Date().getHours() ? '现在' : `${hour}点左右`)

function warning(w: Weather): string | null {
  const bad = w.hours.find((h) => SEVERE.test(name(h.code)))
  if (bad) return `[host]，${when(bad.hour)}有${name(bad.code)}，${TIPS.find(([k]) => name(bad.code).includes(k))![1]}`
  const windy = w.hours.find((h) => h.wind >= WINDY)
  if (windy) return `[host]，${when(windy.hour)}风很大，出门抓紧帽子，别被吹跑啦~`
  if (w.max >= HOT) return `[host]，今天最高${w.max}℃，好热呀，多喝水别中暑~`
  if (w.min <= FREEZING) return `[host]，今天最低${w.min}℃，出门把自己裹严实哦~`
  if (w.max - w.tomorrowMax >= CHILL) return `[host]，明天要降温${w.max - w.tomorrowMax}℃，记得加衣服哦~`
  return null
}

function forecast(w: Weather): string {
  const rain = w.hours.some((h) => name(h.code).includes('雨'))
  return `[host]，今天${save.settings.weatherCity}${name(w.code)}，${w.min}~${w.max}℃${rain ? '，出门记得带伞哦~' : '~'}`
}

/** At most one weather line a day: a warning once bad weather is due, otherwise sometimes a forecast at launch. */
export async function weatherNews(launch: boolean): Promise<string | null> {
  const today = String(dayStart())
  if (save.saveJsonData.weather === today) return null
  // Offline or unknown city: stay quiet, the next check tries again.
  const w = await window.qqpet.weather(save.settings.weatherCity).catch(() => null)
  const s = w && (warning(w) ?? (launch && Math.random() < 0.5 ? forecast(w) : null))
  if (s) update('saveJsonData', { weather: today })
  return s
}

/** Asked for, e.g. right after the city is set; rejects when the weather cannot be fetched. */
export async function weatherNow(): Promise<string> {
  const w = await window.qqpet.weather(save.settings.weatherCity)
  return warning(w) ?? forecast(w)
}
