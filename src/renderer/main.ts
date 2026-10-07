import { SwfPlayer } from './swf/player'

const SIZE = 140
const ACTIONS = ['Appear', 'Stand', 'Stand1', 'Speak', 'Hide'].map((a) => `pet/Action/GG/Adult/peaceful/${a}.swf`)

const petEl = document.getElementById('pet')!
petEl.style.left = `${innerWidth - SIZE - 40}px`
petEl.style.top = `${innerHeight - SIZE - 40}px`

// The window is click-through except while the cursor is over a [data-hit]
// element (or a drag is in progress).
let interactive = false
let dragging = false
window.qqpet.onCursor((p) => {
  const hit = dragging || document.elementFromPoint(p.x, p.y)?.closest('[data-hit]') != null
  if (hit === interactive) return
  interactive = hit
  window.qqpet.setClickThrough(!hit)
})

petEl.addEventListener(
  'pointerdown',
  (e) => {
    dragging = true
    const dx = e.clientX - petEl.offsetLeft
    const dy = e.clientY - petEl.offsetTop
    const move = (m: PointerEvent): void => {
      petEl.style.left = `${m.clientX - dx}px`
      petEl.style.top = `${m.clientY - dy}px`
    }
    const up = (): void => {
      dragging = false
      removeEventListener('pointermove', move, true)
    }
    addEventListener('pointermove', move, true)
    addEventListener('pointerup', up, { capture: true, once: true })
  },
  true,
)

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 1000 / 12))
const player = new SwfPlayer(petEl)
for (let i = 0; ; i = (i + 1) % ACTIONS.length) {
  await player.load(ACTIONS[i])
  while (player.currentFrame < player.totalFrames - 1) await tick()
}
