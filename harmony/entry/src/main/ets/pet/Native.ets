import { fileIo as fs } from '@kit.CoreFileKit'
import { http } from '@kit.NetworkKit'
import { pasteboard } from '@kit.BasicServicesKit'
import { picker } from '@kit.CoreFileKit'
import { PetHost } from './PetHost'

function host(): PetHost {
  return PetHost.inst as PetHost
}

function num(v: number | string): number {
  return typeof v === 'number' ? v : Number(v)
}

function flag(v: boolean | string | number): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export class Native {
  static readonly METHODS: string[] = [
    'read', 'write', 'http', 'messageBox', 'exportSave', 'importSave',
    'openGame', 'quit', 'copyText', 'openUrl', 'setFocusable', 'setAutoStart',
    'setTray', 'setBounds', 'safeArea'
  ]

  read(name: string): string {
    const path = `${host().context.filesDir}/${name}`
    try {
      return fs.readTextSync(path)
    } catch (_e) {
      return ''
    }
  }

  write(name: string, text: string): void {
    const dir = host().context.filesDir
    const tmp = `${dir}/${name}.tmp`
    const file = fs.openSync(tmp, fs.OpenMode.READ_WRITE | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
    fs.writeSync(file.fd, text)
    fs.closeSync(file)
    try {
      fs.unlinkSync(`${dir}/${name}`)
    } catch (_e) {
    }
    fs.renameSync(tmp, `${dir}/${name}`)
  }

  http(id: number | string, method: string, url: string, headers: string, body: string): void {
    const hid = num(id)
    const client = http.createHttp()
    const extra: Record<string, string> = {}
    try {
      const h = JSON.parse(headers) as Record<string, string>
      const keys = Object.keys(h)
      for (let i = 0; i < keys.length; i++) {
        extra[keys[i]] = h[keys[i]]
      }
    } catch (_e) {
    }
    const opts: http.HttpRequestOptions = {
      method: method === 'POST' ? http.RequestMethod.POST : http.RequestMethod.GET,
      header: extra,
      connectTimeout: 60000,
      readTimeout: 60000
    }
    if (body.length > 0) {
      opts.extraData = body
    }
    client.request(url, opts).then((res: http.HttpResponse) => {
      const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
      host().resolve(hid, JSON.stringify({ status: res.responseCode, body: text }))
      client.destroy()
    }).catch((e: Error) => {
      host().resolve(hid, null, e.toString())
      client.destroy()
    })
  }

  messageBox(id: number | string, options: string): void {
    const hid = num(id)
    const o = JSON.parse(options) as Record<string, Object>
    const buttons = (o['buttons'] as string[]) ?? ['取消', '确定']
    const prompt = host().win?.getUIContext().getPromptAction()
    if (!prompt) {
      host().resolve(hid, '0')
      return
    }
    const dialogButtons: DialogButton[] = []
    for (let i = 0; i < buttons.length; i++) {
      const btn: DialogButton = { text: buttons[i], color: '#007DFF' }
      dialogButtons.push(btn)
    }
    const dialog: DialogOptions = {
      title: (o['title'] as string) ?? '',
      message: o['message'] as string,
      buttons: dialogButtons
    }
    prompt.showDialog(dialog).then((r: promptActionResult) => {
      host().resolve(hid, `${r.index}`)
    }).catch((_e: Error) => {
      host().resolve(hid, '0')
    })
  }

  exportSave(id: number | string, name: string, text: string): void {
    const hid = num(id)
    const doc = new picker.DocumentViewPicker(host().context)
    doc.save({ newFileNames: [name] }).then((uris: string[]) => {
      if (!uris || uris.length === 0) {
        host().resolve(hid, null)
        return
      }
      const f = fs.openSync(uris[0], fs.OpenMode.WRITE_ONLY | fs.OpenMode.CREATE | fs.OpenMode.TRUNC)
      fs.writeSync(f.fd, text)
      fs.closeSync(f)
      host().resolve(hid, 'true')
    }).catch((_e: Error) => {
      host().resolve(hid, null)
    })
  }

  importSave(id: number | string): void {
    const hid = num(id)
    const doc = new picker.DocumentViewPicker(host().context)
    doc.select({ maxSelectNumber: 1 }).then((uris: string[]) => {
      if (!uris || uris.length === 0) {
        host().resolve(hid, null)
        return
      }
      host().resolve(hid, fs.readTextSync(uris[0]))
    }).catch((_e: Error) => {
      host().resolve(hid, null)
    })
  }

  openGame(swf: string): void {
    host().openGame(swf)
  }

  quit(): void {
    host().quit()
  }

  copyText(text: string): void {
    const data = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, text)
    pasteboard.getSystemPasteboard().setData(data)
  }

  openUrl(url: string): void {
    host().context.startAbility({ action: 'ohos.want.action.viewData', entities: ['entity.system.browsable'], uri: url })
  }

  setFocusable(on: boolean | string | number): void {
    host().setFocusable(flag(on))
  }

  setAutoStart(on: boolean | string | number): void {
    host().setAutoStart(flag(on))
  }

  setTray(icon: string, tip: string): void {
    host().setTray(icon, tip === 'null' ? '' : tip)
  }

  setBounds(rect: string): void {
    const p = rect.split(',')
    host().setBounds(num(p[0]), num(p[1]), num(p[2]), num(p[3]), num(p[4]))
  }

  safeArea(viewport: number | string): string {
    return host().safeArea(num(viewport))
  }
}

interface promptActionResult {
  index: number
}

interface DialogButton {
  text: string
  color: string
}

interface DialogOptions {
  title: string
  message: string
  buttons: DialogButton[]
}
