import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { route } from '../../src/renderer/pet/router.ts'
import { createPetInput } from '../../src/renderer/pet/input.ts'
import { resizePetPosition } from '../../src/shared/layout.ts'

test('drag fallback keeps the stage, sex and mood', () => {
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
  pet.closest = selector => selector === '#pet' || selector === '[data-hit]' ? pet : null
  pet.getRootNode = () => null
  pet.matches = () => false
  pet.checkVisibility = () => !pet.hidden
  const front = { closest: pet.closest, matches: () => false, checkVisibility: () => true }
  pet.querySelectorAll = () => [front]
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
  const flushFrame = (elapsed = 16) => {
    const pending = [...frames.values()]
    frames.clear()
    clock += elapsed
    for (const callback of pending) callback(clock)
  }
  const noop = () => {}
  // Timers only run when a test advances them.
  let nextTimer = 0
  const timers = new Map()
  const intervals = []
  let menuCloses = 0
  const clickThrough = []
  const shapes = []
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
    hitCover: el => {
      if (el === pet && !pet.style.backgroundImage) return null
      const r = el === pet ? { left: 0, top: 0, right: 1, bottom: 1 } : initial.peek ?? { left: 0, top: 0, right: 1, bottom: 1 }
      return { left: info.lastX + size * r.left, top: info.lastY + size * r.top, right: info.lastX + size * r.right, bottom: info.lastY + size * r.bottom }
    },
    update: (key, value) => Object.assign(services.save[key], value),
    applyEdge: () => null,
    pageX: event => event.clientX + crop.x,
    pageY: event => event.clientY + crop.y,
    touch: false,
    document: {
      getElementById: () => pet,
      elementFromPoint: (x, y) => hitAt?.(x, y) ? { getRootNode: () => null, closest: selector => selector === '[data-hit]' ? {} : null } : initial.petDOM ? pet : null,
      querySelectorAll: () => [pet, front],
      documentElement: { dataset: { cropX: String(crop.x), cropY: String(crop.y) } },
    },
    window: {
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents),
      qqpet: {
        onCursor: listener => { cursorListener = listener }, onTrayClick: listener => { trayListener = listener }, onClipboard: noop,
        onPresence: noop, onFront: noop,
        setClickThrough: on => clickThrough.push(on),
        ...(native ? { setDragging: native } : {}),
        ...(initial.linux ? { setHitShape: rects => shapes.push(rects) } : {}),
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
    setInterval: callback => intervals.push(callback),
    getComputedStyle: () => ({ pointerEvents: 'auto' }),
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout: id => timers.delete(id),
    adopt: noop,
    closeMenu: () => { menuCloses++ },
    showControl: noop,
    clearFacePoints: noop,
    showFacePoints: noop,
    catchDiudiule: noop,
    releaseDiudiule: (...args) => { releases.push(args); return false },
    scheduleHide: noop,
    openMenu: noop,
    closeState: noop,
    openState: noop,
    startAutoUpdate: noop, initLanVisit: noop, initVoice: noop,
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
    info, poses, releases, pointer, save: services.save, clickThrough, shapes,
    runIntervals: () => intervals.forEach(callback => callback()),
    setPose: action => { services.machine.pose.a = action },
    readInt: key => services.window.DataCenter_ReadInt32(key),
    movieMove: (dx, dy) => services.window.API.MoveBy(dx, dy),
    startPose: () => poses.at(-1)?.s?.(),
    advance: flushFrame,
    windowPointer: (type, x, y) => pointer(type, x, y, windowEvents),
    pause: () => { services.window.__qqpetHostPaused = true; services.window.__qqpetInput({ phase: 'cancel', id: -1, x: 0, y: 0 }) },
    cursor: point => { clock += 16; cursorListener(point) },
    trayClick: click => trayListener(click),
    nativeInput: input => services.window.__qqpetInput(input),
    hiddenChanged: () => windowEvents.dispatchEvent(new Event('qqpet-hidden-change')),
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

test('drag movies see the lift threshold and release without moving the host a second time', () => {
  const app = renderer(144)
  assert.equal(app.readInt('drag'), 0)
  assert.equal(app.readInt('unknown'), 0)
  app.pointer('pointerdown', 550, 340)
  app.pointer('pointermove', 555, 340)
  assert.equal(app.readInt('drag'), 0, 'a press alone must not enter the held loop')
  app.pointer('pointermove', 580, 365)
  assert.equal(app.readInt('drag'), 1)
  app.pointer('pointerup', 580, 365)
  assert.equal(app.readInt('drag'), 0)
  const position = { ...app.info }
  app.movieMove(0, 10)
  assert.deepEqual(app.info, position, 'outgoing drop frames cannot shift the new pose')

  app.pointer('pointerdown', 580, 365)
  app.pointer('pointermove', 610, 385)
  assert.equal(app.readInt('drag'), 1)
  app.pointer('pointercancel', 610, 385)
  assert.equal(app.readInt('drag'), 0)

  app.pointer('pointerdown', 610, 385)
  app.pointer('pointermove', 640, 410)
  assert.equal(app.readInt('drag'), 1)
  app.pause()
  assert.equal(app.readInt('drag'), 0)
})

test('adult drag uses the upstream scruff animation and anchors the held head under the cursor', () => {
  for (const size of [96, 144, 164]) {
    const { info, poses, pointer, startPose, advance } = renderer(size, { x: 320, y: 100 }, null, 'Adult')
    pointer('pointerdown', 550, 340)
    pointer('pointermove', 555, 340)
    assert.equal(poses.length, 0)
    pointer('pointermove', 580, 365)
    assert.equal(poses[0].opt.url, 'pet/Action/drag.swf')
    assert.equal(info.lastX, 530, 'the standing pose must not jump while the SWF loads')
    assert.equal(info.lastY, 325)
    startPose()
    assert.equal(info.lastX, 530, 'the first lift frame keeps the original grab')
    advance(60)
    const targetX = 580 - size * 0.58, targetY = 365 - size * 0.30
    assert.ok(Math.abs(info.lastX - targetX) < Math.abs(530 - targetX))
    assert.ok(Math.abs(info.lastY - targetY) < Math.abs(325 - targetY))
    assert.notEqual(info.lastX, targetX, 'the new anchor must ease in rather than snap')
    advance(60)
    assert.ok(Math.abs(info.lastX - targetX) < 1e-8, 'alignment finishes even if the mouse stops')
    assert.ok(Math.abs(info.lastY - targetY) < 1e-8)
    pointer('pointermove', 610, 385)
    assert.ok(Math.abs(info.lastX + size * 0.58 - 610) < 1e-8)
    assert.ok(Math.abs(info.lastY + size * 0.30 - 385) < 1e-8)
    pointer('pointerup', 610, 385)
    assert.equal(poses.at(-1).a, 'normal')
  }
})

test('a late lift animation cannot move a released pet or change a new grab', () => {
  const { info, poses, pointer, advance } = renderer(144, { x: 0, y: 0 }, null, 'Adult')
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 580, 365)
  const lateStart = poses[0].s
  pointer('pointerup', 580, 365)
  const released = { ...info }
  lateStart()
  advance(120)
  assert.deepEqual(info, released)
  pointer('pointerdown', info.lastX + 10, info.lastY + 10)
  lateStart()
  pointer('pointermove', released.lastX + 15, released.lastY + 10)
  assert.equal(info.lastX, released.lastX + 5)
  assert.equal(info.lastY, released.lastY)
})

test('cancelling an anchor transition stops further frames without a fling', () => {
  const { info, pointer, startPose, advance, releases } = renderer(144, { x: 0, y: 0 }, null, 'Adult')
  pointer('pointerdown', 550, 340)
  pointer('pointermove', 580, 365)
  startPose()
  advance(32)
  pointer('pointermove', 600, 380)
  pointer('pointercancel', 600, 380)
  const cancelled = { ...info }
  advance(120)
  assert.deepEqual(info, cancelled)
  assert.deepEqual(releases.at(-1), [false, 0, 0])
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

test('hiding the pet releases its old hit box and showing it restores interaction', () => {
  const app = renderer(144)
  app.element.hidden = false
  app.cursor({ x: 550, y: 340 })
  assert.deepEqual(app.clickThrough, [false])
  app.save.settings.hidden = true
  app.cursor({ x: 551, y: 340 })
  assert.deepEqual(app.clickThrough, [false, true])
  app.save.settings.hidden = false
  app.cursor({ x: 552, y: 340 })
  assert.deepEqual(app.clickThrough, [false, true, false])
})

test('a pet restored hidden does not block clicks, but its open panels still accept them', () => {
  const app = renderer(144)
  app.element.hidden = false
  app.save.settings.hidden = true
  app.cursor({ x: 550, y: 340 })
  assert.deepEqual(app.clickThrough, [])
  app.hitAt((x, y) => x >= 100 && x < 210 && y >= 100 && y < 300)
  app.cursor({ x: 150, y: 200 })
  assert.deepEqual(app.clickThrough, [false])
  app.cursor({ x: 550, y: 340 })
  assert.deepEqual(app.clickThrough, [false, true])
})

test('hidden pets reject DOM dragging and context menus even if an event reaches them', () => {
  let menus = 0
  const app = renderer(144, { x: 0, y: 0 }, null, 'Egg', { ui: { openMenu: () => { menus++ } } })
  app.save.settings.hidden = true
  app.pointer('contextmenu', 550, 340)
  assert.equal(menus, 0)
  app.pointer('pointerdown', 550, 340)
  app.pointer('pointermove', 610, 380)
  app.pointer('pointerup', 610, 380)
  assert.equal(app.info.lastX, 500)
  assert.equal(app.info.lastY, 300)
  assert.equal(app.poses.length, 0)
})

test('hidden pets reject native input and release click interception without another mouse move', () => {
  const app = renderer(144)
  app.element.hidden = false
  app.cursor({ x: 550, y: 340 })
  app.save.settings.hidden = true
  app.hiddenChanged()
  assert.deepEqual(app.clickThrough, [false, true])
  for (const phase of ['begin', 'move', 'end']) app.nativeInput({ phase, id: 1, x: 610, y: 380 })
  assert.equal(app.info.lastX, 500)
  assert.equal(app.info.lastY, 300)
  assert.equal(app.poses.length, 0)
  app.save.settings.hidden = false
  app.hiddenChanged()
  assert.deepEqual(app.clickThrough, [false, true, false])
})

test('hiding cancels an active gesture and releases its pointer capture', () => {
  const app = renderer(144)
  app.pointer('pointerdown', 550, 340)
  assert.equal(app.element.hasPointerCapture(1), true)
  app.save.settings.hidden = true
  app.hiddenChanged()
  assert.equal(app.element.hasPointerCapture(1), false)
  assert.deepEqual(app.releases.at(-1), [false, 0, 0])
  app.pointer('pointermove', 610, 380)
  assert.equal(app.info.lastX, 500)
})

for (const edge of ['hideleft', 'hideright']) test(`${edge} ignores the transparent movie box even with a data-hit ancestor (#74)`, () => {
  let menus = 0
  const right = edge === 'hideright'
  const app = renderer(160, undefined, null, 'Adult', {
    x: right ? 1760 : 0, y: 100, pose: edge, petDOM: true,
    peek: { left: right ? 0.8 : 0, top: 0.3, right: right ? 1 : 0.2, bottom: 0.9 },
    ui: { openMenu: () => { menus++ } },
  })
  const blank = app.info.lastX + (right ? 40 : 120), visible = app.info.lastX + (right ? 150 : 10)
  app.cursor({ x: blank, y: 180 })
  assert.deepEqual(app.clickThrough, [])
  app.pointer('contextmenu', blank, 180)
  app.pointer('pointerdown', blank, 180)
  assert.equal(menus, 0)
  assert.equal(app.element.hasPointerCapture(1), false)
  app.cursor({ x: visible, y: 180 })
  assert.deepEqual(app.clickThrough, [false])
  app.pointer('contextmenu', visible, 180)
  assert.equal(menus, 1)
  app.pointer('pointerdown', visible, 180)
  assert.equal(app.element.hasPointerCapture(1), true)
  app.pointer('pointermove', visible + (right ? -40 : 40), 180)
  app.pointer('pointerup', visible + (right ? -40 : 40), 180)
  assert.equal(app.releases.at(-1)[0], true, 'the visible sliver can still be dragged')
})

test('a movie retracting under a stationary desktop cursor releases click interception (#74)', () => {
  const peek = { left: 0, top: 0, right: 1, bottom: 1 }
  const app = renderer(160, undefined, async () => ({ x: 550, y: 340 }), 'Adult', { pose: 'hideright', peek, petDOM: true })
  app.cursor({ x: 550, y: 340 })
  assert.deepEqual(app.clickThrough, [false])
  peek.left = 0.8
  app.runIntervals()
  assert.deepEqual(app.clickThrough, [false, true])
  app.setPose('normal')
  app.runIntervals()
  assert.deepEqual(app.clickThrough, [false, true, false])
})

test('Linux input shapes contain the peek, not its transparent parent and players (#74)', () => {
  const app = renderer(160, undefined, null, 'Adult', {
    x: 1760, y: 100, pose: 'hideright', linux: true,
    peek: { left: 0.8, top: 0.3, right: 1, bottom: 0.9 },
  })
  app.runIntervals()
  assert.deepEqual(JSON.parse(JSON.stringify(app.shapes.at(-1))), [{ x: 1888, y: 148, width: 32, height: 96 }])
  app.element.style.backgroundImage = 'url(scene.gif)'
  app.runIntervals()
  assert.equal(app.shapes.at(-1)[0].width, 160, 'an equipped scene still covers the full pet box')
  app.element.hidden = true
  app.runIntervals()
  assert.deepEqual(JSON.parse(JSON.stringify(app.shapes.at(-1))), [])
})

test('a panel remains interactive beside a peeking pet (#74)', () => {
  const app = renderer(160, undefined, null, 'Adult', { pose: 'hideright', peek: { left: 0.8, top: 0.3, right: 1, bottom: 0.9 } })
  app.hitAt((x, y) => x === 550 && y === 340)
  app.cursor({ x: 550, y: 340 })
  assert.deepEqual(app.clickThrough, [false])
})
