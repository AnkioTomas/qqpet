import { save } from '../pet/store'
import { div, touch } from './dom'

const SKINS = {
  normal: { head: ['normal/beijing1.bmp', 'normal/beijing2.bmp', 'normal/beijing3.bmp'], foot: ['normal/beijing6.bmp', 'normal/beijing7.bmp', 'normal/beijing8.bmp'] },
  vip: { head: ['vip/Q_01.png', 'vip/Q_02.png', 'vip/Q_03.png'], foot: ['vip/Q_07.png', 'vip/Q_08.png', 'vip/Q_09.png'] },
}

function row(cls: string, imgs: string[], extra?: HTMLElement): HTMLElement {
  // The hd frame slices are SVG redraws under the same names.
  const hd = save.settings.hd
  const r = document.createElement('div')
  r.className = cls
  imgs.forEach((src, i) => {
    const img = document.createElement('img')
    img.className = `${cls}${i + 1}`
    img.src = `pet/windowTip/${hd ? src.replace(/\.\w+$/, '.svg') : src}`
    r.appendChild(img)
  })
  if (extra) r.appendChild(extra)
  return r
}

/** Space kept between a frame shrunk to fit and the screen edges. */
const MARGIN = 16

/** The system bars along one screen edge, set by the Android bridge; none on the desktop. */
const inset = (side: string): number => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--safe-${side}`)) || 0

const scrolls = (el: HTMLElement): boolean =>
  /auto|scroll/.test(getComputedStyle(el).overflow) && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)

/**
 * Shows a frame centered by `translate(-50%, -50%)` in the screen clear of system bars. Returns a function that removes it.
 *
 * With a mouse the frame is scaled down when the screen is too small for it, and
 * dragged unless the press starts in an input or inside `keep` (content that needs
 * its own mouse input, e.g. a SWF). No pointer capture: it would retarget clicks on buttons inside the frame.
 *
 * On touch screens it opens over a backdrop and fills the screen, turned a quarter
 * when it must shrink and that shrinks it less (a wide panel on a portrait phone).
 */
function show(frame: HTMLElement, keep?: HTMLElement): () => void {
  const root = touch ? div('modal', frame) : frame
  root.dataset.hit = ''
  document.body.appendChild(root)
  let dx = 0
  let dy = 0
  let cx = 0
  let cy = 0
  let fit = ''
  /** The scale of a frame turned a quarter, 0 when it is not turned. */
  let spin = 0
  const place = (): void => void (frame.style.transform = `translate(calc(-50% + ${cx + dx}px), calc(-50% + ${cy + dy}px)) ${fit}`)
  const refit = new ResizeObserver(() => {
    if (!frame.isConnected) return refit.disconnect()
    const w = frame.offsetWidth
    const h = frame.offsetHeight
    const [left, top, right, bottom] = ['left', 'top', 'right', 'bottom'].map(inset)
    const room = { w: innerWidth - left - right - MARGIN, h: innerHeight - top - bottom - MARGIN }
    const flat = Math.min(room.w / w, room.h / h)
    const turned = Math.min(room.w / h, room.h / w)
    cx = (left - right) / 2
    cy = (top - bottom) / 2
    spin = touch && flat < 1 && turned > flat ? turned : 0
    fit = !touch ? `scale(${Math.min(1, flat)})` : spin ? `rotate(90deg) scale(${spin})` : `scale(${flat})`
    frame.style.touchAction = spin ? 'none' : ''
    place()
  })
  // Browsers don't pan a scroller turned by a transform: pan it by hand, turning the finger's path back.
  frame.addEventListener('pointerdown', (e) => {
    let el = spin ? (e.target as HTMLElement | null) : null
    while (el && el !== frame && !scrolls(el)) el = el.parentElement
    if (!el || el === frame) return
    const box = el
    let { clientX: x, clientY: y } = e
    let moved = 0
    const move = (m: PointerEvent): void => {
      box.scrollTop += (m.clientX - x) / spin
      box.scrollLeft -= (m.clientY - y) / spin
      moved += Math.abs(m.clientX - x) + Math.abs(m.clientY - y)
      x = m.clientX
      y = m.clientY
    }
    // A pan is not a tap on the button it ends on.
    const eat = (c: MouseEvent): void => c.stopPropagation()
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', () => {
      document.removeEventListener('pointermove', move)
      if (moved < 10) return
      document.addEventListener('click', eat, true)
      setTimeout(() => document.removeEventListener('click', eat, true))
    }, { once: true })
  })
  // The page itself resizes when a phone rotates.
  refit.observe(frame)
  refit.observe(document.documentElement)
  frame.addEventListener('pointerdown', (e) => {
    if (touch || e.button !== 0 || keep?.contains(e.target as Node) || e.target instanceof HTMLInputElement) return
    const sx = e.clientX - dx
    const sy = e.clientY - dy
    const move = (m: PointerEvent): void => {
      dx = m.clientX - sx
      dy = m.clientY - sy
      place()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', () => document.removeEventListener('pointermove', move), { once: true })
  })
  return () => root.remove()
}

/**
 * The original's framed window ("box" component): centered, draggable by its
 * frame, with a close button. Returns a function that removes it.
 */
export function openBox(content: HTMLElement, opts: { vip?: boolean; onClose?: () => void } = {}): () => void {
  const skin = SKINS[opts.vip ? 'vip' : 'normal']
  const frame = document.createElement('div')
  frame.className = opts.vip ? 'box vip' : 'box'

  const closeBtn = document.createElement('div')
  closeBtn.className = 'close'
  const body = document.createElement('div')
  body.className = 'content'
  for (const cls of ['content1', 'content2', 'content3']) {
    const d = document.createElement('div')
    d.className = cls
    if (cls === 'content2') d.appendChild(content)
    body.appendChild(d)
  }
  frame.append(row('head', skin.head, closeBtn), body, row('foot', skin.foot))

  const close = show(frame, content)
  closeBtn.addEventListener('click', () => {
    close()
    opts.onClose?.()
  })
  return close
}

/**
 * The original's single-image window ("boxOneImg"): `content` on an optional
 * background image, centered and draggable. Returns a function that removes it.
 */
export function openFrame(content: HTMLElement, background?: string): () => void {
  const frame = document.createElement('div')
  frame.className = 'boxFrame focusPress'
  const bg = document.createElement('div')
  bg.className = 'backgroundImage'
  if (background) bg.style.backgroundImage = `url('${background}')`
  bg.appendChild(content)
  frame.appendChild(bg)
  return show(frame)
}
