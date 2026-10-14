import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { renderer } from './pet-drag.test.mjs'

function statePanel() {
  const events = new EventTarget()
  const focus = []
  const profiles = []
  const element = (className, ...children) => {
    const el = {
      className, style: {}, dataset: {}, children: [],
      addEventListener(type, listener) { this[type] = listener },
      replaceChildren(...next) {
        this.children = next
        for (const child of next) if (typeof child === 'object') child.parentElement = this
      },
      remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this) },
    }
    el.replaceChildren(...children)
    return el
  }
  const body = element('body')
  body.appendChild = el => { body.children.push(el); el.parentElement = body }
  const source = stripTypeScriptTypes(readFileSync(new URL('../../src/renderer/ui/state.ts', import.meta.url), 'utf8'))
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const ui = runInNewContext(source + '\n;({ openState, closeState })', {
    window: { addEventListener: events.addEventListener.bind(events), qqpet: { setFocusable: on => focus.push(on) } },
    document: { body }, innerWidth: 1920, innerHeight: 1080,
    div: element, img: element,
    button: (cls, click, ...children) => Object.assign(element(cls, ...children), { click }),
    frame: content => content, progress: () => '',
    info: { health: 5 }, save: { settings: {}, petComputedlInfo: { level: 1 }, selfGoodUseOption: {} },
    activity: () => false, growthPerMinute: () => 1, onInfoChange() {},
    openPetInfo: () => profiles.push(focus.at(-1)),
  })
  return { ...ui, body, focus, profiles, blur: () => events.dispatchEvent(new Event('blur')) }
}

test('the tray status panel takes focus and hides on window blur; closing is idempotent', () => {
  const ui = statePanel()
  ui.openState(800, 0)
  assert.equal(ui.body.children.length, 1)
  assert.deepEqual(ui.focus, [true])
  ui.blur()
  assert.equal(ui.body.children.length, 0)
  assert.deepEqual(ui.focus, [true, false])
  ui.blur()
  ui.closeState()
  assert.deepEqual(ui.focus, [true, false])
  ui.openState(800, 0)
  const head = ui.body.children[0].children[0].children[0].children[0]
  head.children[0].click()
  assert.equal(ui.body.children.length, 0)
  assert.deepEqual(ui.profiles, [false], 'release status focus before the editable profile takes focus')
})

test('left then right tray clicks hide status before opening the menu, even without a blur event', () => {
  const ui = statePanel()
  let menus = 0
  const app = renderer(144, undefined, null, 'Egg', {
    ui: { ...ui, openMenu: () => { assert.equal(ui.body.children.length, 0); menus++ } },
  })
  app.save.havePet = true
  app.trayClick({ kind: 'state', x: 800, y: 0 })
  assert.equal(ui.body.children.length, 1)
  app.trayClick({ kind: 'menu', x: 800, y: 0 })
  assert.equal(ui.body.children.length, 0)
  assert.equal(menus, 1)
  assert.deepEqual(ui.focus, [true, false])
})
