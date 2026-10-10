import { BrowserWindow, screen } from 'electron'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
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
    // Chromium apps (browsers, 抖音...) treat a work-area-sized window as covering them and stop painting
    // once it stops being click-through; a tool window is never counted.
    ...(process.platform === 'win32' && { type: 'toolbar' }),
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  // Full-screen apps hide the pet: macOS keeps it off full-screen spaces, and
  // Linux window managers stack a focused full-screen window above it.
  win.setVisibleOnAllWorkspaces(true)
  win.setIgnoreMouseEvents(true)
  // On macOS, dock.hide() turns the process into a UI element, which hides
  // windows that are already visible.
  win.once('ready-to-show', () => {
    win.showInactive()
    if (process.platform === 'win32') hideOnFullscreen(win)
  })
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

// Prints 1 while another window is full screen, 0 otherwise, twice a second.
// SHQueryUserNotificationState: 2 full-screen app, 3 Direct3D full screen, 4 presentation mode.
// The focused pet counts as full screen when it covers the monitor (auto-hidden taskbar), hence the PET handle.
// A write to the closed pipe stops the script once the app is gone.
const FULLSCREEN_PS = `
$ErrorActionPreference = 'Stop'
Add-Type -Namespace Q -Name W -MemberDefinition '
[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();'
while ($true) {
  $s = 0
  [void][Q.W]::SHQueryUserNotificationState([ref]$s)
  [Console]::WriteLine([int]($s -ge 2 -and $s -le 4 -and [Q.W]::GetForegroundWindow() -ne [IntPtr]PET))
  Start-Sleep -Milliseconds 500
}`

/** Windows keeps topmost windows above full-screen apps, so the pet hides itself while one is in front. */
function hideOnFullscreen(win: BrowserWindow): void {
  const script = FULLSCREEN_PS.replace('PET', `${win.getNativeWindowHandle().readBigUInt64LE()}`)
  const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  })
  let full = false
  createInterface({ input: ps.stdout }).on('line', (line) => {
    if ((line === '1') === full) return
    full = !full
    if (full) win.hide()
    else win.showInactive()
  })
  win.on('closed', () => ps.kill())
}

/** A normal, resizable window playing one game; the SWF scales with it. With `parent` it stacks above that window. */
export function openGameWindow(swf: string, parent?: BrowserWindow): BrowserWindow {
  const area = screen.getPrimaryDisplay().workAreaSize
  const scale = Math.min(1, (area.width * 0.9) / 1024, (area.height * 0.9) / 768)
  const win = new BrowserWindow({
    parent,
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
