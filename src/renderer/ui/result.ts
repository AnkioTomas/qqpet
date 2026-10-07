import type { Good } from '../pet/data/goods'
import './css/result.css'
import { button, div, img } from './dom'

/** The task and sign-in panels' overlay over `host`: the goods just received, or `msg` when there are none. */
export function showResult(host: HTMLElement, goods: Good[], msg = ''): void {
  const body = goods.length
    ? div(
        'grb_mgs fcw',
        ' 你领取了 ',
        ...goods.map((g) =>
          div(
            'grb_goods fcC p8',
            Object.assign(img('e_goodImgs', g.url), { title: `${g.outOfPrint ? '绝版：' : ''}${g.name}*${g.num}` }),
            div('pt4', `${g.name}*${g.num}`),
          ),
        ),
      )
    : div('grb_mgs', msg)
  const mark = div(
    'markFull fcc',
    div(
      'getResult',
      div(
        'getResultBorder fcC',
        body,
        button('but_small fcc mt8', () => mark.remove(), '确定'),
      ),
    ),
  )
  host.append(mark)
}
