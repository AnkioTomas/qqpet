import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type QQPetApi } from '../shared/ipc'

const api: QQPetApi = {
  setClickThrough: (enabled) => ipcRenderer.send(IPC.setClickThrough, enabled),
  onCursor: (listener) => {
    ipcRenderer.on(IPC.cursor, (_e, p) => listener(p))
  },
}

contextBridge.exposeInMainWorld('qqpet', api)
