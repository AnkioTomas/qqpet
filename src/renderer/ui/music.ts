import { save, update } from '../pet/store'

const bgm = new Audio('pet/music/main01.mp3')
bgm.loop = true

function apply(vol: number): void {
  bgm.volume = vol
  // Autoplay is blocked until a gesture; pointerdown below retries.
  if (vol > 0) void bgm.play().catch(() => {})
  else bgm.pause()
}

/** Desktop BGM volume, same 0.1 steps as the opacity slider. */
export function setMusic(v: number): void {
  const vol = Math.round(Math.min(Math.max(v, 0), 1) * 10) / 10
  update('settings', { music: vol })
  apply(vol)
}

apply(save.settings.music)
// Chromium blocks autoplay until a gesture; the pet window is click-through until then.
document.addEventListener('pointerdown', () => apply(save.settings.music), { once: true })
