import { app, clipboard, dialog, ipcMain, net, powerMonitor, session, shell } from 'electron'
import { IPC, type MessageBoxOptions, type TrayState } from '../shared/ipc'
import type { SavePatch, Sex } from '../shared/save'
import { aiChat, aiModels } from '../shared/ai'
import { calendar } from '../shared/calendar'
import { weather } from '../shared/weather'
import { handleScheme, registerScheme } from './protocol'
import { exportSave, getSave, importSave, loadSave, patchSave, resetSave } from './save'
import { createPetTray } from './tray'
import { frontName } from './front'
import { createPetWindow, openGameWindow } from './window'

if (!app.requestSingleInstanceLock()) app.exit(0)

registerScheme()

app.whenReady().then(() => {
  handleScheme()
  app.dock?.hide()
  loadSave()
  // CSS keeps decoded images per stylesheet, so @2x bitmaps follow the hd setting as of launch only.
  if (getSave().settings.hd) {
    session.defaultSession.webRequest.onBeforeSendHeaders((d, cb) => cb({ requestHeaders: { ...d.requestHeaders, 'X-HD': '1' } }))
  }

  const win = createPetWindow()
  const tray = createPetTray((click) => {
    const b = win.getBounds()
    win.webContents.send(IPC.trayClick, click.x === undefined ? click : { ...click, x: click.x - b.x, y: click.y! - b.y })
  })
  app.on('before-quit', () => tray.destroy())

  let copied = ''
  void clipboard.readText().then((t) => (copied = t))
  setInterval(async () => {
    const text = await clipboard.readText()
    if (text === copied) return
    copied = text
    if (text.trim() && getSave().settings.clip) win.webContents.send(IPC.clipboard, text)
  }, 500)

  ipcMain.handle(IPC.load, () => getSave())
  ipcMain.on(IPC.save, (_e, patch: SavePatch) => {
    patchSave(patch)
    if (patch.petInfo) tray.retip(getSave().petInfo)
    if (patch.settings?.hd !== undefined) tray.setState(getSave())
    if (patch.settings?.watchApp !== undefined) watchFront(getSave().settings.watchApp)
  })
  ipcMain.on(IPC.resetPet, (_e, sex?: Sex) => {
    resetSave(sex)
    app.relaunch()
    app.exit(0)
  })
  ipcMain.handle(IPC.exportSave, async () => {
    const day = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(win, { defaultPath: `QQPet-${day}.json`, filters: [{ name: 'QQ宠物存档', extensions: ['json'] }] })
    if (r.canceled || !r.filePath) return false
    exportSave(r.filePath)
    return true
  })
  ipcMain.on(IPC.importSave, async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'QQ宠物存档', extensions: ['json'] }] })
    if (r.canceled) return
    try {
      importSave(r.filePaths[0])
    } catch (e) {
      await dialog.showMessageBox(win, { type: 'error', message: '这不是有效的QQ宠物存档', detail: String(e) })
      return
    }
    app.relaunch()
    app.exit(0)
  })
  ipcMain.handle(IPC.calendar, () => calendar(net.fetch))
  ipcMain.handle(IPC.aiModels, (_e, c) => aiModels(net.fetch, c))
  ipcMain.handle(IPC.aiChat, (_e, c, messages) => aiChat(net.fetch, c, messages))
  ipcMain.handle(IPC.weather, (_e, city: string) => weather(net.fetch, city))
  // A focusable pet window holds a full panel (社区, 密室...) that would cover a normal game window.
  let panel = false
  ipcMain.on(IPC.openGame, (_e, swf: string) => {
    const start = Date.now()
    // Quitting with a game open closes the pet window first.
    openGameWindow(swf, panel ? win : undefined).on('closed', () => win.isDestroyed() || win.webContents.send(IPC.gamePlayed, (Date.now() - start) / 60000))
  })
  ipcMain.on(IPC.quit, () => app.quit())
  ipcMain.handle(IPC.messageBox, async (_e, o: MessageBoxOptions) => {
    const r = await dialog.showMessageBox(win, { type: 'none', buttons: ['取消', '确定'], ...o })
    return r.response
  })
  ipcMain.on(IPC.copyText, (_e, text: string) => clipboard.writeText(text))
  ipcMain.on(IPC.openUrl, (_e, url: string) => /^https?:\/\//.test(url) && void shell.openExternal(url))
  ipcMain.on(IPC.setClickThrough, (_e, on: boolean) => win.setIgnoreMouseEvents(on))
  ipcMain.on(IPC.setAlwaysOnTop, (_e, on: boolean) => win.setAlwaysOnTop(on, 'screen-saver'))
  ipcMain.on(IPC.setFocusable, (_e, on: boolean) => {
    panel = on
    win.setFocusable(on)
    // The window is born unfocusable; setFocusable alone does not make it key, so IME stays on the previous app.
    if (on) {
      if (process.platform === 'darwin') app.focus({ steal: true })
      win.focus()
    }
  })
  ipcMain.on(IPC.setAutoStart, (_e, on: boolean) => app.setLoginItemSettings({ openAtLogin: on }))
  ipcMain.on(IPC.setTrayState, (_e, state: TrayState) => tray.setState(getSave(), state))

  const AWAY_S = 300
  let away = false
  const presence = (on: boolean): void => {
    if (on === away) return
    away = on
    win.webContents.send(IPC.presence, away)
  }
  setInterval(() => presence(powerMonitor.getSystemIdleTime() >= AWAY_S), 5000)
  powerMonitor.on('lock-screen', () => presence(true))
  powerMonitor.on('unlock-screen', () => presence(false))
  powerMonitor.on('suspend', () => presence(true))
  powerMonitor.on('resume', () => presence(false))

  let frontTimer: ReturnType<typeof setInterval> | undefined
  let lastFront = ''
  const watchFront = (on: boolean): void => {
    clearInterval(frontTimer)
    frontTimer = undefined
    lastFront = ''
    if (!on) return
    const tick = (): void => {
      void frontName().then((name) => {
        if (!name || name === lastFront) return
        lastFront = name
        win.webContents.send(IPC.front, name)
      })
    }
    tick()
    frontTimer = setInterval(tick, 15_000)
  }
  watchFront(getSave().settings.watchApp)
})

app.on('window-all-closed', () => app.quit())
