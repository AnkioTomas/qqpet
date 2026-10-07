import GAMES from '../pet/data/games.json'
import { speak } from '../pet/pet'
import { addInfo, growthPerMinute, info, save, setInfo } from '../pet/store'
import { addCount, count } from '../pet/tasks'
import { openBox } from './box'
import './css/games.css'
import { button, div } from './dom'
import { floatMood } from './float'

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
