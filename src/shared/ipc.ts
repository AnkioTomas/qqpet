import type { ShapeRect } from './hit-shape'
import type { LanPeer } from './lan'
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
  latestRelease: 'app:latest-release',
  packInfo: 'pack:info',
  importPack: 'pack:import',
  resetPacks: 'pack:reset',
  findPack: 'pack:find',
  downloadPack: 'pack:download',
  findFullPack: 'pack:find-full',
  packProgress: 'pack:progress',
  relaunch: 'app:relaunch',
  quit: 'app:quit',
  copyText: 'app:copy-text',
  openUrl: 'app:open-url',
  clipboard: 'clipboard:text',
  presence: 'app:presence',
  front: 'app:front',
  setClickThrough: 'win:set-click-through',
  setHitShape: 'win:set-hit-shape',
  setAlwaysOnTop: 'win:set-always-on-top',
  setFocusable: 'win:set-focusable',
  setAutoStart: 'app:set-auto-start',
  setTrayState: 'tray:set-state',
  cursor: 'win:cursor',
  setDragging: 'win:set-dragging',
  trayClick: 'tray:click',
  trayMenu: 'tray:menu',
  trayMenuAction: 'tray:menu-action',
  lanOnline: 'lan:online',
  lanOffline: 'lan:offline',
  lanMessage: 'lan:message',
  lanSend: 'lan:send',
  lanPeers: 'lan:peers',
  voiceStart: 'voice:start',
  voiceStop: 'voice:stop',
  voiceText: 'voice:text',
  voiceError: 'voice:error',
  voiceAudio: 'voice:audio',
  voicePart: 'voice:part',
  voicePartial: 'voice:partial',
} as const

export interface Point {
  x: number
  y: number
}

export interface DesktopCursor extends Point {
  /** Desktop only. Offset is relative to the window origin at launch; all lengths are Electron DIP divided by zoom. */
  desktop?: { id: number; width: number; height: number; offset: Point; zoom: number; sequence: number }
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
  /** Windows tray left click: the status panel closes by itself unless the cursor stays on it (#41). */
  autoClose?: boolean
}

/** Data only; menu actions stay in the renderer. */
export interface TrayMenuItem {
  label: string
  action?: number
  children?: TrayMenuItem[]
  checked?: boolean
  toolTip?: string
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

/** The newest GitHub release; `version` without the leading v, `url` its download page. */
export interface Release {
  version: string
  url: string
}

/** An OpenAI-compatible endpoint: `url` ends in /v1; `key` may be empty for local servers. */
export interface AiConfig {
  url: string
  key: string
  model: string
}

/** What the network modules need from fetch: Electron's net.fetch in the main process, a native bridge on Android. */
/** A content pack of the latest release that applies on the installed content (#28); incremental ones name their base. */
export interface PackOffer {
  version: string
  base?: string
  size: number
}

/** Bytes of a pack download so far. */
export interface PackProgress {
  received: number
  total: number
}

/** Desktop content packs (#28); absent on mobile shells, which keep their bundled content. */
export interface PackApi {
  /** Installed content version and the shell's own; `bundled` is false for a lite installer, whose content is all packs. */
  info(): Promise<{ content: string; shell: string; bundled: boolean }>
  /** Picks and installs a .qqpetpack; the new content version, null when cancelled. Rejects with why it was refused. */
  importPack(): Promise<string | null>
  /** Removes every installed pack, back to the bundled content. */
  reset(): Promise<void>
  /** Rejects while offline. */
  find(): Promise<PackOffer | null>
  /** The newest full pack of the latest release, for a lite installer's first run; rejects with why there is none. */
  findFull(mirror?: string): Promise<PackOffer>
  /** Downloads and installs the pack find() or findFull() offered, through `mirror` (a URL prefix) if given; the new content version. */
  download(mirror?: string): Promise<string>
  /** Download progress of the pack being installed. */
  onProgress(listener: (p: PackProgress) => void): void
  relaunch(): void
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Supplied by native device APIs, independently from viewport dimensions. */
export type DeviceKind = 'phone' | 'tablet' | 'other'

/** Exposed to the renderer as `window.qqpet` by the preload script. */
export interface QQPetApi {
  /** Optional native device idiom; absent preserves the existing platform layout. */
  deviceKind?: DeviceKind
  /** Optional platform constraints; omitted means the established platform behavior is available. */
  capabilities?: {
    /** This host adapts to screen rotation; omitted means windows always follow the screen. */
    rotatableScreen?: boolean
    autoStart?: boolean; autoStartReason?: string
    clipboardWatch?: boolean; clipboardWatchReason?: string
    frontWatch?: boolean; frontWatchReason?: string
  }
  load(): Promise<SaveData>
  /** Merges object groups field by field, replaces other keys, then persists. */
  save(patch: SavePatch): void
  /** Resolves after previously submitted saves reach persistent storage. */
  flush?(): Promise<void>
  /** Buries the pet and relaunches into egg selection, or straight into a newborn of `sex`. */
  resetPet(sex?: Sex): void
  /** Asks where to write the save; false when cancelled. */
  exportSave(): Promise<boolean>
  /** Asks for a save file (ours or the original's config.json), then relaunches with it. Rejects when the file is not a save. */
  importSave(): Promise<void>
  /** Plays pet/game/<swf> in its own resizable window. */
  openGame(swf: string): void
  /** Native game-page exit; ordinary browser/Electron pages can keep window.close(). */
  closeGame?(): void
  /** Today and the next 30 days from the calendar API; empty while offline. */
  calendar(): Promise<CalendarDay[]>
  /** Rejects with the server's error. */
  aiModels(c: Omit<AiConfig, 'model'>): Promise<string[]>
  /** The reply's text; rejects with the server's error. */
  aiChat(c: AiConfig, messages: AiMessage[]): Promise<string>
  /** An empty city locates by IP; rejects for an unknown city or while offline. */
  weather(city: string): Promise<Weather>
  /** Rejects while offline. */
  latestRelease(): Promise<Release>
  packs?: PackApi
  quit(): void
  copyText(text: string): void
  /** Opens a web page in the system browser. */
  openUrl(url: string): void
  setClickThrough(enabled: boolean): void
  /**
   * Linux only: the page rectangles (CSS px) that take the mouse; the rest of the window lets it through.
   * A click-through window there never learns where the cursor is (#45), so hit testing cannot wait for it.
   */
  setHitShape?(rects: ShapeRect[]): void
  setAlwaysOnTop(enabled: boolean): void
  setFocusable(enabled: boolean): void
  setAutoStart(enabled: boolean): void
  setTrayState(state: TrayState): void
  /** Native tray popup on macOS; other hosts use the pet's HTML menu. */
  popupTrayMenu?(items: TrayMenuItem[]): void
  onTrayMenuAction?(listener: (action: number) => void): void
  /** Desktop drag follows the native cursor across displays; absent in mobile bridges. */
  setDragging?(enabled: boolean): Promise<DesktopCursor>
  /** Cursor position in window coordinates, pushed ~30 times per second. */
  onCursor(listener: (p: DesktopCursor) => void): void
  onTrayClick(listener: (e: TrayClick) => void): void
  /** A game window closed after `minutes` of play. */
  onGamePlayed(listener: (minutes: number) => void): void
  /** New clipboard text, while the clip setting is on. */
  onClipboard(listener: (text: string) => void): void
  /** The user left the machine (screen off / idle) or came back. */
  onPresence(listener: (away: boolean) => void): void
  /** Frontmost app, as a short label or the process name. Desktop only; never fires on the phone. */
  onFront(listener: (name: string) => void): void
  /** A pet appeared on the friend LAN. Absent on bridges without networking. */
  onLanOnline?(listener: (peer: LanPeer) => void): void
  /** A pet left the friend LAN (goodbye or missed heartbeats). */
  onLanOffline?(listener: (peer: LanPeer) => void): void
  /** A message body from a linked pet (visits and deliveries ride on this). */
  onLanMessage?(listener: (fromId: string, body: unknown) => void): void
  /** Sends to one pet; a `visit` to an offline pet is queued and returns 'queued'. */
  lanSend?(toId: string, body: unknown): Promise<'sent' | 'queued'>
  /** Peers already online; events fired before the renderer loaded are missed otherwise. */
  lanPeers?(): Promise<LanPeer[]>
  /** Push one recorded utterance (16 kHz mono, -1..1) for transcription. */
  voiceAudio?(samples: Float32Array): void
  /** The talk key went down: start recording. */
  onVoiceStart?(listener: () => void): void
  /** The talk key came up: stop and send what was recorded. */
  onVoiceStop?(listener: () => void): void
  /** Transcript of the last utterance; '' means nothing was heard. */
  onVoiceText?(listener: (text: string) => void): void
  onVoiceError?(listener: (message: string) => void): void
  /** Audio so far, for the live transcript shown while the key is held. */
  voicePart?(samples: Float32Array): void
  /** What has been heard so far; keeps changing until the final transcript. */
  onVoicePartial?(listener: (text: string) => void): void
}
