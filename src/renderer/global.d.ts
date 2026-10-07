import type { QQPetApi } from '../shared/ipc'

declare global {
  interface Window {
    qqpet: QQPetApi
    RufflePlayer: { newest(): { createPlayer(): RufflePlayerElement } }
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
    play(): void
    pause(): void
    readonly isPlaying: boolean
    readonly metadata: RuffleMetadata | null
  }

  interface RufflePlayerElement extends HTMLElement {
    ruffle(): RuffleApi
  }
}
