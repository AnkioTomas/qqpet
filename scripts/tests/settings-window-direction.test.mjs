import assert from 'node:assert/strict'
import test from 'node:test'
import { buried, startSave } from '../../src/shared/save-logic.ts'

const copy = save => JSON.parse(JSON.stringify(save))

test('new and older saves keep the automatic phone window direction', () => {
  const fresh = startSave(null)
  assert.equal(fresh.settings.windowDirection, 'auto')
  for (const havePet of [false, true]) {
    const old = copy(fresh)
    old.havePet = havePet
    delete old.settings.windowDirection
    assert.equal(startSave(old).settings.windowDirection, 'auto')
  }
})

test('both supported window directions survive saves and unadopted restarts', () => {
  for (const windowDirection of ['auto', 'screen']) {
    for (const havePet of [false, true]) {
      const save = startSave(null)
      save.havePet = havePet
      Object.assign(save.settings, { windowDirection, paused: true, hidden: true })
      const restored = startSave(copy(save))
      assert.equal(restored.settings.windowDirection, windowDirection)
      assert.equal(restored.settings.paused, havePet, 'new pets must retain the existing pause reset')
      assert.equal(restored.settings.hidden, havePet, 'new pets must retain the existing hiding reset')
    }
  }
})

test('invalid stored directions fall back to auto for adopted and unadopted pets', () => {
  for (const windowDirection of [null, false, 1, '', 'portrait', 'SCREEN', [], {}]) {
    for (const havePet of [false, true]) {
      const save = startSave(null)
      save.havePet = havePet
      save.settings.windowDirection = windowDirection
      assert.equal(startSave(copy(save)).settings.windowDirection, 'auto')
    }
  }
})

test('rebirth and returning to egg selection retain a valid window direction', () => {
  for (const windowDirection of ['auto', 'screen']) {
    for (const sex of [undefined, 'GG', 'MM']) {
      const save = startSave(null)
      save.havePet = true
      save.petInfo.growth = 1000
      save.settings.windowDirection = windowDirection
      const reset = buried(save, sex)
      assert.equal(reset.settings.windowDirection, windowDirection)
      assert.equal(reset.havePet, sex !== undefined)
      assert.equal(startSave(copy(reset)).settings.windowDirection, windowDirection)
      if (sex) {
        assert.equal(reset.petInfo.sex, sex)
        assert.equal(reset.petInfo.growth, 0)
      }
    }
  }
})

test('an invalid direction cannot survive reset or overwrite its default', () => {
  for (const sex of [undefined, 'GG']) {
    const save = startSave(null)
    save.havePet = true
    save.settings.windowDirection = 'landscape'
    assert.equal(buried(save, sex).settings.windowDirection, 'auto')
  }
})
