import { startPet } from './pet/pet'
import { info, onInfoChange, petSize, save, setInfo } from './pet/store'
import { adopt } from './ui/adopt'
import { scheduleHide, showControl } from './ui/control'
import './ui/face'

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
  if (hit === interactive) return
  interactive = hit
  window.qqpet.setClickThrough(!hit)
})

petEl.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || (e.target as HTMLElement).classList.contains('point')) return
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

window.qqpet.onTrayClick((c) => {
  if (c.kind === 'state' && !save.havePet) adopt(begin)
})

if (save.havePet) begin()
else adopt(begin)
