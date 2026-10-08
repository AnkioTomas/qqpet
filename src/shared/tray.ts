import type { TrayState } from './ipc'
import type { PetInfo } from './save'

// Frame count and tooltip per state, from the original traysModel.
// `[n]` is the pet name, `[h]` the owner name. Icons live in pet/img_res/Tray/<sex>/.
export const TRAY_STATES: Record<TrayState, { frames: number; tip?: string }> = {
  normal: { frames: 4, tip: '[h]家的[n]' },
  leave: { frames: 0 },
  dirty: { frames: 4, tip: '[n]要清洁~' },
  event: { frames: 2, tip: '[h]家的[n]' },
  feast: { frames: 3 },
  game: { frames: 4, tip: '[n]游戏中~' },
  hungry: { frames: 4, tip: '[n]要吃饭~' },
  ill: { frames: 2, tip: '[n]生病了~' },
  pause: { frames: 5, tip: '[n]暂停了~' },
  study: { frames: 4, tip: '[n]学习中~' },
  travel: { frames: 3, tip: '[n]旅游中~' },
  work: { frames: 3, tip: '[n]工作中~' },
  dead: { frames: 2, tip: '[n]死亡了~' },
  bury: { frames: 2, tip: '[n]已埋葬~' },
}

// A name that itself contains a placeholder would be substituted twice.
const label = (s: string, fallback: string): string => (!s || /\[[^\]]]/.test(s) ? fallback : s)

/** The state's tooltip for `pet`; undefined for states that keep the previous one. */
export function trayTip(state: TrayState, pet: PetInfo): string | undefined {
  return TRAY_STATES[state].tip?.replace(/\[n]/g, label(pet.name, '宠宝~')).replace(/\[h]/g, label(pet.host, '主人~'))
}
