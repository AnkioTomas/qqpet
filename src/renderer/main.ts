import { clipAsk } from './pet/ai'
import { resumeTask } from './pet/jobs'
import { speak, startPet } from './pet/pet'
import { info, onInfoChange, petSize, save, setInfo } from './pet/store'
import { adopt } from './ui/adopt'
import { scheduleHide, showControl } from './ui/control'
import './ui/face'
import { closeMenu, openMenu } from './ui/menu'
import { openState } from './ui/state'

const petEl = document.getElementById('pet')!

function clampPosition(): void {
  const max = (n: number, limit: number): number => Math.min(Math.max(n, 0), limit - petSize())
  setInfo('lastX', max(info.lastX, innerWidth))
  setInfo('lastY', max(info.lastY, innerHeight))
}

let size = petSize()
function layout(): void {
  // A pet that grows keeps its center.
  const shift = (petSize() - size) / 2
  if (shift) {
    size = petSize()
    setInfo('lastX', info.lastX - shift)
    setInfo('lastY', info.lastY - shift)
    clampPosition()
  }
  petEl.style.width = petEl.style.height = `${size}px`
  petEl.style.left = `${info.lastX}px`
  petEl.style.top = `${info.lastY}px`
}

if (info.lastX < 0 || info.lastY < 0) {
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
  const hit = dragging || document.elementFromPoint(p.x, p.y)?.closest('[data-hit]') != null
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
  const dx = e.clientX - info.lastX
  const dy = e.clientY - info.lastY
  const move = (m: PointerEvent): void => {
    setInfo('lastX', m.clientX - dx)
    setInfo('lastY', m.clientY - dy)
  }
  petEl.setPointerCapture(e.pointerId)
  petEl.addEventListener('pointermove', move)
  petEl.addEventListener(
    'pointerup',
    () => {
      dragging = false
      petEl.removeEventListener('pointermove', move)
      clampPosition()
      scheduleHide()
    },
    { once: true },
  )
})

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
  if (save.havePet) speak({ s: text.length > CLIP_MAX ? `${text.slice(0, CLIP_MAX)}…` : text, b: '当前复制的文字', now: true, ai: clipAsk(text) }, 'speak')
})

if (save.havePet) {
  resumeTask()
  begin()
} else adoptPet()
