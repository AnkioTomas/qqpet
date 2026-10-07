import { app, clipboard, dialog, ipcMain } from 'electron'
import { IPC, type MessageBoxOptions, type TrayState } from '../shared/ipc'
import type { SavePatch, Sex } from '../shared/save'
import { aiChat, aiModels } from './ai'
import { calendar } from './calendar'
import { handleScheme, registerScheme } from './protocol'
import { exportSave, getSave, importSave, loadSave, patchSave, resetSave } from './save'
import { createPetTray } from './tray'
import { weather } from './weather'
import { createPetWindow, openGameWindow } from './window'

if (!app.requestSingleInstanceLock()) app.exit(0)

registerScheme()

app.whenReady().then(() => {
  handleScheme()
  app.dock?.hide()
  loadSave()

  const win = createPetWindow()
  const tray = createPetTray((click) => {
    const b = win.getBounds()
    win.webContents.send(IPC.trayClick, click.x === undefined ? click : { ...click, x: click.x - b.x, y: click.y! - b.y })
  })
  app.on('before-quit', () => tray.destroy())

  ipcMain.handle(IPC.load, () => getSave())
  ipcMain.on(IPC.save, (_e, patch: SavePatch) => {
    patchSave(patch)
    if (patch.petInfo) tray.retip(getSave().petInfo)
    if (patch.settings?.hd !== undefined) tray.setState(getSave())
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
  ipcMain.handle(IPC.calendar, () => calendar())
  ipcMain.handle(IPC.aiModels, (_e, c) => aiModels(c))
  ipcMain.handle(IPC.aiChat, (_e, c, messages) => aiChat(c, messages))
  ipcMain.handle(IPC.weather, (_e, city: string) => weather(city))
  ipcMain.on(IPC.openGame, (_e, swf: string) => {
    const start = Date.now()
    // Quitting with a game open closes the pet window first.
    openGameWindow(swf).on('closed', () => win.isDestroyed() || win.webContents.send(IPC.gamePlayed, (Date.now() - start) / 60000))
  })
  ipcMain.on(IPC.quit, () => app.quit())
  ipcMain.handle(IPC.messageBox, async (_e, o: MessageBoxOptions) => {
    const r = await dialog.showMessageBox(win, { type: 'none', buttons: ['取消', '确定'], ...o })
    return r.response
  })
  ipcMain.on(IPC.copyText, (_e, text: string) => clipboard.writeText(text))
  ipcMain.on(IPC.setClickThrough, (_e, on: boolean) => win.setIgnoreMouseEvents(on))
  ipcMain.on(IPC.setAlwaysOnTop, (_e, on: boolean) => win.setAlwaysOnTop(on, 'screen-saver'))
  ipcMain.on(IPC.setFocusable, (_e, on: boolean) => win.setFocusable(on))
  ipcMain.on(IPC.setAutoStart, (_e, on: boolean) => app.setLoginItemSettings({ openAtLogin: on }))
  ipcMain.on(IPC.setTrayState, (_e, state: TrayState) => tray.setState(getSave(), state))
})

app.on('window-all-closed', () => app.quit())
