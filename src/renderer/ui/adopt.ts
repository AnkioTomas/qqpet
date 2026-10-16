import { setInfo, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import { button, div } from './dom'
import { windowView } from './window-view'

let open = false

/** Egg selection (reset/Adopt.swf). Closing the box leaves no pet; the tray reopens it. */
export function adopt(done: () => void): void {
  if (open) return
  open = true
  // No pet to replace yet, so unlike the setup page's import this needs no confirmation.
  const host = div('adopt', button('but_small import', () => void window.qqpet.importSave().catch(() => windowView({ title: '导入存档', msg: '这不是有效的QQ宠物存档~' })), '导入存档'))
  const close = openBox(host, { onClose: () => (open = false) })
  void new SwfPlayer(host).load('pet/reset/Adopt.swf')
  // Keep this per-window latch set after a choice, even after close; reopening creates a fresh one.
  let choosing = false
  window.ChooseAPI = {
    ChooseSex: (n) => {
      if (choosing) return
      choosing = true
      // The SWF owns the current call. Dispose it after ExternalInterface returns,
      // as for the other SWF windows that close themselves from a callback.
      setTimeout(() => {
        if (!host.isConnected) return
        setInfo('sex', n === 0 ? 'GG' : 'MM')
        update('havePet', true)
        close()
        open = false
        done()
      })
    },
  }
}
