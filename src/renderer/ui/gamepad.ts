import './css/gamepad.css'
import { div } from './dom'

interface Key {
  label: string
  key: string
  code: string
  keyCode: number
}

const named = (label: string, key: string, code: string, keyCode: number): Key => ({ label, key, code, keyCode })

/** What a pad button can send. */
const KEYS: Key[] = [
  named('▲', 'ArrowUp', 'ArrowUp', 38),
  named('▼', 'ArrowDown', 'ArrowDown', 40),
  named('◀', 'ArrowLeft', 'ArrowLeft', 37),
  named('▶', 'ArrowRight', 'ArrowRight', 39),
  named('空格', ' ', 'Space', 32),
  named('回车', 'Enter', 'Enter', 13),
  named('Shift', 'Shift', 'ShiftLeft', 16),
  named('Ctrl', 'Control', 'ControlLeft', 17),
  named('Esc', 'Escape', 'Escape', 27),
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => named(c, c.toLowerCase(), `Key${c}`, c.charCodeAt(0))),
  ...[...'0123456789'].map((d) => named(d, d, `Digit${d}`, d.charCodeAt(0))),
]
const byCode = new Map(KEYS.map((k) => [k.code, k]))

/** The pad's buttons, by position, and the key each sends unless the player changed it. */
const DEFAULTS = { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight', down: 'ArrowDown', a: 'Enter', b: 'Space' }
type Button = keyof typeof DEFAULTS

/** Stored per game. */
interface Settings {
  hidden: boolean
  keys: Record<Button, string>
}

/** Acts on a press without moving focus away from the SWF: Ruffle only takes keys while focused. */
function onPress(el: HTMLElement, run: () => void): void {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    run()
  })
}

/**
 * Touch controls for a game page: an on-screen pad whose keys reach the SWF
 * as keyboard events on `player`, each button remappable per `game`; a
 * toggle that hides the pad for mouse-only games; and a way out of full screen.
 */
export function gamepad(player: HTMLElement, game: string): void {
  const stored = `gamepad:${game}`
  const settings: Settings = { hidden: false, ...JSON.parse(localStorage.getItem(stored) ?? '{}') }
  settings.keys = { ...DEFAULTS, ...settings.keys }
  const persist = (): void => localStorage.setItem(stored, JSON.stringify(settings))
  let editing = false

  const send = (type: 'keydown' | 'keyup', k: Key): boolean =>
    player.dispatchEvent(new KeyboardEvent(type, { key: k.key, code: k.code, keyCode: k.keyCode, bubbles: true, composed: true }))

  /** A sheet listing every key; picking one assigns it to `b`. */
  const pick = (b: Button, relabel: () => void): void => {
    const keys = KEYS.map((k) => {
      const option = div(k.code === settings.keys[b] ? 'padPickerKey on' : 'padPickerKey', k.label)
      onPress(option, () => {
        settings.keys[b] = k.code
        persist()
        relabel()
        sheet.remove()
      })
      return option
    })
    const sheet = div('padPicker', div('padPickerTitle', '选择这个按钮要发送的按键（点空白处取消）'), div('padPickerKeys', ...keys))
    onPress(sheet, () => sheet.remove())
    document.body.append(sheet)
  }

  const button = (b: Button): HTMLElement => {
    const el = div(`padKey ${b}`)
    const relabel = (): void => void (el.textContent = byCode.get(settings.keys[b])!.label)
    relabel()
    // The key pressed is released, even if the button was remapped meanwhile.
    let down: Key | null = null
    onPress(el, () => {
      if (editing) return pick(b, relabel)
      player.focus()
      down = byCode.get(settings.keys[b])!
      el.classList.add('on')
      send('keydown', down)
    })
    const release = (): void => {
      if (!down) return
      el.classList.remove('on')
      send('keyup', down)
      down = null
    }
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(type, release)
    return el
  }

  const pad = div('gamepad', div('padArrows', button('up'), button('left'), button('right'), button('down')), div('padButtons', button('a'), button('b')))
  const show = (on: boolean): void => {
    pad.hidden = !on
    settings.hidden = !on
    persist()
  }
  show(!settings.hidden)

  const edit = div('padTool', '改键')
  onPress(edit, () => {
    editing = !editing
    edit.textContent = editing ? '完成' : '改键'
    pad.classList.toggle('editing', editing)
    if (editing) show(true)
  })
  const toggle = div('padTool', '按键')
  onPress(toggle, () => show(settings.hidden))
  const exit = div('padTool', '退出')
  onPress(exit, () => window.close())
  document.body.append(pad, div('padTools', edit, toggle, exit))
}
