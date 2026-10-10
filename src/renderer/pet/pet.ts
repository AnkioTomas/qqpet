import { PetSwf } from '../swf/pet-swf'
import { openEmail } from '../ui/email'
import { floatMood } from '../ui/float'
import { retell, say } from '../ui/talk'
import { DEAD, illOf } from './data/ills'
import { TALK, type Line } from './data/talk'
import { advanceTask, stopTask } from './activity'
import { IDLE, rephrase } from './ai'
import { dateTalk, festival, greeting, loadCalendar } from './calendar'
import { listGoods, tickTimed } from './goods'
import { useItem } from './items'
import { deliverMails } from './mail'
import { Machine, type Pose } from './machine'
import { rand } from './rand'
import {
  activity,
  addInfo,
  applyEdge,
  busy,
  edgeSide,
  fatigue,
  growthPerMinute,
  info,
  mood,
  onInfoChange,
  petSize,
  playingDesk,
  refreshTray,
  save,
  setActivity,
  setInfo,
  setTray,
  stage,
  syncLevel,
  update,
} from './store'
import { resetFish } from './fishing'
import { harvestNews } from './harvest'
import { resetSignIn, tickGift } from './signin'
import { resetTasks, rollDaily } from './tasks'
import { dayStart, newDay } from './vip'
import { weatherNews } from './weather'

let idleTimer = 0

export const machine = new Machine(new PetSwf(document.getElementById('pet')!), (over, next) => {
  clearTimeout(idleTimer)
  if (next.a === 'normal' || next.a === 'hideleft' || next.a === 'hideright') {
    idleTimer = window.setTimeout(idle, Math.trunc(Math.random() * 40000 + 20000))
  }
  over.e?.()
  next.s?.()
})

/** Answering the pet's small talk cheers it up. */
function cheer(): void {
  const v = rand(5, 15)
  void floatMood(v)
  setInfo('mood', Math.min(info.mood + v, 1000))
}

/** Official lead cooldown (`operatereffecttime="3600"`). Session-only; a restart may show it once. */
const LEAD_CD = 3600
let lastLead = 0
let walkTick = 0

const peeking = (): boolean => machine.pose.a === 'hideleft' || machine.pose.a === 'hideright'

/** Hungry / dirty / poor, same order as the official lead package. */
function leadOf(): 'hungry' | 'dirty' | 'poor' | null {
  if (info.hunger < 300) return 'hungry'
  if (info.clean < 300) return 'dirty'
  if (info.yb < 200) return 'poor'
  return null
}

/** Adult official pack only shipped poor; hungry/dirty fall back to a speak clip. */
function leadClip(kind: 'hungry' | 'dirty' | 'poor'): string {
  if (kind !== 'poor' && stage() === 'Adult') return 'speak'
  return kind
}

/** Plays the official need animation (and the unused `state.eat` / `state.clean` lines). */
function maybeLead(): boolean {
  if (machine.pose.a !== 'normal' || busy() || info.health < 5 || save.settings.paused) return false
  if (Date.now() / 1000 - lastLead < LEAD_CD) return false
  const kind = leadOf()
  if (!kind) return false
  lastLead = Date.now() / 1000
  const talk = kind === 'hungry' ? 'eat' : kind === 'dirty' ? 'clean' : 'poor'
  speak({ c: 'state', s: talk, now: true }, leadClip(kind))
  return true
}

function stopWalk(): void {
  clearInterval(walkTick)
  walkTick = 0
  if (machine.pose.a !== 'walk') return
  // walkstop is a 1-frame clip; the machine treats those as a hold, so it stuck on the same pose.
  machine.play({ a: applyEdge() ?? 'normal' })
}

/** Move only after the walk pose is on screen. play() is async; starting the timer earlier suicides. */
function startWalkMove(speed: number, until: number): void {
  clearInterval(walkTick)
  walkTick = window.setInterval(() => {
    if (machine.pose.a !== 'walk') {
      clearInterval(walkTick)
      walkTick = 0
      return
    }
    const next = info.lastX + speed
    const max = innerWidth - petSize()
    if (Date.now() > until || next <= 0 || next >= max) {
      setInfo('lastX', Math.min(Math.max(next, 0), max))
      stopWalk()
      return
    }
    setInfo('lastX', next)
  }, 1000 / 12)
}

/** In-place walk cycle; we move the box at the official 8 px / 12 fps, scaled to pet size. */
function walk(): boolean {
  if (!save.settings.roam || busy() || playingDesk() || info.health < 5) return false
  if (machine.pose.a !== 'normal' || edgeSide()) return false
  const s = petSize()
  const roomL = info.lastX
  const roomR = innerWidth - info.lastX - s
  if (roomL < 48 && roomR < 48) return false
  const dir: 'left' | 'right' = roomL < 80 ? 'right' : roomR < 80 ? 'left' : Math.random() < 0.5 ? 'left' : 'right'
  const speed = 8 * (s / 144) * (dir === 'left' ? -1 : 1)
  machine.play({
    a: 'walk',
    opt: { url: `pet/Action/${info.sex}/${stage()}/walk/walk_${dir}.swf`, opt: {} },
    s: () => startWalkMove(speed, Date.now() + rand(2000, 5000)),
  })
  return true
}

/** After 20-60 s of standing: walk / play / talk, same timer. Walk only if roam is on. */
function idle(): void {
  if (peeking() || playingDesk()) return
  if (maybeLead()) return
  if (save.settings.roam) {
    const n = Math.trunc(Math.random() * 3)
    if (n === 0 && walk()) return
    if (n !== 2) return machine.add({ a: 'play' })
  } else if (Math.random() < 0.8) {
    return machine.add({ a: 'play' })
  }
  const date = Math.random() < 0.3 ? dateTalk() : null
  speak(date ? { s: date, ai: IDLE } : { c: 'smallTalk', ai: IDLE }, 'speak', { ok: cheer })
}

function line(c: string, s?: string): Line | null {
  let lines = TALK[c] ?? []
  if (s && !Array.isArray(lines)) lines = lines[s] ?? []
  return Array.isArray(lines) && lines.length ? lines[rand(0, lines.length - 1)] : null
}

interface Say {
  /** Dialog category in TALK, with `s` as sub key; otherwise `s` is the literal text. */
  c?: string
  s?: string
  /** Button label. */
  b?: string
  /** Preempt the current animation instead of queueing. */
  now?: boolean
  /**
   * While AI is on: a prompt to rewrite the line (shown first, then replaced),
   * `IDLE` waits for the model (the stock line is only a hint), `false` keeps the text.
   */
  ai?: string | false
}

/** Shows a bubble, optionally together with an action that it waits for. Do-not-disturb drops only the bubble. */
export function speak(t: Say, action?: string, hooks: { start?: () => void; end?: () => void; ok?: () => void } = {}): void {
  let text = t.s ?? ''
  let button = t.b ?? '好的'
  if (t.c) {
    const l = line(t.c, t.s)
    text = l?.tolk ?? `${t.c}-${t.s}聊天数据丢失，请联系管理员处理`
    button = l?.submitText ?? '好的'
  }
  text = text.replace(/\[host]/g, info.host)
  const onOk = hooks.ok ? [hooks.ok] : []
  const show = (): void => {
    if (!save.settings.quiet) {
      if (t.ai === IDLE) void rephrase(text, t.ai).then((s) => void say(s ?? text, [button], onOk))
      else {
        const said = say(text, [button], onOk)
        if (t.ai !== false) void Promise.all([rephrase(text, t.ai), said]).then(([s]) => s && void retell(text, s))
      }
    }
    hooks.start?.()
  }
  if (!action || (!info.health && action !== 'bury')) return show()
  // Peek is a sliver SWF; speak/play would draw the full body and walk it off the edge.
  if ((action === 'speak' || action === 'play') && (machine.pose.a === 'hideleft' || machine.pose.a === 'hideright')) return show()
  const pose: Pose = { a: action, s: show, e: hooks.end }
  if (t.now) machine.play(pose)
  else machine.add(pose)
}

let reviving = false
export function revive(done?: () => void): void {
  if (reviving) return
  reviving = true
  machine.play({
    a: 'revival',
    e: () => {
      speak({ s: '[host]，再次见到你很高兴~~ ', b: '我也很高兴~' })
      setInfo('health', 5)
      done?.()
      reviving = false
      burying = false
    },
  })
}

let burying = false
export function bury(done?: () => void): void {
  if (burying) return
  burying = true
  update('isBury', true)
  setTray('bury')
  speak({ c: 'state', s: 'bury' }, 'bury', { start: done })
}

let lastMood = mood()
onInfoChange((key, prev) => {
  if (key === 'growth') {
    const before = syncLevel()
    const now = save.petComputedlInfo.level
    if (now === before) return
    const first = (now === 5 && before === 4) || (now === 10 && before === 9)
    speak({ c: first ? `first${now === 5 ? 1 : 2}` : 'levUp', now: true }, first ? 'first' : 'levUp')
  } else if (key === 'health') {
    healthChanged(prev as number)
  } else if (key === 'mood' && mood() !== lastMood) {
    lastMood = mood()
    if (stage() === 'Adult') speak({ c: 'mood', s: lastMood, now: true }, 'speak')
  } else if (key === 'hunger' || key === 'clean' || key === 'yb') {
    maybeLead()
  }
})

function healthChanged(prev: number): void {
  const h = info.health
  if (h < 0 || Number.isNaN(h)) return setInfo('health', 0)
  if (h > 5) return setInfo('health', 5)
  if (h === 5) {
    if (prev === 0) revive()
    setActivity('ill', null)
    return setTray('normal')
  }
  if (h === 0) {
    speak({ s: DEAD.tolk, now: true }, 'dying', { start: () => machine.add({ a: 'die' }) })
    return setTray('dead')
  }
  if (!activity('ill')) setActivity('ill', `${rand(0, 2)}-`)
  speak({ s: illOf(activity('ill')! + h).tolk, now: true }, 'sick')
  setTray('ill')
}

/** Last accounted time; null makes the next tick only start the clock (start-up, or after a pause). */
let lastTick: number | null = null

const MOOD_OUT = { work: 'stopWorkFoMood0', study: 'stopStudyFoMood0', trip: 'overTripUpFoMood0' }

/** Per-minute accounting: online time, stat decay and growth for the elapsed minutes. */
function tick(): void {
  const now = Math.floor(Date.now() / 1000)
  const today = dayStart(now)
  if (save.nowTimeLine <= today) {
    setInfo('onlineDataTime', 0)
    newDay(today)
    resetTasks()
    resetSignIn()
    resetFish()
    void daily()
  }
  if (lastTick !== null) {
    const minutes = +((now - lastTick) / 60).toFixed(5)
    addInfo('onlineDataTime', minutes)
    addInfo('onLineTime', minutes)
    tickGift(minutes)
    // Work, study and travel wear the pet out faster.
    const extra = busy() ? 1 : 0
    const moodRate = rand(1, 2) + extra
    // Growth only counts the minutes the mood lasted; an activity stops when it runs out.
    const grown = Math.min(minutes, info.mood / moodRate)
    if (grown < minutes) {
      const stopped = stopTask()
      if (stopped) speak({ c: 'state', s: MOOD_OUT[stopped], now: true }, 'speak')
    }
    setInfo('mood', Math.max(info.mood - moodRate * minutes, 0))
    setInfo('hunger', Math.max(info.hunger - (rand(2, 3) + extra) * minutes, 0))
    setInfo('clean', Math.max(info.clean - (rand(2, 3) + extra) * minutes, 0))
    addInfo('growth', +(growthPerMinute() * grown).toFixed(8))
    if (info.sweetHeart) selfCare()
    for (const type of tickTimed(grown)) speak({ c: 'state', s: `${type}Over`, now: true }, 'speak')
    advanceTask(grown)
  }
  lastTick = now
  update('nowTimeLine', now)
}

/** The first need under 60% (food before cleaning before play), with the words the pet says. */
const NEEDS = [
  { stat: 'hunger', type: 'food', act: '吃东西' },
  { stat: 'clean', type: 'clean', act: '洗白白' },
  { stat: 'mood', type: 'toy', act: '玩玩具' },
] as const

/** Sweetheart: the pet tends its most urgent need with the first matching good it owns. */
function selfCare(): void {
  const need = NEEDS.find((n) => info[n.stat] / save.petComputedlInfo[`${n.stat}Max`] < 0.6)
  if (!need) return
  const g = listGoods(need.type, 1, 1).list[0]
  if (g) useItem(g, false, `[host]，我可以自己${need.act}哦！~~使用了：${g.name}`)
}

/** Random illness for a tired pet, and further health loss once ill. */
function healthRoll(): void {
  const f = fatigue()
  if (!f) return
  if (info.health !== 5) {
    // 8x slower than the original: at its rate an unattended Lv1 pet died within one night (median ~9.5 h).
    if (rand(0, (700 - f * 50) * 8) < 5) setInfo('health', info.health - 1)
    return
  }
  const r = rand(0, 1300 - f * 100)
  if (r < 10) {
    setActivity('ill', `${r % 3}-`)
    setInfo('health', 4)
  }
}

/** A dead or paused pet does not age; the minutes in between are never accounted. */
function grow(): void {
  if (info.health <= 0 || save.settings.paused) {
    lastTick = null
    return
  }
  tick()
  refreshTray()
  healthRoll()
  void harvestNews().then((n) => n && speak({ s: n.s, b: '去看看' }, 'speak', { ok: n.ok }))
}

/** At start-up and at 06:00: the day's tasks, the holiday greeting and the day's mail. */
const weatherTalk = (launch: boolean): Promise<void> => weatherNews(launch).then((s) => void (s && speak({ s }, 'speak')))

/** Day daily() last ran for; a launch on a new day reaches it from both startPet and tick. */
let dailyDay = 0

async function daily(): Promise<void> {
  if (dailyDay === dayStart()) return
  dailyDay = dayStart()
  const today = await loadCalendar()
  rollDaily(today)
  const f = today && festival(today)
  if (f) speak({ s: f }, 'speak')
  void weatherTalk(true)
  if (deliverMails(today)) speak({ s: '[host]，邮箱里来了新邮件，快去看看吧~', b: '这就去' }, 'speak', { ok: openEmail })
}

function startGrowth(): void {
  grow()
  // A task resumed after a restart may be due already.
  advanceTask(0)
  setInterval(grow, 60_000)
}

export function startPet(): void {
  refreshTray()
  if (save.isBury) {
    bury()
    setTray('dead')
  } else if (info.health === 0) {
    speak({ s: DEAD.tolk, b: '别走~' })
    machine.play({ a: 'dying', s: () => machine.add({ a: 'die' }) })
    setTray('dead')
    startGrowth()
  } else {
    if (info.health < 5) setTray('ill')
    const a = info.growth === 0 ? 'first' : 'enter'
    // Half the launches greet by the time of day instead of the original enter lines.
    const g = a === 'enter' && Math.random() < 0.5 ? greeting() : null
    machine.play({ a, s: () => speak(g ? { s: g.tolk, b: g.submitText } : { c: a }), e: startGrowth })
    if (info.growth === 0) addInfo('growth', 1)
    void daily()
    // Bad weather can turn up later in the day.
    setInterval(() => void weatherTalk(false), 3600_000)
  }
  machine.start()
}
