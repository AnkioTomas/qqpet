import { app, Menu, nativeImage, screen, Tray, type NativeImage, type Rectangle } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TrayClick, TrayState } from '../shared/ipc'
import type { PetInfo, SaveData } from '../shared/save'
import { TRAY_STATES, trayTip } from '../shared/tray'
import { resourcesRoot } from './protocol'

const FRAME_MS = 300

/** createFromPath also loads a `@2x` sibling for HiDPI screens; a buffer is the file alone. */
function icon(sex: string, file: string, hd: boolean): NativeImage {
  const path = join(resourcesRoot, 'pet/img_res/Tray', sex, file)
  return hd ? nativeImage.createFromPath(path) : nativeImage.createFromBuffer(readFileSync(path))
}

export function createPetTray(onClick: (e: TrayClick) => void) {
  const tray = new Tray(icon('GG', 'leave.png', false))
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
    // An icon hidden by the menu bar (Bartender, or no room left) reports an off-screen position; drop it so the panel opens at the default spot.
    const at = (kind: TrayClick['kind'], b: Rectangle): TrayClick =>
      screen.getAllDisplays().some(({ bounds: d }) => b.x >= d.x && b.y >= d.y && b.x < d.x + d.width && b.y < d.y + d.height) ? { kind, x: b.x, y: b.y } : { kind }
    tray.on('click', (_e, b) => onClick(at('state', b)))
    tray.on('right-click', (_e, b) => onClick(at('menu', b)))
  }

  let timer: NodeJS.Timeout | undefined
  let current: TrayState = 'leave'
  const retip = (pet: PetInfo): void => {
    const tip = trayTip(current, pet)
    if (tip) tray.setToolTip(tip)
  }
  return {
    /** Re-renders the tooltip, e.g. after a rename. */
    retip,
    /** Without a state: redraws the current one, e.g. after the hd setting changed. */
    setState(s: SaveData, state = current): void {
      const pet = s.petInfo
      clearTimeout(timer)
      current = state
      retip(pet)
      const { frames } = TRAY_STATES[state]
      if (frames === 0) return tray.setImage(icon(pet.sex, `${state}.png`, s.settings.hd))
      const images = Array.from({ length: frames }, (_, i) => icon(pet.sex, `${state}/${i + 1}.png`, s.settings.hd))
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
