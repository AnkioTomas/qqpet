import { isFatalRufflePanic, readPlayerPanic } from '../../shared/ruffle-panic'

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

interface GlobalListener {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  capture: boolean
  remove: EventTarget['removeEventListener']
}
let constructingListeners: GlobalListener[] | null = null

/** Ruffle 0.6's constructor leaves document listeners behind when its element disconnects. */
function createRuffleElement(parent: HTMLElement): { el: RufflePlayerElement; cleanup: () => void } {
  const document = parent.ownerDocument
  const listeners: GlobalListener[] = []
  const restore: (() => void)[] = []
  const previous = constructingListeners
  const cleanup = (): void => {
    for (const entry of listeners.splice(0)) entry.remove.call(entry.target, entry.type, entry.listener, entry.capture)
  }
  let el: RufflePlayerElement | undefined
  constructingListeners = listeners
  try {
    for (const target of new Set<EventTarget | null>([document, document.documentElement, document.defaultView])) {
      if (!target || typeof target.addEventListener !== 'function') continue
      const descriptor = Object.getOwnPropertyDescriptor(target, 'addEventListener')
      const add = target.addEventListener
      const remove = target.removeEventListener
      const wrapped: EventTarget['addEventListener'] = function (this: EventTarget, type, listener, options) {
        add.call(this, type, listener, options)
        if (this === target && listener && constructingListeners === listeners)
          listeners.push({ target, type, listener, capture: typeof options === 'boolean' ? options : Boolean(options?.capture), remove })
      }
      Object.defineProperty(target, 'addEventListener', { configurable: true, writable: true, value: wrapped })
      restore.push(() => {
        if (descriptor) Object.defineProperty(target, 'addEventListener', descriptor)
        else Reflect.deleteProperty(target, 'addEventListener')
      })
    }
    el = document.defaultView!.RufflePlayer.newest().createPlayer()
    el.style.width = '100%'
    el.style.height = '100%'
    parent.appendChild(el)
    safari14Styles(el)
    return { el, cleanup }
  } catch (error) {
    cleanup()
    el?.remove()
    throw error
  } finally {
    for (const undo of restore.reverse()) undo()
    constructingListeners = previous
  }
}

const players = new Set<SwfPlayer>()
const LOAD_MS = 30_000
const CALLBACK_MS = 10_000
const RECOVERY_WINDOW_MS = 30_000
const RECOVERY_LIMIT = 3
let hostPaused = Boolean(window.__qqpetHostPaused)

export interface SwfFailure {
  url: string
  message: string
  terminal?: 'context-recovery-failed' | 'context-recovery-exhausted'
}

/** Display lifecycle is independent from the user's paused-growth setting. */
export function setHostPaused(paused: boolean): void {
  hostPaused = paused
  window.__qqpetHostPaused = paused
  if (paused) window.__qqpetInput?.({ phase: 'cancel', id: -1, x: 0, y: 0 })
  for (const player of players) player.pauseForHost(paused)
}
window.__qqpetSetPaused = setHostPaused

// Panels usually remove their DOM directly. Dispose players, including those inside removed iframes.
const removed = new MutationObserver(() => {
  for (const player of players) {
    const frame = player.el.ownerDocument.defaultView?.frameElement
    if (!player.el.isConnected || (frame && !frame.isConnected)) player.destroy()
  }
})
removed.observe(document.documentElement, { childList: true, subtree: true })

function safari14Styles(el: HTMLElement): void {
  const shadow = el.shadowRoot
  if (!shadow || shadow.getElementById('qqpet-safari14')) return
  const style = el.ownerDocument.createElement('style')
  style.id = 'qqpet-safari14'
  style.textContent = '#container,#message-overlay,#panic,#panic-details-modal,#play-button,#splash-screen,#unmute-overlay,#unmute-overlay .background{top:0;right:0;bottom:0;left:0}'
  shadow.appendChild(style)
}

const releasedCanvases = new WeakSet<HTMLCanvasElement>()
/** Ruffle rebuilds its renderer on load; retired WebGL contexts otherwise wait for GC. */
function releaseRetiredCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  // The front and the hidden back player still need their live contexts, even when suspended.
  if (!canvas || canvas.isConnected || releasedCanvases.has(canvas)) return
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return // Canvas2D and WebGPU renderers own different context types.
    releasedCanvases.add(canvas)
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* A disposed canvas may already have lost its context. */ }
}

/** Ruffle removes its canvas synchronously on disconnect, before outer DOM observers run. */
function releaseRemovedCanvases(records: MutationRecord[] = []): void {
  for (const record of records) {
    for (const node of record.removedNodes) {
      if (node.nodeType !== 1) continue
      const element = node as Element
      if (element.tagName === 'CANVAS') releaseRetiredCanvas(element as HTMLCanvasElement)
      for (const canvas of element.querySelectorAll<HTMLCanvasElement>('canvas')) releaseRetiredCanvas(canvas)
    }
  }
}

/** A detached generation can finish building after its original DOM disconnect. */
function disposeDetached(el: RufflePlayerElement): void {
  const canvas = el.shadowRoot?.querySelector<HTMLCanvasElement>('#container > canvas')
  try {
    el.volume = 0
    el.ruffle().suspend()
    // Pinned Ruffle 0.6 releases its Rust instance in this custom-element lifecycle method.
    const disconnected = (el as RufflePlayerElement & { disconnectedCallback?: () => void }).disconnectedCallback
    disconnected?.call(el)
  } catch { /* A removed or partially built instance may already have been released. */ }
  finally { releaseRetiredCanvas(canvas) }
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
  private muted = false
  private volume = 1
  private destroyed = false
  private revision = 0
  private loading = false
  private pausedAt: number | null = null
  private pending = new Set<(error: Error) => void>()
  private globalCleanup = (): void => {}
  private keyboardCleanup = (): void => {}
  private panicObserver: MutationObserver | null = null
  private reportedPanic = false
  private canvas: HTMLCanvasElement | null = null
  private readonly recoverContext: boolean
  private contextCleanup = (): void => {}
  private lastLoad: { url: string; base: string; options: Record<string, unknown> } | null = null
  private callbackArgs = new Map<string, unknown[]>()
  private movie = 0
  private recovering = false
  private recovery = 0
  private recoveryTimes: number[] = []
  private resumeWaiters = new Set<() => void>()

  /** The SWF's ExternalInterface calls go to the globals of the window that owns `parent`. */
  constructor(parent: HTMLElement, { recoverContext = false }: { recoverContext?: boolean } = {}) {
    this.recoverContext = recoverContext
    const created = createRuffleElement(parent)
    this.el = created.el
    this.globalCleanup = created.cleanup
    try {
      players.add(this)
      if (this.el.shadowRoot) {
        if (recoverContext) {
          const root = this.el.shadowRoot
          const lost = (event: Event): void => this.contextLost(event)
          // Capture before Ruffle's target listener, which leaves small instance
          // counts running on a lost context. suspend() alone still renders.
          root.addEventListener('webglcontextlost', lost, true)
          this.contextCleanup = () => root.removeEventListener('webglcontextlost', lost, true)
        }
        this.panicObserver = new MutationObserver((records) => {
          this.publishPanic()
          releaseRemovedCanvases(records)
        })
        this.panicObserver.observe(this.el.shadowRoot, { childList: true, subtree: true, characterData: true })
      }
      // Ruffle types into text fields from a hidden <input> it empties on every input event, which breaks IME
      // composition (Chinese). Keep the composing keystrokes from it and hand it the committed text at once.
      const keyboard = this.el.shadowRoot?.getElementById('virtual-keyboard')
      const composing = (e: Event): void => {
        if ((e as InputEvent).isComposing) e.stopImmediatePropagation()
      }
      if (keyboard) {
        const committed = (): void => { keyboard.dispatchEvent(new Event('input')) }
        for (const type of ['input', 'keydown', 'keyup']) keyboard.addEventListener(type, composing, true)
        keyboard.addEventListener('compositionend', committed)
        this.keyboardCleanup = () => {
          for (const type of ['input', 'keydown', 'keyup']) keyboard.removeEventListener(type, composing, true)
          keyboard.removeEventListener('compositionend', committed)
        }
      }
    } catch (error) {
      this.destroy()
      throw error
    }
  }

  private cancelPending(message: string): void {
    for (const cancel of [...this.pending]) cancel(new Error(message))
  }

  private failMovie(url: string, error: unknown, terminal?: SwfFailure['terminal']): void {
    if (this.destroyed) return
    const message = error instanceof Error ? error.message : String(error)
    this.cancelPending(message)
    this.destroy()
    window.dispatchEvent(new CustomEvent<SwfFailure>('qqpet-swf-error', { detail: { url, message, ...(terminal ? { terminal } : {}) } }))
  }

  private contextLost(event: Event): void {
    const canvas = event.target as HTMLCanvasElement | null
    const frame = this.el.ownerDocument.defaultView?.frameElement
    if (this.destroyed || !this.el.isConnected || (frame && !frame.isConnected) || !canvas?.isConnected ||
      canvas !== this.el.shadowRoot?.querySelector('#container > canvas')) return
    if (this.loading) {
      // An incomplete builder cannot be reused or recovered. Removing the
      // element synchronously destroys its Rust instance and cancels the load.
      this.failMovie(this.el.dataset.swf ?? '', new Error('WebGL context was lost while loading'), this.recovering ? 'context-recovery-failed' : undefined)
      return
    }
    if (!this.meta || !this.lastLoad || canvas !== this.canvas) return
    const now = performance.now()
    this.recoveryTimes = this.recoveryTimes.filter(at => now - at < RECOVERY_WINDOW_MS)
    if (this.recoveryTimes.length >= RECOVERY_LIMIT) {
      this.failMovie(this.lastLoad.url, new Error('WebGL context recovery limit exceeded'), 'context-recovery-exhausted')
      return
    }
    this.recoveryTimes.push(now)
    const recovery = ++this.recovery
    this.recovering = true
    // This async function reaches ruffle().load() before its first await. Its
    // pinned implementation destroys the old Rust instance synchronously.
    void this.restoreMovie(this.lastLoad, recovery)
  }

  private async waitForResume(): Promise<void> {
    if (!hostPaused) return
    await new Promise<void>((resolve, reject) => {
      const finish = (): void => { this.pending.delete(cancel); this.resumeWaiters.delete(resume) }
      const resume = (): void => { finish(); resolve() }
      const cancel = (error: Error): void => { finish(); reject(error) }
      this.pending.add(cancel)
      this.resumeWaiters.add(resume)
    })
  }

  private async restoreMovie(request: NonNullable<SwfPlayer['lastLoad']>, recovery: number): Promise<void> {
    const current = (): boolean => !this.destroyed && this.recovery === recovery
    try {
      await this.loadMovie(request.url, request.base, request.options, true)
      const replayed = new Map<string, unknown[]>()
      while (current()) {
        const next = [...this.callbackArgs].find(([name, args]) => replayed.get(name) !== args)
        if (!next) break
        const [name] = next
        const host = this.el as unknown as Record<string, unknown>
        const ready = await this.waitFor(() => {
          if (typeof host[name] === 'function') return host[name] as (...args: unknown[]) => unknown
          return hostPaused ? 'paused' : null
        }, `SWF callback ${name}`, CALLBACK_MS)
        if (!current()) return
        if (ready === 'paused') { await this.waitForResume(); continue }
        const args = this.callbackArgs.get(name)
        if (!args) continue
        this.callbacks.add(name)
        ready.apply(this.el, args)
        replayed.set(name, args)
      }
      if (!current()) return
      this.recovering = false
      if (this.stoppedAt !== null) this.el.ruffle().suspend()
      this.pauseForHost(hostPaused)
    } catch (error) {
      if (current()) this.failMovie(request.url, error, 'context-recovery-failed')
    } finally {
      if (this.recovery === recovery) this.recovering = false
    }
  }

  private publishPanic(): void {
    if (this.destroyed || this.reportedPanic) return
    const panic = readPlayerPanic(this.el)
    if (!panic) return
    this.reportedPanic = true
    // Publish while its shadow DOM still exists. This also covers players in
    // SWF iframes created by this module, whose events belong to this host page.
    window.dispatchEvent(new CustomEvent('qqpet-ruffle-panic', { detail: { ...panic, fatal: isFatalRufflePanic(panic) } }))
  }

  private bounded<T>(operation: Promise<T>, label: string, milliseconds: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const finish = (): void => { clearTimeout(timer); this.pending.delete(cancel) }
      const cancel = (error: Error): void => { finish(); reject(error) }
      const timer = setTimeout(() => cancel(new Error(`${label} timed out`)), milliseconds)
      this.pending.add(cancel)
      operation.then((value) => { finish(); resolve(value) }, cancel)
      if (this.destroyed) cancel(new Error('SWF player was destroyed'))
    })
  }

  private waitFor<T>(read: () => T | null | undefined, label: string, milliseconds: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const deadline = performance.now() + milliseconds
      let timer: ReturnType<typeof setTimeout> | undefined
      const finish = (): void => { clearTimeout(timer); this.pending.delete(cancel) }
      const cancel = (error: Error): void => { finish(); reject(error) }
      const poll = (): void => {
        try {
          const value = read()
          if (value != null) { finish(); resolve(value); return }
          if (performance.now() >= deadline) return cancel(new Error(`${label} timed out`))
          timer = setTimeout(poll, 50)
        } catch (error) { cancel(error instanceof Error ? error : new Error(String(error))) }
      }
      this.pending.add(cancel)
      poll()
    })
  }

  /**
   * Mutes or unmutes the movie's audio. Ruffle seeds every new player instance from its own
   * element-wide volume, which is not reachable from here, so load() re-applies this after
   * each load — setting it once would be undone by the next one.
   */
  setMuted(muted: boolean): void {
    this.muted = muted
    this.el.volume = muted ? 0 : this.volume
  }

  /** Master volume for all sounds in this movie, retained across loads. */
  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    this.el.volume = this.muted ? 0 : this.volume
  }

  /** `base` (relative to the page) resolves the SWF's own relative URLs; `options` override Ruffle's config. */
  async load(url: string, base = BASE, options: Record<string, unknown> = {}): Promise<RuffleMetadata> {
    ++this.recovery
    this.recovering = false
    ++this.movie
    this.lastLoad = null
    this.callbackArgs.clear()
    return this.loadMovie(url, base, options)
  }

  private async loadMovie(url: string, base: string, options: Record<string, unknown>, recovering = false): Promise<RuffleMetadata> {
    if (this.destroyed) throw new Error('SWF player was destroyed')
    // Ruffle does not cancel its async WASM/font builder. Never reuse an in-flight element.
    if (this.loading) {
      this.destroy()
      throw new Error('SWF player had an unfinished load; a new player is required')
    }
    // Some hosts request a callback before the first load (the pond); retain those initial waits.
    if (this.revision) this.cancelPending('SWF movie was replaced')
    const revision = ++this.revision
    this.meta = null
    // The mobile overlay window learns per movie which part of the box it draws.
    this.el.dataset.swf = url
    // Ruffle leaves the previous movie's callbacks on the element; calling one before the new movie registers it does nothing.
    for (const name of this.callbacks) delete (this.el as unknown as Record<string, unknown>)[name]
    this.callbacks.clear()
    this.loading = true
    const previousCanvas = this.el.shadowRoot?.querySelector<HTMLCanvasElement>('#container > canvas')
    try {
      const operation = this.el.ruffle().load({
        ...CONFIG,
        ...(this.recoverContext && window.__qqpetNativePetInput === true ? { preferredRenderer: 'webgl' } : {}),
        ...options, base: new URL(base, BASE).href, url: new URL(url, BASE).href,
      }).finally(() => {
        releaseRetiredCanvas(previousCanvas)
        if (this.destroyed || revision !== this.revision) disposeDetached(this.el)
      })
      // Pinned Ruffle destroys the old instance before its first asynchronous build step.
      // Free it before allocating the next renderer, rather than accumulating GPU contexts.
      releaseRetiredCanvas(previousCanvas)
      await this.bounded(operation, 'SWF load', LOAD_MS)
      if (this.destroyed || revision !== this.revision) throw new Error('SWF load was cancelled')
      // The rebuilt instance is live and already at Ruffle's own volume; restore ours before the
      // movie's one-shot audio (the edge-peek 嘿嘿嘿) can be heard.
      this.el.volume = this.muted ? 0 : this.volume
      const metadata = await this.waitFor(() => this.el.ruffle().metadata, 'SWF metadata', LOAD_MS)
      if (this.destroyed || revision !== this.revision) throw new Error('SWF load was cancelled')
      this.meta = metadata
      this.canvas = this.el.shadowRoot?.querySelector<HTMLCanvasElement>('#container > canvas') ?? null
      this.startedAt = performance.now()
      this.stoppedAt = recovering && this.stoppedAt !== null ? this.startedAt : null
      this.pausedAt = null
      if (this.recoverContext) this.lastLoad = { url, base, options: { ...options } }
      this.pauseForHost(hostPaused)
      return this.meta
    } catch (error) {
      // Removing the failed generation isolates every late fetch/build from future players.
      const cancelled = this.destroyed
      this.destroy()
      if (!cancelled) {
        const message = error instanceof Error ? error.message : String(error)
        // loadMovie owns this failure before destroy invalidates the outer
        // recovery token. A cancelled generation must never report it twice.
        window.dispatchEvent(new CustomEvent<SwfFailure>('qqpet-swf-error', { detail: { url, message, ...(recovering ? { terminal: 'context-recovery-failed' as const } : {}) } }))
      }
      throw error
    } finally {
      this.loading = false
    }
  }

  /** 0-based, same convention as Flash's CurrentFrame(). -1 (== totalFrames - 1) before the first load. */
  get currentFrame(): number {
    if (!this.meta) return -1
    const elapsed = (this.stoppedAt ?? this.pausedAt ?? performance.now()) - this.startedAt
    return Math.min(Math.floor((elapsed / 1000) * this.meta.frameRate), this.meta.numFrames - 1)
  }

  get totalFrames(): number {
    return this.meta?.numFrames ?? 0
  }

  get isPlaying(): boolean {
    return !this.recovering && !hostPaused && this.stoppedAt === null && this.el.ruffle().isPlaying
  }

  get isRecovering(): boolean {
    return this.recovering
  }

  stop(): void {
    // Recovery may still need the first frame to register its callbacks.
    if (!this.recovering) this.el.ruffle().suspend()
    this.stoppedAt ??= this.pausedAt ?? performance.now()
  }

  pauseForHost(paused: boolean): void {
    if (this.destroyed || !this.meta) return
    const now = performance.now()
    if (paused) {
      this.pausedAt ??= now
      this.el.ruffle().suspend()
    } else {
      if (this.pausedAt !== null) {
        const elapsed = now - this.pausedAt
        this.startedAt += elapsed
        if (this.stoppedAt !== null) this.stoppedAt += elapsed
        this.pausedAt = null
      }
      if (this.stoppedAt === null || this.recovering) this.el.ruffle().resume()
      for (const resume of [...this.resumeWaiters]) resume()
    }
  }

  async nextPaint(): Promise<void> {
    const view = this.el.ownerDocument.defaultView!
    let first = 0
    let second = 0
    try {
      await this.bounded(new Promise<void>((resolve) => {
        first = view.requestAnimationFrame(() => { second = view.requestAnimationFrame(() => resolve()) })
      }), 'SWF paint', LOAD_MS)
    } finally {
      view.cancelAnimationFrame(first)
      view.cancelAnimationFrame(second)
    }
  }

  /**
   * Resolves with a function the SWF registered via ExternalInterface.addCallback.
   * SWFs register from their first frame script, some time after load() resolves.
   */
  async callback(name: string): Promise<(...args: unknown[]) => unknown> {
    if (this.destroyed) throw new Error('SWF player was destroyed')
    // The pond requests its initial callback before starting the first load.
    const movie = this.movie || 1
    const host = this.el as unknown as Record<string, unknown>
    if (!this.recovering)
      await this.waitFor(() => typeof host[name] === 'function' ? true : null, `SWF callback ${name}`, CALLBACK_MS)
    if (this.destroyed || movie !== this.movie) throw new Error('SWF callback was replaced or destroyed')
    this.callbacks.add(name)
    return (...args: unknown[]): unknown => {
      if (this.destroyed || movie !== this.movie) throw new Error('SWF callback was replaced or destroyed')
      if (this.recoverContext) this.callbackArgs.set(name, args)
      if (this.recovering) return
      const fn = host[name]
      if (typeof fn !== 'function') throw new Error(`SWF callback ${name} is unavailable`)
      return fn.apply(this.el, args)
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.publishPanic()
    this.destroyed = true
    ++this.recovery
    this.recovering = false
    this.lastLoad = null
    this.callbackArgs.clear()
    this.recoveryTimes = []
    this.contextCleanup()
    // The document observer can run before the shadow observer. Drain its
    // canvas-removal records before disconnect discards the pending records.
    releaseRemovedCanvases(this.panicObserver?.takeRecords?.())
    this.panicObserver?.disconnect()
    this.globalCleanup()
    ++this.revision
    this.cancelPending('SWF player was destroyed')
    this.keyboardCleanup()
    players.delete(this)
    const canvas = this.el.shadowRoot?.querySelector<HTMLCanvasElement>('#container > canvas') ?? this.canvas
    this.canvas = null
    this.el.remove()
    releaseRetiredCanvas(canvas)
  }
}
