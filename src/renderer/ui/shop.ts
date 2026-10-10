import { describe, goodOf, TYPE_NAMES, type Good, type GoodType } from '../pet/data/goods'
import SHOP from '../pet/data/shop.json'
import { listGoods, onGoodsChange } from '../pet/goods'
import { buy, discount, price, useItem } from '../pet/items'
import { speak } from '../pet/pet'
import { avatar, info, onInfoChange, save } from '../pet/store'
import { openFrame } from './box'
import './css/shop.css'
import { button, div, img } from './dom'
import { windowView } from './window-view'

interface Tab {
  label: string
  cls: string
  children: { label: string; type: GoodType }[]
}

const MINE: Tab[] = [
  {
    label: '喂养',
    cls: 'selfwy',
    children: [
      { label: '食品', type: 'food' },
      { label: '日用品', type: 'clean' },
      { label: '药品', type: 'medicine' },
    ],
  },
  {
    label: '功能',
    cls: 'selfgn',
    children: [
      { label: '玩具', type: 'toy' },
      { label: '属性', type: 'nums' },
    ],
  },
  {
    label: '装扮',
    cls: 'selfzb',
    children: [{ label: '背景', type: 'background' }],
  },
]

const MALL: Tab[] = [
  {
    label: '推荐',
    cls: 'shopTj',
    children: [
      { label: '食品', type: 'food' },
      { label: '日用品', type: 'clean' },
      { label: '药品', type: 'medicine' },
    ],
  },
  {
    label: '喂养',
    cls: 'shopWy',
    children: [
      { label: '食品', type: 'food' },
      { label: '日用品', type: 'clean' },
      { label: '药品', type: 'medicine' },
    ],
  },
  {
    label: '功能',
    cls: 'shopGN',
    children: [
      { label: '玩具', type: 'toy' },
      { label: '属性', type: 'nums' },
    ],
  },
  {
    label: '装扮',
    cls: 'shopZB',
    children: [{ label: '背景', type: 'background' }],
  },
]

/** Item ids per mall tab, type and page. */
const PAGES = SHOP as Record<string, Partial<Record<GoodType, string[][]>>>
/** Ids the mall sells. */
export const SOLD = new Set(Object.values(PAGES).flatMap((tab) => Object.values(tab).flat(2)))

/** Where the "add to cart" image of mall slot k (two per row) starts, and where it flies to. */
const slot = (k: number): { x: number; y: number } => ({
  x: k % 2 ? 590 : 375,
  y: 117 + 119 * Math.floor(k / 2),
})
const CART = { x: 715, y: 550 }

/** Why a good can't be bought: 1 level too low, 2 pink diamond only. */
const blocked = (g: Good): 0 | 1 | 2 => (g.needLevel ? (g.needLevel > save.petComputedlInfo.level ? 1 : 0) : g.PD && !info.pinkDiamond ? 2 : 0)

/** Tab strip plus sub tabs, as both halves of the original shop draw them. */
function tabs(prefix: 'lscb' | 'rscb', list: Tab[], tab: number, sub: number, pick: (tab: number, sub: number) => void): HTMLElement[] {
  return [
    div(`${prefix}_top`, ...list.map((t, i) => button(`${prefix}_t_onve ${t.cls}${i === tab ? ' active' : ''}`, () => i !== tab && pick(i, 0)))),
    div(
      `${prefix}_dowm`,
      ...list[tab].children.map((c, i) =>
        button(`${prefix}_dowmOnce${i === sub ? ' active' : ''}`, () => i !== sub && pick(tab, i), div(`${prefix}_dowmOnceText`, c.label)),
      ),
    ),
  ]
}

function pager(prefix: 'lsfb' | 'rsfb', page: number, total: number, go: (page: number) => void): HTMLElement[] {
  const to = (p: number) => (): void => {
    if (p >= 1 && p <= total && p !== page) go(p)
  }
  return [
    Object.assign(button(`${prefix}_upMore`, to(1)), { title: '第一页' }),
    Object.assign(button(`${prefix}_up`, to(page - 1)), { title: '上一页' }),
    div(`${prefix}_text fcc`, div(`${prefix}_current`, String(page)), ' / ', div(`${prefix}_totalPage`, String(total))),
    Object.assign(button(`${prefix}_down`, to(page + 1)), { title: '下一页' }),
    Object.assign(button(`${prefix}_downMore`, to(total)), {
      title: '最后一页',
    }),
  ]
}

const tooltip = (g: Good): HTMLElement => div('goodFloatMsg', div('goodName', g.name), ...describe(g).map((l) => div('goodDatas', l)))

let close: (() => void) | null = null

/** The shop: own inventory on the left, the mall on the right, and a cart. */
export function openShop(): void {
  if (close) return
  const left = div('leftSelf')
  const right = div('rightShpping')
  const cartList = div('cartGoodList')
  const cartCount = div('cg_total fcc')
  const cartTotal = div('cg_totalPay f1 fcc')
  const cartMark = div('markFull fcc')
  const busyMark = div('markFull fcc', '购买中，请稍后···')
  const fly = div('markFullNone')
  cartMark.style.display = busyMark.style.display = 'none'

  let mine = { tab: 0, sub: 0, page: 1 }
  let mall = { tab: 0, sub: 0, page: 1 }
  const cart = new Map<string, Good & { cartNum: number }>()

  function drawLeft(next = mine): void {
    mine = next
    const type = MINE[mine.tab].children[mine.sub].type
    // Using up the last good of the last page moves back a page.
    mine.page = Math.min(mine.page, Math.max(Math.ceil(save.selfGoodDatas[type].length / 6), 1))
    const { list, totalPage } = listGoods(type, mine.page, 6)
    const bg = save.selfGoodUseOption.background
    left.replaceChildren(
      div(
        'leftSelfHead',
        div(
          'leftSelfHeadBk por',
          ...(bg ? [div('backgroundTime', ` 背景剩余时间： ${bg.left | 0}分钟 `), img('backgroundImg', goodOf('background', bg.id).url)] : []),
          div('petImgBox fcc', img('petImg penguin_breathe', avatar())),
        ),
      ),
      div('leftSelfCenter', div('leftSelfCenterBk', ...tabs('lscb', MINE, mine.tab, mine.sub, (tab, sub) => drawLeft({ tab, sub, page: 1 })))),
      div(
        'leftSelfGoods',
        div(
          'leftSelfGoodsBk',
          div(
            'selfGoodList fc',
            ...list.map((g) =>
              div(
                'selfGood fc por',
                div('selfGoodImgBox por', tooltip(g), ...(g.PD ? [div('PD')] : []), img('selfGoodImg', g.url)),
                div('selfGoodinfo h100 pt8', div('selfGoodName', g.name), div('selfGoodNum', `剩余：${g.num}`)),
                button('selfGoodUse fcc', () => useItem(g), ' 使用 '),
              ),
            ),
          ),
        ),
      ),
      div(
        'leftSelfFoot',
        div(
          'leftSelfFootBk por',
          div('lsfb_yb', String(info.yb)),
          div('lsfb_pageMsg fcc', ...pager('lsfb', mine.page, totalPage, (page) => drawLeft({ ...mine, page }))),
        ),
      ),
    )
  }

  function drawRight(next = mall): void {
    mall = next
    const t = MALL[mall.tab]
    const pages = PAGES[t.cls][t.children[mall.sub].type] ?? []
    const goods = (pages[mall.page - 1] ?? []).map((id) => goodOf(t.children[mall.sub].type, id))
    right.replaceChildren(
      div('rightSelfHead', div('rightSelfHeadBk', ...tabs('rscb', MALL, mall.tab, mall.sub, (tab, sub) => drawRight({ tab, sub, page: 1 })))),
      div(
        'rightSelfCenter por',
        div(
          'rightSelfCenterBk',
          div(
            'rGoodList fc',
            ...goods.map((g, i) => {
              const why = blocked(g)
              const pic = img('rG_leftImg', g.url)
              const off = why ? ' disablePay' : ''
              return Object.assign(
                div(
                  'rGoods fC',
                  div('rG_title', g.name),
                  div(
                    'rG_top fc',
                    div('rG_leftImgBox fcc por', tooltip(g), ...(g.PD ? [div('PD')] : []), pic),
                    div(
                      'rG_rightInfo fC pl8',
                      div(
                        'rG_payYb f1',
                        ` 元宝：${g.price}/`,
                        Object.assign(document.createElement('span'), {
                          className: 'dpPay',
                          textContent: String(discount(g.price!)),
                        }),
                      ),
                      div('rG_payYb f1 mt8', '消耗不知名道具：0'),
                    ),
                  ),
                  div(
                    'rG_buts f1 fc',
                    div('rG_dj fc h100 f1 w0', `等级 ${g.needLevel || 0}`),
                    button(`rG_cart${off}`, () => !why && addToCart(g, pic, i)),
                    button(`rG_pay${off}`, () => !why && checkout([[g, 1]], false)),
                  ),
                ),
                { title: ['', '等级不足', '无粉钻会员'][why] },
              )
            }),
          ),
        ),
        div(
          'rightSelfPaging fc w100',
          div('f1'),
          div('paging fc', ...pager('rsfb', mall.page, pages.length, (page) => drawRight({ ...mall, page }))),
          button('shoppingCart por', () => {
            drawCart()
            cartMark.style.display = ''
          }),
        ),
      ),
      div('rightSelFoot', div('rightSelFootBk')),
    )
  }

  function addToCart(g: Good, pic: HTMLImageElement, k: number): void {
    const item = cart.get(g.id)
    if (item) item.cartNum++
    else cart.set(g.id, { ...g, cartNum: 1 })
    const from = slot(k)
    const copy = pic.cloneNode() as HTMLImageElement
    Object.assign(copy.style, {
      position: 'absolute',
      left: `${from.x}px`,
      top: `${from.y}px`,
      transition: 'all 500ms ease-in-out',
      opacity: '0.8',
    })
    fly.appendChild(copy)
    setTimeout(
      () =>
        Object.assign(copy.style, {
          left: `${CART.x}px`,
          top: `${CART.y}px`,
          transform: 'scale(0.2)',
          opacity: '0.2',
        }),
      50,
    )
    setTimeout(() => copy.remove(), 550)
  }

  function drawCart(): void {
    let count = 0
    let total = 0
    cartList.replaceChildren(
      ...[...cart.values()].map((g) => {
        count += g.cartNum
        total += g.cartNum * price(g)
        const step = (n: number) => (): void => {
          g.cartNum += n
          if (g.cartNum <= 0) cart.delete(g.id)
          drawCart()
        }
        return div(
          'cartGood fc',
          div('cg_name wsnw tc', g.name),
          div('cg_num wsnw tc', String(g.cartNum)),
          div('cg_type wsnw tc', TYPE_NAMES[g.type]),
          div('cg_price wsnw tc', String(price(g))),
          div('cg_buts fcc f1', button('cg_cutUp', step(-10)), button('cg_cut', step(-1)), button('cg_add', step(1)), button('cg_addDown', step(10))),
        )
      }),
    )
    cartCount.textContent = String(count)
    cartTotal.textContent = `${total} YB`
  }

  /** Buys the given goods behind the original's 0.5 s "buying" overlay; false when 元宝 run short. */
  function checkout(items: [Good, number][], quiet: boolean): boolean {
    const total = items.reduce((s, [g, n]) => s + price(g) * n, 0)
    if (info.yb < total) {
      windowView({ msg: '抱歉您的余额不足' })
      return false
    }
    busyMark.style.display = ''
    for (const [g, n] of items) buy(g, n, quiet)
    setTimeout(() => (busyMark.style.display = 'none'), 500)
    return true
  }

  const shop = div(
    'ui-shop',
    div(
      'shoppingMall fc',
      button('close', () => close?.()),
      left,
      right,
    ),
    div('mallFoot'),
    cartMark,
    busyMark,
    fly,
  )
  cartMark.appendChild(
    div(
      'shoppingCartMain por',
      button('cartClose', () => (cartMark.style.display = 'none')),
      cartList,
      div('totalMsg fc', cartCount, cartTotal),
      div('attributeTotal'),
      div(
        'scm_foot',
        button('qrzf', () => {
          if (
            !cart.size ||
            !checkout(
              [...cart.values()].map((g) => [g, g.cartNum]),
              true,
            )
          )
            return
          cart.clear()
          cartMark.style.display = 'none'
          setTimeout(() => speak({ s: '谢谢[host],帮我清空了购物车~~', now: true }, 'speak'), 500)
        }),
        button('jxgw', () => (cartMark.style.display = 'none')),
      ),
    ),
  )

  drawLeft()
  drawRight()
  redraw = { left: drawLeft, right: drawRight }
  const remove = openFrame(shop)
  close = () => {
    remove()
    close = redraw = null
  }
}

/** Redraw hooks are installed once; they act only while the shop is open. */
let redraw: { left: () => void; right: () => void } | null = null
onGoodsChange(() => redraw?.left())
onInfoChange((key) => {
  if (key === 'yb' || key === 'sex') redraw?.left()
  if (key === 'growth' || key === 'pinkDiamond') redraw?.right()
})
