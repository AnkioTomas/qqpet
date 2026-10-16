import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { startSave } from '../../src/shared/save-logic.ts'
import { canChooseWindowDirection, WINDOW_MARGIN } from '../../src/shared/window-direction.ts'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const executable = text => stripTypeScriptTypes(text).replace(/^import .*$/gm, '').replace(/^export /gm, '')
const storeSource = source('../../src/renderer/pet/store.ts')
const storeBoundary = storeSource.indexOf('\ntype NumKey =')
assert.notEqual(storeBoundary, -1, 'the store entry includes its actual settings subscription and update functions')

class Events {
  listeners = new Map()
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(callback)
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback) }
  emit(type, fields = {}) {
    for (const callback of [...(this.listeners.get(type) ?? [])]) callback({ type, ...fields })
  }
  count(type) { return this.listeners.get(type)?.size ?? 0 }
}

class Element extends Events {
  constructor(className = '') {
    super()
    Object.assign(this, { className, children: [], style: {}, dataset: {}, isConnected: false })
  }
  connect(connected) { this.isConnected = connected; for (const child of this.children) child.connect(connected) }
  appendChild(child) { this.children.push(child); child.parentElement = this; child.connect(this.isConnected); return child }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this)
    this.parentElement = null
    this.connect(false)
  }
}

function fixture({ rotatable = true, width = 375, height = 812, touch = true, direction = 'auto', deviceKind } = {}) {
  const frames = new Map(), timers = new Map(), observers = new Set()
  let nextFrame = 0, nextTimer = 0
  const window = new Events(), document = new Events()
  const body = new Element('body'), viewport = new Element('html')
  body.connect(true)
  Object.assign(viewport, { clientWidth: width, clientHeight: height })
  Object.assign(document, { body, documentElement: viewport })
  const initialSave = startSave(null)
  initialSave.settings.windowDirection = direction
  Object.assign(window, {
    __qqpetInitialSave: initialSave, visualViewport: new Events(),
    qqpet: { deviceKind, capabilities: { rotatableScreen: rotatable }, save() {} },
    screen: { width, height }, devicePixelRatio: 3,
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout: id => timers.delete(id),
  })
  const frame = Object.assign(new Element('boxFrame'), { offsetWidth: 440, offsetHeight: 390 })
  const list = Object.assign(new Element('children'), {
    clientHeight: 200, scrollHeight: 1000, clientWidth: 225, scrollWidth: 225, scrollTop: 0, scrollLeft: 0,
  })
  Object.assign(list.style, { overflow: 'auto', touchAction: 'none' })
  frame.appendChild(list)
  const services = {
    window, document, touch, HTMLInputElement: class {},
    addEventListener: window.addEventListener.bind(window), removeEventListener: window.removeEventListener.bind(window),
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.add(this) }
      observe() { this.callback() }
      disconnect() { observers.delete(this) }
    },
    MutationObserver: class {
      constructor() { observers.add(this) }
      observe() {}
      disconnect() { observers.delete(this) }
    },
    getComputedStyle: element => ({ ...element.style, getPropertyValue: () => '' }),
    div: (className, ...children) => {
      const element = new Element(className)
      for (const child of children) element.appendChild(child)
      return element
    },
  }
  // Load the real store entry without unrelated pet startup side effects.
  const store = runInNewContext(executable(storeSource.slice(0, storeBoundary)) + '\n({ save, info, update, onSettingsChange })', services)
  const { windowDirectionAvailable } = runInNewContext(executable(source('../../src/renderer/ui/viewport.ts')) + ';\n({ windowDirectionAvailable })', { ...services, canChooseWindowDirection })
  const show = runInNewContext(executable(source('../../src/renderer/ui/box.ts')) + '\nshow', { ...services, ...store, windowDirectionAvailable, WINDOW_MARGIN })
  const close = show(frame)
  const tick = () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback() }
  const down = () => frame.emit('pointerdown', { target: list, pointerType: 'touch', button: 0, pointerId: 7, clientX: 10, clientY: 10 })
  return { ...store, frame, list, document, window, viewport, frames, observers, close, tick, down, windowDirectionAvailable }
}

test('the direction choice requires a narrow rotatable logical screen, independently of orientation', () => {
  for (const [width, height] of [[375, 812], [812, 375], [768, 1024], [844, 1200]]) {
    assert.equal(canChooseWindowDirection(true, width, height), true)
    assert.equal(canChooseWindowDirection(false, width, height), false)
  }
  for (const [width, height] of [[845, 1200], [1200, 845], [1024, 1366], [400, 400], [0, 812], [-1, 812], [NaN, 812], [375, Infinity]]) {
    assert.equal(canChooseWindowDirection(true, width, height), false)
  }
})

test('a newly opened window is fitted before the first observer animation frame', () => {
  for (const direction of ['auto', 'screen']) {
    const f = fixture({ direction })
    const initial = f.frame.style.transform
    assert.equal(initial.includes('rotate(90deg)'), direction === 'auto')
    const scale = Number(initial.match(/scale\(([^)]+)\)/)[1])
    assert.ok(scale > 0 && (direction === 'auto' ? 390 : 440) * scale <= 375 - 16)
    f.tick()
    assert.equal(f.frame.style.transform, initial, 'the observer does not correct an initially unscaled frame')
    f.close()
  }
})

test('direction changes refit an open window without a viewport resize or device classification', () => {
  const f = fixture()
  assert.equal(f.save.settings.windowDirection, 'auto')
  f.tick()
  assert.match(f.frame.style.transform, /rotate\(90deg\)/)
  f.update('settings', { windowDirection: 'screen' })
  assert.equal(f.frames.size, 1)
  f.tick()
  assert.doesNotMatch(f.frame.style.transform, /rotate/)
  const scale = Number(f.frame.style.transform.match(/scale\(([^)]+)\)/)[1])
  assert.ok(scale > 0 && 440 * scale <= 375 - 16, 'the upright phone window still fits the viewport')
  f.update('settings', { windowDirection: 'auto' })
  f.tick()
  assert.match(f.frame.style.transform, /rotate\(90deg\)/)
  f.update('settings', { quiet: true })
  assert.equal(f.frames.size, 0, 'unrelated settings do not refit windows')
  f.close()
})

test('narrow rotatable hosts support the preference regardless of device kind or pointer', () => {
  for (const [deviceKind, touch] of [['tablet', true], [undefined, true], ['other', true], ['other', false], ['phone', false]]) {
    const f = fixture({ deviceKind, touch })
    f.tick()
    assert.match(f.frame.style.transform, /rotate\(90deg\)/)
    f.update('settings', { windowDirection: 'screen' })
    f.tick()
    assert.doesNotMatch(f.frame.style.transform, /rotate/, `${String(deviceKind)} / touch=${touch}`)
    f.close()
  }
})

test('wide and fixed screens always follow their orientation, including scaled mobile viewports', () => {
  for (const screen of [{ width: 1024, height: 1366 }, { rotatable: false }, { rotatable: undefined }]) {
    const f = fixture(screen)
    if (screen.rotatable === undefined && !screen.width) delete f.window.qqpet.capabilities
    // Android/Harmony can keep a 480px page short side on a much wider logical screen.
    Object.assign(f.viewport, { clientWidth: 480, clientHeight: 800 })
    Object.assign(f.frame, { offsetWidth: 829, offsetHeight: 600 })
    f.window.emit('resize')
    f.tick()
    assert.equal(f.windowDirectionAvailable(), false)
    assert.doesNotMatch(f.frame.style.transform, /rotate/)
    f.update('settings', { windowDirection: 'screen' })
    f.tick()
    assert.doesNotMatch(f.frame.style.transform, /rotate/)
    f.close()
  }
})

test('screen changes use the current eligibility without overwriting the saved preference', () => {
  const f = fixture()
  assert.equal(f.windowDirectionAvailable(), true, 'DPR does not turn a narrow high-density screen into a wide one')
  Object.assign(f.window.screen, { width: 1024, height: 1366 })
  f.window.emit('resize')
  f.tick()
  assert.equal(f.windowDirectionAvailable(), false)
  assert.doesNotMatch(f.frame.style.transform, /rotate/)
  assert.equal(f.save.settings.windowDirection, 'auto')
  Object.assign(f.window.screen, { width: 812, height: 375 })
  f.window.emit('resize')
  f.tick()
  assert.equal(f.windowDirectionAvailable(), true)
  assert.match(f.frame.style.transform, /rotate\(90deg\)/)
  f.close()
})

test('keyboard-sized viewport changes do not hide the direction choice', () => {
  const f = fixture()
  Object.assign(f.viewport, { clientWidth: 375, clientHeight: 300 })
  f.window.emit('resize')
  f.tick()
  assert.equal(f.windowDirectionAvailable(), true)
  f.close()
})

test('a finger still pans the rotated list when the primary pointer is fine', () => {
  const f = fixture({ touch: false })
  f.tick()
  const transform = f.frame.style.transform
  f.down()
  assert.equal(f.document.count('pointermove'), 1, 'a finger must not start the mouse window drag too')
  f.document.emit('pointermove', { pointerId: 7, clientX: 30, clientY: 10 })
  assert.ok(f.list.scrollTop > 0)
  assert.equal(f.frame.style.transform, transform, 'scrolling does not move the whole window')
  f.document.emit('pointercancel', { pointerId: 7 })
  assert.equal(f.document.count('pointermove'), 0)
  f.close()
})

test('direction changes cancel the previous pan before using the new axes', () => {
  const f = fixture()
  f.tick()
  f.down()
  assert.equal(f.document.count('pointermove'), 1)
  f.update('settings', { windowDirection: 'screen' })
  f.tick()
  assert.equal(f.document.count('pointermove'), 0)
  f.document.emit('pointermove', { pointerId: 7, clientX: 30, clientY: 10 })
  assert.equal(f.list.scrollTop, 0, 'the cancelled rotated gesture cannot keep scrolling')
  f.down()
  f.document.emit('pointermove', { pointerId: 7, clientX: 10, clientY: 0 })
  assert.ok(f.list.scrollTop > 0, 'the next gesture scrolls the upright list vertically')
  f.document.emit('pointercancel', { pointerId: 7 })
  for (const type of ['pointermove', 'pointerup', 'pointercancel']) assert.equal(f.document.count(type), 0)
  f.close()
})

test('closing cancels pending refits, settings subscriptions and touch listeners', () => {
  const f = fixture()
  f.tick()
  f.down()
  f.update('settings', { windowDirection: 'screen' })
  assert.equal(f.frames.size, 1)
  f.close()
  assert.equal(f.frames.size, 0)
  assert.equal(f.observers.size, 0)
  assert.equal(f.window.count('resize'), 0)
  assert.equal(f.window.visualViewport.count('resize'), 0)
  for (const type of ['pointermove', 'pointerup', 'pointercancel', 'click']) assert.equal(f.document.count(type), 0)
  const position = f.list.scrollTop
  f.document.emit('pointermove', { pointerId: 7, clientX: 40, clientY: 10 })
  assert.equal(f.list.scrollTop, position)
  f.update('settings', { windowDirection: 'auto' })
  f.window.emit('resize')
  f.window.visualViewport.emit('resize')
  assert.equal(f.frames.size, 0, 'a removed window no longer subscribes to preference or viewport changes')
})

test('closing also removes a completed pan\'s temporary click suppression', () => {
  const f = fixture()
  f.tick()
  f.down()
  f.document.emit('pointermove', { pointerId: 7, clientX: 30, clientY: 10 })
  f.document.emit('pointerup', { pointerId: 7 })
  assert.equal(f.document.count('click'), 1)
  f.close()
  assert.equal(f.document.count('click'), 0)
})
