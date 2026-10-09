import { abilityAccessCtrl, common, Want, wantAgent } from '@kit.AbilityKit'
import { BusinessError, commonEventManager } from '@kit.BasicServicesKit'
import { display, window } from '@kit.ArkUI'
import { hilog } from '@kit.PerformanceAnalysisKit'
import { image } from '@kit.ImageKit'
import { notificationManager } from '@kit.NotificationKit'
import { preferences } from '@kit.ArkData'
import { webview } from '@kit.ArkWeb'

const DOMAIN = 0x4e50
const TRAY_ID = 1
const TRAY_PX = 96

export class PetHost {
  static inst: PetHost | null = null
  static mainStage: window.WindowStage | null = null
  static lastError: string = ''

  context: common.UIAbilityContext
  win: window.Window | null = null
  controller: webview.WebviewController | null = null
  away: boolean = false
  private trayIcon: string = ''
  private trayTip: string = '点按查看宠物状态'
  private subscriber: commonEventManager.CommonEventSubscriber | null = null

  constructor(context: common.UIAbilityContext) {
    this.context = context
  }

  static async launch(context: common.UIAbilityContext): Promise<boolean> {
    if (PetHost.inst) {
      return true
    }
    const at = abilityAccessCtrl.createAtManager()
    try {
      await at.requestPermissionsFromUser(context, ['ohos.permission.SYSTEM_FLOAT_WINDOW'])
    } catch (e) {
      hilog.error(DOMAIN, 'qqpet', 'float permission request failed %{public}s', JSON.stringify(e))
    }
    const host = new PetHost(context)
    try {
      await host.create()
    } catch (e) {
      const err = e as BusinessError
      PetHost.lastError = `${err.code}: ${err.message}`
      hilog.error(DOMAIN, 'qqpet', 'create float window failed %{public}s', JSON.stringify(err))
      return false
    }
    PetHost.inst = host
    try {
      await notificationManager.requestEnableNotification()
    } catch (_e) {
      // Notification is the tray stand-in; the pet still works without it.
    }
    return true
  }

  static minimizeMain(): void {
    try {
      PetHost.mainStage?.getMainWindowSync().minimize()
    } catch (_e) {
      // First launch: the main window may already be going away.
    }
  }

  private async create(): Promise<void> {
    const d = display.getDefaultDisplaySync()
    AppStorage.setOrCreate('petSW', d.width / d.densityPixels)
    AppStorage.setOrCreate('petSH', d.height / d.densityPixels)
    this.win = await window.createWindow({
      name: 'qqpet',
      windowType: window.WindowType.TYPE_FLOAT,
      ctx: this.context
    })
    try {
      await this.win.resize(d.width, d.height)
      await this.win.moveWindowTo(0, 0)
    } catch (_e) {
      // resize is documented as 2-in-1 only; the default size is used.
    }
    await this.win.setUIContent('pages/Pet')
    try {
      this.win.setWindowBackgroundColor('#00000000')
    } catch (_e) {
      // Phone float windows reject this before they are shown.
    }
    await this.win.showWindow()
    await this.postTray()
    await this.watchScreen()
  }

  private async watchScreen(): Promise<void> {
    try {
      this.subscriber = await commonEventManager.createSubscriber({
        events: ['usual.event.SCREEN_OFF', 'usual.event.SCREEN_ON']
      })
      commonEventManager.subscribe(this.subscriber, (_err, data) => {
        this.emit('presence', data.event === 'usual.event.SCREEN_OFF' ? 'true' : 'false')
      })
    } catch (_e) {
      // Screen events are optional; the pet still talks.
    }
  }

  attach(controller: webview.WebviewController): void {
    this.controller = controller
  }

  emit(type: string, payload: string): void {
    this.controller?.runJavaScript(`__qqpet.emit('${type}', ${payload})`)
  }

  resolve(id: number, value: string | null, error: string | null = null): void {
    const q = (s: string | null): string => s === null ? 'null' : JSON.stringify(s)
    this.controller?.runJavaScript(`__qqpet.resolve(${id}, ${q(value)}, ${q(error)})`)
  }

  private lastPx = -1
  private lastPy = -1
  private lastPw = -1
  private lastPh = -1

  async setBounds(x: number, y: number, w: number, h: number, viewport: number): Promise<void> {
    if (!this.win) {
      return
    }
    const d = display.getDefaultDisplaySync()
    const scale = d.width / viewport
    const px = Math.floor(x * scale)
    const py = Math.floor(y * scale)
    const pw = Math.max(Math.ceil(w * scale), 1)
    const ph = Math.max(Math.ceil(h * scale), 1)
    if (px === this.lastPx && py === this.lastPy && pw === this.lastPw && ph === this.lastPh) {
      return
    }
    this.lastPx = px
    this.lastPy = py
    this.lastPw = pw
    this.lastPh = ph
    try {
      await this.win.resize(pw, ph)
      await this.win.moveWindowTo(px, py)
      await this.win.setWindowTouchable(w > 0 && h > 0)
    } catch (e) {
      hilog.error(DOMAIN, 'qqpet', 'setBounds failed %{public}s', JSON.stringify(e))
    }
  }

  safeArea(viewport: number): string {
    if (!this.win) {
      return '0,0,0,0'
    }
    const d = display.getDefaultDisplaySync()
    const scale = d.width / viewport
    const sys = this.win.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM)
    const cut = this.win.getWindowAvoidArea(window.AvoidAreaType.TYPE_CUTOUT)
    const left = Math.max(sys.leftRect.width, cut.leftRect.width)
    const top = Math.max(sys.topRect.height, cut.topRect.height)
    const right = Math.max(sys.rightRect.width, cut.rightRect.width)
    const bottom = Math.max(sys.bottomRect.height, cut.bottomRect.height)
    return [left, top, right, bottom].map((v: number) => `${v / scale}`).join(',')
  }

  async setFocusable(on: boolean): Promise<void> {
    try {
      await this.win?.setWindowFocusable(on)
    } catch (_e) {
      // Some float windows ignore focus changes.
    }
  }

  async setShown(on: boolean): Promise<void> {
    this.away = !on
    if (!this.win) {
      return
    }
    if (on) {
      await this.win.showWindow()
    } else {
      await this.win.minimize()
    }
  }

  async setTray(icon: string, tip: string): Promise<void> {
    this.trayIcon = icon
    if (tip.length > 0) {
      this.trayTip = tip
    }
    await this.postTray()
  }

  private async postTray(): Promise<void> {
    try {
      const request: notificationManager.NotificationRequest = {
        id: TRAY_ID,
        content: {
          notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
          normal: {
            title: 'QQ宠物',
            text: this.trayTip
          }
        },
        isUnremovable: true,
        wantAgent: await wantAgent.getWantAgent({
          wants: [{
            bundleName: this.context.abilityInfo.bundleName,
            abilityName: 'EntryAbility',
            parameters: { kind: 'state' }
          }] as Want[],
          operationType: wantAgent.OperationType.START_ABILITY,
          requestCode: 1
        })
      }
      if (this.trayIcon.length > 0) {
        try {
          const path = `pet/img_res/Tray/${this.trayIcon}`
          let png: Uint8Array
          try {
            png = this.context.resourceManager.getRawFileContentSync(path.replace('.png', '@2x.png'))
          } catch (_e) {
            png = this.context.resourceManager.getRawFileContentSync(path)
          }
          const src = image.createImageSource(png.buffer)
          const pixel = await src.createPixelMap({ desiredSize: { width: TRAY_PX, height: TRAY_PX } })
          request.smallIcon = pixel
          request.largeIcon = pixel
        } catch (_e) {
          // Keep the previous / default icon.
        }
      }
      await notificationManager.publish(request)
    } catch (e) {
      hilog.error(DOMAIN, 'qqpet', 'tray failed %{public}s', JSON.stringify(e))
    }
  }

  async setAutoStart(on: boolean): Promise<void> {
    const prefs = await preferences.getPreferences(this.context, 'qqpet')
    await prefs.put('autoStart', on)
    await prefs.flush()
  }

  async autoStart(): Promise<boolean> {
    const prefs = await preferences.getPreferences(this.context, 'qqpet')
    return prefs.getSync('autoStart', false) as boolean
  }

  async openGame(swf: string): Promise<void> {
    await this.context.startAbility({
      bundleName: this.context.abilityInfo.bundleName,
      abilityName: 'GameAbility',
      parameters: { swf: swf }
    })
  }

  async quit(): Promise<void> {
    if (this.subscriber) {
      try {
        await commonEventManager.unsubscribe(this.subscriber)
      } catch (_e) {
      }
      this.subscriber = null
    }
    try {
      await notificationManager.cancel(TRAY_ID)
    } catch (_e) {
    }
    try {
      await this.win?.destroyWindow()
    } catch (_e) {
    }
    this.win = null
    PetHost.inst = null
    this.context.terminateSelf()
  }
}
