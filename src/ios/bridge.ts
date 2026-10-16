import { aiChat, aiModels } from '../shared/ai'
import { calendar } from '../shared/calendar'
import { cloneJson } from '../shared/compat'
import type { Fetch, Point, QQPetApi, TrayClick, TrayState } from '../shared/ipc'
import type { SaveData } from '../shared/save'
import type { SwfFailure } from '../renderer/swf/player'
import { applyPatch, buried, petOf, startSave } from '../shared/save-logic'
import { TRAY_STATES, trayTip } from '../shared/tray'
import { latestRelease } from '../shared/update'
import { weather } from '../shared/weather'
import { gameRewards } from './game-rewards'
import { isFatalRufflePanic, readRufflePanic, type RufflePanic } from './diagnostics'
import { startGeometry, type PetPointer } from './geometry'
import { IOSRPC } from './rpc'
import { IOSSaveWriter } from './save-writer'
import { installTextInput } from './text-input'
import './panels.css'

interface Bootstrap {
  save: string | null
  generation: string
  deviceKind?: QQPetApi['deviceKind']
  capabilities?: NonNullable<QQPetApi['capabilities']>
}
interface HTTPReply { status: number; body: string; headers?: Record<string, string> }
interface Insets {
  left: number; top: number; right: number; bottom: number
  viewport?: { width: number; height: number }; pending?: boolean
  layoutGeneration?: number; layoutRevision?: number
}
interface Events {
  cursor: Point
  trayClick: TrayClick
  gamePlayed: number
  clipboard: string
  presence: boolean
  front: string
}

declare global {
  interface Window {
    __qqpetIOS: {
      readonly page: string
      resolve(id: number, value: unknown, error: string | null, page: string): void
      emit(type: string, payload: unknown): void
      flush(): Promise<void>
    }
  }
}

const gamePage = location.pathname.endsWith('/game.html')
const role = gamePage ? 'game' : 'pet'
const capabilities: NonNullable<QQPetApi['capabilities']> = {
  rotatableScreen: true,
  autoStart: false,
  autoStartReason: '此 iOS 版本通过图标手动启动宠物，不安装开机自启服务。',
  clipboardWatch: false,
  clipboardWatchReason: '请在管理界面点击「朗读剪贴板文本」主动发送文字，此版本不在后台持续读取剪贴板。',
  frontWatch: false,
  frontWatchReason: '此 iOS 宿主暂不观察其他应用的前台活动。',
}
const rpc = new IOSRPC((request) => {
  const webkit = (window as Window & { webkit?: { messageHandlers?: { qqpet?: { postMessage(value: unknown): void } } } }).webkit
  const handler = webkit?.messageHandlers?.qqpet
  if (!handler) throw new Error('QQPet requires its iOS WKWebView host.')
  handler.postMessage(request)
})
const listeners: { [K in keyof Events]: ((payload: Events[K]) => void)[] } = {
  cursor: [], trayClick: [], gamePlayed: [], clipboard: [], presence: [], front: [],
}
const buffered = new Map<keyof Events, unknown[]>()
const emit = <K extends keyof Events>(type: K, payload: Events[K]): void => {
  if (!listeners[type].length) {
    const queued = buffered.get(type) ?? []
    // Startup events are small and bounded; repeated cursor samples need only their latest position.
    if (type === 'cursor' || type === 'front') queued.length = 0
    if (queued.length === 32) queued.shift()
    queued.push(payload)
    buffered.set(type, queued)
    return
  }
  for (const listener of listeners[type]) listener(payload)
}
function listen<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): void {
  listeners[type].push(listener)
  if (!buffered.has(type)) return
  // All eager modules register their listeners before this turn ends, including both game reward listeners.
  setTimeout(() => {
    const queued = buffered.get(type)
    if (!queued) return
    buffered.delete(type)
    for (const payload of queued) emit(type, payload as Events[K])
  }, 0)
}
let model: SaveData | null = null
let writer: IOSSaveWriter | null = null
let leaving = false
let operations: Promise<unknown> = Promise.resolve()
let geometry: ReturnType<typeof startGeometry> | null = null
let tray: TrayState = 'leave'
let postedTray = ''
let safeAreaRequest = 0
const gamePlayed = gameRewards(() => ready, () => writer?.generation, (minutes) => emit('gamePlayed', minutes))

function reportError(operation: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`QQPet iOS ${operation}:`, message)
  window.dispatchEvent(new CustomEvent('qqpet-platform-error', { detail: { operation, message } }))
  try { rpc.notify('status', { role, state: 'error', operation, message }) } catch { /* The host error is already reported. */ }
}
function command(op: string, args: Record<string, unknown> = {}): void {
  void rpc.request(op, args).catch((error) => reportError(op, error))
}
let publishedRufflePanic = false
let fatalRufflePanic = false
let fatalPanicNotice: (RufflePanic & { observedAt: number; page: string }) | null = null
let postedFatalPanic = false
let fatalPanicAttempts = 0
let terminalSWFNotice: (SwfFailure & { observedAt: number; page: string }) | null = null
let postedTerminalSWF = false
let terminalSWFAttempts = 0
function publishTerminalSWF(): void {
  if (!terminalSWFNotice || postedTerminalSWF || terminalSWFAttempts >= 3) return
  terminalSWFAttempts++
  try {
    rpc.notify('swfTerminalFailure', { ...terminalSWFNotice,
      url: terminalSWFNotice.url.slice(0, 8192),
      message: (terminalSWFNotice.message || 'WebGL context recovery failed').slice(0, 8192),
    })
    postedTerminalSWF = true
  }
  catch (error) { console.error('QQPet could not publish its renderer failure:', error) }
}
function publishFatalPanic(): void {
  if (!fatalPanicNotice || postedFatalPanic || fatalPanicAttempts >= 3) return
  fatalPanicAttempts++
  try { rpc.notify('rufflePanic', { ...fatalPanicNotice }); postedFatalPanic = true }
  catch (error) { console.error('QQPet could not publish its Ruffle failure:', error) }
}
function acceptRufflePanic(panic: RufflePanic): void {
  if (!panic || typeof panic.details !== 'string' || !panic.details.trim()) return
  const observed = { ...panic, observedAt: Date.now() / 1000, page: rpc.page }
  if (!publishedRufflePanic) {
    try {
      rpc.notify('status', { lastRufflePanic: observed })
      publishedRufflePanic = true
    } catch { /* Keep the DOM/event details available for the next publication. */ }
  }
  if (fatalRufflePanic || !isFatalRufflePanic(panic)) return
  fatalRufflePanic = true
  fatalPanicNotice = observed
  // Post native isolation before touching an already damaged Rust player.
  // Pose retries are then stopped in the same JavaScript turn.
  publishFatalPanic()
  try { setPaused(true) }
  catch (error) { console.error('QQPet could not suspend its failed Ruffle player:', error) }
  finally { geometry?.stop() }
}
function publishRufflePanic(): void {
  publishTerminalSWF()
  if (fatalRufflePanic) { publishFatalPanic(); return }
  const panic = readRufflePanic(document)
  if (!panic) return
  acceptRufflePanic(panic)
}
window.addEventListener('qqpet-ruffle-panic', (event) => acceptRufflePanic((event as CustomEvent<RufflePanic>).detail))
function savedStatus(): void {
  publishRufflePanic()
  if (!model) return
  const pet = model.petInfo
  const element = document.getElementById('pet')
  const visual = window.visualViewport
  const render = element ? {
    observedAt: Date.now() / 1000,
    hidden: element.hidden, paused: Boolean(window.__qqpetHostPaused),
    viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
      visibility: document.visibilityState, visual: visual ? { width: visual.width, height: visual.height, scale: visual.scale } : null },
    timing: geometry?.timing() ?? null,
    position: { x: element.offsetLeft, y: element.offsetTop, size: element.offsetWidth },
    players: Array.from(element.querySelectorAll('ruffle-player')).map((player) => {
      const movie = player as RufflePlayerElement
      const canvas = movie.shadowRoot?.querySelector('canvas')
      return { url: movie.dataset.swf ?? null, opacity: movie.style.opacity, metadata: movie.ruffle().metadata,
        playing: movie.ruffle().isPlaying, canvas: canvas ? { width: canvas.width, height: canvas.height } : null }
    }),
  } : null
  try { rpc.notify('status', {
    role, state: 'saved', havePet: model.havePet,
    audioSessionPolicy: (window as Window & { __qqpetAudioPolicyState?: string }).__qqpetAudioPolicyState ?? 'system-default',
    audioSessionError: (window as Window & { __qqpetAudioPolicyError?: string }).__qqpetAudioPolicyError ?? null,
    pet: { name: pet.name, sex: pet.sex, level: model.petComputedlInfo.level, health: pet.health, mood: pet.mood },
    settings: { clip: model.settings.clip, watchApp: model.settings.watchApp, hd: model.settings.hd },
    render,
  }) } catch (error) { reportError('status', error) }
}
window.addEventListener('qqpet-swf-error', (event) => {
  publishRufflePanic()
  const detail = (event as CustomEvent<SwfFailure>).detail
  const observed = { ...detail, observedAt: Date.now() / 1000, page: rpc.page }
  try { rpc.notify('status', { lastSWFError: observed }) } catch { /* A disconnected page cannot publish diagnostics. */ }
  if (fatalRufflePanic || terminalSWFNotice || !['context-recovery-failed', 'context-recovery-exhausted'].includes(detail.terminal ?? '')) return
  terminalSWFNotice = observed
  // The renderer is already gone; stop interaction and pose retries until the
  // native host completes the existing save-and-stop barrier.
  publishTerminalSWF()
  try { setPaused(true) }
  catch (error) { console.error('QQPet could not suspend its failed renderer:', error) }
  finally { geometry?.stop() }
})
function requireOwner(): { save: SaveData; persistence: IOSSaveWriter } {
  if (gamePage || !model || !writer) throw new Error('Only the initialized pet page can change its save.')
  return { save: model, persistence: writer }
}
function write(): void {
  const { save, persistence } = requireOwner()
  void persistence.write(JSON.stringify(save)).then(savedStatus, (error) => reportError('save', error))
}
function showTray(): void {
  if (gamePage || !model) return
  const pet = model.petInfo
  const icon = `${pet.sex}/${TRAY_STATES[tray].frames ? `${tray}/1` : tray}.png`
  const tip = trayTip(tray, pet) ?? null
  const signature = icon + tip
  if (signature === postedTray) return
  postedTray = signature
  command('setTray', { icon, tip, state: tray })
}

/** Renderer flush settles Farm and its pending patch, then calls this API's native barrier. */
async function flush(): Promise<void> {
  await ready
  if (writer) await writer.flush()
}
async function flushRenderer(): Promise<void> {
  await ready
  if (window.__qqpetFlush) await window.__qqpetFlush()
  else await flush()
}
function exclusive<T>(run: () => Promise<T>): Promise<T> {
  const next = operations.then(run)
  operations = next.catch(() => {})
  return next
}
async function replaceSave(next: SaveData, backup: boolean): Promise<void> {
  const { persistence } = requireOwner()
  if (capabilities.autoStart === false) next.settings.autoStart = false
  if (capabilities.clipboardWatch === false) next.settings.clip = false
  if (capabilities.frontWatch === false) next.settings.watchApp = false
  leaving = true
  try {
    await persistence.replace(JSON.stringify(next), backup)
    model = next
    location.reload()
  } catch (error) {
    leaving = false
    throw error
  }
}

const nativeFetch: Fetch = async (url, init = {}) => {
  const headers: Record<string, string> = {}
  new Headers(init.headers).forEach((value, name) => { headers[name] = value })
  if (init.body !== null && init.body !== undefined && typeof init.body !== 'string') throw new Error('The native network bridge accepts text request bodies.')
  const reply = await rpc.request<HTTPReply>('http', {
    url, method: init.method ?? 'GET', headers, body: init.body ?? null,
  }, { signal: init.signal })
  if (!reply || !Number.isInteger(reply.status) || reply.status < 200 || reply.status > 599 || typeof reply.body !== 'string') throw new Error('Invalid native HTTP response.')
  const body = [204, 205, 304].includes(reply.status) ? null : reply.body
  return new Response(body, { status: reply.status, headers: reply.headers })
}

async function safeArea(): Promise<void> {
  const request = ++safeAreaRequest
  const viewport = { width: innerWidth, height: innerHeight }
  try {
    const insets = await rpc.request<Insets>('safeArea', { viewport }, { timeout: 15_000 })
    if (request !== safeAreaRequest || !insets || insets.pending || viewport.width !== innerWidth || viewport.height !== innerHeight) return
    // Older hosts omit viewport; newer hosts only publish a layout snapshot
    // matching the requested direction, never another stage of a WK resize.
    if (insets.viewport && (insets.viewport.width !== viewport.width || insets.viewport.height !== viewport.height)) return
    for (const side of ['left', 'top', 'right', 'bottom'] as const) {
      const value = insets[side]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`)
    }
    if (Number.isInteger(insets.layoutGeneration) && Number.isInteger(insets.layoutRevision)) {
      // Let inset observers refit panels and the next geometry frame publish
      // before the native host accepts touches in this rotation. Do not block boot.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (request !== safeAreaRequest || viewport.width !== innerWidth || viewport.height !== innerHeight) return
        try { rpc.notify('layoutReady', { viewport, generation: insets.layoutGeneration, revision: insets.layoutRevision }) }
        catch (error) { reportError('layoutReady', error) }
      }))
    }
  } catch (error) { reportError('safeArea', error) }
}

function point(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false
  const p = value as Point
  return typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)
}
function outside(): void {
  const box = geometry?.bounds()
  if (!box) return
  const corners = [{ x: 0, y: 0 }, { x: innerWidth - 1, y: 0 }, { x: 0, y: innerHeight - 1 }, { x: innerWidth - 1, y: innerHeight - 1 }]
  const free = corners.find((p) => p.x < box.x || p.y < box.y || p.x >= box.x + box.width || p.y >= box.y + box.height)
  if (free) emit('cursor', free)
}
function setText(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return
  const text = payload as { value?: unknown; target?: unknown }
  if (typeof text.value !== 'string') return
  const active = document.activeElement
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return
  // A foreground editor result cannot land on a different field opened meanwhile.
  if (typeof text.target === 'string' && active.id !== text.target) return
  active.value = text.value
  active.dispatchEvent(new Event('input', { bubbles: true }))
  active.dispatchEvent(new Event('change', { bubbles: true }))
}
function setPaused(paused: boolean): void {
  paused ||= fatalRufflePanic || Boolean(terminalSWFNotice)
  window.__qqpetHostPaused = paused
  geometry?.pause(paused)
  window.__qqpetSetPaused?.(paused)
}

window.__qqpetIOS = {
  page: rpc.page,
  resolve: (id, value, error, page) => rpc.resolve(id, value, error, page),
  flush: flushRenderer,
  emit(type, payload) {
    if (type === 'pointer' && point(payload)) {
      const input = payload as PetPointer
      if (!['begin', 'move', 'end', 'cancel'].includes(input.phase) || !Number.isInteger(input.id)) return
      geometry?.pointer(input)
      emit('cursor', input)
      window.__qqpetInput?.({ ...input, source: 'native' })
    } else if (type === 'cursor' && point(payload)) emit('cursor', payload)
    else if (type === 'outside') outside()
    else if (type === 'trayClick' && payload && typeof payload === 'object') {
      const click = payload as TrayClick
      if (click.kind === 'state' || click.kind === 'menu') emit('trayClick', { ...click, x: click.x ?? innerWidth / 2, y: click.y ?? innerHeight / 2 })
    } else if (type === 'gamePlayed') {
      void gamePlayed(payload).catch((error) => reportError('gamePlayed', error))
    } else if (type === 'clipboard' && typeof payload === 'string') {
      // The host emits an explicit paste/share action; background watching is a separate capability.
      emit('clipboard', payload)
    } else if (type === 'presence' && typeof payload === 'boolean') {
      setPaused(payload)
      emit('presence', payload)
    } else if (type === 'paused' && typeof payload === 'boolean') {
      setPaused(payload)
    } else if (type === 'front' && typeof payload === 'string' && model?.settings.watchApp) emit('front', payload)
    else if (type === 'safeArea') void safeArea()
    else if (type === 'text') setText(payload)
    else if (type === 'flush' && payload && typeof payload === 'object') {
      const request = payload as { id?: number }
      if (!Number.isInteger(request.id)) return
      void flushRenderer().then(() => rpc.request('flushReady', { requestId: request.id, generation: writer?.generation ?? null }), (error) => {
        command('flushReady', { requestId: request.id, error: error instanceof Error ? error.message : String(error) })
      }).catch((error) => reportError('flushReady', error))
    }
  },
}

const api: QQPetApi = {
  capabilities,
  async load() { await ready; if (!model) throw new Error('The pet save is unavailable.'); return cloneJson(model) },
  save(patch) {
    if (leaving) return
    const { save } = requireOwner()
    const copy = cloneJson(patch)
    if (copy.settings && capabilities.autoStart === false) copy.settings.autoStart = false
    applyPatch(save, copy)
    write()
    if (patch.petInfo) showTray()
  },
  flush,
  resetPet(sex) {
    void exclusive(async () => {
      await flushRenderer()
      const { save } = requireOwner()
      await replaceSave(buried(cloneJson(save), sex), false)
    }).catch((error) => reportError('resetPet', error))
  },
  exportSave: () => exclusive(async () => {
    await flushRenderer()
    const { save } = requireOwner()
    const day = new Date().toISOString().slice(0, 10)
    return await rpc.request<boolean>('exportSave', { name: `QQPet-${day}.json`, text: JSON.stringify(save, null, 2) }, { timeout: 0 })
  }),
  importSave: () => exclusive(async () => {
    await flushRenderer()
    requireOwner()
    const text = await rpc.request<string | null>('importSave', {}, { timeout: 0 })
    if (text === null) return
    if (typeof text !== 'string') throw new Error('The picker did not return a save file.')
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('This is not a QQPet save.')
    const pet = petOf(parsed as Record<string, unknown>)
    if (pet.havePet !== true) throw new Error('No pet exists in this save file.')
    await flushRenderer()
    await replaceSave(startSave(pet), true)
  }),
  openGame(swf) { void exclusive(async () => { await flushRenderer(); const { persistence } = requireOwner(); await rpc.request('openGame', { swf, generation: persistence.generation }) }).catch((error) => reportError('openGame', error)) },
  closeGame: () => command('closeGame'),
  calendar: () => calendar(nativeFetch),
  aiModels: (config) => aiModels(nativeFetch, config),
  aiChat: (config, messages) => aiChat(nativeFetch, config, messages),
  weather: (city) => weather(nativeFetch, city),
  latestRelease: () => latestRelease(nativeFetch),
  quit() {
    if (gamePage) { command('closeGame'); return }
    void exclusive(async () => { await flushRenderer(); leaving = true; const { persistence } = requireOwner(); await rpc.request('quit', { generation: persistence.generation }) }).catch((error) => { leaving = false; reportError('quit', error) })
  },
  copyText: (text) => command('copyText', { text }),
  openUrl: (url) => command('openUrl', { url }),
  // Native geometry partitions pet dragging and WK interactions; cursor hover does not retarget a touch.
  setClickThrough() {},
  setAlwaysOnTop: (enabled) => command('setAlwaysOnTop', { enabled }),
  setFocusable: (enabled) => command('setFocusable', { enabled }),
  setAutoStart(enabled) {
    void rpc.request<{ enabled: boolean; reason?: string }>('setAutoStart', { enabled }).then((reply) => {
      capabilities.autoStart = reply.enabled
      if (reply.reason) capabilities.autoStartReason = reply.reason
      if (!reply.enabled && model && !gamePage) { model.settings.autoStart = false; write() }
    }).catch((error) => reportError('setAutoStart', error))
  },
  setTrayState(state) { tray = state; showTray() },
  onCursor: (listener) => listen('cursor', listener),
  onTrayClick: (listener) => listen('trayClick', listener),
  onGamePlayed: (listener) => listen('gamePlayed', listener),
  onClipboard: (listener) => listen('clipboard', listener),
  onPresence: (listener) => listen('presence', listener),
  onFront: (listener) => listen('front', listener),
}
window.qqpet = api
window.__qqpetNativePetInput = !gamePage
if (gamePage) window.close = () => api.closeGame?.()

const ready: Promise<void> = rpc.request<Bootstrap>('bootstrap', { role }).then(async (bootstrap) => {
  if (!bootstrap || typeof bootstrap.generation !== 'string' || !bootstrap.generation) throw new Error('Native bootstrap did not supply a save generation.')
  if (bootstrap.deviceKind === 'tablet' || bootstrap.deviceKind === 'phone' || bootstrap.deviceKind === 'other') api.deviceKind = bootstrap.deviceKind
  Object.assign(capabilities, bootstrap.capabilities ?? {})
  // This build deliberately has no daemon; imported desktop preferences cannot enable one.
  capabilities.autoStart = false
  let stored: Record<string, any> | null = null
  if (bootstrap.save !== null && bootstrap.save !== '') {
    if (typeof bootstrap.save !== 'string') throw new Error('Native bootstrap returned an invalid save.')
    try {
      const parsed: unknown = JSON.parse(bootstrap.save)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The save is not a JSON object.')
      stored = parsed as Record<string, any>
    } catch (error) {
      if (gamePage) throw error
      await rpc.request('preserveCorrupt', { generation: bootstrap.generation, name: `save.json.corrupt-${Date.now()}`, text: bootstrap.save })
      console.error('A corrupt save was preserved before creating a new pet.')
    }
  }
  model = startSave(stored)
  model.settings.autoStart = false
  model.settings.clip = false
  model.settings.watchApp = false
  if (!gamePage) {
    writer = new IOSSaveWriter(bootstrap.generation, {
      write: (generation, text) => rpc.request('writeSave', { generation, text }),
      replace: (generation, text, backup) => rpc.request<{ generation: string }>('replaceSave', { generation, text, backup }),
    })
    await writer.write(JSON.stringify(model))
    geometry = startGeometry(rpc)
    showTray()
  }
  await safeArea()
  rpc.notify('status', { role, state: 'ready', havePet: model.havePet })
})
window.__qqpetReady = ready
const stopTextInput = gamePage ? () => {} : installTextInput(rpc, flushRenderer, (error) => reportError('editText', error))
void ready.catch((error) => reportError('bootstrap', error))
let safeAreaRootWidth = document.documentElement.clientWidth
let safeAreaRootHeight = document.documentElement.clientHeight
const safeAreaObserver = new ResizeObserver(() => {
  const { clientWidth: width, clientHeight: height } = document.documentElement
  // Applying insets can deliver another observer notification without a new
  // viewport. Only actual root size changes need another native snapshot.
  if (width === safeAreaRootWidth && height === safeAreaRootHeight) return
  safeAreaRootWidth = width
  safeAreaRootHeight = height
  void safeArea()
})
safeAreaObserver.observe(document.documentElement)
addEventListener('resize', () => void safeArea())
for (const type of ['pointerdown', 'pointermove'] as const) document.addEventListener(type, (event) => emit('cursor', { x: event.clientX, y: event.clientY }), true)
addEventListener('pagehide', () => {
  safeAreaObserver.disconnect()
  safeAreaRequest++
  stopTextInput()
  geometry?.stop()
  // Farm and the batched patch settle synchronously before the renderer barrier's first await.
  let pending: Promise<void>
  try { pending = window.__qqpetFlush ? window.__qqpetFlush() : flush() }
  catch (error) { pending = Promise.reject(error) }
  void pending.catch((error) => reportError('pagehide', error)).finally(() => rpc.dispose())
})
