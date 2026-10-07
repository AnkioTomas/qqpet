export const IPC = {
  setClickThrough: 'pet:set-click-through',
  cursor: 'pet:cursor',
} as const

export interface Point {
  x: number
  y: number
}

/** Exposed to the renderer as `window.qqpet` by the preload script. */
export interface QQPetApi {
  setClickThrough(enabled: boolean): void
  /** Cursor position in window coordinates, pushed ~30 times per second. */
  onCursor(listener: (p: Point) => void): void
}
