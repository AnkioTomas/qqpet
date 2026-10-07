import { allGoods, describe, type GoodType } from '../pet/data/goods'
import POOLS from '../pet/data/pool.json'
import { pay } from '../pet/items'
import { birthdayGift, canDrawGrowth, drawGrowth, giftCost, monthSigns, signedToday, signin, signToday, takeOnlineGift } from '../pet/signin'
import { info, save } from '../pet/store'
import { dayStart } from '../pet/vip'
import { openBox } from './box'
import './css/signin.css'
import { button, div, img } from './dom'
import { showResult } from './result'
import { windowView } from './window-view'

const TYPES: { label: string; type: GoodType }[] = [
  { label: '食物', type: 'food' },
  { label: '日用品', type: 'clean' },
  { label: '玩具', type: 'toy' },
  { label: '药品', type: 'medicine' },
  { label: '背景', type: 'background' },
  { label: '属性', type: 'nums' },
]
const TIERS = ['史诗', '传承', '稀有']
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const DIGIT_H = 50

let open = false

/** Collected goods of `type`, per loot pool: the ones seen first. */
function illustrated(type: GoodType, shown: boolean[], redraw: () => void): HTMLElement[] {
  const byId = new Map(allGoods(type).map((g) => [g.id, g]))
  return POOLS.map((pool, i) => {
    const goods = pool.flatMap((code) => byId.get(code.slice(1)) ?? [])
    const seen = goods.filter((g) => save.illustrated.includes(g.id))
    const unseen = goods.filter((g) => !save.illustrated.includes(g.id))
    const card = (cls: string, title: string, url: string) => Object.assign(div(cls, img('', url)), { title })
    return div(
      'il_g_types',
      div(
        'tl_g_ctitle yqd fc',
        `${TIERS[i]}: (${seen.length} / ${goods.length}) `,
        button(
          'open ml16',
          () => {
            shown[i] = !shown[i]
            redraw()
          },
          shown[i] ? '收起' : '展开',
        ),
      ),
      div(
        shown[i] ? 'il_g_c_good w100 fcw' : 'il_g_c_good w100 fcw closeOpen',
        ...seen.map((g) => card('p4 il_g_card', `${g.name}：${describe(g).join('；') || '暂无介绍'}`, g.url)),
        ...unseen.map((g) => card('p4 il_g_cardnot', `${g.name}：${g.desc || '暂无介绍'}`, g.url)),
      ),
    )
  })
}

/** This month's days from Monday, the days before the 1st hidden. */
function calendar(): HTMLElement {
  const today = dayStart()
  const d = new Date(today * 1000)
  const [y, m] = [d.getFullYear(), d.getMonth()]
  const signed = monthSigns(y, m + 1)
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells = Array.from({ length: lead }, () => div('days hidden'))
  for (let k = 1; k <= days; k++) {
    const t = new Date(y, m, k, 6).getTime() / 1000
    const cls = ['days', t < today && 'pass', signed.includes(t) && 'haveGet', t === today && 'nowDay'].filter(Boolean).join(' ')
    cells.push(div(cls, String(k)))
  }
  return div('calendar', div('weekdays fcc', ...WEEK.map((w) => div('week f1', w))), div('daysBox fcw', ...cells))
}

/** A digit that rolls to its value. */
function digit(): { el: HTMLElement; set: (n: number) => void } {
  const nums = div('nums', ...Array.from({ length: 10 }, (_, n) => div('num fcc', String(n))))
  const el = div('activeNum', nums)
  for (const d of [el, ...nums.children] as HTMLElement[]) d.style.height = `${DIGIT_H}px`
  return { el, set: (n) => (nums.style.top = `-${DIGIT_H * n}px`) }
}

export function openSignIn(): void {
  if (open) return
  open = true
  const root = div('ui-signin')

  let type: GoodType = 'food'
  const shown = [true, true, true]
  const tiers = div('il_g_content w100')
  const tabbar = div('il_tabbar fc mt8')
  const drawLeft = (): void => {
    tabbar.replaceChildren(
      ...TYPES.map((t) =>
        button(
          t.type === type ? 'il_tt wsnw active' : 'il_tt wsnw',
          () => {
            type = t.type
            drawLeft()
          },
          t.label,
        ),
      ),
      ' （鼠标放入查看详情！~） ',
    )
    tiers.replaceChildren(...illustrated(type, shown, drawLeft))
  }
  drawLeft()
  const left = div('s_left f1 h100', div('sl_main fcc w100 h100', div('illustrated w100 h100', div('il_title', '图鉴'), tabbar, tiers)))

  const calendarBox = div('calendarBox')
  const signCount = div('yqd')
  const signBtn = button(
    'jrqd but_normal fcc mt8',
    () => {
      if (signedToday()) return
      showResult(root, signToday())
      refresh()
    },
    ' 今日签到 ',
  )
  const signView = div(
    's_right h100 fC',
    calendarBox,
    div(
      'toCollect f1 fcC',
      signCount,
      div('yqdTip', '签到有几率获得绝版物品哦~', document.createElement('br'), '快来试试吧！~'),
      signBtn,
      button('zxlb but_normal fcc mt16', () => view(1), ' 在线礼包 '),
    ),
  )

  const digits = [digit(), digit(), digit()]
  let lastDraw = signin.getGrowth?.[1] ?? signin.getGrowth?.[0] ?? [0, 0, 0]
  let drawing = false
  const drawBtn = button(
    'but_normal fcc mt8',
    () => {
      if (drawing || !canDrawGrowth()) return
      drawing = true
      const r = drawGrowth()
      lastDraw = r.digits
      refresh()
      setTimeout(() => {
        drawing = false
        refresh()
        showResult(root, r.goods, '你咋运气这么差呢！~再让你试一次吧~~')
      }, 600)
    },
    ' 抽成长值 ',
  )
  const online = div('mt8')
  const giftCount = div('')
  const giftBtn = button('mt8 but_normal fcc', () => {
    if (signin.isOnlineLastTime > 0) return
    const take = (): void => {
      showResult(root, takeOnlineGift())
      refresh()
    }
    const cost = giftCost()
    if (!cost) return take()
    const pd = info.pinkDiamond
    windowView({
      title: '在线礼包',
      msg: `${pd ? '尊贵的粉钻用户，' : '尊敬的宠主，'}确定花费${cost}${pd ? '元宝领取双份在线礼物么？' : '元宝领取在线礼物么？'}`,
      ok: (close) => {
        if (!pay(cost)) return
        close()
        take()
      },
    })
  })
  const giftView = div(
    's_right h100 fcC',
    div('s_toQD fcc w100', Object.assign(img('s_toQDImg', 'pet/signIn/qd.png'), { onclick: () => view(0) })),
    div(
      's_getGrowth mt16 fcC',
      div('sgt_top'),
      div('growths fcc mt8', ...digits.map((d, i) => div(`gNum g${i} fcc`, d.el))),
      drawBtn,
      div('sgt_tip fcC', div('', '免费抽取宠物成长值'), div('', '每日限一次'), div('', '（粉钻可额外抽取一次）')),
    ),
    div(
      's_onLine mt16 w100 fcC',
      img('s_gift', 'pet/signIn/gift.svg'),
      online,
      giftBtn,
      div('sgt_tip fcC', div('', '抽奖每10次必出高级物品'), giftCount, div('', '（粉钻可领取双倍奖励）')),
    ),
  )

  function refresh(): void {
    calendarBox.replaceChildren(div('cd_title', '本月签到'), calendar())
    const today = new Date(dayStart() * 1000)
    signCount.textContent = `本月已累计签到 ${monthSigns(today.getFullYear(), today.getMonth() + 1).length} 次`
    signBtn.classList.toggle('disable', signedToday())
    digits.forEach((d, i) => d.set(lastDraw[i]))
    drawBtn.classList.toggle('disable', !canDrawGrowth())
    online.textContent = `已在线 ${info.onlineDataTime | 0} 分钟`
    giftBtn.textContent = signin.isOnlineLastTime ? `剩余${signin.isOnlineLastTime | 0}分钟` : '点击领取'
    giftBtn.classList.toggle('disable', signin.isOnlineLastTime > 0)
    giftCount.textContent = `当前已抽取（${signin.onlineGiftNum}）次`
  }
  function view(n: 0 | 1): void {
    signView.style.display = n ? 'none' : ''
    giftView.style.display = n ? '' : 'none'
  }
  refresh()
  view(0)
  const timer = window.setInterval(refresh, 1000)
  setTimeout(() => {
    const goods = birthdayGift()
    if (goods.length) showResult(root, goods)
  }, 500)

  root.append(div('SignIn fc', left, signView, giftView))
  openBox(root, {
    vip: info.pinkDiamond,
    onClose: () => {
      clearInterval(timer)
      open = false
    },
  })
}
