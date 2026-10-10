import { give } from '../pet/items'
import { readMails, writeMails, type Live } from '../pet/mail'
import { photoUrl } from '../pet/album'
import { openPhoto } from './album'
import { openFrame } from './box'
import './css/email.css'
import { formatDate } from './date'
import { button, div, img } from './dom'
import { frame } from './frame'

const BG = ['bg_01.png', 'bg_02.bmp', 'bg_03.png', 'bg_04.bmp', 'bg_05.bmp', 'bg_06.bmp', 'bg_8.png', 'bg_09.png', 'bg_10.png']

const PAGE = 3

let open = false

/** Mail from the save: the original's, and the welcome, birthday and holiday mails. */
export function openEmail(): void {
  if (open) return
  open = true
  const mails = readMails()
  // Newest first: keys are send times, and new mail must not land on the last page.
  const live = (): Live[] => Object.values(mails).filter((m): m is Live => !m.e).reverse()
  const act = (list: Live[]): void => {
    for (const m of list) {
      if (m.r) mails[m.d] = { d: m.d, e: true, k: m.k }
      else {
        give(m.glb, m.m || '邮箱领取成功！')
        m.r = true
      }
    }
    writeMails(mails)
    render()
  }

  let page = 0
  const emails = div('emails f1')
  const at = div('e_at tc')
  const prev = button('e_prev', () => render(page - 1))
  const next = button('e_next', () => render(page + 1))
  const render = (to = page): void => {
    const all = live()
    const last = Math.max(0, Math.ceil(all.length / PAGE) - 1)
    page = Math.min(Math.max(to, 0), last)
    prev.classList.toggle('off', page === 0)
    next.classList.toggle('off', page === last)
    at.textContent = `${page + 1}/${last + 1}`
    emails.replaceChildren(
      ...all.slice(page * PAGE, (page + 1) * PAGE).map((m) =>
        div(
          'email fc',
          div(m.r ? 'leftType yjImg' : 'leftType uyjImg'),
          div(
            'rightMain f1 fC w0',
            div('e_title', m.l),
            div('e_time', formatDate(m.d, 'YYYY-MM-DD HH:mm')),
            div(
              'e_icons f1 mt2',
              m.p
                ? button('e_photo', () => openPhoto(m.p!), img('e_photoImg', photoUrl(m.p)))
                : div('e_goodImgsBox', ...m.glb.map((g) => Object.assign(img('e_goodImgs', g.url), { title: `${g.name}*${g.num}` }))),
            ),
          ),
          button(m.r ? 'fcc rgetEmail' : 'fcc getEmail', () => act([m]), m.r ? '删除' : '领取'),
        ),
      ),
    )
  }
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
      div('e_pager fcc', prev, at, next),
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
