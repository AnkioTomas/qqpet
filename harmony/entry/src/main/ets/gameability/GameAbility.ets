import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { PetHost } from '../pet/PetHost'

export default class GameAbility extends UIAbility {
  private start: number = 0

  onCreate(want: Want, _launch: AbilityConstant.LaunchParam): void {
    this.start = Date.now()
    const swf = want.parameters?.['swf']
    AppStorage.setOrCreate('gameSwf', typeof swf === 'string' ? swf : '')
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    PetHost.inst?.setShown(false)
    windowStage.loadContent('pages/Game')
  }

  onDestroy(): void {
    const minutes = (Date.now() - this.start) / 60000
    PetHost.inst?.emit('gamePlayed', `${minutes}`)
    PetHost.inst?.setShown(true)
  }
}
