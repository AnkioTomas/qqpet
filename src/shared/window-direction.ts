/** Space kept between a fitted window and the screen edges. */
export const WINDOW_MARGIN = 16

// The largest standard panels have 800px content; the VIP frame adds 15 + 14px.
// Use the same reference for every panel so opening the smaller settings window
// does not hide a preference that is still useful for the shop or community.
const FULL_WINDOW_WIDTH = 800 + 15 + 14

/** Screen dimensions are logical CSS pixels, before a mobile host's page scaling. */
export function canChooseWindowDirection(rotatable: boolean, width: number, height: number): boolean {
  if (!rotatable || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width === height) return false
  // Keep the choice available in landscape too; orientation and the keyboard
  // must not change whether this screen can fit original-sized portrait panels.
  return Math.min(width, height) < FULL_WINDOW_WIDTH + WINDOW_MARGIN
}
