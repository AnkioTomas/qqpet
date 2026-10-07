import GAMES from '../pet/data/games.json'
import { info } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import './css/games.css'
import { button, div } from './dom'

const COLLAPSE =
  '<svg class="icon" viewBox="0 0 1024 1024" width="32" height="32"><path d="M102.4 0h307.2a512 512 0 0 1 0 1024H102.4V0z" fill="#409eff"/><path d="M396.62933368 512L611.53279968 726.76693299 563.19999968 775.099733 300.10026668 512 563.19999968 248.900267l48.264534 48.264533L396.69759968 512z" fill="#FFFFFF"/></svg>'
const ARROW =
  '<svg class="glc_icon" viewBox="0 0 1024 1024" width="24" height="24"><path d="M511 511.6m-448.5 0a448.5 448.5 0 1 0 897 0 448.5 448.5 0 1 0-897 0Z" fill="#24B8FF"/><path d="M488.6 602l193.3-193.3c12.3-12.3 32.4-12.3 44.7 0l0.4 0.4c12.3 12.3 12.3 32.4 0 44.7L533.7 647.1c-12.3 12.3-32.4 12.3-44.7 0l-0.4-0.4c-12.3-12.2-12.3-32.4 0-44.7z" fill="#FFFFFF"/><path d="M340.1 408.7L533.4 602c12.3 12.3 12.3 32.4 0 44.7l-0.4 0.4c-12.3 12.3-32.4 12.3-44.7 0L295 453.8c-12.3-12.3-12.3-32.4 0-44.7l0.4-0.4c12.3-12.3 32.4-12.3 44.7 0z" fill="#FFFFFF"/></svg>'

let open = false

export function openGames(): void {
  if (open) return
  open = true
  // SWF games need the keyboard; the window only takes focus while this is open.
  window.qqpet.setFocusable(true)
  const stage = div('f1 h100')
  const player = new SwfPlayer(stage)
  const side = div('')
  const shown = GAMES.map(() => false)
  let narrow = false
  let current = ''

  const play = (path: string): void => {
    current = path
    draw()
    void player.load(`pet/game/${path}`)
  }
  const item = (path: string, name: string, label: string): HTMLElement => {
    const d = Object.assign(div(path === current ? 'glc_item active' : 'glc_item', label), { title: name })
    d.addEventListener('click', (e) => {
      e.stopPropagation()
      play(path)
    })
    return d
  }
  function draw(): void {
    side.className = narrow ? 'gamesLeftControl isOpenMenu' : 'gamesLeftControl'
    const toggle = button(narrow ? 'glc_open glc_openIcon' : 'glc_open', () => {
      narrow = !narrow
      draw()
    })
    toggle.title = narrow ? '收起' : '展开'
    toggle.innerHTML = COLLAPSE
    side.replaceChildren(
      div('topSee', toggle),
      ...GAMES.map((c, i) => {
        const icon = Object.assign(div(shown[i] ? 'glc_cicon glc_openChildrenIcon' : 'glc_cicon'), { title: c.name, innerHTML: ARROW })
        const list = div(shown[i] ? 'glc_main glc_openChildren' : 'glc_main', ...c.games.map((g, j) => item(`${c.dir}/${g}.swf`, g, narrow ? String(j) : g)))
        list.style.maxHeight = shown[i] ? `${c.games.length * 50}px` : '0px'
        return button(
          'glc_menu',
          () => {
            shown[i] = !shown[i]
            draw()
          },
          div('glc_c', div('glc_title', `${narrow ? '' : c.name} `, icon), list),
        )
      }),
    )
  }

  const games = div('games fc')
  let full = false
  const fullBtn = button('toGetFocusable FullWindow', () => {
    full = !full
    resize()
  })
  function resize(): void {
    games.style.width = full ? `${innerWidth - 30}px` : '700px'
    games.style.height = full ? `${innerHeight - 30}px` : '600px'
    fullBtn.textContent = ` 全屏~！${full ? '-开' : '-关'}`
  }
  resize()
  const refocus = (): void => {
    window.qqpet.setFocusable(true)
    player.el.focus()
  }
  games.append(button('toGetFocusable', refocus, ' 键盘控制失效？，点击我试试！~！ '), fullBtn, side, stage)
  play(`${GAMES[0].dir}/${GAMES[0].games[0]}.swf`)

  openBox(div('ui-games', games), {
    vip: info.pinkDiamond,
    onClose: () => {
      window.qqpet.setFocusable(false)
      open = false
    },
  })
}
