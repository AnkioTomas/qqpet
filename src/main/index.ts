import { readFileSync } from 'node:fs'
import { app, clipboard, dialog, ipcMain } from 'electron'
import { IPC, type MessageBoxOptions, type TrayState } from '../shared/ipc'
import type { SavePatch, Sex } from '../shared/save'
import { openBrowser } from './browser'
import { handleScheme, registerScheme } from './protocol'
import { exportSave, getSave, importSave, loadSave, patchSave, resetSave } from './save'
import { createPetTray } from './tray'
import { createPetWindow } from './window'

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
  ipcMain.handle(IPC.pickSwf, async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Flash', extensions: ['swf'] }] })
    return r.canceled ? null : readFileSync(r.filePaths[0])
  })
  ipcMain.on(IPC.openBrowser, openBrowser)
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
