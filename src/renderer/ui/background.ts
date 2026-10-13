import { goodOf } from '../pet/data/goods'
import { onGoodsChange } from '../pet/goods'
import { save } from '../pet/store'

const petEl = document.getElementById('pet')!

/** The equipped scene sits behind the transparent action players and moves with the pet. */
function draw(): void {
  const bg = save.selfGoodUseOption.background
  petEl.style.backgroundImage = bg && bg.left > 0 && bg.id !== 'b0000000' ? `url("${goodOf('background', bg.id).url}")` : ''
}

draw()
onGoodsChange((type) => {
  if (type === 'background') draw()
})
