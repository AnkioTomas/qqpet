// Save format of the original Arctic Penguin T800 (`petInfoData` in its
// config.json). Field names, including the misspelled `petComputedlInfo`, are
// kept verbatim so old saves load without translation.

export type Sex = 'GG' | 'MM'

export interface PetInfo {
  name: string
  host: string
  sex: Sex
  growth: number
  hunger: number
  clean: number
  /** 0 (dead) .. 5 (healthy) */
  health: number
  /** 0 .. 1000 */
  mood: number
  /** unix seconds */
  birthDay: number
  intel: number
  charm: number
  strong: number
  onLineTime: number
  lastX: number
  lastY: number
  /** 元宝 */
  yb: number
  lastLoginTime: number
  onlineDataTime: number
  pinkDiamond: boolean
  PDgrowth: number
  PDgrowthValue: number
  PDgrowthValue_next: number
  PDiamondLevel: number
  PDiamondBeginDate: number
  PDiamondExpirationDate: number
  sweetHeart: boolean
  sweetHeartOverTime: number
}

export interface PetComputedInfo {
  level: number
  upGrowth: number
  nextGrowth: number
  hungerMax: number
  cleanMax: number
  healthMax: number
  moodMax: number
}

export interface StudyInfo {
  chinese: number
  mathematics: number
  politics: number
  music: number
  art: number
  manner: number
  pe: number
  labouring: number
  wushu: number
}

/** In-progress activity per kind, or null when idle. Shape is owned by the renderer. */
export type ActiveOption = Record<'work' | 'study' | 'trip' | 'ill' | 'die', unknown>

/** Inventory entries are encoded as `_<goodsId>*<count>`. */
export type SelfGoodDatas = Record<
  'food' | 'clean' | 'medicine' | 'background' | 'toy' | 'nums' | 'service' | 'work' | 'study' | 'trip',
  string[]
>

/** Timed goods in effect (`selfGoodUseOption` in the original's localStorage). */
export type SelfGoodUseOption = Record<'background' | 'food' | 'clean' | 'toy', { id: string; left: number } | null>

export interface GameSaveDatas {
  fishing_harvestfish: number
  /** Provinces visited and how often. */
  travel_china: { name: string; value: number }[]
  travel_china_num: number
  ddw: number
  yyds: number
}

/** Menu and settings panel options (kept in the original's localStorage). */
export interface Settings {
  /** Pet, control bar and window opacity, 0..1. */
  opacity: number
  /** Face spots: 0 off, 1 on, 2 on and marked. */
  faceClick: 0 | 1 | 2
  /** Do-not-disturb: no speech bubbles. */
  quiet: boolean
  autoStart: boolean
  paused: boolean
  hidden: boolean
  /** High-resolution assets: @2x tray icons and SVG window frames. */
  hd: boolean
  /** The pet reads out text copied to the clipboard. */
  clip: boolean
  /** OpenAI-compatible endpoint; `aiModel` is set only once it passed the settings test, and AI is off while it is empty. */
  aiUrl: string
  aiKey: string
  aiModel: string
}

export interface SaveData {
  havePet: boolean
  isBury: boolean
  saveNum: number
  nowTimeLine: number
  petInfo: PetInfo
  petComputedlInfo: PetComputedInfo
  studyInfo: StudyInfo
  activeOption: ActiveOption
  selfGoodDatas: SelfGoodDatas
  /** Minutes left per timed good. */
  selfGoodUseOption: SelfGoodUseOption
  gameSaveDatas: GameSaveDatas
  illustrated: unknown[]
  /** Feature-owned JSON blobs (email, task, signin, fishs), stored as strings. */
  saveJsonData: Record<string, string>
  settings: Settings
}

/** Object-valued groups are merged field by field; everything else is replaced. */
export type SavePatch = {
  [K in keyof SaveData]?: SaveData[K] extends unknown[] ? SaveData[K] : SaveData[K] extends object ? Partial<SaveData[K]> : SaveData[K]
}
