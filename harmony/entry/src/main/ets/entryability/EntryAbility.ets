import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { PetHost } from '../pet/PetHost'

const DOMAIN = 0x4e50

export default class EntryAbility extends UIAbility {
  /** Link to open once in the foreground: the pet lives in a minimized ability, which may not start others. */
  private url: string = ''

  onCreate(want: Want, _launch: AbilityConstant.LaunchParam): void {
    this.handleWant(want)
  }

  onNewWant(want: Want, _launch: AbilityConstant.LaunchParam): void {
    this.handleWant(want)
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    PetHost.mainStage = windowStage
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, 'qqpet', 'load Index failed %{public}s', JSON.stringify(err))
      }
    })
  }

  onWindowStageDestroy(): void {
    PetHost.mainStage = null
  }

  onForeground(): void {
    if (this.url.length === 0) {
      return
    }
    const url = this.url
    this.url = ''
    this.context.openLink(url).catch((e: Error) => {
      hilog.error(DOMAIN, 'qqpet', 'openLink failed %{public}s', JSON.stringify(e))
    }).finally(() => PetHost.minimizeMain())
  }

  private handleWant(want: Want): void {
    const kind = want.parameters?.['kind']
    if (kind === 'state' || kind === 'menu') {
      PetHost.inst?.emit('trayClick', JSON.stringify({ kind: kind }))
    } else if (kind === 'url') {
      this.url = want.parameters?.['url'] as string
    } else if (kind === 'quit') {
      PetHost.inst?.quit()
    }
  }
}
