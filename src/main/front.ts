import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)

const KNOWN: [string, string][] = [
  ['code', '写代码'],
  ['cursor', '写代码'],
  ['webstorm', '写代码'],
  ['pycharm', '写代码'],
  ['goland', '写代码'],
  ['idea', '写代码'],
  ['sublime', '写代码'],
  ['nvim', '写代码'],
  ['vim', '写代码'],
  ['emacs', '写代码'],
  ['chrome', '看网页'],
  ['firefox', '看网页'],
  ['safari', '看网页'],
  ['msedge', '看网页'],
  ['edge', '看网页'],
  ['arc', '看网页'],
  ['weixin', '聊微信'],
  ['wechat', '聊微信'],
  ['qq', '聊QQ'],
  ['slack', '在聊天'],
  ['discord', '在聊天'],
  ['telegram', '在聊天'],
  ['spotify', '听音乐'],
  ['music', '听音乐'],
  ['finder', '翻文件'],
  ['explorer', '翻文件'],
  ['nautilus', '翻文件'],
  ['winword', '写文档'],
  ['excel', '看表格'],
  ['powerpnt', '做PPT'],
  ['pages', '写文档'],
  ['preview', '看文件'],
  ['vlc', '看电影'],
  ['iina', '看电影'],
  ['mpv', '看电影'],
]

const WIN = `
Add-Type -Namespace Q -Name F -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();[DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);'
$h=[Q.F]::GetForegroundWindow(); $s=New-Object System.Text.StringBuilder 256; [void][Q.F]::GetWindowText($h,$s,256); $id=[uint32]0; [void][Q.F]::GetWindowThreadProcessId($h,[ref]$id); $p=Get-Process -Id $id -EA SilentlyContinue; Write-Output ($p.ProcessName+'|'+$s)
`

async function raw(): Promise<{ app: string; title: string }> {
  if (process.platform === 'darwin') {
    const { stdout } = await run('osascript', ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'], { timeout: 3000 })
    return { app: stdout.trim(), title: '' }
  }
  if (process.platform === 'win32') {
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WIN], { timeout: 5000 })
    const [app, title] = stdout.trim().split('|')
    return { app: app ?? '', title: title ?? '' }
  }
  try {
    const { stdout: pid } = await run('xdotool', ['getactivewindow', 'getwindowpid'], { timeout: 1500 })
    const app = (await readFile(`/proc/${pid.trim()}/comm`, 'utf8')).trim()
    let title = ''
    try {
      title = (await run('xdotool', ['getactivewindow', 'getwindowname'], { timeout: 1500 })).stdout.trim()
    } catch {
      /* title is optional */
    }
    return { app, title }
  } catch {
    const { stdout } = await run(
      'gdbus',
      ['call', '--session', '--dest', 'org.gnome.Shell', '--object-path', '/org/gnome/Shell', '--method', 'org.gnome.Shell.Eval', 'global.display.focus_window.get_wm_class()'],
      { timeout: 1500 },
    )
    return { app: stdout.match(/"([^"]+)"/)?.[1] ?? '', title: '' }
  }
}

/** A short label, or the process name; empty when it is us or the lookup failed. */
export async function frontName(): Promise<string> {
  try {
    const { app, title } = await raw()
    if (!app || /^(electron|qqpet)$/i.test(app)) return ''
    const s = `${app} ${title}`.toLowerCase()
    return KNOWN.filter(([k]) => s.includes(k)).sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? app
  } catch {
    return ''
  }
}
