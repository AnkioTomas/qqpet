import { description } from '../../../package.json'
import { APP_VERSION } from '../../shared/version'
import { DEFAULT_HOTKEY, hotkeyLabel } from '../../shared/hotkey'
import { allGoods, type GoodType } from '../pet/data/goods'
import { give } from '../pet/items'
import { applyPetSound, speak } from '../pet/pet'
import { rand } from '../pet/rand'
import { addInfo, info, save, setInfo, update } from '../pet/store'
import { clearPinkDiamond, openPinkDiamond } from '../pet/vip'
import { weatherNow } from '../pet/weather'
import { openFrame } from './box'
import './css/setup.css'
import { button, div, typeable } from './dom'
import { setFaceClick } from './face'
import { readopt, setHidden } from './menu'
import { pageZoom, windowDirectionAvailable } from './viewport'
import { checkUpdate, ipcError, packReady } from './update'
import { windowView } from './window-view'

type Option = { label: string; title?: string } & (
  | { type: 'radio'; on: () => boolean; run: () => void }
  | { type: 'slider'; value: () => number; step: (d: number) => void }
  | { type: 'button'; run: () => void }
  | { type: 'see'; value: string; run?: () => void }
  | { type: 'input'; value: () => string; set: (v: string) => void }
)

function setOpacity(v: number): void {
  const o = Math.round(Math.min(Math.max(v, 0.1), 1) * 10) / 10
  update('settings', { opacity: o })
  document.body.style.setProperty('--opacity', String(o))
}
document.body.style.setProperty('--opacity', String(save.settings.opacity))

/** High-resolution assets; open windows keep their frames until reopened. */
function setHd(on: boolean): void {
  update('settings', { hd: on })
  document.body.classList.toggle('hd', on)
}
document.body.classList.toggle('hd', save.settings.hd)

/** The main process zooms the page and reports the new zoom with the next cursor; the pet is rescaled there. */
function setZoom(v: number): void {
  update('settings', { zoom: Math.round(Math.min(Math.max(v, 1), 2) * 10) / 10 })
}

/** Brings a lost pet back on screen. */
function homing(): void {
  setInfo('lastX', 100)
  setInfo('lastY', innerHeight * 0.6)
  // On start: an interrupted hide ends, and hides the pet, right before.
  speak({ s: '[host],我在这里~', now: true }, 'appear', { start: () => setHidden(false) })
}

function toggleAutoStart(): void {
  if (window.qqpet.capabilities?.autoStart === false) {
    windowView({ title: '开机自启', msg: window.qqpet.capabilities.autoStartReason || '此平台不支持开机自启，请从应用图标启动宠物。' })
    return
  }
  const on = !save.settings.autoStart
  window.qqpet.setAutoStart(on)
  update('settings', { autoStart: on })
  speak({ c: 'startupSelf', s: on ? 'startupSelfOn' : 'startupSelfOff', now: true }, 'appear')
}

function toggleWatch(kind: 'clipboardWatch' | 'frontWatch', setting: 'clip' | 'watchApp'): void {
  const capabilities = window.qqpet.capabilities
  if (capabilities?.[kind] === false) {
    windowView({ title: setting === 'clip' ? '剪贴板播报' : '前台应用观察', msg: capabilities[kind === 'clipboardWatch' ? 'clipboardWatchReason' : 'frontWatchReason'] || '此宿主尚不提供该能力。' })
    return
  }
  update('settings', { [setting]: !save.settings[setting] })
}

let taps = 0
let tappedAt = 0
/** Five quick taps on the version show or hide the 作弊 tab, like Android's developer options. */
function tapVersion(): void {
  const now = Date.now()
  taps = now - tappedAt < 1000 ? taps + 1 : 1
  tappedAt = now
  if (taps < 5) return
  taps = 0
  update('settings', { cheatTab: !s.cheatTab })
  speak({ s: s.cheatTab ? '[host]，作弊页已显示在设置里~' : '[host]，作弊页已隐藏~', now: true }, 'appear')
}

async function exportSave(): Promise<void> {
  try {
    if (await window.qqpet.exportSave()) speak({ s: '[host],存档导出成功啦~', now: true }, 'speak')
  } catch (e) {
    windowView({ title: '导出存档', msg: `导出失败：${(e as Error).message}` })
  }
}

function importSave(): void {
  windowView({
    title: '导入存档',
    msg: '导入的存档会替换当前宠物（当前存档会备份为 save.json.bak），导入后自动重启，确定吗？',
    ok: (close) => {
      close()
      void window.qqpet.importSave().catch(() => windowView({ title: '导入存档', msg: '这不是有效的QQ宠物存档~' }))
    },
  })
}

async function importPack(): Promise<void> {
  try {
    const v = await window.qqpet.packs!.importPack()
    if (v) packReady(v)
  } catch (e) {
    windowView({ title: '导入内容包', msg: `无法导入：${ipcError(e)}` })
  }
}

function resetPacks(): void {
  void window.qqpet.packs!.info().then(({ content, shell, bundled }) =>
    windowView({
      title: '恢复内置内容',
      // A lite installer has no content of its own (#28): removing the packs brings back its first-run download.
      msg: !bundled
        ? `精简版程序不带宠物内容。将删除已安装的 v${content} 内容包并重启，之后需要重新下载或导入内容包，确定吗？`
        : content === shell
          ? `当前就是程序自带的 v${shell} 内容~`
          : `将删除已安装的 v${content} 内容包，回到程序自带的 v${shell} 内容并重启，确定吗？`,
      ok: bundled && content === shell ? undefined : () => void window.qqpet.packs!.reset().then(() => window.qqpet.packs!.relaunch()),
    }),
  )
}

function rebornAsOther(): void {
  windowView({
    title: '重生为另一个性别~',
    msg: '点击将会清空当前宠物数据，并重生为另一个性别的宠物，请慎重选择',
    ok: () => window.qqpet.resetPet(info.sex === 'GG' ? 'MM' : 'GG'),
  })
}

/** Ten of a random good of `type`. */
function grant(type: GoodType): void {
  const all = allGoods(type)
  const g = { ...all[rand(0, all.length - 1)], num: 10 }
  give([g], `[host]，我获得了${g.num}个${g.name}！`)
}

/** The pet reports the new city's weather right away, so a wrong name shows at once. */
function setCity(v: string): void {
  const city = v.trim()
  update('settings', { weatherCity: city })
  weatherNow().then(
    (t) => speak({ s: t, now: true }, 'speak'),
    () => speak({ s: `[host]，查不到「${city || '当前位置'}」的天气，换个写法试试吧~`, now: true }, 'speak'),
  )
}

/** The AI tab's model list and last result; `redraw` repaints the open panel once a request finishes. */
let models: string[] = []
let draftModel = ''
let aiStatus = ''
let redraw = (): void => {}

const reason = (e: unknown): string => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

async function loadModels(): Promise<void> {
  aiStatus = '正在获取模型列表…'
  redraw()
  try {
    models = await window.qqpet.aiModels({ url: s.aiUrl, key: s.aiKey })
    aiStatus = models.length ? '选择一个模型，选中后会自动测试，通过才会启用' : '接口没有返回模型，请手动填写后点「测试并启用」'
  } catch (e) {
    models = []
    aiStatus = `获取失败：${reason(e)}。请手动填写模型名称后点「测试并启用」`
  }
  redraw()
}

/** A model is saved, and AI turned on, only if it answers. */
async function testModel(name: string): Promise<void> {
  const model = name.trim()
  if (!model) {
    aiStatus = '请先填写模型名称'
    redraw()
    return
  }
  draftModel = model
  update('settings', { aiModel: '' })
  aiStatus = `正在测试 ${model}…`
  redraw()
  try {
    const reply = await window.qqpet.aiChat({ url: s.aiUrl, key: s.aiKey, model }, [{ role: 'user', content: '你好，用一句话打个招呼。' }])
    update('settings', { aiModel: model })
    aiStatus = `测试通过，已启用。回复：${reply.slice(0, 60)}`
  } catch (e) {
    aiStatus = `测试失败：${reason(e)}`
  }
  redraw()
}

/** Changing where to connect turns AI off until a model passes the test again. The typed name stays. */
const setAi = (patch: { aiUrl?: string; aiKey?: string }): void => {
  if (!draftModel) draftModel = s.aiModel
  update('settings', { ...patch, aiModel: '' })
  models = []
  aiStatus = ''
}

function closeAi(): void {
  draftModel = ''
  models = []
  aiStatus = ''
  update('settings', { aiModel: '' })
}

const aiOptions = (): Option[] => [
  { type: 'input', label: '接口地址（OpenAI 兼容，以 /v1 结尾）', value: () => s.aiUrl, set: (v) => setAi({ aiUrl: v.trim() }) },
  { type: 'input', label: 'API Key（本地服务可不填）', value: () => s.aiKey, set: (v) => setAi({ aiKey: v.trim() }) },
  { type: 'input', label: '模型名称（不支持列表的接口请直接填写）', value: () => draftModel, set: (v) => { draftModel = v.trim() } },
  { type: 'button', label: '获取模型列表', run: () => void loadModels() },
  { type: 'button', label: '测试并启用', run: () => void testModel(draftModel) },
  ...models.map((m): Option => ({ type: 'radio', label: m, on: () => s.aiModel === m, run: () => void testModel(m) })),
  { type: 'see', label: '状态', value: aiStatus || (s.aiModel ? `已启用：${s.aiModel}` : '未启用') },
  ...(s.aiModel ? [{ type: 'button' as const, label: '关闭 AI', run: closeAi }] : []),
]

const FACE_TIP = '使用互动动作：鼠标放入宠物范围0.3s后（手机上点一下宠物），开启点位可进行点击~'
const s = save.settings

const TABS: { label: string; options: Option[] }[] = [
  {
    label: '全局设置',
    get options(): Option[] {
      return [
        { type: 'button', label: '重生~~~（注意数据丢失）', run: readopt },
        { type: 'button', label: '重生为另一个性别~~~（注意数据丢失）', run: rebornAsOther },
        { type: 'button', label: '宠物不见了？点我试试', run: homing },
        { type: 'slider', label: '透明度', value: () => s.opacity, step: (d) => setOpacity(s.opacity + d) },
        // Only the desktop host zooms the page; touch hosts already fit the screen.
        ...(pageZoom() === null
          ? []
          : [{ type: 'slider', label: '界面缩放（宠物和所有窗口一起放大）', value: () => s.zoom - 1, step: (d) => setZoom(s.zoom + d) } satisfies Option]),
        ...(windowDirectionAvailable() ? [
          { type: 'radio', label: '窗口方向：跟随屏幕', title: '保持窗口朝向与屏幕一致，空间不足时缩小', on: () => s.windowDirection === 'screen', run: () => update('settings', { windowDirection: 'screen' }) },
          { type: 'radio', label: '窗口方向：自动选择最大显示方向', title: '选择窗口能显示得更大的方向（默认）', on: () => s.windowDirection === 'auto', run: () => update('settings', { windowDirection: 'auto' }) },
        ] satisfies Option[] : []),
        { type: 'radio', label: '开机自启', title: '仅 Windows、macOS 和 Android 有效', on: () => s.autoStart, run: toggleAutoStart },
        { type: 'input', label: '天气城市（留空按网络位置自动定位）', value: () => s.weatherCity, set: setCity },
        {
          type: 'radio',
          label: '是否开启互动动作(开启后会导致点击位置不可进行宠物移动~)',
          title: FACE_TIP,
          on: () => s.faceClick > 0,
          run: () => setFaceClick(s.faceClick ? 0 : 1),
        },
        { type: 'radio', label: '是否开启互动动作指示器', title: FACE_TIP, on: () => s.faceClick === 2, run: () => setFaceClick(s.faceClick === 2 ? 1 : 2) },
        { type: 'radio', label: '开启免打扰模式', on: () => s.quiet, run: () => update('settings', { quiet: !s.quiet }) },
        {
          type: 'radio',
          label: '点宠物时显示动作栏',
          title: '关掉后点宠物不再弹出日常、交互、工具等按钮，不挡视野；功能仍可从右键/长按宠物或托盘（手机通知栏「菜单」）打开',
          on: () => s.petBar,
          run: () => update('settings', { petBar: !s.petBar }),
        },
        { type: 'radio', label: '随机走动（默认关，贴边不走）', title: '站立闲着时，走动、问候、动画三者随机抽。贴边探头不走。', on: () => s.roam, run: () => update('settings', { roam: !s.roam }) },
        {
          type: 'radio',
          label: '局域网联机（默认关）',
          title: '同一局域网（含 Radmin 等虚拟局域网）内的好友宠物自动互相发现，上线下线互相播报；之后的串门传话也走这里。关闭后完全隐身，不收发任何消息。',
          on: () => s.lan,
          run: () => update('settings', { lan: !s.lan }),
        },
        {
          type: 'radio',
          label: '语音对话',
          title: '松开后本地识别（Paraformer 模型随包，全程离线），识别结果当作聊天内容走同一套对话。',
          on: () => s.voice,
          run: () => update('settings', { voice: !s.voice }),
        },
        { type: 'see', label: '说话键', value: `${hotkeyLabel(DEFAULT_HOTKEY)}后按住说话` },
        {
          type: 'radio',
          label: '开启宠物音效（贴边探头、点脸逗它）',
          title: '关掉只是宠物不出声：贴边探头的「嘿嘿嘿」、点脸逗它的语音等。企鹅岛社区的背景音乐不受影响，游戏窗口自己的音效也不受影响。',
          on: () => s.sound,
          run: () => {
            update('settings', { sound: !s.sound })
            applyPetSound()
          },
        },
        { type: 'radio', label: '开启高清画质', title: '高清托盘图标与窗口边框，新打开的窗口生效；高清界面素材重启后生效', on: () => s.hd, run: () => setHd(!s.hd) },
      ]
    },
  },
  {
    label: '存档',
    options: [
      { type: 'button', label: '导出存档', title: '把当前宠物保存成一个文件，可用于备份或换电脑', run: exportSave },
      { type: 'button', label: '导入存档（支持原版 config.json）', title: '用存档文件替换当前宠物，导入后自动重启', run: importSave },
    ],
  },
  ...(window.qqpet.packs
    ? [
        {
          label: '内容包',
          options: [
            { type: 'button' as const, label: '导入内容包…', title: '安装 .qqpetpack 内容包（新素材），不用重装程序；导入后重启生效', run: importPack },
            { type: 'button' as const, label: '恢复内置内容', title: '删除已导入或下载的内容包，回到程序自带的素材，重启后生效', run: resetPacks },
          ],
        },
      ]
    : []),
  {
    label: '工具',
    options: [
      { type: 'radio', label: '实时监听播报剪切板', title: '复制文字后，宠物会把它念出来', on: () => s.clip, run: () => toggleWatch('clipboardWatch', 'clip') },
      { type: 'radio', label: '留意前台在用的软件（仅电脑，默认关）', title: '同一软件开太久，闲聊时可能会提起。不读窗口内容。', on: () => s.watchApp, run: () => toggleWatch('frontWatch', 'watchApp') },
    ],
  },
  {
    label: '作弊',
    options: [
      {
        type: 'button',
        label: '元宝 +1000',
        run: () => {
          addInfo('yb', 1000)
          speak({ s: '[host]，我获得了1000元宝！', now: true }, 'appear')
        },
      },
      { type: 'button', label: '成长值 +5000', run: () => addInfo('growth', 5000) },
      { type: 'button', label: '随机获得 10 个食物', run: () => grant('food') },
      { type: 'button', label: '随机获得 10 个清洁用品', run: () => grant('clean') },
      { type: 'button', label: '随机获得 10 个药品', run: () => grant('medicine') },
      {
        type: 'button',
        label: '复活吧，我的宠物！',
        run: () => (info.health === 0 ? setInfo('health', 5) : speak({ s: '[host]，我还活得好好的呢~', now: true }, 'speak')),
      },
      {
        type: 'radio',
        label: '聊天框金手指',
        title: '在聊天里输入「元宝+100000」「不要死」等口令生效；关闭时「不要死」一并失效',
        on: () => s.chatCheat,
        run: () => update('settings', { chatCheat: !s.chatCheat, undying: false }),
      },
      {
        type: 'button',
        label: '粉钻 30天',
        run: () => {
          openPinkDiamond(30)
          speak({ s: '[host]，粉钻开了30天！', now: true }, 'appear')
        },
      },
      {
        type: 'button',
        label: '粉钻 年费',
        run: () => {
          openPinkDiamond(365)
          speak({ s: '[host]，粉钻开了365天！', now: true }, 'appear')
        },
      },
      {
        type: 'button',
        label: '粉钻 清除',
        run: () => {
          clearPinkDiamond()
          speak({ s: '[host]，粉钻已清除~', now: true }, 'appear')
        },
      },
    ],
  },
  {
    label: 'AI',
    get options() {
      return aiOptions()
    },
  },
  {
    label: '关于',
    options: [
      { type: 'see', label: '软件', value: `QQPet v${APP_VERSION}`, run: tapVersion },
      { type: 'button', label: '检查更新', title: '有新版本时打开 GitHub 下载页', run: () => void checkUpdate(true) },
      { type: 'radio', label: '每天自动检查更新', on: () => s.autoUpdate, run: () => update('settings', { autoUpdate: !s.autoUpdate }) },
      { type: 'see', label: '简介', value: description },
      { type: 'see', label: '作者', value: 'Ankio' },
      { type: 'see', label: '邮箱', value: 'ankio@ankio.net' },
      { type: 'see', label: '项目地址', value: 'https://github.com/AnkioTomas/qqpet' },
      { type: 'see', label: '声明', value: 'QQ 宠物相关素材版权归腾讯所有，本项目仅供学习交流，请勿用于商业用途' },
    ],
  },
]

function option(o: Option, redraw: () => void): HTMLElement {
  const act = (f: () => void) => (): void => {
    f()
    redraw()
  }
  let inner: HTMLElement
  if (o.type === 'radio') {
    inner = div('childrenIn fcc radio', button(o.on() ? 'choose focusPress active' : 'choose focusPress', act(o.run)), div('label', o.label))
  } else if (o.type === 'slider') {
    const knob = div('sl_center_z')
    knob.style.left = `${o.value() * 100}%`
    const line = div(
      'sliderLine f1 w100 fcc mt8',
      button(
        'sl_down focusPress',
        act(() => o.step(-0.1)),
      ),
      div('sl_center f1 por', div('sl_thumb_track', knob)),
      button(
        'sl_up focusPress',
        act(() => o.step(0.1)),
      ),
    )
    inner = div('childrenIn fccC slider', div('label f1 w100', o.label), line)
  } else if (o.type === 'button') {
    inner = div('childrenIn fcc', div('label f1 w100 por butsLabel fcc tc', `${o.label} `, div('butsButs f1 w100 fcc', button('butsButs_submit', o.run))))
  } else if (o.type === 'input') {
    const input = typeable(Object.assign(document.createElement('input'), { className: 'textInput', value: o.value() }))
    input.addEventListener(
      'change',
      act(() => o.set(input.value)),
    )
    inner = div('childrenIn fC', div('label', o.label), input)
  } else {
    inner = div('childrenIn fC', div('', `${o.label}：`), div('seeValue', o.value))
    if (o.run) inner.addEventListener('click', act(o.run))
  }
  const row = div('childrens', inner)
  row.title = o.title ?? ''
  return row
}

let close = (): void => {}

export function openSetup(): void {
  close()
  if (!draftModel) draftModel = s.aiModel
  // By label: showing the 作弊 tab shifts the tabs after it.
  let tab = TABS[0].label
  const left = div('leftScroll fcC')
  const title = div('right_title ml16')
  const list = div('children')
  const right = div('rightScroll fC', title, list)
  const draw = (): void => {
    const tabs = TABS.filter((t) => t.label !== '作弊' || s.cheatTab)
    const current = tabs.find((t) => t.label === tab) ?? tabs[0]
    tab = current.label
    const pick = (label: string) => (): void => {
      tab = label
      list.scrollTop = 0
      draw()
    }
    left.replaceChildren(...tabs.map((t) => button(t === current ? 'lm_once focusPress fcc activeMenu' : 'lm_once focusPress fcc', pick(t.label), t.label)))
    title.textContent = current.label
    list.replaceChildren(...current.options.map((o) => option(o, draw)))
  }
  draw()
  redraw = draw
  let directionChoice = windowDirectionAvailable()
  const refreshDirection = (): void => {
    const next = windowDirectionAvailable()
    if (next === directionChoice) return
    directionChoice = next
    if (tab !== TABS[0].label) return
    const scroll = list.scrollTop
    draw()
    list.scrollTop = scroll
  }
  addEventListener('resize', refreshDirection)
  const orientation = window.screen.orientation
  orientation?.addEventListener('change', refreshDirection)
  const remove = openFrame(
    div(
      'ui-setup',
      div(
        'setUp',
        button('close focusPress', () => close()),
        left,
        right,
      ),
    ),
    'pet/sysSeting/ditu.png',
  )
  // The AI tab re-draws its option list (and its live input) while requests run; keep the
  // window a keyboard target for the whole panel so typing survives those re-draws.
  window.qqpet.setFocusable(true)
  close = (): void => {
    removeEventListener('resize', refreshDirection)
    orientation?.removeEventListener('change', refreshDirection)
    window.qqpet.setFocusable(false)
    remove()
    close = () => {}
  }
}
