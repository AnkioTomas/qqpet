import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { route } from '../../src/renderer/pet/router.ts'
import { createPetInput } from '../../src/renderer/pet/input.ts'
import { resizePetPosition } from '../../src/shared/layout.ts'

test('drag keeps the stage, sex and adult mood, using an available standing clip', () => {
  for (const sex of ['GG', 'MM']) {
    for (const stage of ['Egg', 'Kid', 'Adult']) {
      for (const mood of ['happy', 'peaceful', 'upset', 'sad']) {
        const target = route(sex, stage, 'drag', mood)
        const expected = `pet/Action/${sex}/${stage}/${stage === 'Adult' ? `${mood}/` : ''}Stand.swf`
        assert.equal(target.url, expected)
        assert.ok(existsSync(new URL(`../../resources/${target.url}`, import.meta.url)), target.url)
      }
    }
  }
})

// Execute the renderer entry with inert app services and real EventTargets, so
// the pointer tests exercise the actual handlers without starting Electron.
export function renderer(size, crop = { x: 0, y: 0 }, native = null, stage = 'Egg', initial = {}) {
  const pet = new EventTarget()
  const windowEvents = new EventTarget()
  const captured = new Set()
  pet.style = {}
  pet.closest = () => null
  pet.setPointerCapture = id => captured.add(id)
  pet.hasPointerCapture = id => captured.has(id)
  pet.releasePointerCapture = id => captured.delete(id)
  const info = { lastX: initial.x ?? 500, lastY: initial.y ?? 300 }
  const listeners = []
  const poses = []
  const releases = []
  let clock = 0
  let nextFrame = 0
  const frames = new Map()
  const observers = new Set()
  const flushFrame = () => {
    const pending = [...frames.values()]
    frames.clear()
    clock += 16
    for (const callback of pending) callback(clock)
  }
  const noop = () => {}
  // Timers only run when a test advances them.
  let nextTimer = 0
  const timers = new Map()
  let menuCloses = 0
  let hitAt = null
  let area = initial.area ?? { width: 1920, height: 1080 }
  let cursorListener
  let trayListener
  const services = {
    createPetInput,
    resizePetPosition,
    info,
    save: { settings: { petBar: false }, petInfo: info, havePet: false },
    machine: { pose: { a: initial.pose ?? 'normal' }, play: pose => poses.push(pose) },
    setInfo: (key, value) => {
      info[key] = value
      listeners.forEach(listener => listener(key))
    },
    onInfoChange: listener => listeners.push(listener),
    petSize: () => size * (native ? area.width / 1920 : 1),
    stage: () => stage,
    viewportSize: () => area,
    setDesktopSize: value => { area = value },
    pageZoom: () => area.zoom ?? null,
    update: (key, value) => Object.assign(services.save[key], value),
    applyEdge: () => null,
    pageX: event => event.clientX + crop.x,
    pageY: event => event.clientY + crop.y,
    touch: false,
    document: {
      getElementById: () => pet,
      elementFromPoint: (x, y) => hitAt?.(x, y) ? { getRootNode: () => null, closest: () => ({}) } : null,
      documentElement: { dataset: { cropX: String(crop.x), cropY: String(crop.y) } },
    },
    window: {
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      qqpet: {
        onCursor: listener => { cursorListener = listener }, onTrayClick: listener => { trayListener = listener }, onClipboard: noop,
        onPresence: noop, onFront: noop,
        setClickThrough: noop,
        ...(native ? { setDragging: native } : {}),
      },
    },
    performance: { now: () => clock },
    AbortController,
    ShadowRoot: class {},
    innerWidth: area.width,
    innerHeight: area.height,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class {
      constructor(callback) { this.callback = callback }
      observe() { observers.add(this) }
      disconnect() { observers.delete(this) }
    },
    setInterval: noop,
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout: id => timers.delete(id),
    adopt: noop,
    closeMenu: () => { menuCloses++ },
    showControl: noop,
    catchDiudiule: noop,
    releaseDiudiule: (...args) => { releases.push(args); return false },
    scheduleHide: noop,
    openMenu: noop,
    closeState: noop,
    openState: noop,
    startAutoUpdate: noop,
    ...initial.ui,
  }
  const source = readFileSync(new URL('../../src/renderer/main.ts', import.meta.url), 'utf8')
  runInNewContext(stripTypeScriptTypes(source).replace(/^import .*$/gm, ''), services)

  const pointer = (type, x, y, target = pet) => {
    clock += 16
    const event = new Event(type)
    Object.assign(event, { button: 0, pointerId: 1, clientX: x - crop.x, clientY: y - crop.y })
    // Ruffle is the normal target and does not have an interaction point class.
    pet.classList = { contains: () => false }
    target.dispatchEvent(event)
  }
  return {
    info, poses, releases, pointer, save: services.save,
    windowPointer: (type, x, y) => pointer(type, x, y, windowEvents),
    pause: () => { services.window.__qqpetHostPaused = true; services.window.__qqpetInput({ phase: 'cancel', id: -1, x: 0, y: 0 }) },
    cursor: point => { clock += 16; cursorListener(point) },
    trayClick: click => trayListener(click),
    menuCloses: () => menuCloses,
    /** Which page points elementFromPoint reports on a [data-hit] element, such as an open menu. */
    hitAt: test => { hitAt = test },
    runTimers: () => {
      const pending = [...timers.values()]
      timers.clear()
      for (const callback of pending) callback()
    },
    resize: next => {
      area = next
      services.innerWidth = next.width
      services.innerHeight = next.height
      windowEvents.dispatchEvent(new Event('resize'))
      flushFrame()
    },
    rootResize: next => {
      area = next
      services.innerWidth = next.width
      services.innerHeight = next.height
      for (const observer of observers) observer.callback([{ target: services.document.documentElement }], observer)
      flushFrame()
    },
    observePosition: listener => listeners.push(listener),
    element: pet,
  }
}

for (const stage of ['Egg', 'Kid']) test(`${stage} drag keeps the original grab point at different sizes and offsets`, () => {
  for (const size of [96, 144, 164]) {
    for (const [offsetX, offsetY] of [[0.1, 0.2], [0.5, 0.5], [0.9, 0.85]]) {
      const { info, poses, pointer } = renderer(size, { x: 0, y: 0 }, null, stage)
      const x = 500 + size * offsetX
      const y = 300 + size * offsetY
      pointer('pointerdown', x, y)
      pointer('pointermove', x + 5, y)
      assert.equal(poses.length, 0)
      pointer('pointermove', x + 20, y + 12)
      assert.equal(info.lastX, 520)
      assert.equal(info.lastY, 312)
      assert.equal(poses[0].a, 'drag')
      assert.equal(poses[0].opt, undefined, 'the drag must use the stage-aware route')
      pointer('pointermove', x + 60, y + 40)
      assert.equal(info.lastX, 560)
      assert.equal(info.lastY, 340)
      pointer('pointerup', x + 60, y + 40)
      assert.equal(poses.at(-1).a, 'normal')
      assert.equal(info.lastX, 560)
      assert.equal(info.lastY, 340)
    }
  }
})

test('adult drag uses the upstream scruff animation and anchors the held head under the cursor', () => {
  for (const size of [96, 144, 164]) {
    const { info, poses, pointer } = renderer(size, { x: 320, y: 100 }, null, 'Adult')
    pointer('pointerdown', 550, 340)
    pointer('pointermove', 555, 340)
    assert.equal(poses.length, 0)
    pointer('pointermove', 580, 365)
    assert.equal(poses[0].opt.url, 'pet/Action/drag.swf')
    assert.ok(Math.abs(info.lastX + size * 0.73 - 580) < 1e-8)
    assert.ok(Math.abs(info.lastY + size * 0.14 - 365) < 1e-8)
    pointer('pointermove', 610, 385)
    assert.ok(Math.abs(info.lastX + size * 0.73 - 610) < 1e-8)
    assert.ok(Math.abs(info.lastY + size * 0.14 - 385) < 1e-8)
    pointer('pointerup', 610, 385)
    assert.equal(poses.at(-1).a, 'normal')
  }
})

test('drag coordinates account for the cropped mobile overlay', () => {
  const { info, pointer } = renderer(144, { x: 320, y: 100 })
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 580, 365)
  assert.equal(info.lastX, 530)
  assert.equal(info.lastY, 325)
})

test('a lifted pet follows the cursor past the screen edge and is clamped on release', () => {
  const { info, pointer } = renderer(144)
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 30, 350)
  assert.equal(info.lastX, -20)
  assert.equal(info.lastY, 310)
  pointer('pointerup', 30, 350)
  assert.equal(info.lastX, 0)
  assert.equal(info.lastY, 310)
})

test('pointer cancellation ends the shared drag without a fling', () => {
  const { pointer, releases } = renderer(144)
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 610, 380)
  pointer('pointercancel', 610, 380)
  assert.deepEqual(releases.at(-1), [false, 0, 0])
})

test('host pause cancels the active DOM gesture and removes its listeners', () => {
  const { pointer, pause, releases, info } = renderer(144)
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 610, 380)
  pause()
  assert.deepEqual(releases.at(-1), [false, 0, 0])
  const position = { ...info }
  pointer('pointermove', 700, 430)
  pointer('pointerup', 700, 430)
  assert.deepEqual(info, position)
  assert.equal(releases.length, 1)
})

test('the renderer keeps a peeking pet attached through a staged rotation and publishes its position', () => {
  const initial = { x: 688, y: 493, pose: 'hideright', area: { width: 834, height: 1194 } }
  const app = renderer(146, { x: 0, y: 0 }, null, 'Kid', initial)
  const changed = []
  app.observePosition(key => changed.push(key))
  app.resize({ width: 1194, height: 1194 })
  app.resize({ width: 1194, height: 834 })
  assert.equal(app.info.lastX, 1048)
  assert.ok(Math.abs(app.info.lastY - 493 * 688 / 1048) < 1e-8)
  assert.equal(app.element.style.left, '1048px')
  assert.ok(changed.includes('lastX'), 'existing position subscribers must follow the resized pet')
  assert.ok(changed.includes('lastY'))
  app.resize({ width: 834, height: 1194 })
  assert.equal(app.info.lastX, 688)
  assert.ok(Math.abs(app.info.lastY - 493) < 1e-8)
})

test('rotation cancels an old grab point before applying the new viewport position', () => {
  const app = renderer(146, { x: 0, y: 0 }, null, 'Kid', { x: 600, y: 493, area: { width: 834, height: 1194 } })
  app.pointer('pointerdown', 650, 530)
  app.resize({ width: 1194, height: 834 })
  assert.deepEqual(app.releases.at(-1), [false, 0, 0])
  assert.ok(Math.abs(app.info.lastX - 600 * 1048 / 688) < 1e-8)
  const position = { ...app.info }
  app.pointer('pointermove', 700, 550)
  app.pointer('pointerup', 700, 550)
  assert.deepEqual(app.info, position)
})

test('the settled root viewport repairs a rotation with no second window resize event', () => {
  const app = renderer(146, { x: 0, y: 0 }, null, 'Kid', { x: 688, y: 315, pose: 'hideright', area: { width: 834, height: 1194 } })
  app.resize({ width: 854, height: 834 })
  assert.equal(app.info.lastX, 708)
  const landscapeY = 315 * 688 / 1048
  assert.ok(Math.abs(app.info.lastY - landscapeY) < 1e-8)
  app.rootResize({ width: 1194, height: 834 })
  assert.equal(app.info.lastX, 1048)
  assert.ok(Math.abs(app.info.lastY - landscapeY) < 1e-8)
  assert.equal(app.element.style.left, '1048px')
  app.rootResize({ width: 834, height: 1194 })
  assert.equal(app.info.lastX, 688)
  assert.ok(Math.abs(app.info.lastY - 315) < 1e-8)
})

test('the menu survives the cursor briefly overshooting it, and closes once the cursor stays on the desktop', () => {
  const app = renderer(144)
  app.hitAt((x, y) => x >= 100 && x < 210 && y >= 100 && y < 300)
  app.cursor({ x: 150, y: 200 })
  app.cursor({ x: 260, y: 200 })
  app.cursor({ x: 200, y: 200 })
  app.runTimers()
  assert.equal(app.menuCloses(), 0)

  app.cursor({ x: 260, y: 200 })
  app.cursor({ x: 300, y: 220 })
  assert.equal(app.menuCloses(), 0)
  app.runTimers()
  assert.equal(app.menuCloses(), 1)
})

test('a cursor leaving the window for the tray keeps the menu open', () => {
  const app = renderer(144)
  app.cursor({ x: 300, y: 220 })
  app.cursor({ x: 300, y: 1200 })
  app.runTimers()
  assert.equal(app.menuCloses(), 0)
})
