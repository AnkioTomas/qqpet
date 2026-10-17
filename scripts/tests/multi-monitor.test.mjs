import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { desktopCursor, overlayArea, petDisplay } from '../../src/main/desktop.ts'
import { startSave } from '../../src/shared/save-logic.ts'
import { renderer } from './pet-drag.test.mjs'

const primary = { id: 1, scaleFactor: 1, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }
const left = { id: 2, scaleFactor: 1.25, workArea: { x: -1280, y: -200, width: 1280, height: 984 } }
const above = { id: 3, scaleFactor: 2, workArea: { x: 0, y: -1440, width: 2560, height: 1400 } }

function desktop() {
  let displays = [primary, left, above]
  let point = { x: 550, y: 340 }
  let bounds = { ...primary.workArea }
  const screen = {
    getAllDisplays: () => displays,
    getPrimaryDisplay: () => primary,
    getCursorScreenPoint: () => point,
    getDisplayNearestPoint: p => displays.find(d => p.x >= d.workArea.x && p.x < d.workArea.x + d.workArea.width && p.y >= d.workArea.y && p.y < d.workArea.y + d.workArea.height) ?? primary,
  }
  const win = { getBounds: () => bounds, setBounds: next => { bounds = { ...next } } }
  return { screen, win, move: next => { point = next }, unplug: () => { displays = [primary] } }
}

test('saved display is restored; a disconnected display falls back to primary', () => {
  const { screen } = desktop()
  assert.equal(petDisplay(screen, 2).id, 2)
  assert.equal(petDisplay(screen, 999).id, 1)
  const stored = startSave(null)
  stored.havePet = true
  stored.settings.petDisplayId = 2
  const restored = startSave(JSON.parse(JSON.stringify(stored)))
  assert.equal(restored.settings.petDisplayId, 2)
  delete restored.settings.petDisplayId
  assert.equal(startSave(restored).settings.petDisplayId, null)
})

test('native overlay follows negative and vertical display coordinates without mixing DIP and pixels', () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  d.move({ x: -100, y: 100 })
  const idle = position(false)
  assert.equal(idle.desktop.id, 1, 'hovering another screen must not move the pet')
  const p = position(true)
  assert.deepEqual(d.win.getBounds(), left.workArea)
  assert.equal(p.x, 1180)
  assert.equal(p.y, 300)
  assert.deepEqual(p.desktop.offset, { x: 1280, y: 200 })
  d.move({ x: 600, y: -600 })
  const top = position(true)
  assert.deepEqual(d.win.getBounds(), above.workArea)
  assert.equal(top.x, 600)
  assert.equal(top.y, 840)
  assert.deepEqual(top.desktop.offset, { x: 0, y: 1440 })
  assert.ok(top.desktop.sequence > p.desktop.sequence)
})

test('disconnecting the active screen relocates the overlay to a visible screen', () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  d.move({ x: -100, y: 100 })
  position(true)
  d.unplug()
  const p = position(false)
  assert.deepEqual(d.win.getBounds(), primary.workArea)
  assert.equal(p.desktop.id, 1)
  assert.deepEqual(p.desktop.offset, { x: 0, y: 0 })
})

test('page zoom turns DIP into page pixels, offset included', () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1, () => 2)
  d.move({ x: -100, y: 100 })
  const p = position(true)
  assert.equal(p.x, 590)
  assert.equal(p.y, 150)
  assert.deepEqual(p.desktop, { id: 2, width: 640, height: 492, offset: { x: 640, y: 100 }, zoom: 2, sequence: 1 })
})

test('changing the zoom rescales the pet where it stands instead of following a display move', async () => {
  const d = desktop()
  let zoom = 1
  const position = desktopCursor(d.win, d.screen, 1, () => zoom)
  const app = renderer(144, undefined, null, 'Egg', { x: 400, y: 300 })
  app.cursor(position(false))
  assert.equal(app.info.lastX, 400)
  zoom = 2
  app.cursor(position(false))
  assert.equal(app.info.lastX, 200)
  assert.equal(app.info.lastY, 150)
})

for (const stage of ['Egg', 'Kid', 'Adult']) test(`${stage} drag keeps its hold point across different display widths`, async () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  let following = false
  const native = async on => {
    const p = position(following || on)
    following = on
    return p
  }
  const app = renderer(144, { x: 0, y: 0 }, native, stage)
  const anchorX = stage === 'Adult' ? 0.58 : 50 / 144
  const anchorY = stage === 'Adult' ? 0.30 : 40 / 144
  await setImmediate()
  app.pointer('pointerdown', 550, 340)
  await setImmediate()
  d.move({ x: -100, y: 100 })
  const p = position(true)
  app.cursor(p)
  app.startPose()
  app.advance(120)
  const smallSize = 144 * 1280 / 1920
  assert.ok(Math.abs(app.info.lastX - (p.x - anchorX * smallSize)) < 1e-8)
  assert.ok(Math.abs(app.info.lastY - (p.y - anchorY * smallSize)) < 1e-8)
  if (stage === 'Adult') assert.equal(app.poses[0].opt.url, 'pet/Action/drag.swf')
  else assert.equal(app.poses[0].opt, undefined, 'younger stages use their own artwork')
  assert.equal(app.save.settings.petDisplayId, 2)
  d.move({ x: 600, y: -600 })
  const top = position(true)
  app.cursor(top)
  const largeSize = 144 * 2560 / 1920
  assert.ok(Math.abs(app.info.lastX - (top.x - anchorX * largeSize)) < 1e-8)
  assert.ok(Math.abs(app.info.lastY - (top.y - anchorY * largeSize)) < 1e-8)
  app.cursor(p) // An old IPC frame must not move the pet back.
  assert.equal(app.save.settings.petDisplayId, 3)
  app.pointer('pointerup', top.x, top.y)
  await setImmediate()
  assert.equal(following, false)
  assert.notEqual(app.releases.at(-1)[1], 0, 'the final cursor sample must retain the fling velocity')
  assert.equal(app.poses.at(-1).a, 'normal')
  assert.ok(app.info.lastX >= 0 && app.info.lastX + largeSize <= 2560)
  assert.ok(app.info.lastY >= 0 && app.info.lastY + largeSize <= 1400)
})

test('release uses the native target display dimensions before Chromium finishes resizing', async () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  let following = false
  const app = renderer(144, { x: 0, y: 0 }, async on => {
    const p = position(following || on)
    following = on
    return p
  })
  await setImmediate()
  app.pointer('pointerdown', 550, 340)
  await setImmediate()
  // No polling frame before release: the final native reply must perform the transfer.
  d.move({ x: 2400, y: -600 })
  app.pointer('pointerup', 2400, 840)
  await setImmediate()
  assert.equal(app.save.settings.petDisplayId, 3)
  assert.ok(app.info.lastX > 1920, 'must not clamp against the old primary viewport')
})

test('release outside the pet still uses the final native display and retains recent fling velocity', async () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  let following = false
  const app = renderer(144, { x: 0, y: 0 }, async on => {
    const p = position(following || on)
    following = on
    return p
  })
  await setImmediate()
  app.pointer('pointerdown', 550, 340)
  await setImmediate()
  d.move({ x: -100, y: 100 })
  const p = position(true)
  app.cursor(p)
  app.windowPointer('pointerup', p.x, p.y)
  await setImmediate()
  assert.equal(following, false)
  assert.equal(app.save.settings.petDisplayId, 2)
  assert.notEqual(app.releases.at(-1)[1], 0)
  assert.equal(app.poses.at(-1).a, 'normal')
})

test('a native cursor that disagrees with the DOM grab point keeps the pet under the cursor (#31)', async () => {
  const d = desktop()
  const position = desktopCursor(d.win, d.screen, 1)
  let following = false
  // Windows display scaling can round the native DIP cursor away from the DOM event's point.
  const skewed = on => { const p = position(following || on); following = on; return { ...p, x: p.x + 7, y: p.y - 5 } }
  const app = renderer(144, { x: 0, y: 0 }, async on => skewed(on))
  await setImmediate()
  app.pointer('pointerdown', 550, 340)
  await setImmediate()
  assert.equal(app.info.lastX, 500)
  assert.equal(app.info.lastY, 300)
  d.move({ x: 650, y: 400 })
  app.cursor(skewed(true))
  assert.equal(app.info.lastX, 600)
  assert.equal(app.info.lastY, 360)
  app.runIntervals()
  assert.equal(app.info.lastX, 600, 'stationary hit polling must not replay a cursor without its native display')
  assert.equal(app.info.lastY, 360)
})

test('an auto-hidden Windows taskbar keeps its screen edge free of the overlay (#37)', () => {
  const screenRect = { x: 0, y: 0, width: 1680, height: 911 }
  // Auto-hide: the work area is the whole screen, so every edge keeps one pixel free.
  assert.deepEqual(overlayArea({ id: 1, workArea: screenRect, bounds: screenRect }, true), { x: 1, y: 1, width: 1678, height: 909 })
  // A docked taskbar already lies outside the work area; only the other edges move in, the pet still sits on the taskbar.
  assert.deepEqual(overlayArea({ id: 1, workArea: { x: 0, y: 0, width: 1680, height: 863 }, bounds: screenRect }, true), { x: 1, y: 1, width: 1678, height: 862 })
  // Other platforms, and displays without bounds, use the work area as is.
  assert.deepEqual(overlayArea({ id: 1, workArea: screenRect, bounds: screenRect }, false), screenRect)
  assert.deepEqual(overlayArea({ id: 1, workArea: screenRect }, true), screenRect)
})

test('the overlay follows the placement across displays and reports the inset origin', () => {
  const d = desktop()
  const place = (display) => overlayArea({ ...display, bounds: display.workArea }, true)
  const position = desktopCursor(d.win, d.screen, 1, () => 1, place)
  let p = position(false)
  assert.deepEqual(d.win.getBounds(), { x: 1, y: 1, width: 1918, height: 1038 })
  assert.deepEqual([p.x, p.y], [549, 339])
  d.move({ x: -600, y: 100 })
  p = position(true)
  assert.deepEqual(d.win.getBounds(), { x: -1279, y: -199, width: 1278, height: 982 })
  assert.equal(p.desktop.id, 2)
})
