import { describe, type Good, type GoodType } from '../pet/data/goods'
import { listGoods, onGoodsChange, pageOf, type Page } from '../pet/goods'
import { doctor, pay, useItem } from '../pet/items'
import { describeStudy, describeWork, study, studyGoods, work, workGoods } from '../pet/jobs'
import { speak } from '../pet/pet'
import { info, onInfoChange, petSize, save } from '../pet/store'
import { openPinkDiamond } from '../pet/vip'
import './css/control.css'
import { formatDate } from './date'
import { button, div, img } from './dom'
import { openEmail } from './email'
import { openFishing } from './fishing'
import { openGames } from './games'
import { openMstx } from './mstx'
import { openPetInfo } from './petinfo'
import { progress } from './progress'
import { openSetup } from './setup'
import { openShop } from './shop'
import { openSignIn } from './signin'
import { setBubbleLift } from './talk'
import { openTask } from './task'
import { openTravel } from './travel'
import { windowView } from './window-view'

const ICONS = 'pet/control/icons/'
const BAR_HEIGHT = 180
const PAGE = 4

type Stat = 'hunger' | 'clean' | 'health' | 'mood'

/** A list of goods to pick from, 4 per page. */
interface Panel {
  icon: string
  list: (page: number) => Page
  lines: (g: Good) => string[]
  /** Returns true when the panel should close. */
  use: (g: Good) => boolean
  /** Everyday panels: the inventory type shown, with the bar of the stat it restores and a shop link. */
  type?: GoodType
  stat?: Stat
}

interface Entry {
  name: string
  icon: string
  run: () => void
}

const activeIcon = (n: number): string => `${ICONS}active/${n}.svg`

const inventory = (type: GoodType, icon: number, stat: Stat) => (): void =>
  openPanel({
    icon: activeIcon(icon),
    list: (page) => listGoods(type, page, PAGE),
    lines: (g) => [...describe(g), `数量：${g.num}`],
    use: (g) => {
      useItem(g)
      return false
    },
    type,
    stat,
  })

const PANELS = {
  food: inventory('food', 18, 'hunger'),
  clean: inventory('clean', 20, 'clean'),
  medicine: inventory('medicine', 22, 'health'),
  toy: inventory('toy', 28, 'mood'),
}

function pinkDiamond(): void {
  const until = (): void => speak({ s: `[host],我们粉钻到${formatDate(info.PDiamondExpirationDate, 'YYYY-MM-DD HH:mm')}过期哦~`, now: true }, 'speak')
  if (info.pinkDiamond) return until()
  const first = info.PDgrowth === 0
  const price = first ? 666 : info.PDiamondLevel * 888
  windowView({
    title: '开通粉钻',
    msg: first ? '限时花费666（原价888）元宝，开通粉钻5天，机不可失！~~' : `开通粉钻需要${price}元宝，开通粉钻5天，助力宝宠成长玩耍~~`,
    ok: (close) => {
      if (!pay(price)) return
      openPinkDiamond(5)
      close()
      until()
    },
  })
}

/** A menu group opens its children on hover, or runs `run` on click. */
const MENU: { name: string; icon: string; children?: Entry[]; run?: () => void }[] = [
  {
    name: '日常',
    icon: 'richang.png',
    children: [
      { name: '食物', icon: 'weishi.png', run: PANELS.food },
      { name: '清洁', icon: 'qingjie.png', run: PANELS.clean },
      { name: '吃药', icon: 'zhibing.png', run: PANELS.medicine },
      { name: '玩具', icon: 'wanshua.png', run: PANELS.toy },
    ],
  },
  { name: '粉钻', icon: 'fenzhuan.png', run: pinkDiamond },
  {
    name: '交互',
    icon: 'chongwu.png',
    children: [
      {
        name: '打工',
        icon: 'dagong.png',
        run: () => openPanel({ icon: activeIcon(26), list: (page) => pageOf(workGoods(), page, PAGE), lines: describeWork, use: work }),
      },
      {
        name: '学习',
        icon: 'xuexi.png',
        run: () => openPanel({ icon: activeIcon(24), list: (page) => pageOf(studyGoods(), page, PAGE), lines: describeStudy, use: study }),
      },
      { name: '旅游', icon: 'lvyou.png', run: openTravel },
      { name: '看病', icon: 'zhibing.png', run: doctor },
    ],
  },
  {
    name: '工具',
    icon: 'renwu.png',
    children: [
      { name: '邮箱', icon: 'haoyou.png', run: openEmail },
      { name: '任务', icon: 'renwu1.png', run: openTask },
      { name: '签到', icon: 'juanzhou00.png', run: openSignIn },
      { name: '设置', icon: 'guanli.png', run: openSetup },
    ],
  },
  {
    name: '活动',
    icon: 'gonggao.png',
    children: [
      { name: '池塘', icon: 'fish01.png', run: openFishing },
      { name: '游戏', icon: 'game.svg', run: openGames },
      { name: '密室', icon: 'mstx.png', run: openMstx },
    ],
  },
  { name: '档案', icon: 'dangan.png', run: openPetInfo },
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
      ...(g.children
        ? [div('childrenMenu', ...g.children.map((c) => button('childrenMenuItem fc', c.run, img('childrenMenuItemIcon', ICONS + c.icon), ` ${c.name}`)))]
        : []),
    )
    if (g.run) item.addEventListener('click', g.run)
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

/** Shows the bar with an everyday goods panel open. */
export function openGoods(type: keyof typeof PANELS): void {
  showControl()
  PANELS[type]()
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
  const { list: goods, totalPage } = p.list(page)
  const turn = (d: number) => (): void => {
    if (page + d >= 1 && page + d <= totalPage) openPanel(p, page + d)
  }
  const items = goods.map((g: Good) =>
    div(
      'goodItem',
      div(
        'goodItemIconBox fcc',
        div('goodInfo', div('goodName', g.name), ...p.lines(g).map((l) => div('goodDatas', l))),
        Object.assign(img('goodItemIcon', g.url), {
          onclick: () => {
            if (p.use(g)) closePanel()
          },
        }),
      ),
    ),
  )
  const next = div(
    'goodList focusPress',
    img('goodTypeIcon', p.icon),
    ...(p.stat ? [button('toShoppingMall', openShop, '去购物')] : []),
    button('goodClose', closePanel),
    div(
      'goodListMain fcc',
      button('toLeft', turn(-1)),
      div(
        'goods f1 fC h100',
        div('fc f1', ...(items.length ? items : [div('goodsNone tc w100', ' 空空如也~~ ')])),
        ...(p.stat ? [div('progress', progress(info[p.stat], save.petComputedlInfo[`${p.stat}Max`]))] : []),
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
  if (open?.type === type) openPanel(open, Math.min(open.page, Math.max(open.list(1).totalPage, 1)))
})
