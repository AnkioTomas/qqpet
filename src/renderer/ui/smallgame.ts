import { speak } from '../pet/pet'
import { addInfo, busy, info, playingDesk, refreshTray, save, setDeskGame, setInfo, setTray, stage } from '../pet/store'
import { addCount } from '../pet/tasks'
import { SwfPlayer } from '../swf/player'
import './css/smallgame.css'
import { button, div } from './dom'

/**
 * The original client's desktop games (pet/smallGame). Each SWF is its own
 * borderless window, driven through ExternalInterface: "API.*" manages the
 * windows and calls between them, "TICKLE_*" reads and rewards the pet.
 * Every window is an iframe with its own Ruffle, so "API" knows its caller.
 */
export const SMALL_GAMES = [
  { dir: 'guess', name: '猜动作' },
  { dir: 'paopao2', name: '吹泡泡' },
  { dir: 'rope', name: '跳绳' },
  { dir: 'mouse', name: '捉老鼠' },
  { dir: 'ball', name: '颠球' },
  // Only the kid builds exist: main_102 (GG) and main_103 (MM).
  { dir: '100ceng', name: '下一百层', kidOnly: true },
]

/** Every main_*.swf stage is 140×140. */
const MAIN = 140
/** Per Tickle.sendAction (the games send one every 5 hits); guess's offline defaults. */
const REWARD = { mood: 55, yb: 1 }
/**
 * SWFs that never listen to the mouse. Native layered windows let clicks through
 * their transparent pixels; an iframe swallows its whole rect, so these must not.
 */
const PASSIVE = /^(prompt_(money|mood|timer)|status_count|shadow|player_|rat\.)/

interface Win {
  name: string
  parent: Win | null
  box: HTMLDivElement
  player?: SwfPlayer
  x: number
  y: number
  w: number
  h: number
  drag: boolean
}

type Fn = (...a: never[]) => unknown

const wins = new Map<string, Win>()
/** Windows inside an ExternalInterface call; Ruffle cannot be re-entered, so calls to them wait. */
const inCall = new Set<Win>()
let root: Win | null = null
let dir = ''
/** Above .smallGameWin's own z-index, or "topmost" would sink below every other window. */
let top = 50

const place = (w: Win): void => {
  Object.assign(w.box.style, { left: `${w.x}px`, top: `${w.y}px`, width: `${w.w}px`, height: `${w.h}px` })
}

const guard =
  (w: Win, f: Fn): Fn =>
  (...a) => {
    inCall.add(w)
    try {
      return f(...a)
    } finally {
      inCall.delete(w)
    }
  }

function call(w: Win | undefined, fn: string, args: unknown[]): unknown {
  if (!w?.player || wins.get(w.name) !== w) return undefined
  if (inCall.has(w)) return void setTimeout(() => call(w, fn, args))
  return w.player.el.ruffle().callExternalInterface(fn, ...args)
}

/** A window may destroy itself from its own call, so its iframe goes after the call returns. */
function destroy(w: Win): void {
  if (wins.get(w.name) !== w) return
  for (const c of [...wins.values()]) if (c.parent === w) destroy(c)
  wins.delete(w.name)
  setTimeout(() => w.box.remove())
  if (w === root) finish()
}

function finish(): void {
  root = null
  dir = ''
  setDeskGame('')
  document.getElementById('pet')!.hidden = false
  window.qqpet.setFocusable(false)
  addCount('GameRound')
  refreshTray()
}

function reward(w: Win): void {
  const mood = Math.min(REWARD.mood, save.petComputedlInfo.moodMax - info.mood)
  setInfo('mood', info.mood + mood)
  addInfo('yb', REWARD.yb)
  call(w, 'TICKLE_OnResult', [mood, REWARD.yb])
}

/** The "API" object one window's SWF sees; a missing window name means the caller. */
function api(self: Win): Record<string, Fn> {
  const of = (name?: string): Win => (name ? wins.get(name)! : self)
  const move = (w: Win, x: number, y: number): number => {
    w.x = x
    w.y = y
    place(w)
    return 1
  }
  const methods: Record<string, Fn> = {
    IsVisible: (n?: string) => +!of(n).box.hidden,
    IsEnableDrag: (n?: string) => +of(n).drag,
    EnableDrag: (on: number, n?: string) => {
      of(n).drag = on === 1
      return 1
    },
    DestroyWindow: (n?: string) => {
      destroy(of(n))
      return 1
    },
    ResizeWindow: (w: number, h: number, n?: string) => {
      Object.assign(of(n), { w, h })
      place(of(n))
      return 1
    },
    MoveTo: (x: number, y: number, n?: string) => move(of(n), x, y),
    MoveBy: (dx: number, dy: number, n?: string) => move(of(n), of(n).x + dx, of(n).y + dy),
    GetWindowRect: (n?: string) => `${of(n).x},${of(n).y},${of(n).w},${of(n).h}`,
    GetWindowPosition: () => `${self.x},${self.y}`,
    GetScalable: () => 1,
    SetScalable: () => 1,
    CreateWindow: (name: string, x: number, y: number, w: number, h: number, hidden: number, swf: string) => {
      const old = wins.get(name)
      if (old) destroy(old)
      open(name, self, swf, x, y, w, h).box.hidden = hidden === 1
      return 1
    },
    // 0 self, -1 parent, 1 children.
    GetWindowName: (opt: number) =>
      opt === 0 ? self.name : opt === -1 ? (self.parent?.name ?? '') : [...wins.values()].filter((c) => c.parent === self).map((c) => c.name),
    SetWindow: (op: string, n?: string) => {
      if (op === 'topmost') of(n).box.style.zIndex = String(++top)
    },
    Show: (cmd: number, n?: string) => {
      of(n).box.hidden = cmd === 0
      return 1
    },
    GetCursorPosition: () => window.API.GetCursorPosition(),
    // Ruffle's Capabilities.screenResolution is the player's own size; the patched SWFs ask these instead.
    GetScreenWidth: () => innerWidth,
    GetScreenHeight: () => innerHeight,
    RemoteCall: (n: string, fn: string, ...args: never[]) => call(wins.get(n), fn, args),
  }
  for (const [k, f] of Object.entries(methods)) methods[k] = guard(self, f)
  return methods
}

/** Drags a window whose SWF enabled it, reporting each step like a moved native window. */
function draggable(w: Win, doc: Document): void {
  doc.addEventListener(
    'pointerdown',
    (e) => {
      if (!w.drag || e.button !== 0) return
      let sx = e.screenX
      let sy = e.screenY
      const move = (m: PointerEvent): void => {
        w.x += m.screenX - sx
        w.y += m.screenY - sy
        sx = m.screenX
        sy = m.screenY
        place(w)
        call(w, 'APIEvent.OnWindowMove', [w.x, w.y, w.w, w.h])
      }
      doc.addEventListener('pointermove', move, true)
      doc.addEventListener('pointerup', () => doc.removeEventListener('pointermove', move, true), { once: true, capture: true })
    },
    true,
  )
}

function open(name: string, parent: Win | null, swf: string, x: number, y: number, w: number, h: number): Win {
  const frame = document.createElement('iframe')
  frame.src = 'swf.html'
  const box = div('smallGameWin', frame)
  box.dataset.hit = ''
  box.classList.toggle('passive', PASSIVE.test(swf))
  const win: Win = { name, parent, box, x, y, w, h, drag: false }
  wins.set(name, win)
  place(win)
  document.body.append(box)
  frame.addEventListener(
    'load',
    () => {
      Object.assign(frame.contentWindow!, {
        API: api(win),
        TICKLE_GetFeeling: guard(win, () => ({ feelNow: info.mood, feelTotal: save.petComputedlInfo.moodMax })),
        TICKLE_SendAction: guard(win, () => reward(win)),
      })
      draggable(win, frame.contentDocument!)
      win.player = new SwfPlayer(frame.contentDocument!.body)
      win.player.el.ruffle().addFSCommandHandler((cmd) => {
        if (cmd === 'quit' && root) destroy(root)
      })
      void win.player.load(`pet/smallGame/${dir}/${swf}`, `pet/smallGame/${dir}/`)
    },
    { once: true },
  )
  return win
}

export function playSmallGame(g: (typeof SMALL_GAMES)[number]): void {
  if (root || playingDesk()) return
  const st = stage()
  if (st === 'Egg') return speak({ s: '[host]，我还是个蛋呢，等破壳了再陪你玩~', now: true }, 'speak')
  if (busy()) return speak({ s: '[host]，我正忙着呢，忙完再陪你玩~', now: true }, 'speak')
  dir = g.dir
  setDeskGame(g.dir)
  const pet = document.getElementById('pet')!
  const r = pet.getBoundingClientRect()
  pet.hidden = true
  setTray('game')
  // 100ceng moves with the arrow keys.
  window.qqpet.setFocusable(true)
  const variant = `1${g.kidOnly || st !== 'Adult' ? 0 : 2}${info.sex === 'GG' ? 2 : 3}`
  root = open('main', null, `main_${variant}.swf`, Math.round(r.left + (r.width - MAIN) / 2), Math.round(r.bottom - MAIN), MAIN, MAIN)
  root.box.append(button('quit', () => destroy(root!)))
}
