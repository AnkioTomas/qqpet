import './css/progress.css'
import { div } from './dom'

interface Options {
  /** Blue above 60%, yellow above 20%, red below; green otherwise. */
  graded?: boolean
  /** Numbers only on hover. */
  hover?: boolean
  /** Replaces the `n / m` text. */
  text?: string
}

/** The original's stat bar filled to `n / m`. */
export function progress(n: number, m: number, o: Options = {}): HTMLElement {
  const r = n / m
  const color = !o.graded ? 'luse' : r > 0.6 ? 'blue' : r > 0.2 ? 'huangse' : 'hongse'
  const bar = (cls: string, part: string): HTMLDivElement => {
    const d = div(cls)
    d.style.backgroundImage = `url(pet/stateInfo/${color}jindutiao${part}.png)`
    return d
  }
  const line = div('background_line', bar('b_left', '00'), div('b_center', bar('b_c_back', '01')), bar('b_right', '02'))
  line.style.width = `${r * 100}%`
  const num = div(o.hover ? 'seeNum fs10 z30 wsnw hoverNum' : 'seeNum fs10 z30 wsnw', o.text ?? `${n | 0} / ${m}`)
  const root = div('ui-progress', div('progress por fcc', line, num))
  root.style.height = '100%'
  return root
}
