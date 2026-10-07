import { save } from '../pet/store'

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

/**
 * Drags a frame centered by `translate(-50%, -50%)`, unless the press starts
 * in an input or inside `keep` (content that needs its own mouse input, e.g. a SWF).
 * No pointer capture: it would retarget clicks on buttons inside the frame.
 */
function draggable(frame: HTMLElement, keep?: HTMLElement): void {
  let dx = 0
  let dy = 0
  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || keep?.contains(e.target as Node) || e.target instanceof HTMLInputElement) return
    const sx = e.clientX - dx
    const sy = e.clientY - dy
    const move = (m: PointerEvent): void => {
      dx = m.clientX - sx
      dy = m.clientY - sy
      frame.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', () => document.removeEventListener('pointermove', move), { once: true })
  })
}

/**
 * The original's framed window ("box" component): centered, draggable by its
 * frame, with a close button. Returns a function that removes it.
 */
export function openBox(content: HTMLElement, opts: { vip?: boolean; onClose?: () => void } = {}): () => void {
  const skin = SKINS[opts.vip ? 'vip' : 'normal']
  const frame = document.createElement('div')
  frame.className = opts.vip ? 'box vip' : 'box'
  frame.dataset.hit = ''

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
  document.body.appendChild(frame)

  const close = (): void => frame.remove()
  closeBtn.addEventListener('click', () => {
    close()
    opts.onClose?.()
  })
  draggable(frame, content)
  return close
}

/**
 * The original's single-image window ("boxOneImg"): `content` on an optional
 * background image, centered and draggable. Returns a function that removes it.
 */
export function openFrame(content: HTMLElement, background?: string): () => void {
  const frame = document.createElement('div')
  frame.className = 'boxFrame focusPress'
  frame.dataset.hit = ''
  const bg = document.createElement('div')
  bg.className = 'backgroundImage'
  if (background) bg.style.backgroundImage = `url('${background}')`
  bg.appendChild(content)
  frame.appendChild(bg)
  document.body.appendChild(frame)
  draggable(frame)
  return () => frame.remove()
}
