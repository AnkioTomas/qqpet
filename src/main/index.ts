import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { join } from 'node:path'
import { IPC, type Point } from '../shared/ipc'
import { APP_ORIGIN, handleScheme, registerScheme, resourcesRoot } from './protocol'

const CURSOR_INTERVAL_MS = 33

if (!app.requestSingleInstanceLock()) app.exit(0)

registerScheme()

function createPetWindow(): BrowserWindow {
  const area = screen.getPrimaryDisplay().workArea
  const win = new BrowserWindow({
    ...area,
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

function createTray(): Tray {
  const icon = nativeImage.createFromPath(join(resourcesRoot, 'icons/tray.png')).resize({ width: 16, height: 16 })
  const t = new Tray(icon)
  t.setToolTip('QQ宠物')
  t.setContextMenu(Menu.buildFromTemplate([{ label: '退出', click: () => app.quit() }]))
  return t
}

ipcMain.on(IPC.setClickThrough, (e, enabled: boolean) => {
  BrowserWindow.fromWebContents(e.sender)?.setIgnoreMouseEvents(enabled)
})

app.whenReady().then(() => {
  handleScheme()
  app.dock?.hide()
  const tray = createTray()
  app.on('before-quit', () => tray.destroy())
  createPetWindow()
})

app.on('window-all-closed', () => app.quit())
