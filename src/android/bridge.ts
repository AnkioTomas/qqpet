// window.qqpet on Android. The page runs in a WebView that fills the screen but
// sits inside an overlay window cut down to the visible content: Android cannot
// pass touches through transparent pixels, so everything outside the window
// reaches the apps below.
import { aiChat, aiModels } from '../shared/ai'
import { calendar } from '../shared/calendar'
import type { Fetch, Point, QQPetApi, TrayClick, TrayState } from '../shared/ipc'
import type { SaveData } from '../shared/save'
import { applyPatch, buried, petOf, startSave } from '../shared/save-logic'
import { TRAY_STATES, trayTip } from '../shared/tray'
import { weather } from '../shared/weather'

/** The `QQPetNative` JavaScript interface of PetService. Async calls answer through `__qqpet.resolve(id, value, error)`. */
interface Native {
  /** A file in the app's private storage. Missing is undefined: the WebView bridge turns Kotlin's null into undefined. */
  read(name: string): string | undefined
  write(name: string, text: string): void
  /** Resolves to `{"status": n, "body": "…"}` JSON. */
  http(id: number, method: string, url: string, headers: string, body: string | null): void
  /** Resolves to the clicked button's index. */
  messageBox(id: number, options: string): void
  /** Resolves to "true" once written, null when cancelled. */
  exportSave(id: number, name: string, text: string): void
  /** Resolves to the picked file's text, null when cancelled. */
  importSave(id: number): void
  openGame(swf: string): void
  quit(): void
  copyText(text: string): void
  setFocusable(on: boolean): void
  setAutoStart(on: boolean): void
  /** The notification standing in for the tray: an icon under pet/img_res/Tray/, and its text unless null. */
  setTray(icon: string, tip: string | null): void
  /** The overlay window's rectangle, in CSS pixels of a page `viewport` pixels wide. */
  setBounds(x: number, y: number, w: number, h: number, viewport: number): void
  /** "left,top,right,bottom" of the system bars and cutout, in CSS pixels of a page `viewport` pixels wide. */
  safeArea(viewport: number): string
}

interface Events {
  trayClick: TrayClick
  gamePlayed: number
  /** A touch landed outside the overlay window. */
  outside: void
  /** Text picked from another app's selection menu or share sheet. */
  clipboard: string
}

declare global {
  interface Window {
    QQPetNative: Native
    __qqpet: {
      resolve(id: number, value: string | null, error: string | null): void
      emit<K extends keyof Events>(type: K, payload: Events[K]): void
    }
  }
}

const native = window.QQPetNative

const pending = new Map<number, { resolve: (v: string | null) => void; reject: (e: Error) => void }>()
let seq = 0
const call = (start: (id: number) => void): Promise<string | null> =>
  new Promise((resolve, reject) => {
    pending.set(++seq, { resolve, reject })
    start(seq)
  })

const listeners: { [K in keyof Events]: ((p: Events[K]) => void)[] } = { trayClick: [], gamePlayed: [], outside: [], clipboard: [] }

window.__qqpet = {
  resolve(id, value, error) {
    const p = pending.get(id)!
    pending.delete(id)
    if (error === null) p.resolve(value)
    else p.reject(new Error(error))
  },
  emit(type, payload) {
    for (const l of listeners[type]) l(payload)
  },
}

const nativeFetch: Fetch = (url, init = {}) =>
  new Promise((resolve, reject) => {
    const { signal } = init
    signal?.addEventListener('abort', () => reject(signal.reason))
    call((id) => native.http(id, init.method ?? 'GET', url, JSON.stringify(init.headers ?? {}), (init.body as string | undefined) ?? null)).then((r) => {
      const { status, body } = JSON.parse(r!)
      resolve(new Response(body, { status }))
    }, reject)
  })

const FILE = 'save.json'

function readSave(): Record<string, any> | null {
  const text = native.read(FILE)
  if (text === undefined) return null
  try {
    return JSON.parse(text)
  } catch (e) {
    // Keep the broken file for manual recovery instead of silently losing the pet.
    native.write(`${FILE}.corrupt-${Date.now()}`, text)
    console.error('save file is corrupt, kept a copy:', e)
    return null
  }
}

let save: SaveData = startSave(readSave())
// Set while reloading into another save: the renderer's pending write must not land on it.
let leaving = false
const write = (): void => native.write(FILE, JSON.stringify(save))
write()

// The notification shows the first frame only: reposting it for every frame of the animation would be throttled.
let tray: TrayState = 'leave'
let posted = ''
function showTray(): void {
  const pet = save.petInfo
  const icon = `${pet.sex}/${TRAY_STATES[tray].frames ? `${tray}/1` : tray}.png`
  const tip = trayTip(tray, pet) ?? null
  if (posted === icon + tip) return
  posted = icon + tip
  native.setTray(icon, tip)
}

function relaunch(): void {
  leaving = true
  location.reload()
}

const cursorListeners: ((p: Point) => void)[] = []
const cursor = (p: Point): void => {
  for (const l of cursorListeners) l(p)
}
for (const type of ['pointerdown', 'pointermove'] as const) document.addEventListener(type, (e) => cursor({ x: e.clientX, y: e.clientY }), true)

// While a finger drags, the window covers the screen so the dragged pet or frame is never cut off.
// A tap leaves the window alone: every resize risks a frame where the page and window disagree.
const DRAG_PX = 6
let press: Point | null = null
let dragging = false
document.addEventListener('pointerdown', (e) => (press = { x: e.clientX, y: e.clientY }), true)
document.addEventListener('pointermove', (e) => (dragging ||= press !== null && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_PX), true)
for (const type of ['pointerup', 'pointercancel'] as const)
  document.addEventListener(
    type,
    () => {
      press = null
      dragging = false
    },
    true,
  )

let bounds = { x: 0, y: 0, w: 0, h: 0 }
function track(): void {
  requestAnimationFrame(track)
  // A resize under a resting finger skews the next events (a long press reads as a drag); it waits for the lift.
  if (press && !dragging) return
  let x = innerWidth
  let y = innerHeight
  let r = 0
  let b = 0
  if (dragging) [x, y, r, b] = [0, 0, innerWidth, innerHeight]
  else
    for (const el of document.body.querySelectorAll('*')) {
      const box = el.getBoundingClientRect()
      if (!box.width || !box.height) continue
      x = Math.min(x, box.left)
      y = Math.min(y, box.top)
      r = Math.max(r, box.right)
      b = Math.max(b, box.bottom)
    }
  const next = { x: Math.max(Math.floor(x), 0), y: Math.max(Math.floor(y), 0), w: 0, h: 0 }
  next.w = Math.max(Math.min(Math.ceil(r), innerWidth) - next.x, 0)
  next.h = Math.max(Math.min(Math.ceil(b), innerHeight) - next.y, 0)
  if (next.x !== bounds.x || next.y !== bounds.y || next.w !== bounds.w || next.h !== bounds.h) native.setBounds(next.x, next.y, next.w, next.h, innerWidth)
  bounds = next
}
requestAnimationFrame(track)

// The page spans the whole screen, under the status and navigation bars; frames keep clear of them (box.ts).
function safeArea(): void {
  const [left, top, right, bottom] = native.safeArea(innerWidth).split(',')
  const s = document.documentElement.style
  for (const [side, v] of Object.entries({ left, top, right, bottom })) s.setProperty(`--safe-${side}`, `${v}px`)
}
safeArea()
addEventListener('resize', safeArea)

// A touch outside the window means the cursor rests on the desktop: report a viewport corner the window does not cover.
listeners.outside.push(() => {
  const corners = [
    { x: 0, y: 0 },
    { x: innerWidth - 1, y: 0 },
    { x: 0, y: innerHeight - 1 },
    { x: innerWidth - 1, y: innerHeight - 1 },
  ]
  const free = corners.find((p) => p.x < bounds.x || p.y < bounds.y || p.x >= bounds.x + bounds.w || p.y >= bounds.y + bounds.h)
  if (free) cursor(free)
})

const api: QQPetApi = {
  load: async () => structuredClone(save),
  save(patch) {
    if (leaving) return
    applyPatch(save, structuredClone(patch))
    write()
    if (patch.petInfo) showTray()
  },
  resetPet(sex) {
    save = buried(save, sex)
    write()
    relaunch()
  },
  async exportSave() {
    const day = new Date().toISOString().slice(0, 10)
    return (await call((id) => native.exportSave(id, `QQPet-${day}.json`, JSON.stringify(save, null, 2)))) !== null
  },
  async importSave() {
    const text = await call((id) => native.importSave(id))
    if (text === null) return
    try {
      const pet = petOf(JSON.parse(text))
      if (pet.havePet !== true) throw new Error('no pet in this file')
      native.write(`${FILE}.bak`, JSON.stringify(save))
      native.write(FILE, JSON.stringify(pet))
    } catch (e) {
      await api.messageBox({ type: 'error', message: `这不是有效的QQ宠物存档\n${e}`, buttons: ['确定'] })
      return
    }
    relaunch()
  },
  openGame: (swf) => native.openGame(swf),
  calendar: () => calendar(nativeFetch),
  aiModels: (c) => aiModels(nativeFetch, c),
  aiChat: (c, messages) => aiChat(nativeFetch, c, messages),
  weather: (city) => weather(nativeFetch, city),
  quit: () => native.quit(),
  messageBox: async (o) => Number(await call((id) => native.messageBox(id, JSON.stringify({ buttons: ['取消', '确定'], ...o })))),
  copyText: (text) => native.copyText(text),
  // The overlay window follows the content instead.
  setClickThrough() {},
  // Overlay windows are always on top.
  setAlwaysOnTop() {},
  setFocusable: (on) => native.setFocusable(on),
  setAutoStart: (on) => native.setAutoStart(on),
  setTrayState(state) {
    tray = state
    showTray()
  },
  onCursor: (l) => void cursorListeners.push(l),
  // The notification has no position; its panels open mid-screen, not under the status bar.
  onTrayClick: (l) => void listeners.trayClick.push((c) => l({ ...c, x: innerWidth / 2, y: innerHeight / 2 })),
  onGamePlayed: (l) => void listeners.gamePlayed.push(l),
  // Android only lets the focused app read the clipboard; text arrives through the selection menu and share sheet instead.
  onClipboard: (l) => void listeners.clipboard.push(l),
}

window.qqpet = api
