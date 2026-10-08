import { SwfPlayer } from '../swf/player'
import { openFrame } from './box'
import './css/mstx.css'
import { div, touch } from './dom'
import { gamepad } from './gamepad'

let open = false

/** 密室探险: the game reads canned server replies (cmdN.xml) from its own folder. */
export function openMstx(): void {
  if (open) return
  open = true
  const host = div('mstx')
  const ui = div('ui-mstx', host)
  const remove = openFrame(ui)
  window.qqpet.setFocusable(true)
  // The SWF calls this from its own script, and Ruffle cannot destroy an instance until that call returns.
  window.closeFrame = () =>
    setTimeout(() => {
      remove()
      window.qqpet.setFocusable(false)
      open = false
    })
  const player = new SwfPlayer(host)
  void player.load('pet/mstx/main_qq_mstx.swf', 'pet/mstx/')
  // It walks by the arrow keys and uses items by A/S/D.
  if (touch) gamepad(player.el, 'mstx', ui, () => window.closeFrame())
}
