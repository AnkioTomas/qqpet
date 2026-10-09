import { version } from '../../../package.json'
import type { Release } from '../../shared/ipc'
import { save, update } from '../pet/store'

const DAY = 86400
const NOTES_MAX = 400

/** x.y.z compared numerically; a pre-release suffix is ignored. */
function newer(a: string, b: string): boolean {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

const tell = (message: string, type: 'info' | 'error' = 'info'): void => void window.qqpet.messageBox({ type, title: '检查更新', message, buttons: ['确定'] })

/** Offers the download page of a newer release. Only a manual check reports "up to date" and failures. */
export async function checkUpdate(manual: boolean): Promise<void> {
  let r: Release
  try {
    r = await window.qqpet.latestRelease()
  } catch {
    if (manual) tell('检查更新失败，请检查网络后重试', 'error')
    return
  }
  update('settings', { updateCheckedAt: Math.floor(Date.now() / 1000) })
  if (!newer(r.version, version)) {
    if (manual) tell(`已经是最新版本 v${version}`)
    return
  }
  const notes = r.notes.length > NOTES_MAX ? `${r.notes.slice(0, NOTES_MAX)}…` : r.notes
  const message = `发现新版本 v${r.version}（当前 v${version}），前往 GitHub 下载？\n\n${notes}`
  if ((await window.qqpet.messageBox({ type: 'info', title: '发现新版本', message, buttons: ['以后再说', '去下载'] })) === 1) window.qqpet.openUrl(r.url)
}

/** Hourly look at the clock, so a machine that slept or was offline still checks once a day. */
export function startAutoUpdate(): void {
  const due = (): void => {
    if (save.settings.autoUpdate && Date.now() / 1000 - save.settings.updateCheckedAt >= DAY) void checkUpdate(false)
  }
  due()
  setInterval(due, 3600_000)
}
