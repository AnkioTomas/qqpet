import type { QQPetApi } from '../shared/ipc'

declare global {
  interface Window {
    qqpet: QQPetApi
    RufflePlayer: { newest(): { createPlayer(): RufflePlayerElement } }
    /** Called by pet action SWFs (Stand eyes follow the cursor). Values are "x,y,0" / "x,y,w,h". */
    API: { GetCursorPosition(): string; GetWindowRect(): string }
  }

  interface RuffleMetadata {
    width: number
    height: number
    frameRate: number
    numFrames: number
    isActionScript3: boolean
  }

  /** Subset of Ruffle's PlayerV1 API (ruffle.js 0.6) that we rely on. */
  interface RuffleApi {
    load(options: Record<string, unknown>): Promise<void>
    resume(): void
    suspend(): void
    readonly isPlaying: boolean
    readonly metadata: RuffleMetadata | null
  }

  interface RufflePlayerElement extends HTMLElement {
    ruffle(): RuffleApi
  }
}
