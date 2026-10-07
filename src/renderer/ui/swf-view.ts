import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import { div } from './dom'

/** Plays a local SWF at its own size, scaled down to fit the screen. */
export async function openSwfViewer(): Promise<void> {
  const swf = await window.qqpet.pickSwf()
  if (!swf) return
  const url = URL.createObjectURL(new Blob([swf]))
  const stage = div('')
  stage.style.cssText = 'width:550px;height:400px'
  const player = new SwfPlayer(stage)
  window.qqpet.setFocusable(true)
  openBox(stage, {
    onClose: () => {
      URL.revokeObjectURL(url)
      window.qqpet.setFocusable(false)
    },
  })
  const { width, height } = await player.load(url)
  const k = Math.min(1, (innerWidth - 80) / width, (innerHeight - 120) / height)
  stage.style.width = `${width * k}px`
  stage.style.height = `${height * k}px`
}
