import { SwfPlayer } from './swf/player'

const SIZE = 140
const MARGIN = 40

const save = await window.qqpet.load()
const actions = ['Appear', 'Stand', 'Stand1', 'Speak', 'Hide'].map((a) => `pet/Action/${save.petInfo.sex}/Adult/peaceful/${a}.swf`)
window.qqpet.setTrayState('normal')
window.qqpet.onTrayClick((c) => console.log('tray click', c))

const petEl = document.getElementById('pet')!
const { lastX, lastY } = save.petInfo
petEl.style.left = `${lastX >= 0 ? lastX : innerWidth - SIZE - MARGIN}px`
petEl.style.top = `${lastY >= 0 ? lastY : innerHeight - SIZE - MARGIN}px`

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
      window.qqpet.save({ petInfo: { lastX: petEl.offsetLeft, lastY: petEl.offsetTop } })
    }
    addEventListener('pointermove', move, true)
    addEventListener('pointerup', up, { capture: true, once: true })
  },
  true,
)

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 1000 / 12))
const player = new SwfPlayer(petEl)
for (let i = 0; ; i = (i + 1) % actions.length) {
  await player.load(actions[i])
  while (player.currentFrame < player.totalFrames - 1) await tick()
}
