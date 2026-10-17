import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const view = readFileSync(new URL('../../tools/qqfarm/src/com/MyFarm/view/InstallFace.as', import.meta.url), 'utf8')
const tools = readFileSync(new URL('../../tools/qqfarm/src/com/MyFarm/control/ToolsBarControl.as', import.meta.url), 'utf8')

// Execute the patched AS3 methods; their display-list arithmetic also runs as TypeScript.
function method(source, name, context) {
  const start = source.indexOf(`function ${name}(`)
  const body = source.indexOf('{', start)
  let end = body + 1, depth = 1
  while (depth) { if (source[end] === '{') depth++; if (source[end++] === '}') depth-- }
  const code = source.slice(start, end)
    .replace(/for each\(var (\w+):\w+ in ([^)]+)\)/g, 'for (const $1 of $2)')
    .replace(/:(Number|uint)\b/g, ':number')
  return runInNewContext(stripTypeScriptTypes(code) + `;${name}`, Object.assign(context, { int: Math.trunc }))
}

class Sprite {
  children = []
  x = 0; y = 0; width = 60; height = 60
  txt = {}
  addChild(child) { this.children.push(child); return child }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1) }
  getChildByName(name) { return this.children.find(child => child.name === name) ?? null }
  addEventListener() {}
}

function display() {
  const bar = Object.assign(new Sprite(), { name: 'ToolBarBg', width: 380, height: 40 })
  const pack = Object.assign(new Sprite(), { name: 'PackBarBg', visible: false })
  pack.addChild(Object.assign(new Sprite(), { name: 'background' }))
  const _tools = new Sprite(); _tools.addChild(bar); _tools.addChild(pack)
  return { _tools, pack, Sprite, _stage: { stageWidth: 700, stageHeight: 550, addChild() {} },
    createClip: name => Object.assign(new Sprite(), name === 'ToolBarBg' ? { width: 380, height: 40 } : {}),
    createButton: () => new Sprite(), IntroductionText: function () {} }
}

test('toolbar stays centred and every inventory card fits the stage, including wrapped rows and refreshes', () => {
  for (const count of [0, 1, 6, 10, 14, 25]) {
    const context = { ...display(), _user: { burden: Array.from({ length: count }, (_, i) => ({ Items: `Seed${i}`, number: 10 })) } }
    context._tools = new Sprite()
    context.showBurden = method(view, 'showBurden', context)
    method(view, 'installToolsBar', context)()
    const { _tools } = context
    assert.equal(_tools.x + _tools.getChildByName('ToolBarBg').width / 2, 350)
    const pack = _tools.getChildByName('PackBarBg')
    pack.visible = true
    context.showBurden()
    const cards = pack.getChildByName('container').children
    assert.equal(cards.length, count)
    for (const card of cards) {
      const x = _tools.x + pack.x + card.x, y = _tools.y + pack.y + card.y
      assert.ok(x >= 10 && x + card.width <= 690, `card ${card.name} fits horizontally`)
      assert.ok(y >= 80 && y + card.height < _tools.y, `card ${card.name} fits above the tools`)
      assert.equal(card.mouseChildren, false)
    }
    assert.equal(pack.visible, true)
  }
})

test('pack remains open through its own presses, selects late items, and closes on an outside press', () => {
  const { pack, _tools } = display()
  const face = { _tools, _myMouse: {}, changeMouse(name) { this._myMouse.name = name } }
  _tools.contains = target => target.inside
  const context = { face, Mouse: { show() {} } }
  const press = method(tools, 'clickHandler', context)
  const select = method(tools, 'toolsSelected', context)
  for (const name of ['PeachSeed', 'WatermelonSeed', 'BananaSeed', 'FertilizerVeryFastP']) {
    select({ target: { name: 'ButtonSeed' } })
    press({ target: { name, inside: true } })
    assert.equal(pack.visible, true)
    select({ target: { name } })
    assert.equal(face._myMouse.name, name)
    assert.equal(pack.visible, false)
  }
  select({ target: { name: 'ButtonSeed' } })
  press({ target: { inside: false } })
  assert.equal(pack.visible, false)
  assert.doesNotMatch(tools, /addEventListener\(MouseEvent\.ROLL_OUT,mouseOutHandler/)
})

class Rectangle {
  constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }) }
  get right() { return this.x + this.width }
  get bottom() { return this.y + this.height }
  union(other) {
    const x = Math.min(this.x, other.x), y = Math.min(this.y, other.y)
    return new Rectangle(x, y, Math.max(this.right, other.right) - x, Math.max(this.bottom, other.bottom) - y)
  }
  inflate(x, y) { this.x -= x; this.y -= y; this.width += 2 * x; this.height += 2 * y }
}

test('overview fits all 18 plots above the tools and restores after the original-size view', () => {
  const plots = Array.from({ length: 18 }, (_, i) => new Rectangle(254 - i % 3 * 103 + Math.floor(i / 3) * 100, 284 + Math.floor(i / 3) * 50 + i % 3 * 53, 200, 100))
  const context = { ...display(), Rectangle, _bg: {}, _beijing: { x: -15, y: 0, width: 1000, height: 800 },
    _farmland_array: plots.map(plot => ({ getBounds: () => new Rectangle(plot.x, plot.y, plot.width, plot.height) })) }
  context._tools.y = 500
  context.fitFarm = method(view, 'fitFarm', context)
  context.fitFarm()
  for (const plot of plots) {
    const { _bg } = context
    assert.ok(_bg.x + plot.x * _bg.scaleX >= 10)
    assert.ok(_bg.x + plot.right * _bg.scaleX <= 690)
    assert.ok(_bg.y + (plot.y - 45) * _bg.scaleY >= 80)
    assert.ok(_bg.y + plot.bottom * _bg.scaleY < context._tools.y - 20)
  }
  const zoom = context._bg.scaleX
  const toggle = method(view, 'toggleFarmView', context)
  toggle(); assert.equal(context._bg.scaleX, 1)
  toggle(); assert.equal(context._bg.scaleX, zoom)
})
