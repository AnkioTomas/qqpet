import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { route } from '../../src/renderer/pet/router.ts'

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
export function renderer(size, crop = { x: 0, y: 0 }, native = null, stage = 'Egg') {
  const pet = new EventTarget()
  pet.style = {}
  pet.setPointerCapture = () => {}
  const info = { lastX: 500, lastY: 300 }
  const listeners = []
  const poses = []
  const releases = []
  let clock = 0
  const noop = () => {}
  let area = { width: 1920, height: 1080 }
  let cursorListener
  const services = {
    info,
    save: { settings: { petBar: false }, havePet: false },
    machine: { pose: { a: 'normal' }, play: pose => poses.push(pose) },
    setInfo: (key, value) => {
      info[key] = value
      listeners.forEach(listener => listener(key))
    },
    onInfoChange: listener => listeners.push(listener),
    petSize: () => size * (native ? area.width / 1920 : 1),
    stage: () => stage,
    viewportSize: () => area,
    setDesktopSize: value => { area = value },
    update: (key, value) => Object.assign(services.save[key], value),
    applyEdge: () => null,
    pageX: event => event.clientX + crop.x,
    pageY: event => event.clientY + crop.y,
    touch: false,
    document: {
      getElementById: () => pet,
      elementFromPoint: () => null,
      documentElement: { dataset: { cropX: String(crop.x), cropY: String(crop.y) } },
    },
    window: {
      qqpet: {
        onCursor: listener => { cursorListener = listener }, onTrayClick: noop, onClipboard: noop,
        onPresence: noop, onFront: noop,
        setClickThrough: noop,
        ...(native ? { setDragging: native } : {}),
      },
    },
    performance: { now: () => clock },
    AbortController,
    ShadowRoot: class {},
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: noop,
    setInterval: noop,
    setTimeout: noop,
    clearTimeout: noop,
    adopt: noop,
    closeMenu: noop,
    showControl: noop,
    catchDiudiule: noop,
    releaseDiudiule: (...args) => { releases.push(args); return false },
    scheduleHide: noop,
    openMenu: noop,
    startAutoUpdate: noop,
  }
  const source = readFileSync(new URL('../../src/renderer/main.ts', import.meta.url), 'utf8')
  runInNewContext(stripTypeScriptTypes(source).replace(/^import .*$/gm, ''), services)

  const pointer = (type, x, y) => {
    clock += 16
    const event = new Event(type)
    Object.assign(event, { button: 0, pointerId: 1, clientX: x - crop.x, clientY: y - crop.y })
    // Ruffle is the normal target and does not have an interaction point class.
    pet.classList = { contains: () => false }
    pet.dispatchEvent(event)
  }
  return { info, poses, releases, pointer, save: services.save, cursor: point => { clock += 16; cursorListener(point) } }
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
