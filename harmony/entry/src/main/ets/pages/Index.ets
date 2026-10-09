import { common } from '@kit.AbilityKit'
import { PetHost } from '../pet/PetHost'

@Entry
@Component
struct Index {
  @State tip: string = '正在启动QQ宠物…'

  aboutToAppear(): void {
    const ctx = getContext(this) as common.UIAbilityContext
    PetHost.launch(ctx).then((ok: boolean) => {
      if (ok) {
        this.tip = 'QQ宠物已显示在桌面'
        PetHost.minimizeMain()
      } else {
        this.tip = `请允许QQ宠物显示在其他应用的上层\n${PetHost.lastError}`
      }
    })
  }

  build() {
    Column() {
      Text(this.tip)
        .fontSize(18)
        .fontColor('#333333')
        .padding(24)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .backgroundColor('#F5F5F5')
  }
}
