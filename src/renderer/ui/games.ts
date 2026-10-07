import GAMES from '../pet/data/games.json'
import { info } from '../pet/store'
import { openBox } from './box'
import './css/games.css'
import { button, div } from './dom'

let open = false

/** Game picker; each game opens in its own window. */
export function openGames(): void {
  if (open) return
  open = true
  const tabs = div('gameTabs', ...GAMES.map((c, i) => button('gameTab', () => show(i), c.name)))
  const list = div('gameList')
  function show(i: number): void {
    tabs.querySelectorAll('.gameTab').forEach((t, j) => t.classList.toggle('active', i === j))
    const c = GAMES[i]
    list.replaceChildren(
      ...c.games.map((g) =>
        Object.assign(
          button('gameItem', () => window.qqpet.openGame(`${c.dir}/${g}.swf`), g),
          { title: g },
        ),
      ),
    )
  }
  show(0)
  openBox(div('ui-games', tabs, list), { vip: info.pinkDiamond, onClose: () => (open = false) })
}
