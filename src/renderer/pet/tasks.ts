import { parseGood, type Good } from './data/goods'
import { give } from './items'
import { loot } from './loot'
import { save, update } from './store'

/** Amusing: face pokes today; Travel1: trips today; Travel2: provinces visited since the tour was last finished. */
type Counter = 'Amusing' | 'Travel1' | 'Travel2'
export type Tab = 'ddw' | 'travel'

interface Task {
  label: string
  msg: string
  obj: Counter
  num: number
  /** City tasks stay taken across days. */
  keep?: boolean
  /** Rerolled every day: that many random goods. */
  reroll?: number
  good?: string[]
}

export const TABS: Record<Tab, string> = { ddw: '逗逗我', travel: '旅游任务' }

const DDW = '鼠标点击逗乐点位'
const TASKS: Record<Tab, Task[]> = {
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

/** Progress kept in saveJsonData.task, in the original's shape: entries line up with TASKS. */
interface Progress {
  doNums: Partial<Record<Counter, number>>
  taskList: Record<Tab, { take: boolean; good: Good[] }[]>
}

const rewards = (t: Task): Good[] => (t.reroll ? loot(t.reroll) : t.good!.map(parseGood))

function load(): Progress {
  const p: Partial<Progress> = JSON.parse(save.saveJsonData.task || '{}')
  const list = (tab: Tab) => TASKS[tab].map((t, i) => p.taskList?.[tab]?.[i] ?? { take: false, good: rewards(t) })
  return { doNums: p.doNums ?? {}, taskList: { ddw: list('ddw'), travel: list('travel') } }
}

const progress = load()
const store = (): void => update('saveJsonData', { task: JSON.stringify(progress) })

export function count(obj: Counter): number {
  return obj === 'Travel2' ? save.gameSaveDatas.travel_china.length : (progress.doNums[obj] ?? 0)
}

export function addCount(obj: 'Amusing' | 'Travel1'): void {
  progress.doNums[obj] = count(obj) + 1
  store()
}

export const tasks = (tab: Tab) => TASKS[tab].map((t, i) => ({ ...t, ...progress.taskList[tab][i], done: count(t.obj) }))

/** Hands out a finished task's goods; false when it is not finished yet. */
export function claim(tab: Tab, i: number): Good[] | false {
  const t = TASKS[tab][i]
  const p = progress.taskList[tab][i]
  if (p.take || count(t.obj) < t.num) return false
  p.take = true
  store()
  give(p.good, `[host],我们完成${t.label}任务啦！~~`)
  return p.good
}

/** 06:00: daily tasks open again, with fresh random rewards, and the day's counters restart. */
export function resetTasks(): void {
  for (const tab of Object.keys(TASKS) as Tab[])
    TASKS[tab].forEach((t, i) => {
      const p = progress.taskList[tab][i]
      if (!t.keep) p.take = false
      if (t.reroll) p.good = rewards(t)
    })
  progress.doNums.Amusing = 0
  progress.doNums.Travel1 = 0
  store()
}

/** Finishing the tour clears the visited provinces, so the city tasks can be done again. */
export function resetTour(): void {
  for (const p of progress.taskList.travel.slice(2)) p.take = false
  store()
}
