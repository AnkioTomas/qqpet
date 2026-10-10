import { askAs } from '../pet/ai'
import { info, save, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import './css/community.css'
import { div } from './dom'
import { openFishing } from './fishing'
import { arrive, chatted, ISLAND, meet, played, stage } from './island'
import { SAYS } from './island-talk'
import { openMstx } from './mstx'
import { openPetInfo } from './petinfo'
import { openSetup } from './setup'
import { openShop } from './shop'

const BASE = 'pet/petsoc/'
/** 夏帕海岸: SceneConfig matches the tiles we actually have. 企鹅镇's bg_V69 is missing from the dump. */
const TOWN = 3
const UIN = 66666666
/** 小艾旁边：草地/邮筒/长椅。1270,1020 是空沙滩，镜头跟过去就是一片白。 */
const PLAZA = { x: 800, y: 620 }
const DEAD = { x: 1270, y: 1020 }
/** Scenes whose tiles we have. 风语广场 (22) lost its bottom row, so its SceneConfig is cut to 9 rows. */
const SCENES = new Set([3, 5, 7, 8, 13, 15, 16, 18, 20, 21, 22, 23, 26, 27, 29, 30, 31, 32])
/** 夏帕海岸/粉钻雪山 were rebuilt as 24/25 (no tiles in the dump), yet 竞技场/粉钻雪山/度假村 exits already point there. */
const ALIAS: Record<number, number> = { 24: 3, 25: 5 }
const SPAWN: Record<number, { x: number; y: number }> = {
  3: PLAZA,
  5: { x: 1255, y: 1475 },
}

/** PetCommunityRes_1065.xml ResID → folder the SWF loads by itself. */
const RES: Record<string, string> = {
  CommunityMainFlash: 'world_1051.swf',
  NPCConfigure: 'Data/NpcList_1065',
  NavigationConfigure: 'Data/NavigationMap_1065',
  SceneConfigure: 'Data/SceneConfig_1065',
  MusicConfigure: 'Data/MusicConfig_3',
  LoadPanel: 'Data/LoadPanel/LoadPanel101',
  ServerInfo: 'ServerInfo4',
  WeatherSystem: 'Data/WeatherSystem/WeatherSystem2',
  MapConfigure: 'Data/MapCfg_1065',
  NpcRes: 'Data/Npc26',
  TitleCfg: 'title1064',
  TitleShow: 'Data/title_903',
  PetStatus: 'petstatusdesc2',
  StaticRes: 'StaticRes1041',
  Animation: 'Data/Animation_1042',
}

/** The community game open now; errands count it once it has been played a minute. */
let playing = ''
const game = (swf: string) => (): void => {
  playing = swf
  window.qqpet.openGame(`企鹅/${swf}.swf`)
}
/**
 * Some NPCs and the 新闻 button make Flash load a SWF from Tencent's dead game host itself, with no host call:
 * such a request opens whatever stands in for it, quietly when nothing does.
 */
const GONE = 'img.pet.qq.com/swf/games/'
const fetchNet = window.fetch
window.fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input)
  if (!url.includes(GONE)) return fetchNet(input, init)
  setTimeout(() => visit(url))
  return Promise.resolve(new Response(null, { status: 404 }))
}
window.qqpet.onGamePlayed((minutes) => {
  const done = minutes >= 1 && played(playing)
  playing = ''
  if (done) say(done)
})

/** Web pages (by a piece of their URL) qqpet can stand in for; the rest of the island's pages are long gone. */
const PAGES: Record<string, () => void> = {
  '$W$[10012]': openPetInfo,
  happyfight: () => window.qqpet.openUrl('https://fight.qq.com/'),
  diaoyu: openFishing,
  qq_mstx: openMstx,
  dajimu: game('Q宠搭积木'),
  dg_tqd: game('QQ跆拳道'),
  qq_ddp: game('QQ端盘子'),
  qq_hhxx: game('QQ好好学习'),
  main_xmxd: game('冒险岛系列/1起航'),
  guanxingtai: game('满天星'),
  qcdzk: game('Q宠邀你来找茬'),
  'qq.com/td.html': game('Q宠守护使'),
  'qq.com/td2.html': game('Q宠守护使'),
  qq_tdsj: game('Q宠守护使'),
  sanmingzhi: game('QQ煎饼摊'),
  couxingxing: game('QQ宠物摘星星'),
  qq_qqpp: game('QQ宠物泡泡'),
  ...ISLAND,
}

/** Opens what stands in for an island page; false when nothing does. */
function visit(url: string): boolean {
  const page = Object.entries(PAGES).find(([key]) => url.includes(key))?.[1]
  if (!page) return meet(url)
  page()
  return true
}

/** Offline the island would be empty: a few guest pets wander and chat through Flash's own GPet API. */
const GUESTS = ['阿呆', '豆豆', '小胖', '球球', '咕咕', '泡泡']
const LINES = [
  '今天天气真好~',
  '有人一起去钓鱼吗？',
  '听说密室里藏着宝贝！',
  '好饿呀，去找点吃的',
  '你好呀！',
  '这里风景真不错~',
  '谁来陪我玩小游戏？',
  '走累了，歇一会儿',
  '东郊荒地又有妖怪出没啦，好可怕！',
  '我刚从咖啡厅出来，翠花做的点心真好吃。',
  '谁知道图图在哪儿？我想要宝藏图碎片。',
  '风语广场今天人好多呀~',
]
const REPLIES = [
  '哈哈，说得对！',
  '真的吗？',
  '嗯嗯~',
  '你好呀，一起玩吧！',
  '我也这么觉得~',
  '嘿嘿~',
  '好呀好呀！',
  '算我一个！',
  '哇，好厉害！',
  '我也想去看看~',
  '下次叫上我呀！',
]
const IDLE = '随口说一句闲聊，可以接着刚才的话题，也可以说说岛上的事。只输出这句话。'

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

interface Spot {
  scene: number
  x: number
  y: number
}

const CONFIG: Record<string, (id: unknown) => string> = {
  GetResByIDName: (id) => RES[String(id)] ?? '',
  GetSceneConfigure: (id) => file(RES.SceneConfigure, id, 'Config.xml'),
  GetNPCConfigure: (id) => file(RES.NPCConfigure, id, 'NpcList.xml'),
  GetNavigationConfigure: (id) => file(RES.NavigationConfigure, id, 'NavigationMap.xml'),
  GetMusicConfigure: (id) => file(RES.MusicConfigure, id, 'MusicConfigV2.xml'),
  GetWorldMapConfigure: () => `${RES.MapConfigure}/WorldMapConfig.xml`,
  GetMapNavigateConfig: () => `${RES.MapConfigure}/Config.xml`,
  GetMiniMapConfigure: () => `${RES.MapConfigure}/MiniMapConfig.xml`,
}

function file(root: string, id: unknown, name: string): string {
  return id == null || id === '' ? root : `${root}/${id}/${name}`
}

function spawn(scene: number): { x: number; y: number } {
  return SPAWN[scene] ?? PLAZA
}

function clamp(s: Spot): Spot {
  const scene = SCENES.has(s.scene) ? s.scene : TOWN
  const d = spawn(scene)
  return {
    scene,
    x: s.x > 0 ? s.x : d.x,
    y: s.y > 0 ? s.y : d.y,
  }
}

interface Nav {
  w: number
  h: number
  sw: number
  sh: number
  walk: Uint8Array
}

let nav: Nav | null = null
const navs: Record<number, Nav> = {}
let pending: [number, string][] = []
let resFlush = 0
let busy = false

function ok(n: Nav, i: number): boolean {
  return i >= 0 && i < n.walk.length && n.walk[i] === 1
}

function world(n: Nav, i: number): { x: number; y: number } {
  return { x: ((i % n.w) + 0.5) / n.w * n.sw, y: (Math.floor(i / n.w) + 0.5) / n.h * n.sh }
}

function cell(n: Nav, x: number, y: number): number {
  const cx = Math.max(0, Math.min(n.w - 1, Math.round((x / n.sw) * n.w)))
  const cy = Math.max(0, Math.min(n.h - 1, Math.round((y / n.sh) * n.h)))
  return cy * n.w + cx
}

function snap(n: Nav, x: number, y: number): { x: number; y: number } {
  const start = cell(n, x, y)
  if (ok(n, start)) return world(n, start)
  const sx = start % n.w
  const sy = Math.floor(start / n.w)
  for (let r = 1; r < 80; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const x2 = sx + dx
        const y2 = sy + dy
        if (x2 < 0 || y2 < 0 || x2 >= n.w || y2 >= n.h) continue
        const i = y2 * n.w + x2
        if (ok(n, i)) return world(n, i)
      }
    }
  }
  return { x, y }
}

/** BFS over the nav PNG; Flash's CPetMove animates along the returned points. */
function findPath(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
  if (!nav) return [{ x: x1, y: y1 }, { x: x2, y: y2 }]
  const n = nav
  const from = snap(n, x1, y1)
  const to = snap(n, x2, y2)
  const a = cell(n, from.x, from.y)
  const b = cell(n, to.x, to.y)
  if (a === b) return [{ x: x1, y: y1 }, to]
  const prev = new Int32Array(n.walk.length).fill(-1)
  const q = [a]
  prev[a] = a
  const step = [1, -1, n.w, -n.w, n.w + 1, n.w - 1, -n.w + 1, -n.w - 1]
  for (let qi = 0; qi < q.length && prev[b] < 0; qi++) {
    const cur = q[qi]
    const cx = cur % n.w
    for (const s of step) {
      const nxt = cur + s
      if (!ok(n, nxt) || prev[nxt] >= 0 || Math.abs((nxt % n.w) - cx) > 1) continue
      prev[nxt] = cur
      q.push(nxt)
    }
  }
  if (prev[b] < 0) return [{ x: x1, y: y1 }]
  const raw: number[] = []
  for (let i = b; i !== a; i = prev[i]) raw.push(i)
  raw.reverse()
  const pts = [{ x: x1, y: y1 }]
  for (let i = 5; i < raw.length - 1; i += 6) pts.push(world(n, raw[i]))
  pts.push(to)
  return pts
}

async function loadNav(scene: number): Promise<void> {
  if (navs[scene]) {
    nav = navs[scene]
    return
  }
  nav = null
  const text = await (await fetch(`${BASE}${file(RES.SceneConfigure, scene, 'Config.xml')}`)).text()
  const size = text.match(/<SceneModel[^>]*\sw="(\d+)"\s+h="(\d+)"/)
  const path = text.match(/<Navigator[\s\S]*?<Path value="([^"]+)"/)
  if (!size || !path) return
  const img = new Image()
  img.src = `${BASE}${path[1]}`
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d')
  if (!g) return
  g.drawImage(img, 0, 0)
  const pix = g.getImageData(0, 0, c.width, c.height).data
  const walk = new Uint8Array(c.width * c.height)
  for (let i = 0; i < walk.length; i++) {
    const o = i * 4
    walk[i] = pix[o] > 200 && pix[o + 1] < 80 && pix[o + 3] > 0 ? 1 : 0
  }
  nav = { w: c.width, h: c.height, sw: Number(size[1]), sh: Number(size[2]), walk }
  navs[scene] = nav
}

function loadSpot(): Spot {
  const raw = save.saveJsonData.community
  if (!raw) return { scene: TOWN, ...PLAZA }
  const s = clamp(JSON.parse(raw) as Spot)
  if (s.scene === TOWN && Math.abs(s.x - DEAD.x) < 80 && Math.abs(s.y - DEAD.y) < 80) return { scene: TOWN, ...PLAZA }
  return s
}

function saveSpot(s: Spot): void {
  update('saveJsonData', { community: JSON.stringify(s) })
}

function pet(): Record<string, unknown> {
  const level = save.petComputedlInfo.level
  return {
    petid: '1',
    uin: UIN,
    qqname: info.host,
    mastername: info.host,
    petname: info.name,
    vip: info.pinkDiamond ? 1 : 0,
    viplevel: info.PDiamondLevel,
    vipyearflag: 0,
    grade: level,
    nGrade: level,
    sex: info.sex === 'GG' ? 1 : 0,
    x: spot.x,
    y: spot.y,
  }
}

interface Row {
  ID: number
  id: number
  Name: string
  name: string
  svrName: string
  Status: number
  status: number
  online: number
  busy: number
  AreaID: number
}

const row = (id: number, name: string): Row => ({
  ID: id,
  id,
  Name: name,
  name,
  svrName: name,
  Status: 1,
  status: 1,
  online: 1,
  busy: 0,
  AreaID: id,
})

let regions: Row[] = []
let zones: { id: number; name: string; region: string }[] = []
let areas: Row[] = []

async function loadCatalog(): Promise<void> {
  if (regions.length) return
  const text = await (await fetch(`${BASE}ServerInfo4/ServerInfo.ini`)).text()
  let cur = ''
  let obj: Record<string, string> = {}
  const flush = (): void => {
    if (cur.startsWith('ZONE_')) zones.push({ id: Number(cur.slice(5)), name: obj.name, region: obj.region })
    if (cur.startsWith('AREA_')) areas.push(row(Number(cur.slice(5)), obj.name))
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith(';')) continue
    if (t.startsWith('[')) {
      flush()
      cur = t.slice(1, -1)
      obj = {}
      continue
    }
    const i = t.indexOf('=')
    if (i > 0) obj[t.slice(0, i)] = t.slice(i + 1)
  }
  flush()
  regions = [...new Set(zones.map((z) => z.region))].map((n, i) => row(i + 1, n))
}

function zoneRows(region: unknown): Row[] {
  const key = String(region ?? '')
  const hit = zones.filter((z) => !key || z.region === key || z.region.includes(key) || key.includes(z.region))
  return (hit.length ? hit : zones).map((z) => row(z.id, z.name))
}

/** Offline there is no server to pick the arrival point: land at the NPC in `scene` that portals back to `from`. */
async function portal(scene: number, from: number): Promise<{ x: number; y: number } | null> {
  const text = await (await fetch(`${BASE}${file(RES.NPCConfigure, scene, 'NpcList.xml')}`)).text()
  for (const [, attrs, body] of text.matchAll(/<Npc\s([^>]*)>([\s\S]*?)<\/Npc>/g)) {
    const to = Number(body.match(/"enterScene">\s*<Param name="id">(\d+)</)?.[1])
    if ((ALIAS[to] ?? to) !== from) continue
    const x = attrs.match(/\sx="(\d+)"/)
    const y = attrs.match(/\sy="(\d+)"/)
    if (x && y) return { x: Number(x[1]), y: Number(y[1]) }
  }
  return null
}

function trace(name: string, args: unknown[]): void {
  const row = [name, ...args]
  calls.push(row)
  if (calls.length > 200) calls.shift()
  console.debug('[petsoc]', ...row)
}

const QUIET = new Set(['GetRes'])

function host(handlers: Record<string, (...args: unknown[]) => unknown>): Record<string, (...args: unknown[]) => unknown> {
  return new Proxy(handlers, {
    get(t, key) {
      if (typeof key !== 'string') return undefined
      if (key in t) return (...args: unknown[]) => {
        if (!QUIET.has(key)) trace(key, args)
        return t[key](...args)
      }
      return (...args: unknown[]) => {
        trace(key, args)
        return 1
      }
    },
  })
}

const calls: unknown[][] = []
let open = false
let spot = loadSpot()
let player: SwfPlayer | null = null
let task = 0
let placed = false

async function flash(name: string, ...args: unknown[]): Promise<boolean> {
  if (!player) return false
  const el = player.el as unknown as Record<string, unknown>
  const start = performance.now()
  while (typeof el[name] !== 'function') {
    if (performance.now() - start > 1500) return false
    await new Promise((r) => setTimeout(r, 50))
  }
  if (name !== 'PSW.OnGetRes') trace(`→ ${name}`, args)
  ;(el[name] as (...a: unknown[]) => unknown).call(player.el, ...args)
  return true
}

Object.assign(stage, {
  play: (n: number) => void flash('PetCommunity_PlayAnimation', '', n, spot.x, spot.y - 70),
  face: (n: number) => void flash('PSW.MainPetPlayEmotion', 0, n),
})

/** Flush the current GetRes burst in one turn. New GetRes from pumpNext wait for the next timeout. */
function kick(): void {
  if (busy || !pending.length) return
  busy = true
  resFlush = window.setTimeout(() => {
    resFlush = 0
    const batch = pending
    pending = []
    if (player) {
      const fn = (player.el as unknown as Record<string, unknown>)['PSW.OnGetRes']
      if (typeof fn === 'function') {
        for (const [id, path] of batch) fn.call(player.el, id, 1, path)
      }
    }
    busy = false
    kick()
  }, 0)
}

interface Guest {
  id: string
  name: string
  x: number
  y: number
}

let wander = 0
let guests: Guest[] = []
let thinking = false
/** The island's recent chat, fed back to the AI so guests keep to the topic. */
const said: string[] = []

function hear(who: string, text: string): void {
  said.push(`${who}：${text}`)
  if (said.length > 8) said.shift()
}

function speak(g: Guest, text: string): void {
  hear(g.name, text)
  void flash('PSW.GPetSpeak', 0, g.id, text)
}

async function line(g: Guest, prompt: string, fallback: string[]): Promise<string> {
  const others = guests.filter((o) => o !== g).map((o) => o.name).join('、')
  const who = [
    `你是QQ宠物企鹅岛社区里的一只小企鹅，名叫「${g.name}」，正在岛上闲逛。岛上还有小企鹅${others}，以及玩家的企鹅「${info.name}」。`,
    '只写你说出口的那句话：用「我」自称，不写动作和旁白，不加名字前缀和引号，不用表情符号。',
  ].join('\n')
  const log = said.length ? `刚才岛上的聊天：\n${said.join('\n')}\n` : ''
  const text = await askAs(who, [{ role: 'user', content: log + prompt }])
  // Ruffle's fonts have no emoji; models still narrate now and then (泡泡拍着翅膀说："...").
  const quoted = text?.match(/说[：:]?\s*[“"「](.+?)[”"」]/)?.[1] ?? text
  const clean = quoted?.replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').replace(new RegExp(`^${g.name}(说)?[：:]\\s*`), '').trim()
  return clean || pick(fallback)
}

/** One or two guests answer what the player said; a whisper is answered by the guest it went to. */
async function reply(to: unknown): Promise<void> {
  const target = guests.find((g) => g.id === to)
  const shuffled = [...guests].sort(() => Math.random() - 0.5)
  for (const g of target ? [target] : shuffled.slice(0, 1 + Math.floor(Math.random() * 2))) {
    const text = await line(g, `回应${info.name}刚才说的话。只输出这句话。`, REPLIES)
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000))
    speak(g, text)
  }
}

async function populate(): Promise<void> {
  clearInterval(wander)
  guests = []
  await flash('PSW.ClearAllGuestPlayer')
  const n = nav
  if (!n) return
  const somewhere = (): { x: number; y: number } => snap(n, Math.random() * n.sw, Math.random() * n.sh)
  guests = GUESTS.map((name, i) => ({ id: `guest${i}`, name, ...somewhere() }))
  for (const [i, g] of guests.entries()) {
    await flash('PSW.AddGPet', g.id, i % 2, 5 + Math.floor(Math.random() * 40), Math.round(g.x), Math.round(g.y), 0)
    await flash('PSW.NotifyUpdateGPetInfo', g.id, 0, g.name, 0, '', 0, 0)
  }
  wander = window.setInterval(() => {
    const g = pick(guests)
    if (Math.random() < 0.3) {
      if (thinking) return
      thinking = true
      return void line(g, IDLE, LINES)
        .then((text) => speak(g, text))
        .finally(() => (thinking = false))
    }
    const to = somewhere()
    const path = findPath(g.x, g.y, to.x, to.y)
    Object.assign(g, path[path.length - 1])
    void flash('PSW.GPetWalk', g.id, path)
  }, 2000)
}

/** SceneView.reset() zeroes the world size, so MPetInit/SetMPetPos must land before ChangeScene sets it again. */
async function enter(next = spot): Promise<void> {
  spot = clamp(next)
  await loadNav(spot.scene)
  if (nav) spot = { ...spot, ...snap(nav, spot.x, spot.y) }
  saveSpot(spot)
  // Only the login panel needs clearing. A scene request opened the panel over a snapshot of the old scene;
  // resetting it makes ChangeScene snapshot the half-cleared new one, a grey sheet with stray tiles.
  if (!placed) {
    await flash('PSW.ResetLoadingInfo')
    placed = true
    const self = pet()
    await flash('PSW.MPetInit', String(self.petid), Number(self.sex), Number(self.grade), spot.x, spot.y)
    await flash('PSW.SetMPetData', String(self.petid), String(self.petname), Number(self.sex), Number(self.grade), Number(self.vip), '')
  }
  await flash('PSW.SetMPetPos', spot.x, spot.y)
  await flash('PSW.ChangeScene', spot.scene)
  await flash('PSW.SetFps', 30)
  await populate()
  const done = arrive(spot.scene)
  if (done) say(done)
}

/** The player's pet says `text` on the island. */
const say = (text: string): void => void flash('PSW.MPetSendChatMSG', 0, '', text)

/** 企鹅社区 (pet/petsoc/world_1051.swf). Offline: skip the dead login servers and drop into 企鹅镇. */
export function openCommunity(): void {
  if (open) return
  open = true
  spot = loadSpot()
  task = 0
  placed = false
  pending = []
  busy = false
  clearTimeout(resFlush)
  resFlush = 0
  calls.length = 0
  said.length = 0
  const stage = div('community')
  player = new SwfPlayer(stage)
  window.qqpet.setFocusable(true)
  // Panels opened from the island (钓鱼, 档案, 设置...) make the window unfocusable again when they close.
  stage.addEventListener('pointerdown', () => window.qqpet.setFocusable(true), true)
  const route = (_id: unknown, x1: unknown, y1: unknown, x2: unknown, y2: unknown): { x: number; y: number }[] =>
    findPath(Number(x1) || spot.x, Number(y1) || spot.y, Number(x2) || spot.x, Number(y2) || spot.y)

  const go = (): number => {
    void enter(loadSpot())
    return 1
  }
  const goScene = (id: unknown): number => {
    const scene = ALIAS[Number(id)] ?? Number(id)
    void (async () => {
      // Missing tiles (风语广场, 企鹅镇...): stay put; Failed closes the loading panel the request opened.
      if (!SCENES.has(scene)) {
        await flash('PSW.RequestChangeSceneFailed', 1)
        return say(pick(SAYS.road))
      }
      if (scene === spot.scene) return enter()
      await enter({ scene, ...((await portal(scene, spot.scene)) ?? spawn(scene)) })
    })()
    return 1
  }

  window.PSW = host({
    FLASHINITCOMPLETE: () => {
      void loadCatalog().then(() => enter())
    },
    RandomLogin: go,
    PetSocLoginServer: go,
    PetLoginAreaServer: go,
    RequestLoginServer: go,
    RequestChangeScene: goScene,
    RequestJumpScene: goScene,
    OpenBigMap: () => {
      void flash('PSW.ShowWorldMap', 1)
      return 1
    },
    PetFindPath: route,
    PetFindNPCPath: route,
    PetFindPathPerStep: route,
    RequestNotifyWalkPath: (pts) => {
      const last = (Array.isArray(pts) ? pts[pts.length - 1] : pts) as { x?: unknown; y?: unknown } | undefined
      if (last && typeof last === 'object') {
        spot = { ...spot, x: Number(last.x) || spot.x, y: Number(last.y) || spot.y }
        saveSpot(spot)
      }
      return 1
    },
    GetRes: (id) => {
      const path = (RES[String(id)] ?? String(id ?? '')).replace(/\\/g, '/')
      const n = ++task
      pending.push([n, path])
      kick()
      return n
    },
    GetSoundVolume: () => Math.round(save.settings.music * 100),
    GetWindowBreState: () => 0,
    IsScenePrepare: () => 1,
    GetZoomServerList: (region) => {
      const list = zoneRows(region)
      void flash('PSW.PetSocNotifyUIUpdateZoomServerList', list)
      return list
    },
    GetAreaServerList: () => {
      void flash('PSW.PetSocNotifyUIUpdateAreaServerList', areas)
      return areas
    },
    GetRegionList: () => regions,
    PetSocGetDefaultInfo: () => ({
      region: regions[0]?.Name,
      zone: zones[0]?.id,
      area: areas[0]?.ID,
      zoneName: zones[0]?.name,
      areaName: areas[0]?.Name,
      svrName: zones[0]?.name,
      ID: zones[0]?.id,
      Name: zones[0]?.name,
      Status: 1,
    }),
    RequestSendChatMsg: (type, to, text) => {
      hear(info.name, String(text))
      setTimeout(() => {
        void flash('PSW.MPetSendChatMSG', type, to, text)
        void reply(to)
        const done = chatted()
        if (done) setTimeout(() => say(done), 800)
      })
      return 1
    },
    RequestAddChatPrivately: () => 1,
    RequestUpdateAvatar: () => 1,
    OpenSysConfig: () => {
      setTimeout(openSetup)
      return 1
    },
    // The 物品 button: qqpet keeps its goods in the shop's left half.
    OpenItemBox: () => {
      setTimeout(openShop)
      return 1
    },
    LoginHome: () => {
      setTimeout(() => say(pick(SAYS.home)))
      return 1
    },
    OpenFriendList: () => {
      setTimeout(() => say(pick(SAYS.friends)))
      return 1
    },
  })
  window.PET = host({
    GetPetInfor: pet,
    // Another pet's archive: only our guests exist, so the guest says hello instead.
    OpenArchiveWindow: (id) => {
      const g = guests.find((o) => o.id === id)
      if (g) setTimeout(() => void line(g, `${info.name}走过来看你，跟它打个招呼。只输出这句话。`, LINES).then((text) => speak(g, text)))
      return 1
    },
    // Calling back into Flash before this call returns re-runs its click handler (and can hang Ruffle).
    ParseURL: (url) => {
      setTimeout(() => visit(String(url)) || say(pick(SAYS.closed)))
      return 1
    },
    GetState: () => 1,
    GetPrivateProfileInt: () => 0,
    GetPrivateProfileString: () => '',
    WritePrivateProfileInt: () => 1,
    WritePrivateProfileString: () => 1,
  })
  const w = window as unknown as Record<string, unknown>
  for (const [name, fn] of Object.entries(CONFIG)) {
    w[`CommunityRes_${name}`] = (...args: unknown[]) => {
      const out = fn(args[0])
      trace(`CommunityRes_${name}`, args)
      return out
    }
  }
  w.Avatar_GetAvatarRes = (...args: unknown[]) => {
    trace('Avatar_GetAvatarRes', args)
    return ''
  }
  w.__petsoc = calls

  openBox(div('ui-community', stage), {
    onClose: () => {
      clearInterval(wander)
      player?.destroy()
      player = null
      pending = []
      clearTimeout(resFlush)
      resFlush = 0
      busy = false
      window.qqpet.setFocusable(false)
      open = false
    },
  })
  void loadCatalog().then(() =>
    player!.load(`${BASE}world_1051.swf`, BASE, {
      wmode: 'opaque',
      parameters: { uin: String(UIN), qqnumber: String(UIN), basePath: BASE },
      // The world map reads each area's scene id from this server file; the bundled copy carries them.
      urlRewriteRules: [
        [/^http:\/\/img\.pet\.qq\.com\/WorldMapHotInfo\.xml/, new URL(`${BASE}Data/WorldMap/WorldMapHotInfo.xml`, location.href).href],
        // The right-hand panel: island NPCs and places, and pages qqpet stands in for.
        [/^http:\/\/img\.pet\.qq\.com\/newnavigation\.xml/, new URL(`${BASE}Data/newnavigation.xml`, location.href).href],
        // Only main01/main02 survived; the other scene tracks fall back to them.
        [/(?:sea|snow|live)0([12])\.mp3$/, 'main0$1.mp3'],
        [/sound3\.mp3$/, 'main01.mp3'],
      ],
    }),
  )
}
