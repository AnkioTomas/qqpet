import { canChooseWindowDirection } from '../../shared/window-direction'

let desktopSize: { width: number; height: number; zoom: number } | null = null

/** Native display dimensions avoid racing a Chromium resize after moving the overlay. */
export const viewportSize = (): { width: number; height: number } => desktopSize ?? { width: innerWidth, height: innerHeight }
export const setDesktopSize = (size: { width: number; height: number; zoom: number }): void => {
  desktopSize = { width: size.width, height: size.height, zoom: size.zoom }
}
/** The desktop page zoom; null on hosts that cannot zoom the page. */
export const pageZoom = (): number | null => desktopSize?.zoom ?? null

/**
 * Use the screen's logical size rather than DPR or the current layout viewport:
 * Android/Harmony scale that viewport to a fixed short side, even on wide screens.
 * The actual frame still fits the available page space independently (box.ts).
 */
export const windowDirectionAvailable = (): boolean => canChooseWindowDirection(
  window.qqpet.capabilities?.rotatableScreen === true, window.screen.width, window.screen.height,
)
