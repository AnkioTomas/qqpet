import { machine, speak } from '../pet/pet'
import { addInfo, busy, info, petSize, playingDesk, refreshTray, save, setDeskGame, setInfo, setTray, stage } from '../pet/store'
import { addCount } from '../pet/tasks'
import './css/smallgame.css'
import { button } from './dom'

/** Official `DiudiuleConfig.xml`. */
const G = 500
const POWER = 80 / 100
const DAMP = 0.55
const STOP = 80
const MIN = 280

let fly = 0
let vx = 0
let vy = 0
let t0 = 0
let quit: HTMLDivElement | null = null
let born = 0

const clip = (v: number, max: number): number => Math.min(Math.max(v, 0), max)

function stopFly(): void {
  if (fly) cancelAnimationFrame(fly)
  fly = 0
}

function land(tossed: boolean): void {
  stopFly()
  const s = petSize()
  setInfo('lastX', Math.round(clip(info.lastX, innerWidth - s)))
  setInfo('lastY', Math.round(clip(info.lastY, innerHeight - s)))
  if (playingDesk() !== 'diudiule') return
  machine.play({ a: 'normal' })
  if (!tossed) return
  const mood = Math.min(55, save.petComputedlInfo.moodMax - info.mood)
  setInfo('mood', info.mood + mood)
  addInfo('yb', 1)
}

function step(now: number): void {
  if (playingDesk() !== 'diudiule') return stopFly()
  const dt = Math.min((now - t0) / 1000, 0.05)
  t0 = now
  vy += G * dt
  const s = petSize()
  const maxX = innerWidth - s
  const maxY = innerHeight - s
  let x = info.lastX + vx * dt
  let y = info.lastY + vy * dt
  if (x < 0) {
    x = 0
    vx = Math.abs(vx) * DAMP
  } else if (x > maxX) {
    x = maxX
    vx = -Math.abs(vx) * DAMP
  }
  if (y < 0) {
    y = 0
    vy = Math.abs(vy) * DAMP
  } else if (y > maxY) {
    y = maxY
    vy = -Math.abs(vy) * DAMP
    vx *= 0.85
  }
  setInfo('lastX', x)
  setInfo('lastY', y)
  if (now - born > 8000 || (y >= maxY - 0.5 && Math.abs(vy) < STOP && Math.abs(vx) < STOP * 1.5)) return land(true)
  fly = requestAnimationFrame(step)
}

/** Grab the pet out of the air. */
export function catchDiudiule(): void {
  if (playingDesk() !== 'diudiule' || !fly) return
  stopFly()
}

/** Fling after a drag. Returns true if this game ate the release. */
export function releaseDiudiule(lifted: boolean, sx: number, sy: number): boolean {
  if (playingDesk() !== 'diudiule') return false
  stopFly()
  vx = sx * POWER
  vy = sy * POWER
  if (!lifted || Math.hypot(vx, vy) < MIN) {
    land(false)
    return true
  }
  machine.play({
    a: 'diudiule',
    opt: { url: `pet/smallGame/diudiule/Diudiule_${info.sex === 'GG' ? 102 : 103}.swf`, opt: {} },
  })
  t0 = born = performance.now()
  fly = requestAnimationFrame(step)
  return true
}

export function stopDiudiule(): void {
  if (playingDesk() !== 'diudiule') return
  stopFly()
  quit?.remove()
  quit = null
  setDeskGame('')
  machine.play({ a: 'normal' })
  addCount('GameRound')
  refreshTray()
}

export function playDiudiule(): void {
  if (playingDesk()) return
  if (stage() === 'Egg') return speak({ s: '[host]，我还是个蛋呢，等破壳了再陪你玩~', now: true }, 'speak')
  if (busy() || info.health < 5) return speak({ s: '[host]，我正忙着呢，忙完再陪你玩~', now: true }, 'speak')
  setDeskGame('diudiule')
  setTray('game')
  const pet = document.getElementById('pet')!
  quit = Object.assign(button('quit', stopDiudiule), { title: '结束丢丢乐' })
  quit.dataset.hit = ''
  quit.addEventListener('pointerdown', (e) => e.stopPropagation())
  pet.append(quit)
  speak({ s: '[host]，抓住我甩出去！看我飞多高~', now: true }, 'appear')
}
