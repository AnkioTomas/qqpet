import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron'
import { join } from 'node:path'
import type { TrayClick, TrayState } from '../shared/ipc'
import type { PetInfo } from '../shared/save'
import { resourcesRoot } from './protocol'

const FRAME_MS = 300

// Frame count and tooltip per state, from the original traysModel.
// `[n]` is the pet name, `[h]` the owner name.
const STATES: Record<TrayState, { frames: number; tip?: string }> = {
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

const icon = (sex: string, file: string): NativeImage =>
  nativeImage.createFromPath(join(resourcesRoot, 'pet/img_res/Tray', sex, file))

// A name that itself contains a placeholder would be substituted twice.
const label = (s: string, fallback: string): string => (!s || /\[[^\]]\]/.test(s) ? fallback : s)

export function createPetTray(onClick: (e: TrayClick) => void) {
  const tray = new Tray(nativeImage.createFromPath(join(resourcesRoot, 'pet/img_res/Tray/GG/leave.png')))
  tray.setToolTip('QQ宠物')
  // AppIndicator trays on Linux emit no click events; expose the same actions as a menu.
  if (process.platform === 'linux') {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '宠物状态', click: () => onClick({ kind: 'state' }) },
        { label: '菜单', click: () => onClick({ kind: 'menu' }) },
        { type: 'separator' },
        { label: '退出', click: () => app.quit() },
      ]),
    )
  } else {
    tray.on('click', (_e, b) => onClick({ kind: 'state', x: b.x, y: b.y }))
    tray.on('right-click', (_e, b) => onClick({ kind: 'menu', x: b.x, y: b.y }))
  }

  let timer: NodeJS.Timeout | undefined
  return {
    setState(state: TrayState, pet: PetInfo): void {
      clearTimeout(timer)
      const { frames, tip } = STATES[state]
      if (tip) tray.setToolTip(tip.replace(/\[n\]/g, label(pet.name, '宠宝~')).replace(/\[h\]/g, label(pet.host, '主人~')))
      if (frames === 0) return tray.setImage(icon(pet.sex, `${state}.png`))
      const images = Array.from({ length: frames }, (_, i) => icon(pet.sex, `${state}/${i + 1}.png`))
      const show = (i: number): void => {
        tray.setImage(images[i])
        timer = setTimeout(() => show((i + 1) % frames), FRAME_MS)
      }
      show(0)
    },
    destroy(): void {
      clearTimeout(timer)
      tray.destroy()
    },
  }
}
