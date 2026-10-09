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
  exportSave: () => ipcRenderer.invoke(IPC.exportSave),
  importSave: () => ipcRenderer.invoke(IPC.importSave),
  openGame: send(IPC.openGame),
  calendar: () => ipcRenderer.invoke(IPC.calendar),
  aiModels: (c) => ipcRenderer.invoke(IPC.aiModels, c),
  aiChat: (c, messages) => ipcRenderer.invoke(IPC.aiChat, c, messages),
  weather: (city) => ipcRenderer.invoke(IPC.weather, city),
  latestRelease: () => ipcRenderer.invoke(IPC.latestRelease),
  quit: send(IPC.quit),
  copyText: send(IPC.copyText),
  openUrl: send(IPC.openUrl),
  setClickThrough: send(IPC.setClickThrough),
  setAlwaysOnTop: send(IPC.setAlwaysOnTop),
  setFocusable: send(IPC.setFocusable),
  setAutoStart: send(IPC.setAutoStart),
  setTrayState: send(IPC.setTrayState),
  onCursor: (listener) => ipcRenderer.on(IPC.cursor, (_e, p) => listener(p)),
  onTrayClick: (listener) => ipcRenderer.on(IPC.trayClick, (_e, c) => listener(c)),
  onGamePlayed: (listener) => ipcRenderer.on(IPC.gamePlayed, (_e, m) => listener(m)),
  onClipboard: (listener) => ipcRenderer.on(IPC.clipboard, (_e, text) => listener(text)),
  onPresence: (listener) => ipcRenderer.on(IPC.presence, (_e, away) => listener(away)),
  onFront: (listener) => ipcRenderer.on(IPC.front, (_e, name) => listener(name)),
}

contextBridge.exposeInMainWorld('qqpet', api)
