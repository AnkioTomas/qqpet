import { setInfo, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'

let open = false

/** Egg selection (reset/Adopt.swf). Closing the box leaves no pet; the tray reopens it. */
export function adopt(done: () => void): void {
  if (open) return
  open = true
  const host = document.createElement('div')
  host.className = 'adopt'
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
