import type { SaveData, SavePatch, Sex } from './save'

export const IPC = {
  load: 'pet:load',
  save: 'pet:save',
  resetPet: 'pet:reset',
  exportSave: 'pet:export',
  importSave: 'pet:import',
  openGame: 'game:open',
  calendar: 'app:calendar',
  gamePlayed: 'game:played',
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
  clipboard: 'clipboard:text',
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

/** One local date from the calendar API. */
export interface CalendarDay {
  /** YYYY-MM-DD. */
  date: string
  /** Lunar month and day, e.g. 八月廿七. */
  lunar: string
  /** Solar term starting this day, e.g. 霜降. */
  term: string | null
  /** Statutory holiday; `off` false is a make-up working day. */
  holiday: { name: string; off: boolean } | null
}

/** Exposed to the renderer as `window.qqpet` by the preload script. */
export interface QQPetApi {
  load(): Promise<SaveData>
  /** Merges object groups field by field, replaces other keys, then persists. */
  save(patch: SavePatch): void
  /** Buries the pet and relaunches into egg selection, or straight into a newborn of `sex`. */
  resetPet(sex?: Sex): void
  /** Asks where to write the save; false when cancelled. */
  exportSave(): Promise<boolean>
  /** Asks for a save file (ours or the original's config.json), then relaunches with it. */
  importSave(): void
  /** Plays pet/game/<swf> in its own resizable window. */
  openGame(swf: string): void
  /** Today and the next 30 days from the calendar API; empty while offline. */
  calendar(): Promise<CalendarDay[]>
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
  /** New clipboard text, while the clip setting is on. */
  /** A game window closed after `minutes` of play. */
  onGamePlayed(listener: (minutes: number) => void): void
  onClipboard(listener: (text: string) => void): void
}
