import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { IPC } from '../../src/shared/ipc.ts'

function load(path, services) {
  const source = stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8'))
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  return runInNewContext(source + '\n' + (path.includes('/main/') ? 'createPetTray' : path.includes('/preload/') ? 'api' : 'openMenu'), services)
}

function fixture(platform) {
  const clicks = []
  const popups = []
  let tray
  const create = load('../../src/main/tray.ts', {
    process: { platform },
    Tray: class extends EventEmitter {
      constructor() { super(); tray = this }
      setToolTip() {}
      setContextMenu(menu) { this.contextMenu = menu }
      popUpContextMenu(menu) {
        popups.push(menu)
        // macOS uses performClick to open the native status-item menu.
        if (platform === 'darwin') this.emit('click')
      }
    },
    Menu: { buildFromTemplate: items => items },
    nativeImage: { createFromBuffer: () => ({}) },
    readFileSync: () => new Uint8Array(), resourceFile: (path) => '/resources/' + path,
    screen: { getCursorScreenPoint: () => ({ x: -1200, y: -1400 }) },
    app: { quit: () => clicks.push('quit') },
  })
  const native = create(click => clicks.push(click))
  const actions = []
  const appended = []
  const element = (className, ...children) => ({ className, children, style: {}, dataset: {}, remove() {} })
  const save = { havePet: true, isBury: false, settings: { hidden: false, paused: false } }
  // Exercise the actual preload platform gate, rather than duplicating it in the fixture.
  const ipcRenderer = new EventEmitter()
  ipcRenderer.send = (channel, items) => {
    if (channel === IPC.trayMenu) native.popupMenu(items, action => ipcRenderer.emit(IPC.trayMenuAction, {}, action))
  }
  const api = platform === 'mobile' ? {} : load('../../src/preload/index.ts', {
    process: { platform }, IPC, ipcRenderer, contextBridge: { exposeInMainWorld() {} },
  })
  const open = load('../../src/renderer/ui/menu.ts', {
    window: { qqpet: { ...api, quit: () => actions.push('quit') } },
    document: { body: { classList: { toggle() {} }, appendChild: menu => appended.push(menu) } },
    innerWidth: 1920, innerHeight: 1080,
    save, info: { health: 5 },
    div: element, button: (cls, run, ...children) => element(cls, ...children), frame: content => content,
    openChat: () => actions.push('chat'), openShop: () => actions.push('shop'), rest: () => actions.push('rest'), visitFriend: () => actions.push('visit'),  sendLetter: () => actions.push("letter"),
    openGoods: kind => actions.push(kind), openPetInfo: () => actions.push('info'),
    openState: () => actions.push('state'), openSetup: () => actions.push('setup'),
    update: (key, patch) => Object.assign(save[key], patch),
    setPaused: on => { save.settings.paused = on },
    speak: () => {},
  })
  return { open, save, tray, popups, clicks, actions, appended }
}

test('macOS tray popup ignores overlay coordinates and dispatches the existing actions', () => {
  const f = fixture('darwin')
  f.tray.emit('right-click')
  assert.equal(f.clicks[0].kind, 'menu')
  assert.equal(f.clicks[0].x, undefined, 'native menu must not be positioned in the pet overlay')
  f.open({ x: -1200, y: -1400, pet: false }, () => {})
  assert.equal(f.appended.length, 0, 'a tray on another display must not create a clamped HTML menu')
  assert.equal(f.clicks.length, 1, 'opening a native menu must not also open the status panel')
  const menu = f.popups[0]
  assert.deepEqual(Array.from(menu, item => item.label), ['和我聊天', '打开商城', '喂养宠物', '隐藏宠物', '设置帮助', '宠物状态', '停止成长', '一起玩耍', '退出宠物'])
  menu[2].submenu[1].click()
  assert.deepEqual(f.actions, ['clean'])
  f.save.settings.paused = true
  f.save.settings.hidden = true
  f.open({ x: 0, y: 0, pet: false }, () => {})
  assert.equal(f.popups[1][3].label, '显示宠物')
  assert.equal(f.popups[1][6].label, '开始成长')
  assert.equal(f.popups[1][6].checked, true)
  f.popups[1][5].click()
  assert.equal(f.actions.at(-1), 'state')
  f.open({ x: 0, y: 0, pet: false }, () => {})
  f.popups[2][4].submenu[1].click()
  assert.deepEqual(f.actions, ['clean', 'state', 'setup'])
  f.save.havePet = false
  f.open({ x: 0, y: 0, pet: false }, () => f.actions.push('adopt'))
  f.popups[3][0].click()
  assert.equal(f.actions.at(-1), 'adopt')
  f.open({ x: 500, y: 300, pet: true }, () => {})
  assert.equal(f.appended.length, 1, 'pet context menus keep their HTML appearance')
})

test('Windows keeps its HTML tray menu at the cursor, including an overflow flyout', () => {
  const f = fixture('win32')
  f.tray.emit('right-click')
  assert.equal(f.clicks[0].kind, 'menu')
  assert.equal(f.clicks[0].x, -1200)
  assert.equal(f.clicks[0].y, -1400)
  f.open({ x: 1000, y: 900, pet: false }, () => {})
  assert.equal(f.popups.length, 0)
  assert.equal(f.appended[0].children[0].style.left, '945px')
  assert.equal(f.appended[0].children[0].style.bottom, '179px')
  f.tray.emit('click')
  assert.equal(f.clicks[1].kind, 'state')
  assert.equal(f.clicks[1].x, -1200)
  assert.equal(f.clicks[1].y, -1400)
})

test('Linux and mobile retain their HTML menus and Linux retains its AppIndicator entries', () => {
  for (const platform of ['linux', 'mobile']) {
    const f = fixture(platform)
    f.open({ x: 1000, y: 0, pet: false }, () => {})
    assert.equal(f.popups.length, 0)
    assert.equal(f.appended[0].children[0].style.top, '0px')
    if (platform === 'linux') {
      assert.deepEqual(Array.from(f.tray.contextMenu, item => item.label), ['宠物状态', '菜单', undefined, '退出'])
      f.tray.contextMenu[1].click()
      assert.equal(f.clicks[0].kind, 'menu')
    }
  }
})

test('a pending outside-touch dismissal cannot close a newly requested tray menu', () => {
  const f = fixture('mobile')
  const timers = new Map()
  let nextTimer = 0, onCursor, onTrayClick
  const source = stripTypeScriptTypes(readFileSync(new URL('../../src/renderer/main.ts', import.meta.url), 'utf8'))
  const cursorSource = source.slice(source.indexOf('function updateCursor('), source.indexOf('// Linux:'))
  const traySource = source.slice(source.indexOf('// Linux trays report no position;'), source.indexOf('\nconst CLIP_MAX'))
  const services = {
    window: { qqpet: {
      onCursor: fn => { onCursor = fn }, onTrayClick: fn => { onTrayClick = fn }, setClickThrough() {},
    } },
    document: { documentElement: { dataset: {} }, elementFromPoint: () => null },
    ShadowRoot: class {}, innerWidth: 375, innerHeight: 812,
    petEl: { hidden: true }, save: f.save, info: {}, size: 100,
    dragging: false, out: false, interactive: false, dragMove: null, cursor: {}, menuLeave: 0, MENU_LEAVE_MS: 300,
    syncDesktop: () => true,
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id },
    clearTimeout: id => timers.delete(id),
    closeMenu: () => { f.appended.at(-1)?.remove() }, closeState() {},
    openMenu: f.open, openState() {}, adoptPet() {},
  }
  // Keep the fixture's actual menu creation/removal visible to the delayed callback.
  const append = f.appended.push.bind(f.appended)
  f.appended.push = menu => {
    menu.closed = false
    menu.remove = () => { menu.closed = true }
    return append(menu)
  }
  runInNewContext(cursorSource + '\n' + traySource, services)
  onCursor({ x: 0, y: 0 })
  assert.equal(timers.size, 1, 'an earlier outside sample schedules a dismissal')
  onTrayClick({ kind: 'menu', x: 180, y: 400 })
  assert.equal(f.appended.length, 1)
  for (const callback of timers.values()) callback()
  assert.equal(f.appended[0].closed, false, 'the old leave must not dismiss the new menu')
  onCursor({ x: 0, y: 0 })
  assert.equal(timers.size, 1, 'a later outside touch still dismisses it')
  for (const callback of timers.values()) callback()
  assert.equal(f.appended[0].closed, true)
})
