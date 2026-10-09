import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { PetHost } from '../pet/PetHost'

const DOMAIN = 0x4e50

export default class EntryAbility extends UIAbility {
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

  private handleWant(want: Want): void {
    const kind = want.parameters?.['kind']
    if (kind === 'state' || kind === 'menu') {
      PetHost.inst?.emit('trayClick', JSON.stringify({ kind: kind }))
    } else if (kind === 'quit') {
      PetHost.inst?.quit()
    }
  }
}
