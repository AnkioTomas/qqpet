import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { startSave } from '../../src/shared/save-logic.ts'

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

function fixture(deviceKind = 'phone', touch = true, direction = 'auto') {
  const frames = new Map(), timers = new Map(), observers = new Set()
  let nextFrame = 0, nextTimer = 0
  const window = new Events(), document = new Events()
  const body = new Element('body'), viewport = new Element('html')
  body.connect(true)
  Object.assign(viewport, { clientWidth: 375, clientHeight: 812 })
  Object.assign(document, { body, documentElement: viewport })
  const initialSave = startSave(null)
  initialSave.settings.windowDirection = direction
  Object.assign(window, {
    __qqpetInitialSave: initialSave, visualViewport: new Events(),
    qqpet: { deviceKind, save() {} },
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
  const show = runInNewContext(executable(source('../../src/renderer/ui/box.ts')) + '\nshow', { ...services, ...store })
  const close = show(frame)
  const tick = () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback() }
  const down = () => frame.emit('pointerdown', { target: list, pointerId: 7, clientX: 10, clientY: 10 })
  return { ...store, frame, list, document, window, frames, observers, close, tick, down }
}

test('a newly opened window is fitted before the first observer animation frame', () => {
  for (const direction of ['auto', 'screen']) {
    const f = fixture('phone', true, direction)
    const initial = f.frame.style.transform
    assert.equal(initial.includes('rotate(90deg)'), direction === 'auto')
    const scale = Number(initial.match(/scale\(([^)]+)\)/)[1])
    assert.ok(scale > 0 && (direction === 'auto' ? 390 : 440) * scale <= 375 - 16)
    f.tick()
    assert.equal(f.frame.style.transform, initial, 'the observer does not correct an initially unscaled frame')
    f.close()
  }
})

test('phone direction changes refit an open window without a viewport resize', () => {
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

test('tablets, unknown devices and desktop pointers preserve their existing layout', () => {
  for (const [deviceKind, touch] of [['tablet', true], [undefined, true], ['other', true], ['other', false], ['phone', false]]) {
    // Passing undefined explicitly exercises the bridge without a device classification.
    const f = fixture(deviceKind, touch)
    f.window.qqpet.deviceKind = deviceKind
    f.tick()
    const before = f.frame.style.transform
    assert.equal(before.includes('rotate(90deg)'), touch)
    f.update('settings', { windowDirection: 'screen' })
    f.tick()
    assert.equal(f.frame.style.transform, before, `${String(deviceKind)} / touch=${touch}`)
    f.close()
  }
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
