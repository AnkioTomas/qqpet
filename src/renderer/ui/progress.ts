import './css/progress.css'
import { div } from './dom'

const bar = (cls: string, part: string): HTMLDivElement => {
  const d = div(cls)
  d.style.backgroundImage = `url(pet/stateInfo/lusejindutiao${part}.png)`
  return d
}

/** The original's green stat bar showing `n / m`. */
export function progress(n: number, m: number): HTMLElement {
  const line = div('background_line', bar('b_left', '00'), div('b_center', bar('b_c_back', '01')), bar('b_right', '02'))
  line.style.width = `${(n / m) * 100}%`
  const root = div('ui-progress', div('progress por fcc', line, div('seeNum fs10 z30 wsnw', `${n | 0} / ${m}`)))
  root.style.height = '100%'
  return root
}
