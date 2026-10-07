import GAMES from '../pet/data/games.json'
import { speak } from '../pet/pet'
import { addInfo, growthPerMinute, info, save, setInfo } from '../pet/store'
import { addCount, count } from '../pet/tasks'
import { openBox } from './box'
import './css/games.css'
import { button, div } from './dom'
import { floatMood } from './float'
import { playSmallGame, SMALL_GAMES } from './smallgame'

let open = false

/** Played minutes a day that earn rewards: 5 元宝, 2 mood and a minute's growth each. */
const DAY_MINUTES = 60

window.qqpet.onGamePlayed((minutes) => {
  if (minutes < 1) return
  addCount('GameRound')
  const m = Math.min(Math.floor(minutes), DAY_MINUTES - count('Game'))
  if (m <= 0) return speak({ s: '[host]，今天小游戏玩得够多啦，休息一下眼睛吧~', now: true }, 'speak')
  addCount('Game', m)
  addInfo('yb', 5 * m)
  addInfo('growth', +(growthPerMinute() * m).toFixed(8))
  setInfo('mood', Math.min(info.mood + 2 * m, save.petComputedlInfo.moodMax))
  void floatMood(2 * m)
  speak({ s: `[host]，陪我玩了${m}分钟小游戏，好开心！获得${5 * m}元宝~`, now: true }, 'speak')
})

/** Game picker: the desktop games play with the pet, the rest open in their own window. */
export function openGames(): void {
  if (open) return
  open = true
  const cats = [
    {
      name: '陪我玩',
      games: SMALL_GAMES.map((g) => ({
        name: g.name,
        run: () => {
          close()
          open = false
          playSmallGame(g)
        },
      })),
    },
    ...GAMES.map((c) => ({ name: c.name, games: c.games.map((g) => ({ name: g, run: () => window.qqpet.openGame(`${c.dir}/${g}.swf`) })) })),
  ]
  const tabs = div('gameTabs', ...cats.map((c, i) => button('gameTab', () => show(i), c.name)))
  const list = div('gameList')
  function show(i: number): void {
    tabs.querySelectorAll('.gameTab').forEach((t, j) => t.classList.toggle('active', i === j))
    list.replaceChildren(...cats[i].games.map((g) => Object.assign(button('gameItem', g.run, g.name), { title: g.name })))
  }
  show(0)
  const close = openBox(div('ui-games', tabs, list), { vip: info.pinkDiamond, onClose: () => (open = false) })
}
