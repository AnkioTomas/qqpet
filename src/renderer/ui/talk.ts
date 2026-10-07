import { info, petSize } from '../pet/store'
import { SwfPlayer } from '../swf/player'

const W = 261
const H = 183
const SHOW_MS = 5000

const el = document.createElement('div')
el.id = 'talk'
el.dataset.hit = ''
el.style.visibility = 'hidden'
document.body.appendChild(el)
const player = new SwfPlayer(el)

let skin = 0
let actions: (() => void)[] = []
let hideTimer = 0

const hide = (): void => {
  clearTimeout(hideTimer)
  el.style.visibility = 'hidden'
}

/** Called by talk.swf; button i runs actions[i]. */
window.BubbleAPI = {
  OnButtonClick: (i) => {
    hide()
    actions[i]?.()
  },
}

/** Bubble skin follows the VIP flags: 1 plain, 2 pink diamond, 3 sweetheart, 4 both. */
const skinOf = (): number => (info.pinkDiamond ? (info.sweetHeart ? 4 : 2) : info.sweetHeart ? 3 : 1)

let lift = 0
/**
 * Room the action bar takes above the pet (0 when it is hidden or below).
 * The bar calls this whenever the pet moves or grows, so the bubble follows.
 */
export function setBubbleLift(px: number): void {
  lift = px
  place()
}

function place(): void {
  const size = petSize()
  const left = Math.min(Math.max(info.lastX + size / 2 - W / 2, 0), innerWidth - W)
  // Above the pet; below it when there is no room at the top.
  const top = info.lastY < H ? info.lastY + size : info.lastY - H - lift
  el.style.left = `${left}px`
  el.style.top = `${top}px`
}

export async function say(text: string, buttons: string[], onButton: (() => void)[] = []): Promise<void> {
  actions = onButton
  if (skin !== skinOf()) {
    skin = skinOf()
    await player.load(`pet/talk/${skin}/talk.swf`)
  }
  const speak = await player.callback('speak')
  place()
  el.style.visibility = 'visible'
  speak(text, buttons)
  clearTimeout(hideTimer)
  hideTimer = window.setTimeout(hide, SHOW_MS)
}
