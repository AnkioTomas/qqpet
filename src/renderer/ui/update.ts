import { version } from '../../../package.json'
import type { Release } from '../../shared/ipc'
import { save, update } from '../pet/store'
import { windowView } from './window-view'

const DAY = 86400

/** x.y.z compared numerically; a pre-release suffix is ignored. */
function newer(a: string, b: string): boolean {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

/** Offers the download page of a newer release. Only a manual check reports "up to date" and failures. */
export async function checkUpdate(manual: boolean): Promise<void> {
  let r: Release
  try {
    r = await window.qqpet.latestRelease()
  } catch {
    if (manual) windowView({ title: '检查更新', msg: '检查更新失败，请检查网络后重试~' })
    return
  }
  update('settings', { updateCheckedAt: Math.floor(Date.now() / 1000) })
  if (!newer(r.version, version)) {
    if (manual) windowView({ title: '检查更新', msg: `已经是最新版本 v${version}~` })
    return
  }
  windowView({
    title: '发现新版本',
    msg: `新版本 v${r.version}（当前 v${version}），点击确认前往 GitHub 下载~`,
    ok: (close) => {
      close()
      window.qqpet.openUrl(r.url)
    },
  })
}

/** Hourly look at the clock, so a machine that slept or was offline still checks once a day. */
export function startAutoUpdate(): void {
  const due = (): void => {
    if (save.settings.autoUpdate && Date.now() / 1000 - save.settings.updateCheckedAt >= DAY) void checkUpdate(false)
  }
  due()
  setInterval(due, 3600_000)
}
