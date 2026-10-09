import { info, save, update } from '../pet/store'
import { SwfPlayer } from '../swf/player'
import { openBox } from './box'
import './css/community.css'
import { div } from './dom'

const BASE = 'pet/petsoc/'
/** 夏帕海岸: SceneConfig matches the tiles we actually have. 企鹅镇's bg_V69 is missing from the dump. */
const TOWN = 3
const UIN = 66666666
const PLAZA = { x: 1180, y: 1020 }
/** SceneConfig_1065 folders. 1/2 exist only on the world map. */
const SCENES = new Set([3, 5, 7, 8, 13, 15, 16, 18, 20, 21, 23, 26, 27, 29, 30, 31, 32])

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

function clamp(s: Spot): Spot {
  return {
    scene: SCENES.has(s.scene) ? s.scene : TOWN,
    x: s.x > 80 ? s.x : PLAZA.x,
    y: s.y > 80 ? s.y : PLAZA.y,
  }
}

function loadSpot(): Spot {
  const raw = save.saveJsonData.community
  if (!raw) return { scene: TOWN, ...PLAZA }
  return clamp(JSON.parse(raw) as Spot)
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

function spotOf(a: unknown, b?: unknown, c?: unknown): Spot {
  if (a && typeof a === 'object') {
    const o = a as Record<string, unknown>
    return {
      scene: Number(o.sceneID ?? o.sceneId ?? o.destSceneID ?? o.id ?? o.sid) || spot.scene,
      x: Number(o.x ?? o.X ?? o.enterX) || spot.x,
      y: Number(o.y ?? o.Y ?? o.enterY) || spot.y,
    }
  }
  return { scene: Number(a) || spot.scene, x: Number(b) || spot.x, y: Number(c) || spot.y }
}

function trace(name: string, args: unknown[]): void {
  const row = [name, ...args]
  calls.push(row)
  if (calls.length > 200) calls.shift()
  console.debug('[petsoc]', ...row)
}

function host(handlers: Record<string, (...args: unknown[]) => unknown>): Record<string, (...args: unknown[]) => unknown> {
  return new Proxy(handlers, {
    get(t, key) {
      if (typeof key !== 'string') return undefined
      if (key in t) return (...args: unknown[]) => {
        trace(key, args)
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

async function flash(name: string, ...args: unknown[]): Promise<boolean> {
  if (!player) return false
  const el = player.el as unknown as Record<string, unknown>
  const start = performance.now()
  while (typeof el[name] !== 'function') {
    if (performance.now() - start > 1500) return false
    await new Promise((r) => setTimeout(r, 50))
  }
  trace(`→ ${name}`, args)
  ;(el[name] as (...a: unknown[]) => unknown).call(player.el, ...args)
  return true
}

async function enter(next = spot): Promise<void> {
  spot = clamp(next)
  saveSpot(spot)
  const self = pet()
  await flash('PSW.PushAndUpdateLoadingInfo', 100, '完成')
  await flash('PSW.ResetLoadingInfo')
  await flash('PSW.ChangeScene', spot.scene)
  for (const name of ['PSW.MPetInit', 'MPetInit']) {
    if (await flash(name, self)) break
  }
  await flash('PSW.SetMPetData', self)
  await flash('PSW.SetMPetPos', spot.x, spot.y)
}

/** 企鹅社区 (pet/petsoc/world_1051.swf). Offline: skip the dead login servers and drop into 企鹅镇. */
export function openCommunity(): void {
  if (open) return
  open = true
  spot = loadSpot()
  calls.length = 0
  const stage = div('community')
  player = new SwfPlayer(stage)
  window.qqpet.setFocusable(true)

  const go = (): number => {
    void enter(loadSpot())
    return 1
  }
  const goScene = (...args: unknown[]): number => {
    void enter(spotOf(args[0], args[1], args[2]))
    return 1
  }

  window.PSW = host({
    FLASHINITCOMPLETE: () => {
      void (async () => {
        await loadCatalog()
        await flash('PSW.PetSocNotifyUIUpdateZoomServerList', zoneRows(regions[0]?.Name))
        await flash('PSW.PetSocNotifyUIUpdateAreaServerList', areas)
        await flash('PSW.ShowServerListUI')
        await new Promise((r) => setTimeout(r, 1500))
        await enter()
      })()
    },
    RandomLogin: go,
    PetSocLoginServer: go,
    PetLoginAreaServer: go,
    RequestLoginServer: go,
    RequestChangeScene: goScene,
    RequestJumpScene: goScene,
    PetFindPath: (_x1, _y1, x2, y2) => [{ x: Number(x2) || spot.x, y: Number(y2) || spot.y }],
    PetFindNPCPath: (_x1, _y1, x2, y2) => [{ x: Number(x2) || spot.x, y: Number(y2) || spot.y }],
    PetFindPathPerStep: (_x1, _y1, x2, y2) => [{ x: Number(x2) || spot.x, y: Number(y2) || spot.y }],
    RequestNotifyWalkPath: (x, y) => {
      spot = { ...spot, x: Number(x) || spot.x, y: Number(y) || spot.y }
      saveSpot(spot)
      return 1
    },
    GetRes: (id) => {
      const path = (RES[String(id)] ?? String(id ?? '')).replace(/\\/g, '/')
      const url = new URL(path, new URL(BASE, location.href)).href
      void fetch(url)
        .then((r) => r.arrayBuffer())
        .then((buf) => flash('PSW.OnGetRes', path, new Uint8Array(buf)))
      return 1
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
    RequestSendChatMsg: () => 1,
    RequestAddChatPrivately: () => 1,
    RequestUpdateAvatar: () => 1,
  })
  window.PET = host({
    GetPetInfor: pet,
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
      player?.destroy()
      player = null
      window.qqpet.setFocusable(false)
      open = false
    },
  })
  void loadCatalog().then(() =>
    player!.load(`${BASE}world_1051.swf`, BASE, {
      parameters: { uin: String(UIN), qqnumber: String(UIN), basePath: BASE },
    }),
  )
}
