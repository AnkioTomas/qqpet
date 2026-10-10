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
  private callbacks = new Set<string>()

  /** The SWF's ExternalInterface calls go to the globals of the window that owns `parent`. */
  constructor(parent: HTMLElement) {
    this.el = parent.ownerDocument.defaultView!.RufflePlayer.newest().createPlayer()
    this.el.style.width = '100%'
    this.el.style.height = '100%'
    parent.appendChild(this.el)
    // Ruffle types into text fields from a hidden <input> it empties on every input event, which breaks IME
    // composition (Chinese). Keep the composing keystrokes from it and hand it the committed text at once.
    const keyboard = this.el.shadowRoot!.getElementById('virtual-keyboard')!
    const composing = (e: Event): void => {
      if ((e as InputEvent).isComposing) e.stopImmediatePropagation()
    }
    for (const type of ['input', 'keydown', 'keyup']) keyboard.addEventListener(type, composing, true)
    keyboard.addEventListener('compositionend', () => keyboard.dispatchEvent(new Event('input')))
  }

  /** `base` (relative to the page) resolves the SWF's own relative URLs; `options` override Ruffle's config. */
  async load(url: string, base = BASE, options: Record<string, unknown> = {}): Promise<RuffleMetadata> {
    this.meta = null
    // The mobile overlay window learns per movie which part of the box it draws.
    this.el.dataset.swf = url
    // Ruffle leaves the previous movie's callbacks on the element; calling one before the new movie registers it does nothing.
    for (const name of this.callbacks) delete (this.el as unknown as Record<string, unknown>)[name]
    this.callbacks.clear()
    const ready = new Promise<void>((resolve) => this.el.addEventListener('loadedmetadata', () => resolve(), { once: true }))
    await this.el.ruffle().load({ ...CONFIG, ...options, base: new URL(base, BASE).href, url: new URL(url, BASE).href })
    await ready
    this.meta = this.el.ruffle().metadata!
    this.startedAt = performance.now()
    this.stoppedAt = null
    return this.meta
  }

  /** 0-based, same convention as Flash's CurrentFrame(). -1 (== totalFrames - 1) before the first load. */
  get currentFrame(): number {
    if (!this.meta) return -1
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
    this.el.ruffle().suspend()
    this.stoppedAt ??= performance.now()
  }

  /**
   * Resolves with a function the SWF registered via ExternalInterface.addCallback.
   * SWFs register from their first frame script, some time after load() resolves.
   */
  async callback(name: string): Promise<(...args: unknown[]) => unknown> {
    const host = this.el as unknown as Record<string, unknown>
    while (typeof host[name] !== 'function') await new Promise((r) => setTimeout(r, 50))
    this.callbacks.add(name)
    return (host[name] as (...args: unknown[]) => unknown).bind(this.el)
  }

  destroy(): void {
    this.el.remove()
  }
}
