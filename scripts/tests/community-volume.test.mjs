import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { startSave } from '../../src/shared/save-logic.ts'
import { isFatalRufflePanic, readPlayerPanic } from '../../src/shared/ruffle-panic.ts'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const executable = text => stripTypeScriptTypes(text).replace(/^import .*$/gm, '').replace(/^export /gm, '')

test('player volume survives Ruffle rebuilding its instance and stays independent of mute', async () => {
  const document = { documentElement: {}, createElement: () => ({}) }
  const api = {
    metadata: { width: 100, height: 100, frameRate: 10, numFrames: 10 },
    async load() { element.volume = 1 }, // Ruffle resets its master gain on every load.
    resume() {}, suspend() {},
  }
  const element = {
    style: {}, dataset: {}, ownerDocument: document, volume: 1, isConnected: true,
    ruffle: () => api, remove() {},
  }
  document.defaultView = { RufflePlayer: { newest: () => ({ createPlayer: () => element }) } }
  const { SwfPlayer } = runInNewContext(executable(source('../../src/renderer/swf/player.ts')) + '\n({ SwfPlayer })', {
    document, window: {}, location: { href: 'http://localhost/' }, URL, performance, setTimeout, clearTimeout,
    isFatalRufflePanic, readPlayerPanic,
    MutationObserver: class { observe() {} disconnect() {} },
  })
  const player = new SwfPlayer({ ownerDocument: document, appendChild() {} })
  for (const volume of [0.5, 0, 1]) {
    player.setVolume(volume)
    await player.load('community.swf')
    assert.equal(element.volume, volume, 'load must restore the chosen volume, including silence')
  }
  player.setVolume(0.5)
  player.setMuted(true)
  player.setVolume(0.3)
  await player.load('replacement.swf')
  assert.equal(element.volume, 0)
  player.setMuted(false)
  assert.equal(element.volume, 0.3, 'unmuting restores the volume rather than full gain')
  player.setVolume(-1)
  assert.equal(element.volume, 0)
  player.setVolume(2)
  assert.equal(element.volume, 1)
  player.destroy()
})

test('community applies saved volume, follows settings, and releases its subscription on close', () => {
  const initialSave = startSave(null)
  initialSave.settings.music = 0.5
  const window = {
    __qqpetInitialSave: initialSave,
    qqpet: { onGamePlayed() {}, setFocusable() {}, save() {} },
    setTimeout: () => 1, clearTimeout() {},
  }
  const storeSource = source('../../src/renderer/pet/store.ts')
  const store = runInNewContext(executable(storeSource.slice(0, storeSource.indexOf('\ntype NumKey ='))) + '\n({ save, info, update, onSettingsChange, settingsListeners })', {
    window, addEventListener() {},
  })
  const players = []
  let close
  class Movie {
    constructor() { this.volumes = []; players.push(this) }
    setVolume(value) { this.volumes.push(value) }
    destroy() { this.destroyed = true }
  }
  const { openCommunity } = runInNewContext(executable(source('../../src/renderer/ui/community.ts')) + '\n({ openCommunity })', {
    ...store, window, SwfPlayer: Movie, ISLAND: {}, stage: {},
    openPetInfo() {}, openFishing() {}, openMstx() {}, openSetup() {}, openShop() {},
    div: () => ({ addEventListener() {} }),
    openBox: (_content, options) => { close = options.onClose },
    // Keep resource loading pending while exercising settings during startup.
    fetch: () => new Promise(() => {}), clearTimeout() {}, clearInterval() {},
  })
  openCommunity()
  assert.deepEqual(players[0].volumes, [0.5])
  assert.equal(window.PSW.GetSoundVolume(), 100, 'Flash must not multiply the master gain again')
  store.update('settings', { music: 0 })
  store.update('settings', { sound: false })
  store.update('settings', { music: 0.3 })
  assert.deepEqual(players[0].volumes, [0.5, 0, 0.3], 'pet sound settings do not change community volume')
  assert.equal(store.settingsListeners.size, 1)
  close()
  assert.equal(store.settingsListeners.size, 0)
  store.update('settings', { music: 0 })
  assert.deepEqual(players[0].volumes, [0.5, 0, 0.3], 'closed players must not receive settings')
  openCommunity()
  assert.deepEqual(players[1].volumes, [0], 'reopening retains silence')
  close()
  const restarted = startSave(JSON.parse(JSON.stringify(store.save)))
  assert.equal(restarted.settings.music, 0, 'silence survives saving and restart')
})
