import type { SaveData, SavePatch } from './save'

export const IPC = {
  load: 'pet:load',
  save: 'pet:save',
  resetPet: 'pet:reset',
  exportSave: 'pet:export',
  importSave: 'pet:import',
  quit: 'app:quit',
  messageBox: 'app:message-box',
  copyText: 'app:copy-text',
  setClickThrough: 'win:set-click-through',
  setAlwaysOnTop: 'win:set-always-on-top',
  setFocusable: 'win:set-focusable',
  setAutoStart: 'app:set-auto-start',
  setTrayState: 'tray:set-state',
  cursor: 'win:cursor',
  trayClick: 'tray:click',
} as const

export interface Point {
  x: number
  y: number
}

export type TrayState =
  | 'normal'
  | 'leave'
  | 'dirty'
  | 'event'
  | 'feast'
  | 'game'
  | 'hungry'
  | 'ill'
  | 'pause'
  | 'study'
  | 'travel'
  | 'work'
  | 'dead'
  | 'bury'

/** `state` opens the pet status panel, `menu` the pet's context menu. Window coordinates (the tray may lie outside it), absent on Linux. */
export interface TrayClick {
  kind: 'state' | 'menu'
  x?: number
  y?: number
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  buttons?: string[]
}

/** Exposed to the renderer as `window.qqpet` by the preload script. */
export interface QQPetApi {
  load(): Promise<SaveData>
  /** Merges object groups field by field, replaces other keys, then persists. */
  save(patch: SavePatch): void
  /** Buries the pet and relaunches into egg selection. */
  resetPet(): void
  /** Asks where to write the save; false when cancelled. */
  exportSave(): Promise<boolean>
  /** Asks for a save file (ours or the original's config.json), then relaunches with it. */
  importSave(): void
  quit(): void
  /** Resolves to the index of the clicked button. */
  messageBox(options: MessageBoxOptions): Promise<number>
  copyText(text: string): void
  setClickThrough(enabled: boolean): void
  setAlwaysOnTop(enabled: boolean): void
  setFocusable(enabled: boolean): void
  setAutoStart(enabled: boolean): void
  setTrayState(state: TrayState): void
  /** Cursor position in window coordinates, pushed ~30 times per second. */
  onCursor(listener: (p: Point) => void): void
  onTrayClick(listener: (e: TrayClick) => void): void
}
