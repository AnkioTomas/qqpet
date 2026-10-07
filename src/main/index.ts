import { app, clipboard, dialog, ipcMain } from 'electron'
import { IPC, type MessageBoxOptions, type TrayState } from '../shared/ipc'
import type { SavePatch } from '../shared/save'
import { handleScheme, registerScheme } from './protocol'
import { getSave, loadSave, patchSave, resetSave } from './save'
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

  ipcMain.handle(IPC.load, () => getSave())
  ipcMain.on(IPC.save, (_e, patch: SavePatch) => {
    patchSave(patch)
    if (patch.petInfo) tray.retip(getSave().petInfo)
    if (patch.settings?.hd !== undefined) tray.setState(getSave())
  })
  ipcMain.on(IPC.resetPet, () => {
    resetSave()
    app.relaunch()
    app.exit(0)
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
