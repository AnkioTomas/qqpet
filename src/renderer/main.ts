import { PetSwf } from './swf/pet-swf'

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

const cursor = { x: 0, y: 0 }
window.API = {
  GetCursorPosition: () => `${cursor.x},${cursor.y},0`,
  GetWindowRect: () => `${petEl.offsetLeft},${petEl.offsetTop},${SIZE},${SIZE}`,
}

// The window is click-through except while the cursor is over a [data-hit]
// element (or a drag is in progress).
let interactive = false
let dragging = false
window.qqpet.onCursor((p) => {
  cursor.x = p.x
  cursor.y = p.y
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
const pet = new PetSwf(petEl)
for (let i = 0; ; i = (i + 1) % actions.length) {
  await pet.load(actions[i])
  while (pet.front.currentFrame < pet.front.totalFrames - 1) await tick()
  // Single-frame actions (Stand) animate from script and hold until the state
  // machine queues something else; the demo just holds them for a while.
  if (pet.front.totalFrames === 1) await new Promise((r) => setTimeout(r, 5000))
}
