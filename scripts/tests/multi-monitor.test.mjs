import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'
import { desktopCursor, petDisplay } from '../../src/main/desktop.ts'
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
  const anchorX = stage === 'Adult' ? 0.73 : 50 / 144
  const anchorY = stage === 'Adult' ? 0.14 : 40 / 144
  await setImmediate()
  app.pointer('pointerdown', 550, 340)
  await setImmediate()
  d.move({ x: -100, y: 100 })
  const p = position(true)
  app.cursor(p)
  const smallSize = 144 * 1280 / 1920
  assert.ok(Math.abs(app.info.lastX - (p.x - anchorX * smallSize)) < 1e-8)
  assert.ok(Math.abs(app.info.lastY - (p.y - anchorY * smallSize)) < 1e-8)
  assert.equal(app.poses[0].opt?.url, stage === 'Adult' ? 'pet/Action/drag.swf' : undefined)
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

test('Electron window restores the saved display and transfers on drag IPC, including final release', () => {
  const d = desktop()
  let poll
  let handler
  let removed = false
  const packets = []
  class Window extends EventEmitter {
    constructor(bounds) {
      super()
      this.bounds = bounds
      this.webContents = new EventEmitter()
      this.webContents.setWindowOpenHandler = () => {}
      this.webContents.send = (_channel, point) => packets.push(point)
    }
    getBounds() { return this.bounds }
    setBounds(bounds) { this.bounds = bounds }
    setAlwaysOnTop() {}
    setVisibleOnAllWorkspaces() {}
    setIgnoreMouseEvents() {}
    loadURL() {}
  }
  const context = {
    BrowserWindow: Window, screen: d.screen, desktopCursor, petDisplay,
    getSave: () => ({ settings: { petDisplayId: 2 } }),
    IPC: { cursor: 'cursor', setDragging: 'dragging' },
    ipcMain: { handle: (_channel, callback) => { handler = callback }, removeHandler: () => { removed = true } },
    setInterval: callback => { poll = callback; return 1 }, clearInterval: () => {},
    join: (...parts) => parts.join('/'), PAGES: 'app://bundle', CURSOR_INTERVAL_MS: 33,
    process: { platform: 'linux', env: {} },
  }
  const source = readFileSync(new URL('../../src/main/window.ts', import.meta.url), 'utf8')
  const factory = source.slice(source.indexOf('/** Transparent'), source.indexOf('// Prints 1'))
    .replace('export function', 'function').replaceAll('import.meta.dirname', "'C:/qqpet/out/main'")
  const win = runInNewContext(stripTypeScriptTypes(factory) + '\ncreatePetWindow()', context)
  assert.equal(win.getBounds().x, -1280)
  poll()
  poll()
  assert.equal(packets.length, 1, 'stationary cursor frames must be deduplicated')
  assert.throws(() => handler({ sender: {} }, true), /Unknown drag sender/)
  handler({ sender: win.webContents }, true)
  assert.equal(win.getBounds().x, 0)
  d.move({ x: 2400, y: -600 })
  const released = handler({ sender: win.webContents }, false)
  assert.equal(released.desktop.id, 3)
  assert.equal(win.getBounds().y, -1440)
  d.move({ x: 550, y: 340 })
  poll()
  assert.equal(win.getBounds().y, -1440, 'idle cursor must not move the overlay back')
  win.emit('closed')
  assert.equal(removed, true)
})
