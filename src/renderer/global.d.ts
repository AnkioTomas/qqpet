import type { QQPetApi } from '../shared/ipc'

declare global {
  interface Window {
    qqpet: QQPetApi
    RufflePlayer: { newest(): { createPlayer(): RufflePlayerElement } }
    /** Called by pet action SWFs (Stand eyes follow the cursor). Values are "x,y,0" / "x,y,w,h". The community reads its ini through it. */
    API: { GetCursorPosition(): string; GetWindowRect(): string; GetPrivateProfileString(section: string, key: string, fallback: string, file: string): string }
    /** Called by talk.swf when a bubble button is clicked. */
    BubbleAPI: { OnButtonClick(i: number): void }
    /** Called by reset/Adopt.swf: 0 GG, 1 MM. */
    ChooseAPI: { ChooseSex(n: number): void }
    /** Called by fishing/main.swf: requests as `{head, data}` JSON, the pet's profile, and its close button (1). */
    PETSendData(json: string): void
    /** Official pond pay gate; returning true skips the Flash confirm. */
    before_pay?(...args: unknown[]): boolean
    SNS_GetSelfPetInfo(): Record<string, unknown>
    close_game(n: number): void
    /** Called by mstx/main_qq_mstx.swf's close button. */
    closeFrame(): void
    /** PetSoc world_1051.swf ↔ host. Missing names are logged stubs. */
    PSW: Record<string, (...args: unknown[]) => unknown>
    PET: Record<string, (...args: unknown[]) => unknown>
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
    addFSCommandHandler(handler: (command: string, args: string) => void): void
    callExternalInterface(name: string, ...args: unknown[]): unknown
    readonly isPlaying: boolean
    readonly metadata: RuffleMetadata | null
  }

  interface RufflePlayerElement extends HTMLElement {
    ruffle(): RuffleApi
  }
}
