import { SwfPlayer } from './player'

const nextPaint = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

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
  }

  async load(url: string): Promise<void> {
    const next = this.back
    await next.load(url)
    await nextPaint()
    next.el.style.visibility = 'visible'
    this.front.el.style.visibility = 'hidden'
    this.front.stop()
    this.back = this.front
    this.front = next
  }
}
