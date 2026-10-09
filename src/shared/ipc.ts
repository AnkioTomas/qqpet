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
  aiModels: 'ai:models',
  aiChat: 'ai:chat',
  weather: 'app:weather',
  quit: 'app:quit',
  messageBox: 'app:message-box',
  copyText: 'app:copy-text',
  clipboard: 'clipboard:text',
  presence: 'app:presence',
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

/** Today's weather in wttr.in's codes and °C. */
export interface Weather {
  code: number
  max: number
  min: number
  tomorrowMax: number
  /** Today's 3-hourly forecast from the current slot on; `wind` in km/h. */
  hours: { hour: number; code: number; wind: number }[]
}

/** An OpenAI-compatible endpoint: `url` ends in /v1; `key` may be empty for local servers. */
export interface AiConfig {
  url: string
  key: string
  model: string
}

/** What the network modules need from fetch: Electron's net.fetch in the main process, a native bridge on Android. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
  /** Rejects with the server's error. */
  aiModels(c: Omit<AiConfig, 'model'>): Promise<string[]>
  /** The reply's text; rejects with the server's error. */
  aiChat(c: AiConfig, messages: AiMessage[]): Promise<string>
  /** An empty city locates by IP; rejects for an unknown city or while offline. */
  weather(city: string): Promise<Weather>
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
  /** A game window closed after `minutes` of play. */
  onGamePlayed(listener: (minutes: number) => void): void
  /** New clipboard text, while the clip setting is on. */
  onClipboard(listener: (text: string) => void): void
  /** The user left the machine (screen off / idle) or came back. */
  onPresence(listener: (away: boolean) => void): void
}
