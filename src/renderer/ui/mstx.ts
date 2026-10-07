import { SwfPlayer } from '../swf/player'
import { openFrame } from './box'
import './css/mstx.css'
import { div } from './dom'

let open = false

/** 密室探险: the game reads canned server replies (cmdN.xml) from its own folder. */
export function openMstx(): void {
  if (open) return
  open = true
  const host = div('mstx')
  const remove = openFrame(div('ui-mstx', host))
  window.qqpet.setFocusable(true)
  // The SWF calls this from its own script, and Ruffle cannot destroy an instance until that call returns.
  window.closeFrame = () =>
    setTimeout(() => {
      remove()
      window.qqpet.setFocusable(false)
      open = false
    })
  void new SwfPlayer(host).load('pet/mstx/main_qq_mstx.swf', 'pet/mstx/')
}
