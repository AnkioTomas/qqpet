import { webview } from '@kit.ArkWeb'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { ORIGIN, attach, serve } from '../pet/Assets'
import { Native } from '../pet/Native'
import { PetHost } from '../pet/PetHost'

@Entry
@Component
struct Pet {
  @StorageLink('petSW') sw: number = 1
  @StorageLink('petSH') sh: number = 1
  private controller: webview.WebviewController = new webview.WebviewController()
  private nativeObj: Native = new Native()

  build() {
    Stack() {
    Web({ src: `${ORIGIN}/index.html`, controller: this.controller })
      .width(this.sw)
      .height(this.sh)
      .backgroundColor(Color.Transparent)
      .javaScriptAccess(true)
      .domStorageAccess(true)
      .fileAccess(true)
      .imageAccess(true)
      .mixedMode(MixedMode.All)
      .mediaPlayGestureAccess(false)
      .zoomAccess(false)
      .darkMode(WebDarkMode.Off)
      .javaScriptProxy({
        object: this.nativeObj,
        name: 'QQPetNative',
        methodList: Native.METHODS,
        controller: this.controller
      })
      .onInterceptRequest((event: OnInterceptRequestEvent) => {
        let accept = ''
        const headers = event.request.getRequestHeader()
        for (let i = 0; i < headers.length; i++) {
          if (headers[i].headerKey.toLowerCase() === 'accept') {
            accept = headers[i].headerValue
            break
          }
        }
        return serve(PetHost.inst!.context, event.request.getRequestUrl(), accept, this.hd())
      })
      .onConsole((e: OnConsoleEvent) => {
        hilog.info(0x4e50, 'qqpet', 'web %{public}s', e.message.getMessage())
        return false
      })
      .onErrorReceive((e: OnErrorReceiveEvent) => {
        hilog.error(0x4e50, 'qqpet', 'web error %{public}d %{public}s %{public}s',
          e.error.getErrorCode(), e.error.getErrorInfo(), e.request.getRequestUrl())
      })
      .onPageEnd((e: OnPageEndEvent) => {
        hilog.info(0x4e50, 'qqpet', 'page end %{public}s', e.url)
        this.controller.runJavaScript(
          "JSON.stringify({n:typeof QQPetNative,q:typeof window.qqpet,s:document.scripts.length,t:document.title,h:location.href})"
        ).then((s: string) => {
          hilog.info(0x4e50, 'qqpet', 'js %{public}s', s)
        })
      })
      .onControllerAttached(() => {
        hilog.info(0x4e50, 'qqpet', 'web attached')
        webview.WebviewController.setWebDebuggingAccess(true)
        attach(this.controller, PetHost.inst!.context, this.hd())
        PetHost.inst!.attach(this.controller)
      })
    }
    .width(this.sw)
    .height(this.sh)
    .clip(false)
    .backgroundColor(Color.Transparent)
  }

  private hd(): boolean {
    try {
      const save = new Native().read('save.json')
      if (save.length === 0) {
        return false
      }
      const obj = JSON.parse(save) as Record<string, Record<string, boolean>>
      return obj['settings']['hd'] === true
    } catch (_e) {
      return false
    }
  }
}
