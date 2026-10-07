import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { IPC, type Point } from '../shared/ipc'
import { APP_ORIGIN } from './protocol'

const CURSOR_INTERVAL_MS = 33
const PAGES = process.env.ELECTRON_RENDERER_URL ?? APP_ORIGIN

/** Transparent, click-through overlay covering the primary display's work area. */
export function createPetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...screen.getPrimaryDisplay().workArea,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true)
  // On macOS, dock.hide() and visibleOnFullScreen turn the process into a UI
  // element, which hides windows that are already visible.
  win.once('ready-to-show', () => win.showInactive())
  // The pet never navigates; links inside SWFs must not replace the page.
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Click-through windows receive no mouse events on Linux, so the renderer
  // cannot hit-test on hover. Pushing the cursor position from here works the
  // same on every platform.
  let last: Point = { x: NaN, y: NaN }
  const timer = setInterval(() => {
    const c = screen.getCursorScreenPoint()
    const b = win.getBounds()
    const p = { x: c.x - b.x, y: c.y - b.y }
    if (p.x === last.x && p.y === last.y) return
    last = p
    win.webContents.send(IPC.cursor, p)
  }, CURSOR_INTERVAL_MS)
  win.on('closed', () => clearInterval(timer))

  void win.loadURL(`${PAGES}/index.html`)
  if (process.env.ELECTRON_RENDERER_URL) win.webContents.openDevTools({ mode: 'detach' })
  return win
}

/** A normal, resizable window playing one game; the SWF scales with it. */
export function openGameWindow(swf: string): BrowserWindow {
  const area = screen.getPrimaryDisplay().workAreaSize
  const scale = Math.min(1, (area.width * 0.9) / 1024, (area.height * 0.9) / 768)
  const win = new BrowserWindow({
    width: Math.round(1024 * scale),
    height: Math.round(768 * scale),
    useContentSize: true,
    backgroundColor: '#000',
    autoHideMenuBar: true,
    webPreferences: { sandbox: true },
  })
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  void win.loadURL(`${PAGES}/game.html?swf=${encodeURIComponent(swf)}`)
  return win
}
