import type { CalendarDay } from '../../shared/ipc'
import { parseGood, type Good } from './data/goods'
import { give } from './items'
import { loot } from './loot'
import { rand } from './rand'
import { info, save, update } from './store'
import { dayStart } from './vip'

/** Today's face pokes, trips, goods eaten, cleaned with and played with, and minutes of games; Travel2: provinces visited since the tour was last finished. */
export type Counter = 'Amusing' | 'Travel1' | 'Eat' | 'Clean' | 'Toy' | 'Game' | 'Travel2'
export type Tab = 'daily' | 'ddw' | 'travel'

interface Task {
  label: string
  msg: string
  obj: Counter
  num: number
  /** City tasks stay taken across days. */
  keep?: boolean
  /** Rerolled every day: that many random goods, besides `good`. */
  reroll?: number
  good?: string[]
}

export const TABS: Record<Tab, string> = { daily: '今日任务', ddw: '逗逗我', travel: '旅游任务' }

const DDW = '鼠标点击逗乐点位'
const TASKS: Record<Exclude<Tab, 'daily'>, Task[]> = {
  ddw: [
    { label: '逗逗我~~', msg: DDW, obj: 'Amusing', num: 5, good: ['_102010001*1'] },
    { label: '逗逗我2~~', msg: DDW, obj: 'Amusing', num: 10, good: ['_10012002*1'] },
    { label: '逗逗我3~~', msg: DDW, obj: 'Amusing', num: 15, good: ['_10013004*1'] },
    { label: '逗逗我4~~', msg: DDW, obj: 'Amusing', num: 20, reroll: 1 },
    { label: '逗逗我5~~', msg: DDW, obj: 'Amusing', num: 25, reroll: 2 },
  ],
  travel: [
    { label: '每日1游~~', msg: '去旅游一次吧~', obj: 'Travel1', num: 1, good: ['_102010001*1'] },
    { label: '每日5游~~', msg: '见多识广哦~', obj: 'Travel1', num: 5, reroll: 2 },
    {
      label: '去5个不同的城市~~',
      msg: '初行记​​ 烟霞初逢，人间烟火的温度，是你与世界交换的第一张明信片，游览5座不同的城市',
      obj: 'Travel2',
      num: 5,
      keep: true,
      good: ['_100010490*1'],
    },
    {
      label: '去10个不同的城市~~',
      msg: '漫游帖 山河漫笔，江南的桥，塞北的雪，像散落的诗笺，都是岁月等你签收的小确幸，游览10座不同的城市',
      obj: 'Travel2',
      num: 10,
      keep: true,
      good: ['_100010127*1'],
    },
    {
      label: '去15个不同的城市~~',
      msg: '寻踪录​ 故迹寻光，有些故事藏在门环后，有些传说埋在树影里，游览15座不同的城市',
      obj: 'Travel2',
      num: 15,
      keep: true,
      good: ['_100010239*1', '_100010497*1'],
    },
    {
      label: '去20个不同的城市~~',
      msg: '探微志​ 风物志异，从茶碗的釉色看一方水土，从方言的尾音听千年变迁，游览20座不同的城市',
      obj: 'Travel2',
      num: 20,
      keep: true,
      good: ['_100010417*1', '_100010499*1', '_100020155*1'],
    },
    {
      label: '去25个不同的城市~~',
      msg: '越障行 云程越嶂，那些被汗水浸透的脚印，终会连成独属于你的地图，游览25座不同的城市',
      obj: 'Travel2',
      num: 25,
      keep: true,
      good: ['_yb*1024', '_100020195*1', '_100020198*1', '_100020217*1'],
    },
    {
      label: '去30个不同的城市~~',
      msg: '奇旅帖​ 星野奇遇，旅行最妙的，是计划外的相遇，游览30座不同的城市',
      obj: 'Travel2',
      num: 30,
      keep: true,
      good: ['_100010485*1', '_100020221*1', '_100010353*1', '_b0000006*1', '_b0000015*1'],
    },
    {
      label: '去35个不同的城市~~',
      msg: '最好的风景，从来不在终点，而在你与它相遇时，眼里的光，游览35座不同的城市',
      obj: 'Travel2',
      num: 35,
      keep: true,
      good: ['_100010486*1', '_yb*2048', '_100020205*1', '_100020240*1', '_b0000016*1', '_60001*1'],
    },
  ],
}

/**
 * Progress kept in saveJsonData.task, in the original's shape: entries line up with TASKS.
 * `daily` holds today's generated tasks, made on the day starting at `dailyDay`.
 */
interface Progress {
  doNums: Partial<Record<Counter, number>>
  taskList: Record<Tab, { take: boolean; good: Good[] }[]>
  daily: Task[]
  dailyDay: number
}

const rewards = (t: Task): Good[] => [...(t.reroll ? loot(t.reroll) : []), ...(t.good ?? []).map(parseGood)]

function load(): Progress {
  const p: Partial<Progress> = JSON.parse(save.saveJsonData.task || '{}')
  // The original stored whole task objects, `take` only once claimed; the definitions here stay authoritative.
  const entry = (t: Task, e?: { take?: boolean; good: Good[] }) => (e ? { take: e.take === true, good: e.good } : { take: false, good: rewards(t) })
  const list = (tab: 'ddw' | 'travel') => TASKS[tab].map((t, i) => entry(t, p.taskList?.[tab]?.[i]))
  return {
    doNums: p.doNums ?? {},
    taskList: { daily: p.taskList?.daily ?? [], ddw: list('ddw'), travel: list('travel') },
    daily: p.daily ?? [],
    dailyDay: p.dailyDay ?? 0,
  }
}

const progress = load()
const store = (): void => update('saveJsonData', { task: JSON.stringify(progress) })
const defs = (tab: Tab): Task[] => (tab === 'daily' ? progress.daily : TASKS[tab])

export function count(obj: Counter): number {
  return obj === 'Travel2' ? save.gameSaveDatas.travel_china.length : (progress.doNums[obj] ?? 0)
}

export function addCount(obj: Exclude<Counter, 'Travel2'>, n = 1): void {
  progress.doNums[obj] = count(obj) + n
  store()
}

export const tasks = (tab: Tab) => defs(tab).map((t, i) => ({ ...t, ...progress.taskList[tab][i], done: count(t.obj) }))

/** Hands out a finished task's goods; false when it is not finished yet. */
export function claim(tab: Tab, i: number): Good[] | false {
  const t = defs(tab)[i]
  const p = progress.taskList[tab][i]
  if (p.take || count(t.obj) < t.num) return false
  p.take = true
  store()
  give(p.good, `[host],我们完成${t.label}任务啦！~~`)
  return p.good
}

/** 06:00: daily tasks open again, with fresh random rewards, and the day's counters restart. */
export function resetTasks(): void {
  for (const tab of Object.keys(TASKS) as (keyof typeof TASKS)[])
    TASKS[tab].forEach((t, i) => {
      const p = progress.taskList[tab][i]
      if (!t.keep) p.take = false
      if (t.reroll) p.good = rewards(t)
    })
  progress.doNums = {}
  store()
}

/** Kinds of daily task; one the pet `needs` right now is three times as likely, and says so. */
const KINDS: { obj: Exclude<Counter, 'Travel2'>; label: string; num: [number, number]; needs: () => boolean; msg: [string, string] }[] = [
  {
    obj: 'Eat',
    label: '喂我吃东西{n}次',
    num: [2, 4],
    needs: () => info.hunger < save.petComputedlInfo.hungerMax / 2,
    msg: ['肚子咕咕叫啦，快给我吃点东西吧~', '吃饱饱才能长高高~'],
  },
  {
    obj: 'Clean',
    label: '帮我洗香香{n}次',
    num: [1, 3],
    needs: () => info.clean < save.petComputedlInfo.cleanMax / 2,
    msg: ['身上脏脏的，好难受呀~', '香香的才招人喜欢~'],
  },
  { obj: 'Toy', label: '陪我玩玩具{n}次', num: [2, 4], needs: () => info.mood < 500, msg: ['人家不开心，陪我玩一会儿嘛~', '一起玩最开心啦~'] },
  { obj: 'Amusing', label: '逗逗我{n}次', num: [10, 20], needs: () => info.mood < 500, msg: ['心情不好，逗我笑一笑吧~', DDW] },
  { obj: 'Game', label: '陪我玩小游戏{n}分钟', num: [5, 15], needs: () => info.mood < 500, msg: ['好无聊呀，陪我玩会儿小游戏吧~', '一起玩小游戏吧~'] },
  {
    obj: 'Travel1',
    label: '带我去旅游{n}次',
    num: [1, 2],
    needs: () => [0, 6].includes(new Date().getDay()),
    msg: ['周末啦，出去走走吧~', '读万卷书，行万里路~'],
  },
]

/** Today's three tasks drawn by the pet's needs, plus one on statutory holidays; made once per day. */
export function rollDaily(today?: CalendarDay): void {
  if (progress.dailyDay === dayStart()) return
  const pool = KINDS.flatMap((k) => Array<typeof k>(k.needs() ? 3 : 1).fill(k))
  const daily: Task[] = []
  while (daily.length < 3) {
    const k = pool[rand(0, pool.length - 1)]
    const num = rand(...k.num)
    if (!daily.some((t) => t.obj === k.obj))
      daily.push({ label: k.label.replace('{n}', String(num)), msg: k.msg[k.needs() ? 0 : 1], obj: k.obj, num, reroll: 1, good: [`_yb*${rand(2, 5) * 10}`] })
  }
  const h = today?.holiday
  if (h?.off) daily.push({ label: `${h.name}快乐`, msg: `过节啦，陪我玩5次玩具一起庆祝吧~`, obj: 'Toy', num: 5, reroll: 2, good: ['_yb*100'] })
  progress.daily = daily
  progress.dailyDay = dayStart()
  progress.taskList.daily = daily.map((t) => ({ take: false, good: rewards(t) }))
  store()
}

/** Finishing the tour clears the visited provinces, so the city tasks can be done again. */
export function resetTour(): void {
  for (const p of progress.taskList.travel.slice(2)) p.take = false
  store()
}
