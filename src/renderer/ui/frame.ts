import './css/frame.css'
import { div, img } from './dom'

/**
 * The original's 9-slice image frame ("imgBjBox") behind `content`, built
 * from `<base>01.png` .. `<base>09.png`; `sides` are the edge column widths.
 */
export function frame(content: HTMLElement, base: string, sides: [number, number]): HTMLElement {
  const src = (n: number): string => `${base}0${n}.png`
  const row = (cls: string, n: number): HTMLElement => div(`${cls} fcc`, img(`${cls}1`, src(n)), img(`${cls}2 f1`, src(n + 1)), img(`${cls}3`, src(n + 2)))
  const left = img('content1', src(4))
  const right = img('content3', src(6))
  left.style.width = `${sides[0]}px`
  right.style.width = `${sides[1]}px`
  const middle = div('content fcc f1', left, img('content2 f1 h100', src(5)), right)
  return div('imgBjBoxFrame', div('styleBox fC', row('head', 1), middle, row('foot', 7)), div('slotMain', content))
}
