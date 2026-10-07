const FONT = 'HappyZcool-2016'
// SWFs resolve relative URLs (configs, sub-movies) against the page, exactly
// like the original <embed> inside dist/index.html did.
const BASE = new URL('./', location.href).href

const CONFIG = {
  base: BASE,
  wmode: 'transparent',
  backgroundColor: null,
  autoplay: 'on',
  splashScreen: false,
  unmuteOverlay: 'hidden',
  contextMenu: 'off',
  letterbox: 'off',
  allowScriptAccess: true,
  // Ruffle ships no CJK glyphs; without this every Chinese text field is blank.
  fontSources: [BASE + 'pet/qqfont.ttf'],
  defaultFonts: { sans: [FONT], serif: [FONT], typewriter: [FONT] },
  logLevel: 'error',
}

/**
 * One Ruffle instance. Ruffle has no Flash scripting API (CurrentFrame,
 * TotalFrames, StopPlay...), so the playhead is derived from the SWF header
 * frame rate and the time since load. The pet state machine only uses it to
 * detect "animation reached its last frame", so the estimate clamps there
 * instead of looping.
 */
export class SwfPlayer {
  readonly el: RufflePlayerElement
  private meta: RuffleMetadata | null = null
  private startedAt = 0
  private stoppedAt: number | null = null

  constructor(parent: HTMLElement) {
    this.el = window.RufflePlayer.newest().createPlayer()
    this.el.style.width = '100%'
    this.el.style.height = '100%'
    parent.appendChild(this.el)
  }

  async load(url: string): Promise<RuffleMetadata> {
    this.meta = null
    const ready = new Promise<void>((resolve) => this.el.addEventListener('loadedmetadata', () => resolve(), { once: true }))
    await this.el.ruffle().load({ ...CONFIG, url: new URL(url, BASE).href })
    await ready
    this.meta = this.el.ruffle().metadata!
    this.startedAt = performance.now()
    this.stoppedAt = null
    return this.meta
  }

  /** 0-based, same convention as Flash's CurrentFrame(). */
  get currentFrame(): number {
    if (!this.meta) return 0
    const elapsed = (this.stoppedAt ?? performance.now()) - this.startedAt
    return Math.min(Math.floor((elapsed / 1000) * this.meta.frameRate), this.meta.numFrames - 1)
  }

  get totalFrames(): number {
    return this.meta?.numFrames ?? 0
  }

  get isPlaying(): boolean {
    return this.stoppedAt === null && this.el.ruffle().isPlaying
  }

  stop(): void {
    this.el.ruffle().pause()
    this.stoppedAt ??= performance.now()
  }

  destroy(): void {
    this.el.remove()
  }
}
