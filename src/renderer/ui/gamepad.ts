import './css/gamepad.css'
import { div } from './dom'

interface Key {
  label: string
  key: string
  code: string
  keyCode: number
}

const UP: Key = { label: '▲', key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 }
const DOWN: Key = { label: '▼', key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 }
const LEFT: Key = { label: '◀', key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 }
const RIGHT: Key = { label: '▶', key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 }
const SPACE: Key = { label: '空格', key: ' ', code: 'Space', keyCode: 32 }
const ENTER: Key = { label: '回车', key: 'Enter', code: 'Enter', keyCode: 13 }

/**
 * On-screen arrows, space and enter for playing keyboard games on a touch
 * screen. The keys reach the SWF as keyboard events on `player`; a toggle
 * hides the pad for mouse-only games, remembered per `game`.
 */
export function gamepad(player: HTMLElement, game: string): void {
  const send = (type: 'keydown' | 'keyup', k: Key): boolean =>
    player.dispatchEvent(new KeyboardEvent(type, { key: k.key, code: k.code, keyCode: k.keyCode, bubbles: true, composed: true }))

  const key = (cls: string, k: Key): HTMLElement => {
    const b = div(`padKey ${cls}`, k.label)
    let down = false
    b.addEventListener('pointerdown', (e) => {
      // Ruffle only takes keys while it has focus; a press on the pad must not take it away.
      e.preventDefault()
      e.stopPropagation()
      player.focus()
      down = true
      b.classList.add('on')
      send('keydown', k)
    })
    const release = (): void => {
      if (!down) return
      down = false
      b.classList.remove('on')
      send('keyup', k)
    }
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(type, release)
    return b
  }

  const pad = div(
    'gamepad',
    div('padArrows', key('up', UP), key('left', LEFT), key('right', RIGHT), key('down', DOWN)),
    div('padButtons', key('enter', ENTER), key('space', SPACE)),
  )
  const stored = `gamepad:${game}`
  const show = (on: boolean): void => {
    pad.hidden = !on
    localStorage.setItem(stored, on ? '1' : '0')
  }
  const toggle = div('padToggle', '按键')
  toggle.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    show(pad.hidden === true)
  })
  show(localStorage.getItem(stored) !== '0')
  document.body.append(pad, toggle)
}
