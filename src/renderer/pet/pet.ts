import { PetSwf } from '../swf/pet-swf'
import { floatMood } from '../ui/float'
import { say } from '../ui/talk'
import { DEAD, illOf } from './data/ills'
import { TALK, type Line } from './data/talk'
import { Machine, type Pose } from './machine'
import { rand } from './rand'
import {
  activity,
  addInfo,
  fatigue,
  growthPerMinute,
  info,
  mood,
  onInfoChange,
  refreshTray,
  save,
  setActivity,
  setInfo,
  setTray,
  stage,
  syncLevel,
  update,
} from './store'

let idleTimer = 0

export const machine = new Machine(new PetSwf(document.getElementById('pet')!), (over, next) => {
  clearTimeout(idleTimer)
  if (next.a === 'normal') idleTimer = window.setTimeout(idle, Math.trunc(Math.random() * 40000 + 20000))
  over.e?.()
  next.s?.()
})

/** After 20-60 s of standing: play an animation, or chat for a small mood bonus. */
function idle(): void {
  if (Math.random() < 0.8) return machine.add({ a: 'play' })
  speak({ c: 'smallTalk' }, 'speak', {
    ok: () => {
      const v = rand(5, 15)
      void floatMood(v)
      setInfo('mood', Math.min(info.mood + v, 1000))
    },
  })
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
}

/** Shows a bubble, optionally together with an action that it waits for. */
export function speak(t: Say, action?: string, hooks: { start?: () => void; end?: () => void; ok?: () => void } = {}): void {
  let text = t.s ?? ''
  let button = t.b ?? '好的'
  if (t.c) {
    const l = line(t.c, t.s)
    text = l?.tolk ?? `${t.c}-${t.s}聊天数据丢失，请联系管理员处理`
    button = l?.submitText ?? '好的'
  }
  text = text.replace(/\[host\]/g, info.host)
  const show = (): void => {
    void say(text, [button], hooks.ok ? [hooks.ok] : [])
    hooks.start?.()
  }
  if (!action || !info.health) return show()
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

/** Today's 06:00 (yesterday's before 06:00), when daily counters reset. */
function dayStart(now: number): number {
  const d = new Date(now * 1000)
  d.setHours(6, 0, 0, 0)
  if (d.getTime() > now * 1000) d.setDate(d.getDate() - 1)
  return d.getTime() / 1000
}

/** Per-minute accounting: online time, stat decay and growth for the elapsed minutes. */
function tick(): void {
  const now = Math.floor(Date.now() / 1000)
  if (save.nowTimeLine <= dayStart(now)) setInfo('onlineDataTime', 0)
  if (lastTick !== null) {
    const minutes = +((now - lastTick) / 60).toFixed(5)
    addInfo('onlineDataTime', minutes)
    addInfo('onLineTime', minutes)
    const moodRate = rand(1, 2)
    // Growth only counts the minutes the mood lasted.
    const grown = Math.min(minutes, info.mood / moodRate)
    setInfo('mood', Math.max(info.mood - moodRate * minutes, 0))
    setInfo('hunger', Math.max(info.hunger - rand(2, 3) * minutes, 0))
    setInfo('clean', Math.max(info.clean - rand(2, 3) * minutes, 0))
    addInfo('growth', +(growthPerMinute() * grown).toFixed(8))
  }
  lastTick = now
  update('nowTimeLine', now)
}

/** Random illness for a tired pet, and further health loss once ill. */
function healthRoll(): void {
  const f = fatigue()
  if (!f) return
  if (info.health !== 5) {
    if (rand(0, 700 - f * 50) < 5) setInfo('health', info.health - 1)
    return
  }
  const r = rand(0, 1300 - f * 100)
  if (r < 10) {
    setActivity('ill', `${r % 3}-`)
    setInfo('health', 4)
  }
}

function grow(): void {
  if (info.health <= 0) {
    lastTick = null
    return
  }
  tick()
  refreshTray()
  healthRoll()
}

function startGrowth(): void {
  grow()
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
    machine.play({ a, s: () => speak({ c: a }), e: startGrowth })
    if (info.growth === 0) addInfo('growth', 1)
  }
  machine.start()
}
