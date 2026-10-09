import { common } from '@kit.AbilityKit'
import { webview } from '@kit.ArkWeb'
import { ORIGIN, attach, serve } from '../pet/Assets'
import { PetHost } from '../pet/PetHost'

class GameNative {
  private ctx: common.UIAbilityContext

  constructor(ctx: common.UIAbilityContext) {
    this.ctx = ctx
  }

  close(): void {
    this.ctx.terminateSelf()
  }
}

@Entry
@Component
struct Game {
  private controller: webview.WebviewController = new webview.WebviewController()
  private swf: string = (AppStorage.get('gameSwf') as string) ?? ''

  build() {
    Stack() {
    Web({ src: `${ORIGIN}/game.html?swf=${encodeURIComponent(this.swf)}`, controller: this.controller })
      .width('100%')
      .height('100%')
      .backgroundColor(Color.Black)
      .javaScriptAccess(true)
      .domStorageAccess(true)
      .fileAccess(true)
      .imageAccess(true)
      .mixedMode(MixedMode.All)
      .mediaPlayGestureAccess(false)
      .zoomAccess(false)
      .onInterceptRequest((event: OnInterceptRequestEvent) => {
        return serve(PetHost.inst!.context, event.request.getRequestUrl(), '', false) as WebResourceResponse
      })
      .onControllerAttached(() => {
        webview.WebviewController.setWebDebuggingAccess(true)
        attach(this.controller, PetHost.inst!.context, false)
        this.controller.registerJavaScriptProxy(new GameNative(getContext(this) as common.UIAbilityContext),
          'QQPetGame', ['close'])
        this.controller.runJavaScript('window.close = () => QQPetGame.close()')
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.Black)
  }
}
