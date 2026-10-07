import { describe, type Good, type GoodType } from '../pet/data/goods'
import { listGoods, onGoodsChange } from '../pet/goods'
import { doctor, useItem } from '../pet/items'
import { info, onInfoChange, petSize, save } from '../pet/store'
import './css/control.css'
import { button, div, img } from './dom'
import { progress } from './progress'
import { openShop } from './shop'
import { setBubbleLift } from './talk'

const ICONS = 'pet/control/icons/'
const BAR_HEIGHT = 180
const PAGE = 4

/** An inventory panel: goods of `type` with the bar of the stat they restore. */
interface Panel {
  type: GoodType
  icon: string
  stat: 'hunger' | 'clean' | 'health' | 'mood'
}

interface Entry {
  name: string
  icon: string
  run: () => void
}

const panel = (type: GoodType, icon: number, stat: Panel['stat']) => (): void => openPanel({ type, icon: `${ICONS}active/${icon}.svg`, stat })

const MENU: { name: string; icon: string; children: Entry[] }[] = [
  {
    name: '日常',
    icon: 'richang.png',
    children: [
      { name: '食物', icon: 'weishi.png', run: panel('food', 18, 'hunger') },
      { name: '清洁', icon: 'qingjie.png', run: panel('clean', 20, 'clean') },
      {
        name: '吃药',
        icon: 'zhibing.png',
        run: panel('medicine', 22, 'health'),
      },
      { name: '玩具', icon: 'wanshua.png', run: panel('toy', 28, 'mood') },
    ],
  },
  {
    name: '交互',
    icon: 'chongwu.png',
    children: [{ name: '看病', icon: 'zhibing.png', run: doctor }],
  },
]

const control = div('control')
control.dataset.hit = ''
document.body.appendChild(div('ui-control', control))

let shown = false
let hideTimer = 0
let introTimer = 0
let open: (Panel & { page: number }) | null = null

/** Centered under the pet; above it when there is no room below. */
function place(): void {
  const size = petSize()
  let top = info.lastY + size
  const onTop = top > innerHeight - 10 - BAR_HEIGHT
  if (onTop) top = info.lastY - BAR_HEIGHT
  control.style.left = `${Math.min(Math.max(info.lastX + size / 2, 10), innerWidth - 10)}px`
  control.style.top = `${top}px`
  setBubbleLift(shown && onTop ? BAR_HEIGHT : 0)
}

const icons: HTMLElement[] = []
const menus = div(
  'menus fcc',
  ...MENU.map((g) => {
    const icon = div('menuItemIconBox', img('menuItemIcon', ICONS + g.icon))
    icons.push(icon)
    const item = div(
      'menuItem fcc focusPress',
      div('menuTip', g.name),
      icon,
      div('childrenMenu', ...g.children.map((c) => button('childrenMenuItem fc', c.run, img('childrenMenuItemIcon', ICONS + c.icon), ` ${c.name}`))),
    )
    item.addEventListener('mouseenter', () => {
      clearTimeout(introTimer)
      highlight(-1)
      clearTimeout(hideTimer)
    })
    item.addEventListener('mouseleave', scheduleHide)
    return item
  }),
)
control.appendChild(menus)

const highlight = (n: number): void => icons.forEach((icon, i) => icon.classList.toggle('hoverMenuItemIcon', i === n))

/** Lights the menu icons up one after another when the bar appears. */
function intro(n = 0): void {
  highlight(n)
  if (n < icons.length) introTimer = window.setTimeout(() => intro(n + 1), 150)
}

/** Pressing the pet shows the bar. */
export function showControl(): void {
  if (save.isBury) return
  clearTimeout(hideTimer)
  if (shown) return
  shown = true
  control.classList.add('showControl')
  place()
  intro()
}

/** The bar hides 1.5 s after the pointer leaves it, unless an inventory panel is open. */
export function scheduleHide(): void {
  clearTimeout(hideTimer)
  if (open) return
  hideTimer = window.setTimeout(() => {
    shown = false
    control.classList.remove('showControl')
    place()
  }, 1500)
}

let list: HTMLElement | null = null

function openPanel(p: Panel, page = 1): void {
  open = { ...p, page }
  menus.style.display = 'none'
  const { list: goods, totalPage } = listGoods(p.type, page, PAGE)
  const turn = (d: number) => (): void => {
    if (page + d >= 1 && page + d <= totalPage) openPanel(p, page + d)
  }
  const items = goods.map((g: Good) =>
    div(
      'goodItem',
      div(
        'goodItemIconBox fcc',
        div('goodInfo', div('goodName', g.name), ...[...describe(g), `数量：${g.num}`].map((l) => div('goodDatas', l))),
        Object.assign(img('goodItemIcon', g.url), {
          onclick: () => useItem(g),
        }),
      ),
    ),
  )
  const next = div(
    'goodList focusPress',
    img('goodTypeIcon', p.icon),
    button('toShoppingMall', openShop, '去购物'),
    button('goodClose', closePanel),
    div(
      'goodListMain fcc',
      button('toLeft', turn(-1)),
      div(
        'goods f1 fC h100',
        div('fc f1', ...(items.length ? items : [div('goodsNone tc w100', ' 空空如也~~ ')])),
        div('progress', progress(info[p.stat], save.petComputedlInfo[`${p.stat}Max`])),
      ),
      button('toRight', turn(1)),
    ),
  )
  if (list) list.replaceWith(next)
  else control.appendChild(next)
  list = next
}

function closePanel(): void {
  open = null
  list?.remove()
  list = null
  menus.style.display = ''
  scheduleHide()
}

onInfoChange((key) => {
  if (key === 'lastX' || key === 'lastY' || key === 'growth') place()
  if (open && key === open.stat) openPanel(open, open.page)
})
onGoodsChange((type) => {
  if (open?.type === type) openPanel(open, Math.min(open.page, Math.max(listGoods(type, 1, PAGE).totalPage, 1)))
})
