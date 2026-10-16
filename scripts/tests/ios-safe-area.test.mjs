import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../../src/ios/bridge.ts', import.meta.url), 'utf8')
const updateSource = source.slice(source.indexOf('async function safeArea()'), source.indexOf('\nfunction point('))
const observerSource = source.slice(source.indexOf('let safeAreaRootWidth ='))

function fixture() {
  const requests = [], notifications = [], frames = new Map(), values = new Map(), handlers = new Map(), observers = new Set()
  const root = { clientWidth: 375, clientHeight: 812, style: { setProperty: (name, value) => values.set(name, value) } }
  let observer, textStopped = false, nextFrame = 0
  const context = {
    innerWidth: 375, innerHeight: 812,
    document: { documentElement: root, addEventListener() {} }, window: {}, geometry: null,
    stopTextInput: () => { textStopped = true }, flush: async () => {}, emit() {},
    reportError: (_operation, error) => { throw error },
    rpc: {
      request: (op, args) => new Promise(resolve => requests.push({ op, args, resolve })),
      notify: (op, args) => notifications.push({ op, args }), dispose() {},
    },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame },
    addEventListener: (type, listener) => handlers.set(type, listener),
    ResizeObserver: class {
      constructor(callback) { observer = this; this.callback = callback }
      observe() { observers.add(this) }
      disconnect() { observers.delete(this) }
    },
  }
  const update = runInNewContext(stripTypeScriptTypes(`let safeAreaRequest = 0;\n${updateSource}\n${observerSource}\nsafeArea`), context)
  return {
    context, root, requests, notifications, values, observers, update,
    frame: () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback() },
    resize: () => handlers.get('resize')(), observed: () => observer.callback(),
    hide: () => handlers.get('pagehide')(), textStopped: () => textStopped,
  }
}

const reply = (extra = {}) => ({ left: 0, top: 44, right: 0, bottom: 34, ...extra })

test('safe areas accept matching snapshots and replies from older hosts', async () => {
  for (const extra of [{}, { viewport: { width: 375, height: 812 } }]) {
    const f = fixture(), pending = f.update()
    f.requests[0].resolve(reply(extra))
    await pending
    assert.equal(f.values.get('--safe-top'), '44px')
    assert.equal(f.values.get('--safe-bottom'), '34px')
    f.frame(); f.frame()
    assert.equal(f.notifications.length, 0, 'older hosts do not receive a layout barrier acknowledgement')
  }
})

test('pending or other-direction snapshots never replace the current safe area', async () => {
  const f = fixture(), first = f.update()
  f.requests[0].resolve(reply())
  await first
  for (const extra of [{ pending: true }, { viewport: { width: 812, height: 375 } }]) {
    const pending = f.update()
    f.requests.at(-1).resolve(reply({ top: 99, ...extra }))
    await pending
    assert.equal(f.values.get('--safe-top'), '44px')
  }
  assert.equal(f.requests.length, 3, 'discarded snapshots do not start an RPC retry loop')
})

test('superseded and viewport-stale asynchronous replies cannot apply', async () => {
  const f = fixture(), first = f.update(), second = f.update()
  f.requests[1].resolve(reply({ top: 20 }))
  await second
  f.requests[0].resolve(reply({ top: 99 }))
  await first
  assert.equal(f.values.get('--safe-top'), '20px')
  const third = f.update()
  Object.assign(f.context, { innerWidth: 812, innerHeight: 375 })
  f.requests[2].resolve(reply({ top: 99 }))
  await third
  assert.equal(f.values.get('--safe-top'), '20px', 'even an old host reply belongs to its requested viewport')
})

test('the settled root size requests insets without requiring another window resize', async () => {
  const f = fixture()
  f.observed()
  assert.equal(f.requests.length, 0, 'initial and style-only observer notifications are deduplicated')
  f.resize()
  assert.equal(f.requests.length, 1)
  Object.assign(f.context, { innerWidth: 812, innerHeight: 375 })
  Object.assign(f.root, { clientWidth: 812, clientHeight: 375 })
  f.observed()
  assert.equal(f.requests.length, 2)
  assert.equal(f.requests[1].args.viewport.width, 812)
  f.requests[1].resolve(reply({ top: 0, viewport: { width: 812, height: 375 } }))
  await new Promise(setImmediate)
  f.observed()
  assert.equal(f.values.get('--safe-top'), '0px')
  assert.equal(f.requests.length, 2, 'applying inset styles cannot request another snapshot')
  f.requests[0].resolve(reply({ top: 99 }))
  await new Promise(setImmediate)
  assert.equal(f.values.get('--safe-top'), '0px')
})

test('page teardown disconnects the observer and invalidates an in-flight reply', async () => {
  const f = fixture(), pending = f.update()
  f.hide()
  assert.equal(f.observers.size, 0)
  assert.equal(f.textStopped(), true)
  f.requests[0].resolve(reply())
  await pending
  assert.equal(f.values.size, 0)
})

test('only a current layout is acknowledged after both refit animation frames', async () => {
  for (const invalidation of ['none', 'request', 'viewport', 'pagehide']) {
    const f = fixture(), pending = f.update()
    f.requests[0].resolve(reply({ viewport: { width: 375, height: 812 }, layoutGeneration: 4, layoutRevision: 7 }))
    await pending
    assert.equal(f.notifications.length, 0, 'bootstrap does not wait for the layout acknowledgement')
    f.frame()
    assert.equal(f.notifications.length, 0, 'the first frame lets inset observers refit panels')
    if (invalidation === 'request') {
      const newer = f.update()
      f.requests[1].resolve(reply())
      await newer
    } else if (invalidation === 'viewport') Object.assign(f.context, { innerWidth: 812, innerHeight: 375 })
    else if (invalidation === 'pagehide') f.hide()
    f.frame()
    if (invalidation === 'none') {
      assert.equal(f.notifications.length, 1)
      const notification = f.notifications[0]
      assert.equal(notification.op, 'layoutReady')
      assert.equal(notification.args.generation, 4)
      assert.equal(notification.args.revision, 7)
      assert.equal(notification.args.viewport.width, 375)
      assert.equal(notification.args.viewport.height, 812)
    } else assert.equal(f.notifications.length, 0, `${invalidation} invalidates the deferred acknowledgement`)
  }
})
