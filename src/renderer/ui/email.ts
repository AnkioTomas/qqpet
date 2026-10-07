import type { Good } from '../pet/data/goods'
import { give } from '../pet/items'
import { save, update } from '../pet/store'
import { openFrame } from './box'
import './css/email.css'
import { formatDate } from './date'
import { button, div, img } from './dom'
import { frame } from './frame'

/** saveJsonData.email entries, keyed by `d` (unix seconds); a deleted mail keeps only its key. */
interface Live {
  d: number
  /** Title. */
  l: string
  glb: Good[]
  /** Claimed. */
  r?: boolean
  /** What the pet says on claiming. */
  m?: string
  e?: undefined
}
type Mail = Live | { d: number; e: true }

const BG = ['bg_01.png', 'bg_02.bmp', 'bg_03.png', 'bg_04.bmp', 'bg_05.bmp', 'bg_06.bmp', 'bg_8.png', 'bg_09.png', 'bg_10.png']

let open = false

/** Offline there is no mail server: only mail already in the save is shown. */
export function openEmail(): void {
  if (open) return
  open = true
  const mails: Record<string, Mail> = JSON.parse(save.saveJsonData.email || '{}')
  const live = (): Live[] => Object.values(mails).filter((m): m is Live => !m.e)
  const act = (list: Live[]): void => {
    for (const m of list) {
      if (m.r) mails[m.d] = { d: m.d, e: true }
      else {
        give(m.glb, m.m || '邮箱领取成功！')
        m.r = true
      }
    }
    update('saveJsonData', { email: JSON.stringify(mails) })
    render()
  }

  const emails = div('emails f1 h0')
  const render = (): void =>
    emails.replaceChildren(
      ...live().map((m) =>
        div(
          'email fc',
          div(m.r ? 'leftType yjImg' : 'leftType uyjImg'),
          div(
            'rightMain f1 fC w0',
            div('e_title', m.l),
            div('e_time', formatDate(m.d, 'YYYY-MM-DD HH:mm')),
            div('e_icons f1 mt2', div('e_goodImgsBox', ...m.glb.map((g) => Object.assign(img('e_goodImgs', g.url), { title: `${g.name}*${g.num}` })))),
          ),
          button(m.r ? 'fcc rgetEmail' : 'fcc getEmail', () => act([m]), m.r ? '删除' : '领取'),
        ),
      ),
    )
  render()

  const close = (): void => {
    closeFrame()
    open = false
  }
  const content = div(
    'Email fC',
    div('titleBox por fcc', div('title fcc', '邮箱'), button('close', close)),
    emails,
    div(
      'e_foot fcc',
      button('fcc wsnw getEmail getEmails', () => act(live().filter((m) => !m.r)), ' 一键领取 '),
      button('fcc wsnw rgetEmail rgetEmails', () => act(live().filter((m) => m.r)), ' 一键删除 '),
    ),
  )
  const closeFrame = openFrame(
    div(
      'ui-email',
      frame(content, (n) => `pet/email/${BG[n - 1]}`, [12, 12]),
    ),
  )
}
