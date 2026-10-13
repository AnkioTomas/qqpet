import { clipAsk, IDLE, note } from './pet/ai'
import { resumeTask } from './pet/jobs'
import { machine, speak, startPet } from './pet/pet'
import { applyEdge, info, onInfoChange, petSize, save, setInfo, stage, update } from './pet/store'
import type { DesktopCursor } from '../shared/ipc'
import { setDesktopSize, viewportSize } from './ui/viewport'
import { adopt } from './ui/adopt'
import { catchDiudiule, releaseDiudiule } from './ui/diudiule'
import { scheduleHide, showControl } from './ui/control'
import { div, pageX, pageY, touch } from './ui/dom'
import './ui/background'
import './ui/face'
import { closeMenu, openMenu } from './ui/menu'
import { openState } from './ui/state'
import { startAutoUpdate } from './ui/update'

const petEl = document.getElementById('pet')!
const HOLD_MS = 500
let dragging = false
let desktopOffset = { x: 0, y: 0 }
let desktopSequence = 0
let dragMove: ((point: DesktopCursor) => void) | null = null

function clampOnScreen(): void {
  const s = petSize()
  const area = viewportSize()
  setInfo('lastX', Math.min(Math.max(info.lastX, 0), Math.max(0, area.width - s)))
  setInfo('lastY', Math.min(Math.max(info.lastY, 0), Math.max(0, area.height - s)))
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
  const shift = dragging ? 0 : (petSize() - size) / 2
  size = petSize()
  if (shift) {
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
// A save from another screen, or a phone turned, leaves the pet off this one.
clampOnScreen()
addEventListener('resize', () => { if (!dragging) clampOnScreen() })
layout()
onInfoChange((key) => {
  if (key === 'lastX' || key === 'lastY' || key === 'growth') layout()
})

const cursor = { x: 0, y: 0 }
window.API = {
  GetCursorPosition: () => `${cursor.x},${cursor.y},0`,
  GetWindowRect: () => `${info.lastX},${info.lastY},${size},${size}`,
  // No PetEden.ini: every key reads as its default, as the Windows call does for a missing file.
  GetPrivateProfileString: (_section, _key, fallback) => fallback,
}

// The window is click-through except while the cursor is over a [data-hit]
// element (or a drag is in progress).
let interactive = false
/** A click stepped the pet out of its peek; it slips back once the cursor leaves it and its bar. */
let out = false
const syncDesktop = (p: DesktopCursor): boolean => {
  const area = p.desktop
  if (!area) return true
  if (area.sequence <= desktopSequence) return false
  desktopSequence = area.sequence
  const dx = area.offset.x - desktopOffset.x
  const dy = area.offset.y - desktopOffset.y
  desktopOffset = area.offset
  setDesktopSize(area)
  setInfo('lastX', info.lastX + dx)
  setInfo('lastY', info.lastY + dy)
  if (save.settings.petDisplayId !== area.id) update('settings', { petDisplayId: area.id })
  if (!dragging) clampOnScreen()
  layout()
  return true
}
window.qqpet.onCursor((p) => {
  if (!syncDesktop(p)) return
  dragMove?.(p)
  cursor.x = p.x
  cursor.y = p.y
  // The pet box is the hit target. elementFromPoint misses Ruffle's shadow canvas,
  // so the OS arrow shows until we also test the box itself.
  const overPet = !petEl.hidden && p.x >= info.lastX && p.x < info.lastX + size && p.y >= info.lastY && p.y < info.lastY + size
  // The cursor is in page coordinates; a cropped page (HarmonyOS) is shifted by the crop.
  const { cropX = 0, cropY = 0 } = document.documentElement.dataset
  const el = document.elementFromPoint(p.x - Number(cropX), p.y - Number(cropY))
  const root = el?.getRootNode()
  const host = root instanceof ShadowRoot ? root.host : el
  const hit = dragging || overPet || host?.closest('[data-hit]') != null
  // The menu closes once the cursor rests on the desktop; it may still be on the tray, outside the window.
  const inside = p.x >= 0 && p.y >= 0 && p.x < innerWidth && p.y < innerHeight
  if (!hit && inside) closeMenu()
  if (out && !hit) {
    out = false
    const edge = snapEdge()
    if (edge && machine.pose.a === 'normal') machine.play({ a: edge })
  }
  if (hit === interactive) return
  interactive = hit
  window.qqpet.setClickThrough(!hit)
})
// The store's asynchronous load may finish after the initial cursor broadcast.
if (window.qqpet.setDragging) void window.qqpet.setDragging(false).then(syncDesktop)

petEl.addEventListener('contextmenu', (e) => openMenu({ x: e.clientX, y: e.clientY, pet: true }, adoptPet))

petEl.addEventListener('pointerdown', (e) => {
  if (dragging || e.button !== 0 || (e.target as HTMLElement).classList.contains('point')) return
  closeMenu()
  if (save.settings.petBar) showControl()
  dragging = true
  catchDiudiule()
  let dx = pageX(e) - info.lastX
  let dy = pageY(e) - info.lastY
  let grabX = dx / size
  let grabY = dy / size
  const startX = pageX(e) - desktopOffset.x
  const startY = pageY(e) - desktopOffset.y
  let px = pageX(e)
  let py = pageY(e)
  let pt = performance.now()
  let vx = 0
  let vy = 0
  // Touch has no right button, and Ruffle keeps the browser from turning a long press into one.
  const hold = touch ? setTimeout(() => openMenu({ x: pageX(e), y: pageY(e), pet: true }, adoptPet), HOLD_MS) : 0
  let lifted = false
  const movePoint = (point: DesktopCursor, desktop: boolean): void => {
    const { x, y } = point
    const t = performance.now()
    const dt = (t - pt) / 1000
    const globalX = desktop ? x - desktopOffset.x : x
    const globalY = desktop ? y - desktopOffset.y : y
    if (dt > 0 && (globalX !== px || globalY !== py)) {
      vx = (globalX - px) / dt
      vy = (globalY - py) / dt
      pt = t
    }
    px = globalX
    py = globalY
    if (Math.hypot(x - desktopOffset.x - startX, y - desktopOffset.y - startY) > 8) {
      clearTimeout(hold)
      if (!lifted) {
        lifted = true
        // Only the adult has a lifted-by-the-scruff clip, and drag.swf draws that scruff in the
        // upper-right; anchor it under the cursor. Younger pets stand and keep the grab point.
        if (stage() === 'Adult') {
          machine.play({ a: 'drag', opt: { url: 'pet/Action/drag.swf', opt: {} } })
          grabX = 0.73
          grabY = 0.14
          dx = size * 0.73
          dy = size * 0.14
        } else machine.play({ a: 'drag' })
      }
    }
    setInfo('lastX', x - (desktop ? petSize() * grabX : dx))
    setInfo('lastY', y - (desktop ? petSize() * grabY : dy))
    // Once lifted the grab point is the cursor; clamping the box would pull it off.
    if (!lifted) clampOnScreen()
  }
  const nativeDrag = window.qqpet.setDragging
  const move = (m: PointerEvent): void => {
    if (nativeDrag) return
    movePoint({ x: pageX(m), y: pageY(m) }, false)
  }
  if (nativeDrag) {
    px = startX
    py = startY
    dragMove = (p): void => movePoint(p, true)
    // Native cursor updates survive losing pointer capture when the overlay changes display/DPI.
    void nativeDrag(true).then((p) => { if (dragMove && syncDesktop(p)) dragMove(p) })
  }
  petEl.setPointerCapture(e.pointerId)
  petEl.addEventListener('pointermove', move)
  const events = new AbortController()
  const end = async (): Promise<void> => {
    if (events.signal.aborted) return
    events.abort()
    clearTimeout(hold)
    if (nativeDrag) {
      const p = await nativeDrag(false)
      if (syncDesktop(p)) dragMove?.(p)
      dragMove = null
    }
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
    if (edge && !lifted && machine.pose.a === edge) {
      out = true
      machine.play({ a: 'normal' })
    } else if (edge) machine.play({ a: edge })
    else if (lifted || machine.pose.a === 'hideleft' || machine.pose.a === 'hideright') machine.play({ a: 'normal' })
    scheduleHide()
  }
  petEl.addEventListener('pointerup', () => void end(), { signal: events.signal })
  petEl.addEventListener('pointercancel', () => void end(), { signal: events.signal })
  if (nativeDrag) {
    // A display/DPI change can release capture; the release still bubbles to the window.
    addEventListener('pointerup', () => void end(), { signal: events.signal })
    addEventListener('pointercancel', () => void end(), { signal: events.signal })
  }
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

// Linux trays report no position; open at the top right, under the menu bar.
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
startAutoUpdate()
