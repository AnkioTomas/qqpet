import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit'
import { PetHost } from '../pet/PetHost'

export default class TextAbility extends UIAbility {
  onCreate(want: Want, _launch: AbilityConstant.LaunchParam): void {
    const text = want.parameters?.['ohos.extra.param.key.shareData'] ?? want.uri ?? ''
    if (typeof text === 'string' && text.length > 0) {
      PetHost.inst?.emit('clipboard', JSON.stringify(text))
    }
    this.context.terminateSelf()
  }
}
