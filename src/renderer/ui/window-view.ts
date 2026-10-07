import type { Good } from '../pet/data/goods'
import { openFrame } from './box'
import './css/window.css'
import { button, div, img } from './dom'

interface Dialog {
  title?: string
  msg: string
  goods?: Good[]
  /** Shows a quantity picker from 1 to max (initially max). */
  max?: number
  /** OK button; without it OK just closes. `num` is the picked quantity. */
  ok?: (close: () => void, num: number) => void
  /** The sweetheart skin. */
  sweet?: boolean
}

let closeCurrent = (): void => {}

/** The original's single "WindowView" alert: opening one replaces the previous. */
export function windowView(d: Dialog): void {
  closeCurrent()
  let num = d.max ?? 1
  const count = div('content', String(num))
  const step = (n: number): void => {
    num = Math.min(Math.max(num + n, 1), d.max!)
    count.textContent = String(num)
  }

  const main = div('main', div('msg', d.msg))
  if (d.goods?.length)
    main.append(
      div(
        'goods',
        ...d.goods.map((g) =>
          Object.assign(div('goodImgBox', img('goodImg', g.url)), {
            title: g.name,
          }),
        ),
      ),
    )
  if (d.max !== undefined) {
    main.append(
      div(
        'chooseNum fc',
        button('cutUpOver', () => step(-Infinity)),
        button('cutUp', () => step(-10)),
        button('cut', () => step(-1)),
        count,
        button('add', () => step(1)),
        button('addUp', () => step(10)),
        button('addUpOver', () => step(Infinity)),
      ),
    )
  }

  const view = div(d.sweet ? 'windowView sweetHeart' : 'windowView', ...(d.title ? [div('title', d.title)] : []), main)
  const close = openFrame(div('ui-window', view), d.sweet ? 'pet/windowTip/sweetHeart/sweetHeart.png' : 'pet/windowTip/alert/bg.png')
  closeCurrent = close
  view.append(
    button('windowViewBut', close),
    button('windowViewButSubmit', () => (d.ok ? d.ok(close, num) : close())),
  )
}
