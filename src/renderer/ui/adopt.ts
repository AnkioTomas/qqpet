import { setInfo, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import { button, div } from './dom'

let open = false

/** Egg selection (reset/Adopt.swf). Closing the box leaves no pet; the tray reopens it. */
export function adopt(done: () => void): void {
  if (open) return
  open = true
  // No pet to replace yet, so unlike the setup page's import this needs no confirmation.
  const host = div('adopt', button('but_small import', () => window.qqpet.importSave(), '导入存档'))
  const close = openBox(host, { onClose: () => (open = false) })
  void new SwfPlayer(host).load('pet/reset/Adopt.swf')
  window.ChooseAPI = {
    ChooseSex: (n) => {
      setInfo('sex', n === 0 ? 'GG' : 'MM')
      update('havePet', true)
      close()
      open = false
      done()
    },
  }
}
