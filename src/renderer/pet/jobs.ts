import type { StudyInfo } from '../../shared/save'
import { openEmail } from '../ui/email'
import { openExam } from '../ui/exam'
import { floatMood } from '../ui/float'
import { windowView } from '../ui/window-view'
import { startTask, type Task } from './activity'
import { isBuddy, takePhoto } from './album'
import { allGoods, attrs, goodOf, type Good } from './data/goods'
import PROVINCES from './data/travel.json'
import { addGood } from './goods'
import { apply } from './items'
import { loot } from './loot'
import { mailPhoto } from './mail'
import { speak } from './pet'
import { rand } from './rand'
import { activity, addInfo, busy, info, luck, save, setInfo, update } from './store'
import { addCount } from './tasks'

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
  else if (save.settings.paused) speak({ s: `[host],我暂停成长拉！无法${what}~~`, now: true }, 'speak')
  else if (info.mood <= 0) speak({ s: `[host],没有心情哦！无法${sad}~~`, now: true }, 'speak')
  else if (busy()) speak({ s: '[host],做事要专心哦~~', now: true }, 'speak')
  else return false
  return true
}

/** The diploma a studyInfo value stands for, e.g. "中学语文"; '' before primary school is done. */
export const diploma = (k: string, v: number): string => school(v).name && school(v).name + goodOf('study', `xx-${k}`).object

export const workGoods = (): Good[] => allGoods('work')

export function describeWork(g: Good): string[] {
  const edu = Object.entries(g.education ?? {})
    .map(([k, v]) => diploma(k, v))
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
  speak({ s: '[host]，我开始工作了哦~', now: true }, 'speak', { start: () => startTask(workTask(g), g.id) })
  return true
}

const workTask = (g: Good): Task => ({
  key: 'work',
  minutes: g.useTime!,
  end: () => {
    addInfo('yb', g.yb!)
    apply(g)
    addCount('Work')
    speak({ c: 'state', s: 'overWork', now: true }, 'speak')
  },
})

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
  speak({ s: `[host]，我被分配到${rand(1e6, 9999999)}班学习${g.object},我放学就回来，不要太想念我哦~~~`, now: true }, 'speak', {
    start: () => startTask(studyTask(g), g.id),
  })
  return true
}

function studyTask(g: Good): Task {
  const minutes = g.useTime!
  return {
    key: 'study',
    minutes,
    // A clever pet may be let out of the last five minutes.
    early: (done) => done > minutes - 5 && rand(0, Math.max(200, 3000 - info.intel / 10)) <= 10,
    end: (early) => {
      learn(subjectOf(g))
      apply(g)
      addCount('Study')
      if (lessons(g) === g.classNum) examPrompt(g)
      else speak({ c: 'state', s: early ? 'cententStudy' : 'overStudy', now: true }, 'speak')
    },
  }
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
  const [g] = loot(1, isNew ? 2 : 1)
  addGood(g.type, g.id, 1)
  windowView({ title: '旅游奇遇~~', msg: '带回物品~~', goods: [g] })
}

function back(p: Province, early: boolean): void {
  const isNew = visit(p.name)
  addCount('Travel1')
  void floatMood(20)
  setInfo('mood', Math.min(info.mood + 20, 1000))
  const e = p.extraordinaryEncounter[rand(0, p.extraordinaryEncounter.length - 1)]
  speak({ s: e.tolk, b: e.submitText, now: true }, 'speak', early ? { ok: () => souvenir(isNew) } : {})
  const shot = takePhoto(p.name)
  if (!shot) return
  mailPhoto(shot)
  const s = isBuddy(shot.id) ? '[host]，我在路上遇到了旅游搭子，一起拍了张合照，寄到邮箱啦~' : `[host]，我在${p.name}拍了张明信片寄给你，快去邮箱看看吧~`
  speak({ s, b: '这就去' }, 'speak', { ok: openEmail })
}

/** An hour in a random province; a lucky pet comes back early from an encounter. */
export function travel(): void {
  if (cannot('旅行了', '去旅游哦')) return
  const p = PROVINCES[rand(0, PROVINCES.length - 1)]
  speak({ s: `[host]，我开始去${p.name}了哦~`, now: true }, 'speak', { start: () => startTask(tripTask(p), p.name) })
}

const tripTask = (p: Province): Task => ({
  key: 'trip',
  minutes: 60,
  early: (done) => done > 55 && rand(0, 1000 - luck() * 10) <= 10,
  end: (e) => back(p, e),
})

/** Rebuilds a task from its activeOption value; null for a job or city this version does not know. */
const REBUILD: Record<Task['key'], (v: string) => Task | null> = {
  work: (v) => (goodOf('work', v).useTime ? workTask(goodOf('work', v)) : null),
  study: (v) => (goodOf('study', v).useTime ? studyTask(goodOf('study', v)) : null),
  trip: (v) => {
    const p = PROVINCES.find((x) => x.name === v)
    return p ? tripTask(p) : null
  },
}

/** Picks up the task running when the app quit, the time it was closed counting too; one already due ends once growth starts. */
export function resumeTask(): void {
  const key = (['work', 'study', 'trip'] as const).find((k) => activity(k))
  const value = key ? activity(key)! : ''
  update('activeOption', { work: null, study: null, trip: null })
  const t = key && info.health > 0 ? REBUILD[key](value) : null
  if (!t) return
  const offline = Math.max(Date.now() / 1000 - save.nowTimeLine, 0) / 60
  startTask(t, value, Math.min(Number(save.saveJsonData.activity ?? 0) + offline, t.minutes))
}
