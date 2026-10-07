import type { StudyInfo } from '../../shared/save'
import { openExam } from '../ui/exam'
import { floatMood } from '../ui/float'
import { windowView } from '../ui/window-view'
import { startTask } from './activity'
import { allGoods, attrs, findGood, goodOf, type Good } from './data/goods'
import POOLS from './data/pool.json'
import PROVINCES from './data/travel.json'
import { addGood } from './goods'
import { apply } from './items'
import { speak } from './pet'
import { rand } from './rand'
import { addInfo, busy, info, luck, paused, save, setInfo, update } from './store'

export { PROVINCES }

type Subject = keyof StudyInfo
const SUBJECTS: Subject[] = ['chinese', 'mathematics', 'politics', 'music', 'art', 'manner', 'pe', 'labouring', 'wushu']

/** Schools by studyInfo value: `name` is the diploma a value up to `max` stands for, `key` the school attended. */
const SCHOOLS = [
  { max: 9, key: 'xx', name: '' },
  { max: 30, key: 'zx', name: '小学' },
  { max: 71, key: 'dx', name: '中学' },
  { max: 167, key: 'yjs', name: '大学' },
  { max: Infinity, key: 'xwzj', name: '研究生' },
]
const school = (v: number) => SCHOOLS.find((s) => v <= s.max)!

/** Study goods are `<school>-<subject>`. */
const subjectOf = (g: Good): Subject => g.id.split('-')[1] as Subject
/** Lessons done at the current school. */
const lessons = (g: Good): number => save.studyInfo[subjectOf(g)] - g.classNumUp!
const learn = (k: Subject): void => update('studyInfo', { [k]: save.studyInfo[k] + 1 })

/** The checks before work, study and travel; true (after saying why) when the pet can't start. */
function cannot(what: string, sad = what): boolean {
  if (info.health === 0) speak({ c: 'state', s: 'die' })
  else if (info.health !== 5) speak({ s: `[host],我生病了无法${what}~~`, now: true }, 'speak')
  else if (paused) speak({ s: `[host],我暂停成长拉！无法${what}~~`, now: true }, 'speak')
  else if (info.mood <= 0) speak({ s: `[host],没有心情哦！无法${sad}~~`, now: true }, 'speak')
  else if (busy()) speak({ s: '[host],做事要专心哦~~', now: true }, 'speak')
  else return false
  return true
}

export const workGoods = (): Good[] => allGoods('work')

export function describeWork(g: Good): string[] {
  const edu = Object.entries(g.education ?? {})
    .map(([k, v]) => school(v).name && school(v).name + goodOf('study', `xx-${k}`).object)
    .filter(Boolean)
    .join('、')
  const req = (['charm', 'intel', 'strong'] as const)
    .filter((k) => g.useArtt?.[k])
    .map((k) => ` ${{ charm: '魅力', intel: '智力', strong: '武力' }[k]}：${g.useArtt![k]}`)
    .join('')
  const a = attrs(g)
  const lines = [
    g.desc,
    g.yb && `元宝：${g.yb}`,
    g.needLevel ? `需要大于${g.needLevel}级~` : '无等级要求~',
    edu && `学历要求：${edu}`,
    req && `属性要求：${req}`,
    `工作时长：${g.useTime}分钟`,
    a && `属性：${a}`,
  ]
  return lines.filter((l): l is string => Boolean(l))
}

/** Returns whether the pet went to work. */
export function work(g: Good): boolean {
  if (cannot('工作')) return false
  let no = ''
  if (g.needLevel! > save.petComputedlInfo.level) no = '[host]，我等级不够哦~'
  else if (Object.entries(g.useArtt ?? {}).some(([k, v]) => v > info[k as 'charm'])) no = '[host]，我还需要多吃，才能胜任这个工作哦！~'
  else if (Object.entries(g.education ?? {}).some(([k, v]) => v > save.studyInfo[k as Subject])) no = '[host]，书到用时方恨少啊，我一定要好好念书！~'
  if (no) {
    speak({ s: no, now: true }, 'speak')
    return false
  }
  const end = (): void => {
    addInfo('yb', g.yb!)
    apply(g)
    speak({ c: 'state', s: 'overWork', now: true }, 'speak')
  }
  speak({ s: '[host]，我开始工作了哦~', now: true }, 'speak', { start: () => startTask({ key: 'work', minutes: g.useTime!, end }, g.id) })
  return true
}

/** Each subject's lesson at the school its progress is in. */
export const studyGoods = (): Good[] =>
  SUBJECTS.map((k) => {
    const g = goodOf('study', `${school(save.studyInfo[k]).key}-${k}`)
    return { ...g, name: g.tolkName! }
  })

export function describeStudy(g: Good): string[] {
  const a = attrs(g)
  const lines = [g.desc, `课时：${g.classNum}`, `已学课时：${lessons(g)}`, a && `属性：${a}`, `学习时长：${g.useTime}分钟`]
  return lines.filter((l): l is string => Boolean(l))
}

/** All lessons of a school done: the pet asks for its exam. */
function examPrompt(g: Good): void {
  speak({ s: '[host]，我要升学啦，我一定好好考试！', b: '我要考试', now: true }, 'speak', {
    ok: () =>
      openExam(g.id, () => {
        speak({ s: '[host],好开心啊，我终于升学了！~', now: true }, 'speak')
        learn(subjectOf(g))
      }),
  })
}

/** Returns whether the pet went to class. */
export function study(g: Good): boolean {
  if (cannot('学习')) return false
  if (lessons(g) === g.classNum) {
    examPrompt(g)
    return false
  }
  const minutes = g.useTime!
  const end = (early: boolean): void => {
    learn(subjectOf(g))
    apply(g)
    if (lessons(g) === g.classNum) examPrompt(g)
    else speak({ c: 'state', s: early ? 'cententStudy' : 'overStudy', now: true }, 'speak')
  }
  // A clever pet may be let out of the last five minutes.
  const early = (done: number): boolean => done > minutes - 5 && rand(0, Math.max(200, 3000 - info.intel / 10)) <= 10
  speak({ s: `[host]，我被分配到${rand(1e6, 9999999)}班学习${g.object},我放学就回来，不要太想念我哦~~~`, now: true }, 'speak', {
    start: () => startTask({ key: 'study', minutes, early, end }, g.id),
  })
  return true
}

type Province = (typeof PROVINCES)[number]

/** Counts a visit; true for a province never visited before. */
function visit(name: string): boolean {
  const list = save.gameSaveDatas.travel_china
  const old = list.find((t) => t.name === name)
  update('gameSaveDatas', { travel_china: old ? list.map((t) => (t === old ? { name, value: t.value + 1 } : t)) : [...list, { name, value: 1 }] })
  return !old
}

/** An encounter brings a random good back: from the better pool for a new province. */
function souvenir(isNew: boolean): void {
  const pool = POOLS[isNew ? 2 : 1]
  const g = findGood(pool[rand(0, pool.length - 1)].slice(1))
  addGood(g.type, g.id, 1)
  windowView({ title: '旅游奇遇~~', msg: '带回物品~~', goods: [g] })
}

function back(p: Province, early: boolean): void {
  const isNew = visit(p.name)
  void floatMood(20)
  setInfo('mood', Math.min(info.mood + 20, 1000))
  const e = p.extraordinaryEncounter[rand(0, p.extraordinaryEncounter.length - 1)]
  speak({ s: e.tolk, b: e.submitText, now: true }, 'speak', early ? { ok: () => souvenir(isNew) } : {})
}

/** An hour in a random province; a lucky pet comes back early from an encounter. */
export function travel(): void {
  if (cannot('旅行了', '去旅游哦')) return
  const p = PROVINCES[rand(0, PROVINCES.length - 1)]
  const early = (done: number): boolean => done > 55 && rand(0, 1000 - luck() * 10) <= 10
  speak({ s: `[host]，我开始去${p.name}了哦~`, now: true }, 'speak', {
    start: () => startTask({ key: 'trip', minutes: 60, early, end: (e) => back(p, e) }, p.name),
  })
}
