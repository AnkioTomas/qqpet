import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type QQPetApi } from '../shared/ipc'

const send =
  (channel: string) =>
  (arg?: unknown): void =>
    ipcRenderer.send(channel, arg)

const api: QQPetApi = {
  load: () => ipcRenderer.invoke(IPC.load),
  save: send(IPC.save),
  resetPet: send(IPC.resetPet),
  quit: send(IPC.quit),
  messageBox: (options) => ipcRenderer.invoke(IPC.messageBox, options),
  copyText: send(IPC.copyText),
  setClickThrough: send(IPC.setClickThrough),
  setAlwaysOnTop: send(IPC.setAlwaysOnTop),
  setFocusable: send(IPC.setFocusable),
  setAutoStart: send(IPC.setAutoStart),
  setTrayState: send(IPC.setTrayState),
  onCursor: (listener) => ipcRenderer.on(IPC.cursor, (_e, p) => listener(p)),
  onTrayClick: (listener) => ipcRenderer.on(IPC.trayClick, (_e, c) => listener(c)),
}

contextBridge.exposeInMainWorld('qqpet', api)
