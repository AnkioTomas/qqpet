import { createPetInput, type PetPointerInput } from './pet/input'
import { clipAsk, IDLE, note } from './pet/ai'
import { resumeTask } from './pet/jobs'
import { machine, speak, startPet } from './pet/pet'
import { applyEdge, info, onInfoChange, petSize, save, setInfo, stage, update } from './pet/store'
import type { DesktopCursor } from '../shared/ipc'
import { pageZoom, setDesktopSize, viewportSize } from './ui/viewport'
import { adopt } from './ui/adopt'
import { catchDiudiule, releaseDiudiule } from './ui/diudiule'
import { scheduleHide, showControl } from './ui/control'
import { div, pageX, pageY, touch } from './ui/dom'
import './ui/background'
import { clearFacePoints, showFacePoints } from './ui/face'
import { closeMenu, openMenu } from './ui/menu'
import { closeState, openState } from './ui/state'
import { startAutoUpdate } from './ui/update'
import { windowView } from './ui/window-view'
import { initLanVisit } from './ui/lan-visit'
import { initVoice } from './ui/voice'
import { resizePetPosition } from '../shared/layout'
import { hitCover, type Box } from '../mobile/overlay'

let lastPlatformError = ''
let lastPlatformErrorAt = -Infinity
// The native adapter reports errors before and after bootstrap; only the initialized UI opens dialogs.
window.addEventListener('qqpet-platform-error', (event) => {
  const detail = (event as CustomEvent<{ operation?: unknown; message?: unknown }>).detail
  if (!detail || typeof detail.message !== 'string') return
  const message = typeof detail.operation === 'string' ? `${detail.operation}：${detail.message}` : detail.message
  const now = performance.now()
  // A failed periodic save should leave one readable alert instead of replacing it on every tick.
  if (message === lastPlatformError && now - lastPlatformErrorAt < 10_000) return
  lastPlatformError = message
  lastPlatformErrorAt = now
  windowView({ title: '平台操作失败', msg: message })
})

const petEl = document.getElementById('pet')!
const HOLD_MS = 500
let dragging = false
let dragLifted = false
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
let previousViewport = { ...viewportSize(), size }
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
  const area = viewportSize()
  if (area.width === previousViewport.width && area.height === previousViewport.height) previousViewport.size = size
}

if (info.lastX === -1 && info.lastY === -1) {
  setInfo('lastX', (innerWidth - size) / 2)
  setInfo('lastY', (innerHeight - size) / 2)
}
// A save from another screen can leave the pet outside the current viewport.
clampOnScreen()
function resizeMobilePet(): void {
  const next = { ...viewportSize(), size: petSize() }
  if (next.width === previousViewport.width && next.height === previousViewport.height && next.size === previousViewport.size) return
  const pose = machine.pose.a
  const edge = pose === 'hideleft' || pose === 'hideright' ? pose : null
  const position = resizePetPosition({ x: info.lastX, y: info.lastY }, previousViewport, next, edge)
  // A pointer's grab point belongs to the previous viewport, even on hosts
  // which do not send an orientation cancellation themselves.
  if (dragging) petInput.cancel()
  previousViewport = next
  size = next.size
  setInfo('lastX', position.x)
  setInfo('lastY', position.y)
  layout()
}
// Desktop transfers use native global coordinates, including mid-drag.
if (window.qqpet.setDragging) addEventListener('resize', () => { if (!dragging) clampOnScreen() })
else {
  let resizeFrame = 0
  const scheduleResize = (): void => {
    if (resizeFrame) return
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0
      resizeMobilePet()
    })
  }
  addEventListener('resize', scheduleResize)
  // WebKit can emit resize with an intermediate width, then settle the root
  // viewport without another window event. Read the final dimensions per frame.
  const viewportObserver = new ResizeObserver(scheduleResize)
  viewportObserver.observe(document.documentElement)
  addEventListener('pagehide', () => {
    viewportObserver.disconnect()
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    removeEventListener('resize', scheduleResize)
  })
}
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
  // Release positioning and flings belong to the host. An outgoing movie may
  // still run its drop frames while the replacement loads.
  MoveBy: () => {},
}
// The newer drag movies loop their nested timeline while this value is 1.
window.DataCenter_ReadInt32 = (key) => key === 'drag' && dragLifted ? 1 : 0

// The window is click-through except while the cursor is over a [data-hit]
// element (or a drag is in progress).
let interactive = false
/** A click stepped the pet out of its peek; it slips back once the cursor leaves it and its bar. */
let out = false
/** A cursor overshooting the menu edge, or crossing to a submenu, may come back before this. */
const MENU_LEAVE_MS = 300
let menuLeave = 0
/** Peek movies leave most of the pet box transparent (#74). */
function petHitBoxes(): Box[] {
  if (petEl.hidden || save.settings.hidden) return []
  if (machine.pose.a !== 'hideleft' && machine.pose.a !== 'hideright') {
    return [{ left: info.lastX, top: info.lastY, right: info.lastX + size, bottom: info.lastY + size }]
  }
  return [petEl, ...petEl.querySelectorAll('ruffle-player')].map((el) => hitCover(el)).filter((box): box is Box => box !== null)
}
const overPet = (x: number, y: number): boolean => petHitBoxes().some((r) => x >= r.left && x < r.right && y >= r.top && y < r.bottom)

const syncDesktop = (p: DesktopCursor): boolean => {
  const area = p.desktop
  if (!area) return true
  if (area.sequence <= desktopSequence) return false
  desktopSequence = area.sequence
  // A zoom change rescales every page length, the old offset included; what is left is a real display move.
  const k = (pageZoom() ?? area.zoom) / area.zoom
  const dx = area.offset.x - desktopOffset.x * k
  const dy = area.offset.y - desktopOffset.y * k
  desktopOffset = area.offset
  setDesktopSize(area)
  setInfo('lastX', info.lastX * k + dx)
  setInfo('lastY', info.lastY * k + dy)
  if (save.settings.petDisplayId !== area.id) update('settings', { petDisplayId: area.id })
  if (!dragging) clampOnScreen()
  layout()
  return true
}
function updateCursor(p: DesktopCursor): void {
  if (!syncDesktop(p)) return
  dragMove?.(p)
  cursor.x = p.x
  cursor.y = p.y
  // The cursor is in page coordinates; a cropped page (HarmonyOS) is shifted by the crop.
  const { cropX = 0, cropY = 0 } = document.documentElement.dataset
  const el = document.elementFromPoint(p.x - Number(cropX), p.y - Number(cropY))
  const root = el?.getRootNode()
  const host = root instanceof ShadowRoot ? root.host : el
  // The pet's data-hit ancestor must not restore its transparent SWF rectangle.
  const panelHit = host?.closest('[data-hit]') && (!host.closest('#pet') || host.closest('.point'))
  const hit = dragging || overPet(p.x, p.y) || !!panelHit
  // The menu closes once the cursor rests on the desktop; it may still be on the tray, outside the window.
  const inside = p.x >= 0 && p.y >= 0 && p.x < innerWidth && p.y < innerHeight
  if (!hit && inside) {
    menuLeave ||= setTimeout(() => {
      menuLeave = 0
      closeMenu()
    }, MENU_LEAVE_MS)
  } else if (menuLeave) {
    clearTimeout(menuLeave)
    menuLeave = 0
  }
  if (out && !hit) {
    out = false
    const edge = snapEdge()
    if (edge && machine.pose.a === 'normal') machine.play({ a: edge })
  }
  if (hit === interactive) return
  interactive = hit
  window.qqpet.setClickThrough(!hit)
}
window.qqpet.onCursor(updateCursor)

// Linux: the window takes the mouse only over the pet and the [data-hit] panels (#45). A hit root may be a
// zero-sized anchor with overflowing children (the pet toolbar), so the children count too.
const setHitShape = window.qqpet.setHitShape
if (setHitShape || window.qqpet.setDragging) {
  let sent = ''
  setInterval(() => {
    // The movie can retract under a stationary cursor; native cursor IPC only sends changes.
    if (!dragging) updateCursor(cursor)
    if (!setHitShape) return
    const rects: { x: number; y: number; width: number; height: number }[] = []
    if (dragging) rects.push({ x: 0, y: 0, width: innerWidth, height: innerHeight })
    else if (!save.settings.hidden) {
      for (const r of petHitBoxes()) rects.push({ x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top })
      for (const el of document.querySelectorAll('#pet, [data-hit], [data-hit] *')) {
        if (el.closest('#pet') && !el.matches('.point')) continue
        if (!el.checkVisibility({ visibilityProperty: true }) || getComputedStyle(el).pointerEvents === 'none') continue
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) rects.push({ x: r.x, y: r.y, width: r.width, height: r.height })
      }
    }
    const key = JSON.stringify(rects)
    if (key === sent) return
    sent = key
    setHitShape(rects)
  }, 50)
}
window.addEventListener('qqpet-hidden-change', () => {
  if (save.settings.hidden) petInput.cancel()
  updateCursor(cursor)
})
// The store's asynchronous load may finish after the initial cursor broadcast.
if (window.qqpet.setDragging) void window.qqpet.setDragging(false).then(syncDesktop)

petEl.addEventListener('contextmenu', (e) => {
  if (overPet(pageX(e), pageY(e))) openMenu({ x: pageX(e), y: pageY(e), pet: true }, adoptPet)
})

let releaseDomInput = (): void => {}
const petInput = createPetInput({
  clock: () => performance.now(),
  requestFrame: requestAnimationFrame,
  cancelFrame: cancelAnimationFrame,
  position: () => ({ x: info.lastX, y: info.lastY, size }),
  begin: () => {
    clearFacePoints()
    closeMenu()
    if (save.settings.petBar) showControl()
    catchDiudiule()
  },
  active: (on) => {
    dragging = on
    if (!on) { dragLifted = false; releaseDomInput() }
  },
  hold: (x, y) => openMenu({ x, y, pet: true }, adoptPet),
  lift: (s, align) => {
    dragLifted = true
    if (stage() === 'Adult') {
      // Hold the upper-right rim of the head, so the finger lifts it from the side.
      // Keep following the original grab until the double-buffered SWF is on screen.
      machine.play({ a: 'drag', opt: { url: 'pet/Action/drag.swf', opt: {} },
        s: () => align({ dx: s * 0.58, dy: s * 0.30, duration: 120 }) })
      return null
    }
    machine.play({ a: 'drag' })
    return null
  },
  move: (x, y, lifted) => {
    setInfo('lastX', x)
    setInfo('lastY', y)
    if (!lifted) clampOnScreen()
  },
  end: (lifted, vx, vy, cancelled) => {
    if (releaseDiudiule(cancelled ? false : lifted, vx, vy)) return scheduleHide()
    const edge = snapEdge()
    if (edge && !lifted && !cancelled && machine.pose.a === edge) {
      out = true
      machine.play({ a: 'normal' })
    } else if (edge) machine.play({ a: edge })
    else if (lifted || machine.pose.a === 'hideleft' || machine.pose.a === 'hideright') machine.play({ a: 'normal' })
    scheduleHide()
    if (touch && !lifted && !cancelled) showFacePoints()
  },
}, touch ? HOLD_MS : 0)

window.__qqpetInput = (input) => {
  if ((window.__qqpetHostPaused || save.settings.hidden) && input.phase !== 'cancel') return
  cursor.x = input.x
  cursor.y = input.y
  petInput.send({ ...input, source: 'native' })
}
addEventListener('pagehide', () => petInput.cancel())

petEl.addEventListener('pointerdown', (e) => {
  if (save.settings.hidden || window.__qqpetNativePetInput || window.__qqpetHostPaused || e.button !== 0 || (e.target as HTMLElement).closest('.point')) return
  if (!overPet(pageX(e), pageY(e))) return
  if (petInput.active) return
  const nativeDrag = window.qqpet.setDragging
  let lastPoint: DesktopCursor = { x: pageX(e), y: pageY(e) }
  const sample = (phase: PetPointerInput['phase'], p: DesktopCursor): PetPointerInput => ({
    phase, id: e.pointerId, x: p.x, y: p.y, source: 'dom',
    ...(nativeDrag ? { globalX: p.x - desktopOffset.x, globalY: p.y - desktopOffset.y, scaleGrab: true } : {}),
  })
  petInput.send(sample('begin', lastPoint))
  if (!petInput.active) return
  let ending = false
  let disposed = false
  // The grab point comes from the DOM event, every later point from the native cursor. Where the two
  // disagree (Windows display scaling, mixed-DPI screens), the pet would jump off the cursor on the
  // first native sample; measure the gap once and keep it while the pointer stays on that display.
  const start = lastPoint
  let shift: { id: number | undefined; x: number; y: number } | null = null
  const fromDesktop = (p: DesktopCursor): void => {
    shift ??= { id: p.desktop?.id, x: p.x - start.x, y: p.y - start.y }
    lastPoint = shift.id === p.desktop?.id ? { ...p, x: p.x - shift.x, y: p.y - shift.y } : p
    petInput.send(sample('move', lastPoint))
  }
  const move = (m: PointerEvent): void => {
    if (nativeDrag || m.pointerId !== e.pointerId) return
    lastPoint = { x: pageX(m), y: pageY(m) }
    petInput.send(sample('move', lastPoint))
  }
  const failed = (error: unknown): void => {
    console.error('Native desktop drag failed:', error)
    if (!disposed) petInput.cancel()
  }
  const stopFollowing = (): void => {
    if (nativeDrag) void nativeDrag(false).then(syncDesktop).catch(failed)
  }
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    petEl.removeEventListener('pointermove', move)
    petEl.removeEventListener('pointerup', end)
    petEl.removeEventListener('pointercancel', end)
    if (nativeDrag) {
      removeEventListener('pointerup', end)
      removeEventListener('pointercancel', end)
      if (dragMove === fromDesktop) dragMove = null
      if (!ending) { ending = true; stopFollowing() }
    }
    if (petEl.hasPointerCapture(e.pointerId)) petEl.releasePointerCapture(e.pointerId)
    releaseDomInput = () => {}
  }
  const end = (m: PointerEvent): void => {
    if (m.pointerId !== e.pointerId || ending || disposed) return
    ending = true
    if (m.type === 'pointercancel') {
      petInput.send(sample('cancel', lastPoint))
      stopFollowing()
      return
    }
    if (nativeDrag) {
      // Resolve the target display and final sample before releasing or clamping the pet.
      void nativeDrag(false).then((p) => {
        if (disposed) return
        if (syncDesktop(p)) fromDesktop(p)
        petInput.send(sample('end', lastPoint))
      }).catch(failed)
    } else {
      lastPoint = { x: pageX(m), y: pageY(m) }
      petInput.send(sample('end', lastPoint))
    }
  }
  releaseDomInput = dispose
  if (nativeDrag) {
    dragMove = fromDesktop
    // Native cursor updates survive losing pointer capture during a display/DPI transfer.
    void nativeDrag(true).then((p) => { if (!disposed && !ending && syncDesktop(p)) fromDesktop(p) }).catch(failed)
  }
  petEl.setPointerCapture(e.pointerId)
  petEl.addEventListener('pointermove', move)
  petEl.addEventListener('pointerup', end)
  petEl.addEventListener('pointercancel', end)
  if (nativeDrag) {
    addEventListener('pointerup', end)
    addEventListener('pointercancel', end)
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
      const move = (m: PointerEvent): void => {
        if (Math.hypot(m.clientX - e.clientX, m.clientY - e.clientY) > 8) end()
      }
      const end = (): void => {
        clearTimeout(hold)
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointercancel', end)
        document.removeEventListener('pointerup', up)
      }
      const up = (): void => {
        end()
        if (!tip.isConnected) return
        document.addEventListener('click', eat, true)
        setTimeout(() => document.removeEventListener('click', eat, true))
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointercancel', end)
      document.addEventListener('pointerup', up)
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
  // A manager/tray press may have scheduled a leave before opening this panel.
  // That older pointer event must not dismiss the newly requested menu.
  if (menuLeave) { clearTimeout(menuLeave); menuLeave = 0 }
  const x = c.x ?? innerWidth - 60
  const y = c.y ?? 0
  if (c.kind === 'menu') {
    closeState()
    openMenu({ x, y, pet: false }, adoptPet)
  } else if (save.havePet) {
    closeMenu()
    openState(x, y, c.autoClose)
  } else adoptPet()
})

const CLIP_MAX = 60
window.qqpet.onClipboard((text) => {
  if (!save.havePet) return
  note('主人刚复制了一段文字')
  speak({ s: text.length > CLIP_MAX ? `${text.slice(0, CLIP_MAX)}…` : text, b: '当前复制的文字', now: true, ai: clipAsk(text) }, 'speak')
})

// Friend LAN presence moved into initLanVisit (one registration per channel).
initLanVisit()
initVoice()

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
