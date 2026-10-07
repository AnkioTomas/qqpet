import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { IPC, type Point } from '../shared/ipc'
import { APP_ORIGIN } from './protocol'

const CURSOR_INTERVAL_MS = 33

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
      // macOS may report this overlay as occluded (Space switches, wake from sleep);
      // throttled, Ruffle stops drawing and bubble buttons stop responding.
      backgroundThrottling: false,
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

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadURL(`${APP_ORIGIN}/index.html`)
  }
  return win
}
