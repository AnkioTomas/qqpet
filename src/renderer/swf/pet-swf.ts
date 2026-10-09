import { SwfPlayer } from './player'

const nextPaint = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

/** Ruffle's :host { all: initial } and SWF cursor commands both beat document CSS. */
function pinCursor(el: HTMLElement): void {
  el.style.setProperty('cursor', 'inherit', 'important')
  const sr = el.shadowRoot
  if (!sr || sr.getElementById('qqpet-cursor')) return
  const s = el.ownerDocument.createElement('style')
  s.id = 'qqpet-cursor'
  s.textContent = ':host, canvas { cursor: inherit !important }'
  sr.append(s)
}

/**
 * Pet action player. Ruffle tears down its instance on every load(), which
 * blanks the pet for a few frames, so actions alternate between two stacked
 * players: the next action loads in the hidden one and is swapped in once it
 * has painted.
 */
export class PetSwf {
  front: SwfPlayer
  private back: SwfPlayer

  constructor(parent: HTMLElement) {
    this.front = new SwfPlayer(parent)
    this.back = new SwfPlayer(parent)
    this.back.el.style.visibility = 'hidden'
    pinCursor(this.front.el)
    pinCursor(this.back.el)
  }

  async load(url: string): Promise<void> {
    const next = this.back
    await next.load(url)
    pinCursor(next.el)
    await nextPaint()
    next.el.style.visibility = 'visible'
    this.front.el.style.visibility = 'hidden'
    this.front.stop()
    this.back = this.front
    this.front = next
  }
}
