import { askAs } from '../pet/ai'
import { dayText } from '../pet/calendar'
import { allGoods, findGood, parseGood, type Good } from '../pet/data/goods'
import { hasGood, takeGood } from '../pet/goods'
import { give } from '../pet/items'
import { loot } from '../pet/loot'
import { rand } from '../pet/rand'
import { info, save, update } from '../pet/store'
import { dayStart } from '../pet/vip'
import { openBox } from './box'
import './css/island.css'
import { button, div, img } from './dom'
import { openTask } from './task'

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

const PLACES: Record<number, string> = { 3: '夏帕海岸', 5: '粉钻雪山', 13: '百货店', 18: '教堂', 20: '咖啡厅', 21: '古堡森林', 22: '风语广场' }

/** 布袋长老's addressees: islanders whose own pages are gone, known by a piece of their URL. */
const POST = [
  { key: 'npc_lili', name: '莉莉', scene: 3 },
  { key: 'npc_qiongsi', name: '探险家琼斯', scene: 3 },
  { key: 'npc_ylcManage', name: '游乐场管理员', scene: 3 },
  { key: 'npc_jl.html', name: '杰里', scene: 3 },
  { key: 'npc_liangliang', name: '亮亮', scene: 5 },
  { key: 'npc_gjds', name: '管家苔丝', scene: 5 },
  { key: 'npc_ys.html', name: '伊苏', scene: 5 },
  { key: 'npc_zhoudabing', name: '周大饼', scene: 13 },
  { key: 'jiaotang/3', name: '梅奥', scene: 18 },
  { key: 'kf_index', name: '佐佐', scene: 20 },
  { key: 'ore2weapon', name: '亚瑟', scene: 21 },
  { key: 'npc_mumu', name: '木木', scene: 22 },
  { key: 'npc_saikm', name: '赛孔明', scene: 22 },
  { key: 'npc_luxika', name: '露西卡', scene: 22 },
  { key: 'npc_jianyuzhang', name: '监狱长', scene: 22 },
  { key: 'npc_jlll', name: '精灵乐乐', scene: 22 },
]
const SENDERS = ['小艾', '图图', '天使坏坏', '摩西', '菜菜', '融少', '饭饭']
const LETTERS = 5
const PIECES = 8
/** 天使坏坏 hands out a growth gift every this many levels. */
const TIER = 4
/** 小艾 asks for shop goods up to this price; her thanks are worth 100~300 元宝. */
const WANT_PRICE = 200

/** True island happenings for the daily paper; the AI only writes up the stories. */
const FACTS: News[] = [
  ['布袋长老招信使', '风语广场的布袋长老每天有5封信要送，帮他跑腿能拿元宝，一个地方的岛民都收到过信还有大礼包。'],
  ['图图的宝藏图', '风语广场的图图每天发一张宝藏图碎片，集齐8张就能挖宝藏。'],
  ['天使坏坏的成长礼', '宠物每长4级，就能去风语广场找天使坏坏领成长奖励。'],
  ['小艾的爱心任务', '夏帕海岸的小艾每天都想要一样东西，帮她找来有谢礼。'],
  ['摩西邀你钓鱼', '夏帕海岸的摩西在码头摆好了鱼竿，钓上来的鱼能换元宝。'],
  ['大乐斗擂台开张', '风语广场的菜菜和融少在等挑战者，快去乐斗一番。'],
  ['教堂密室', '教堂里的密室藏着一道道谜题，听说解开的企鹅都有收获。'],
  ['小游戏天天玩', '竞技场的跆拳道、游乐场的搭积木、小学课堂的好好学习，随时等你来玩。'],
]
const REPORTER = '你是QQ宠物企鹅岛《企鹅日报》的小记者。'

const GUIDE: News[] = [
  ['风语广场', '布袋长老送信、图图宝藏图、天使坏坏成长奖励，还有菜菜和融少的大乐斗。'],
  ['夏帕海岸', '小艾的爱心任务、摩西钓鱼、饭饭端盘子、冒险岛。'],
  ['竞技场 / 超级游乐场', '跆拳道、搭积木。'],
  ['小学课堂 / 教堂', '好好学习、密室逃脱。'],
  ['右边的导航', '点推荐活动、休闲游戏里的名字，企鹅会自己走过去；区域导航能直接去各个地方。'],
]

/** A heading and its text. */
type News = [string, string]

/** Kept in saveJsonData.island; the daily fields restart at 06:00. */
interface State {
  day: number
  sent: number
  /** POST key of the letter being carried, or ''. */
  letter: string
  note: string
  /** POST keys that ever got a letter, and scenes whose islanders all did (gift given). */
  lit: string[]
  lamps: number[]
  /** Growth gifts claimed, in TIER levels. */
  tier: number
  pieces: number
  piece: boolean
  /** Good id 小艾 asks for today. */
  want: string
  loved: boolean
  news: News[]
}

const state: State = {
  day: 0,
  sent: 0,
  letter: '',
  note: '',
  lit: [],
  lamps: [],
  tier: 0,
  pieces: 0,
  piece: false,
  want: '',
  loved: false,
  news: [],
  ...JSON.parse(save.saveJsonData.island || '{}'),
}
const store = (): void => update('saveJsonData', { island: JSON.stringify(state) })

function today(): State {
  if (state.day === dayStart()) return state
  const level = save.petComputedlInfo.level
  const wants = (['food', 'toy', 'clean'] as const)
    .flatMap((t) => allGoods(t))
    .filter((g) => g.price! > 0 && g.price! <= WANT_PRICE && !g.PD && !g.outOfPrint && (g.needLevel ?? 0) <= level)
  Object.assign(state, { day: dayStart(), sent: 0, letter: '', note: '', piece: false, want: pick(wants).id, loved: false, news: [] })
  store()
  return state
}

/** An islander's line; `fallback` when AI is off or fails. */
async function voice(npc: string, prompt: string, fallback: string): Promise<string> {
  const who = `你是QQ宠物企鹅岛社区里的「${npc}」，正在和小企鹅「${info.name}」说话。只写你说出口的话，不写动作和旁白，不加名字前缀和引号。`
  const text = await askAs(who, [{ role: 'user', content: `${prompt}只输出这句话。` }])
  return text?.replace(/^[「“"]+|[」”"]+$/g, '') || fallback
}

let closeTalk = (): void => {}

/** An islander's dialog: what they say, the goods shown and an optional button. Opening one replaces the last. */
function talk(name: string, body: (Node | string)[], goods: Good[] = [], action?: [string, () => void]): void {
  closeTalk()
  const box = div('island fC', div('i_title', name), div('i_body f1', ...body.map((b) => div('i_line', b))))
  if (goods.length) box.append(div('i_goods', ...goods.map((g) => div('i_good', img('goodImg', g.url), `${g.name}*${g.num}`))))
  if (action)
    box.append(
      button(
        'but_small i_ok',
        () => {
          closeTalk()
          action[1]()
        },
        action[0],
      ),
    )
  closeTalk = openBox(div('ui-island', box))
}

const rows = (list: News[]): HTMLElement[] => list.map(([h, t]) => div('i_row', div('i_head', h), t))

async function letter(): Promise<void> {
  const s = today()
  const to = POST.find((p) => p.key === s.letter)
  if (to) return talk('布袋长老', [`信还没送到呢！快去${PLACES[to.scene]}找${to.name}吧。`, `「${s.note}」`])
  if (s.sent >= LETTERS) return talk('布袋长老', ['今天的信都送完啦，明天再来帮老头子跑腿吧~'])
  const left = POST.filter((p) => !s.lit.includes(p.key))
  const next = pick(left.length ? left : POST)
  const from = pick(SENDERS)
  const where = `${PLACES[next.scene]}的${next.name}`
  const note = await voice(from, `你托布袋长老给${where}捎一封信，说出信里写的一句话。`, `${next.name}，好久不见，有空来风语广场玩呀！`)
  talk('布袋长老', [`${from}有封信要交给${where}，帮老头子跑一趟吧！（今天第${s.sent + 1}/${LETTERS}封）`, `「${note}」`], [], [
    '接下这封信',
    () => {
      s.letter = next.key
      s.note = note
      store()
    },
  ])
}

/** The carried letter's addressee was clicked (`url` is their page): hand it over. False for anyone else. */
export function deliver(url: string): boolean {
  const s = today()
  const to = POST.find((p) => p.key === s.letter && url.includes(p.key))
  if (!to) return false
  const note = s.note
  s.letter = ''
  s.sent++
  if (!s.lit.includes(to.key)) s.lit.push(to.key)
  const lamp = !s.lamps.includes(to.scene) && POST.every((p) => p.scene !== to.scene || s.lit.includes(p.key))
  if (lamp) s.lamps.push(to.scene)
  store()
  const goods = [parseGood(`_yb*${rand(5, 20) * 10 + (lamp ? 500 : 0)}`), ...(lamp ? loot(3) : [])]
  give(goods, '[host],我们帮布袋长老把信送到啦！~~')
  const lit = lamp ? `${PLACES[to.scene]}的岛民都收到过信啦，送你一份大礼包！` : `已经给${s.lit.length}/${POST.length}位岛民送过信。`
  void voice(to.name, `${info.name}帮布袋长老给你送来一封信，信上写着「${note}」。读完信，对它说一句话。`, '谢谢你帮我送信！').then((line) =>
    talk(to.name, [line, lit], goods),
  )
  return true
}

async function growth(): Promise<void> {
  const s = today()
  const level = save.petComputedlInfo.level
  const tier = Math.floor(level / TIER)
  if (tier <= s.tier) return talk('天使坏坏', [`每长${TIER}级来找我领一次成长奖励哦，${(s.tier + 1) * TIER}级的时候再来吧~`])
  const n = tier - s.tier
  s.tier = tier
  store()
  const goods = [parseGood(`_yb*${200 * n}`), ...loot(n)]
  give(goods, '[host],天使坏坏送了我们成长奖励！~~')
  talk('天使坏坏', [await voice('天使坏坏', `${info.name}长到${level}级了，夸夸它，送它成长奖励。`, `哇，${level}级啦，长得真快！这是给你的成长奖励~`)], goods)
}

function treasure(): void {
  const s = today()
  if (s.piece) return talk('图图', [`今天的碎片已经给过你啦，明天再来吧！现在有${s.pieces}/${PIECES}张。`])
  s.piece = true
  s.pieces++
  const full = s.pieces >= PIECES
  if (full) s.pieces = 0
  store()
  if (!full) return talk('图图', [`给你一张宝藏图碎片！现在有${s.pieces}/${PIECES}张，集齐${PIECES}张就能挖宝藏。`])
  const goods = [parseGood('_yb*500'), ...loot(4)]
  give(goods, '[host],我们拼好宝藏图挖到宝藏啦！~~')
  talk('图图', [`${PIECES}张碎片拼成了完整的宝藏图，挖到宝藏啦！`], goods)
}

async function love(): Promise<void> {
  const s = today()
  if (s.loved) return talk('小艾', ['谢谢你今天的爱心，明天再来看看我吧~'])
  const want = findGood(s.want)
  if (!hasGood(want.type, want.id))
    return talk('小艾', [await voice('小艾', `你今天想要一个「${want.name}」，请${info.name}帮你找一个来。`, `我今天想要一个${want.name}，你能帮我找一个来吗？`)], [want])
  talk('小艾', [`你带来了${want.name}！可以送给我吗？`], [want], [
    '送给小艾',
    () => {
      if (!takeGood(want)) return
      s.loved = true
      store()
      const goods = [parseGood(`_yb*${rand(10, 30) * 10}`), ...loot(1)]
      give(goods, '[host],我们完成了小艾的爱心任务！~~')
      talk('小艾', ['太谢谢你啦！这是我的一点心意~'], goods)
    },
  ])
}

let paper: Promise<News[]> | null = null
let paperDay = 0

const digits = (s: string): string => (s.match(/\d+/g) ?? []).join()

async function write(): Promise<News[]> {
  const now = new Date()
  const out: News[] = [['岛务公告', `今天是${now.getMonth() + 1}月${now.getDate()}日，${dayText()}。祝岛民们玩得开心！`]]
  for (const [head, fact] of [...FACTS].sort(() => Math.random() - 0.5).slice(0, 4)) {
    const line = await askAs(REPORTER, [{ role: 'user', content: `把这件事写成岛报新闻的正文，一两句话，只输出正文。事情：${fact}` }])
    const body = line?.replace(/^正文[：:]/, '')
    // Small models change the numbers now and then; those keep the plain fact.
    out.push([head, body && digits(body) === digits(fact) ? body : fact])
  }
  state.news = out
  store()
  return out
}

/** Today's island paper, written once a day. */
async function openNews(): Promise<void> {
  const s = today()
  if (paperDay !== s.day) {
    paperDay = s.day
    paper = s.news.length ? Promise.resolve(s.news) : write()
  }
  if (!s.news.length) talk('今日关注', ['小记者正在赶稿，马上就好……'])
  talk('今日关注', rows(await paper!))
}

const openGuide = (): void => talk('社区向导', rows(GUIDE))

/** Island pages by a piece of their URL: the NPC errands, and the navigation bar's three buttons. */
export const ISLAND: Record<string, () => void> = {
  npc_bdzl: () => void letter(),
  npc_tshh: () => void growth(),
  npc_tutu: treasure,
  npc_xiaoai: () => void love(),
  stf_index: openGuide,
  'qqpet://news': () => void openNews(),
  'qqpet://guide': openGuide,
  'qqpet://task': openTask,
}
