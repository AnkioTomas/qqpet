import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import test from 'node:test'

// Keep the real goods state transitions; replace only the disk-backed store and DOM.
const save = {
  selfGoodUseOption: { background: null, food: null, clean: null, toy: null },
}
globalThis.backgroundTestSave = save
const pet = { id: 'pet', style: { backgroundImage: '' } }
globalThis.document = {
  getElementById: () => pet,
  createElement: () => ({ getContext: () => ({}) }),
}
globalThis.HTMLCanvasElement = class {
  getContext() { return {} }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+(?:\?|$)/i.test(specifier)) specifier += '.ts'
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith('/pet/store.ts')) return {
      format: 'module', shortCircuit: true,
      source: 'export const save = globalThis.backgroundTestSave; export const update = (key, value) => Object.assign(save[key], value)',
    }
    if (url.endsWith('/pet/data/goods.json')) return {
      format: 'module', shortCircuit: true,
      source: `export default ${readFileSync(new URL(url), 'utf8')}`,
    }
    return nextLoad(url, context)
  },
})

const { goodOf } = await import('../../src/renderer/pet/data/goods.ts')
const { startTimed, tickTimed } = await import('../../src/renderer/pet/goods.ts')
const { cover } = await import('../../src/mobile/overlay.ts')

test('desktop background restores, switches, expires and supports 无背景', async () => {
  await import('../../src/renderer/ui/background.ts')
  assert.equal(pet.style.backgroundImage, '')

  startTimed(goodOf('background', 'b0000001'))
  assert.equal(pet.style.backgroundImage, 'url("./pet/img_res/background/b0000001.gif")')
  assert.equal(save.selfGoodUseOption.background.left, 60)
  tickTimed(1)
  assert.equal(pet.style.backgroundImage, 'url("./pet/img_res/background/b0000001.gif")')

  startTimed(goodOf('background', 'b0000002'))
  assert.equal(pet.style.backgroundImage, 'url("./pet/img_res/background/b0000002.gif")')
  assert.deepEqual(tickTimed(120), ['background'])
  assert.equal(pet.style.backgroundImage, '')

  startTimed(goodOf('background', 'b0000001'))
  startTimed(goodOf('background', 'b0000000'))
  assert.equal(pet.style.backgroundImage, '')

  // Re-loading the renderer must draw the equipped background before any goods event.
  save.selfGoodUseOption.background = { id: 'b0000002', left: 15 }
  await import('../../src/renderer/ui/background.ts?restored')
  assert.equal(pet.style.backgroundImage, 'url("./pet/img_res/background/b0000002.gif")')
  save.selfGoodUseOption.background.left = 0
  await import('../../src/renderer/ui/background.ts?expired')
  assert.equal(pet.style.backgroundImage, '')
})

test('mobile cropping includes the scene, releases it when removed, and ignores hidden pets', () => {
  const box = { left: 100, top: 80, right: 260, bottom: 240, width: 160, height: 160 }
  Object.assign(pet, {
    getBoundingClientRect: () => box,
    checkVisibility: () => true,
    closest: () => pet,
    matches: () => false,
  })
  startTimed(goodOf('background', 'b0000001'))
  assert.equal(cover(pet), box)
  startTimed(goodOf('background', 'b0000000'))
  assert.equal(cover(pet), null)
  startTimed(goodOf('background', 'b0000001'))
  pet.checkVisibility = () => false
  assert.equal(cover(pet), null)
})
