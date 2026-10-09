import { clipAsk, IDLE, note } from './pet/ai'
import { resumeTask } from './pet/jobs'
import { machine, speak, startPet } from './pet/pet'
import { applyEdge, info, onInfoChange, petSize, save, setInfo } from './pet/store'
import { adopt } from './ui/adopt'
import { catchDiudiule, releaseDiudiule } from './ui/diudiule'
import { scheduleHide, showControl } from './ui/control'
import { div, pageX, pageY, touch } from './ui/dom'
import './ui/face'
import { closeMenu, openMenu } from './ui/menu'
import { openState } from './ui/state'

const petEl = document.getElementById('pet')!
const HOLD_MS = 500

function clampOnScreen(): void {
  const s = petSize()
  setInfo('lastX', Math.min(Math.max(info.lastX, 0), innerWidth - s))
  setInfo('lastY', Math.min(Math.max(info.lastY, 0), innerHeight - s))
}

/** Left/right: keep the box on-screen. Hide_left/right already peek from the sprite edge. */
function snapEdge(): 'hideleft' | 'hideright' | null {
  const edge = applyEdge()
  if (!edge) clampOnScreen()
  return edge
}

let size = petSize()
function layout(): void {
  // A pet that grows keeps its center.
  const shift = (petSize() - size) / 2
  if (shift) {
    size = petSize()
    setInfo('lastX', info.lastX - shift)
    setInfo('lastY', info.lastY - shift)
    clampOnScreen()
  }
  petEl.style.width = petEl.style.height = `${size}px`
  petEl.style.left = `${info.lastX}px`
  petEl.style.top = `${info.lastY}px`
}

if (info.lastX === -1 && info.lastY === -1) {
  setInfo('lastX', (innerWidth - size) / 2)
  setInfo('lastY', (innerHeight - size) / 2)
}
layout()
onInfoChange((key) => {
  if (key === 'lastX' || key === 'lastY' || key === 'growth') layout()
})

const cursor = { x: 0, y: 0 }
window.API = {
  GetCursorPosition: () => `${cursor.x},${cursor.y},0`,
  GetWindowRect: () => `${info.lastX},${info.lastY},${size},${size}`,
}

// The window is click-through except while the cursor is over a [data-hit]
// element (or a drag is in progress).
let interactive = false
let dragging = false
window.qqpet.onCursor((p) => {
  cursor.x = p.x
  cursor.y = p.y
  // The pet box is the hit target. elementFromPoint misses Ruffle's shadow canvas,
  // so the OS arrow shows until we also test the box itself.
  const overPet = !petEl.hidden && p.x >= info.lastX && p.x < info.lastX + size && p.y >= info.lastY && p.y < info.lastY + size
  const el = document.elementFromPoint(p.x, p.y)
  const root = el?.getRootNode()
  const host = root instanceof ShadowRoot ? root.host : el
  const hit = dragging || overPet || host?.closest('[data-hit]') != null
  // The menu closes once the cursor rests on the desktop; it may still be on the tray, outside the window.
  const inside = p.x >= 0 && p.y >= 0 && p.x < innerWidth && p.y < innerHeight
  if (!hit && inside) closeMenu()
  if (hit === interactive) return
  interactive = hit
  window.qqpet.setClickThrough(!hit)
})

petEl.addEventListener('contextmenu', (e) => openMenu({ x: e.clientX, y: e.clientY, pet: true }, adoptPet))

petEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || (e.target as HTMLElement).classList.contains('point')) return
  closeMenu()
  showControl()
  dragging = true
  catchDiudiule()
  let dx = pageX(e) - info.lastX
  let dy = pageY(e) - info.lastY
  let px = pageX(e)
  let py = pageY(e)
  let pt = performance.now()
  let vx = 0
  let vy = 0
  // Touch has no right button, and Ruffle keeps the browser from turning a long press into one.
  const hold = touch ? setTimeout(() => openMenu({ x: pageX(e), y: pageY(e), pet: true }, adoptPet), HOLD_MS) : 0
  let lifted = false
  const move = (m: PointerEvent): void => {
    const x = pageX(m)
    const y = pageY(m)
    const t = performance.now()
    const dt = (t - pt) / 1000
    if (dt > 0) {
      vx = (x - px) / dt
      vy = (y - py) / dt
    }
    px = x
    py = y
    pt = t
    if (Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) > 8) {
      clearTimeout(hold)
      if (!lifted) {
        lifted = true
        machine.play({ a: 'drag', opt: { url: 'pet/Action/drag.swf', opt: {} } })
        // drag.swf draws the held head in the upper-right, not the box center.
        // Anchor the scruff (measured hold point) under the cursor.
        dx = size * 0.73
        dy = size * 0.14
      }
    }
    setInfo('lastX', x - dx)
    setInfo('lastY', y - dy)
    // Once lifted the scruff is the cursor; clamping the box would pull it off.
    if (!lifted) clampOnScreen()
  }
  petEl.setPointerCapture(e.pointerId)
  petEl.addEventListener('pointermove', move)
  petEl.addEventListener(
    'pointerup',
    () => {
      clearTimeout(hold)
      dragging = false
      petEl.removeEventListener('pointermove', move)
      if (performance.now() - pt > 80) {
        vx = 0
        vy = 0
      }
      if (releaseDiudiule(lifted, vx, vy)) {
        scheduleHide()
        return
      }
      const edge = snapEdge()
      if (edge) machine.play({ a: edge })
      else if (lifted || machine.pose.a === 'hideleft' || machine.pose.a === 'hideright') machine.play({ a: 'normal' })
      scheduleHide()
    },
    { once: true },
  )
})

// Touch has no hover to show a tooltip by: a long press shows it, and the lift is not a tap.
if (touch) {
  const tip = div('touchTip')
  const eat = (c: MouseEvent): void => c.stopPropagation()
  document.addEventListener(
    'pointerdown',
    (e) => {
      tip.remove()
      const text = (e.target as Element).closest('[title]')?.getAttribute('title')
      if (!text) return
      const hold = setTimeout(() => {
        tip.textContent = text
        tip.style.left = `${Math.min(Math.max(e.clientX, 110), innerWidth - 110)}px`
        tip.style.top = `${e.clientY}px`
        document.body.append(tip)
      }, HOLD_MS)
      const off = new AbortController()
      const signal = { signal: off.signal }
      const end = (): void => {
        clearTimeout(hold)
        off.abort()
      }
      document.addEventListener(
        'pointermove',
        (m) => {
          if (Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) > 8) end()
        },
        signal,
      )
      document.addEventListener('pointercancel', end, signal)
      document.addEventListener(
        'pointerup',
        () => {
          end()
          if (!tip.isConnected) return
          document.addEventListener('click', eat, true)
          setTimeout(() => document.removeEventListener('click', eat, true))
        },
        signal,
      )
    },
    true,
  )
}

const begin = (): void => {
  petEl.hidden = false
  startPet()
}
const adoptPet = (): void => adopt(begin)

// Linux trays report no position; their menus live at the top of the screen.
window.qqpet.onTrayClick((c) => {
  const x = c.x ?? innerWidth - 60
  const y = c.y ?? 0
  if (c.kind === 'menu') openMenu({ x, y, pet: false }, adoptPet)
  else if (save.havePet) openState(x, y)
  else adoptPet()
})

const CLIP_MAX = 60
window.qqpet.onClipboard((text) => {
  if (!save.havePet) return
  note('主人刚复制了一段文字')
  speak({ s: text.length > CLIP_MAX ? `${text.slice(0, CLIP_MAX)}…` : text, b: '当前复制的文字', now: true, ai: clipAsk(text) }, 'speak')
})

window.qqpet.onPresence((gone) => {
  if (!save.havePet) return
  if (gone) {
    note('主人离开了一会儿')
    return
  }
  note('主人回来了')
  speak({ s: '[host]，你回来啦~', now: true, ai: IDLE }, 'appear')
})

const DWELL = 10 * 60 * 1000
let front = ''
let frontSince = 0
let frontNoted = ''
window.qqpet.onFront((name) => {
  front = name
  frontSince = Date.now()
})
setInterval(() => {
  if (!save.settings.watchApp || !save.havePet || !front || front === frontNoted || Date.now() - frontSince < DWELL) return
  frontNoted = front
  note(/[A-Za-z]/.test(front) ? `主人在用「${front}」` : `主人在${front}`)
}, 15_000)

if (save.havePet) {
  resumeTask()
  begin()
} else adoptPet()
