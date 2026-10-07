import { description, version } from '../../../package.json'
import { allGoods, type GoodType } from '../pet/data/goods'
import { give } from '../pet/items'
import { speak } from '../pet/pet'
import { rand } from '../pet/rand'
import { addInfo, info, save, setInfo, update } from '../pet/store'
import { weatherNow } from '../pet/weather'
import { openFrame } from './box'
import './css/setup.css'
import { button, div, typeable } from './dom'
import { setFaceClick } from './face'
import { readopt, setHidden } from './menu'

type Option = { label: string; title?: string } & (
  | { type: 'radio'; on: () => boolean; run: () => void }
  | { type: 'slider'; value: () => number; step: (d: number) => void }
  | { type: 'button'; run: () => void }
  | { type: 'see'; value: string }
  | { type: 'input'; value: () => string; set: (v: string) => void }
)

function setOpacity(v: number): void {
  const o = Math.round(Math.min(Math.max(v, 0), 1) * 10) / 10
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

/** Brings a lost pet back on screen. */
function homing(): void {
  setInfo('lastX', 100)
  setInfo('lastY', innerHeight * 0.6)
  // On start: an interrupted hide ends, and hides the pet, right before.
  speak({ s: '[host],我在这里~', now: true }, 'appear', { start: () => setHidden(false) })
}

function toggleAutoStart(): void {
  const on = !save.settings.autoStart
  window.qqpet.setAutoStart(on)
  update('settings', { autoStart: on })
  speak({ c: 'startupSelf', s: on ? 'startupSelfOn' : 'startupSelfOff', now: true }, 'appear')
}

async function exportSave(): Promise<void> {
  if (await window.qqpet.exportSave()) speak({ s: '[host],存档导出成功啦~', now: true }, 'speak')
}

async function importSave(): Promise<void> {
  const message = '导入的存档会替换当前宠物（当前存档会备份为 save.json.bak），导入后自动重启，确定吗？'
  if ((await window.qqpet.messageBox({ type: 'question', title: '导入存档', message })) === 1) window.qqpet.importSave()
}

async function rebornAsOther(): Promise<void> {
  const message = '点击将会清空当前宠物数据，并重生为另一个性别的宠物，请慎重选择'
  if ((await window.qqpet.messageBox({ type: 'question', title: '重生为另一个性别~', message })) === 1) window.qqpet.resetPet(info.sex === 'GG' ? 'MM' : 'GG')
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
let aiStatus = ''
let redraw = (): void => {}

const reason = (e: unknown): string => String(e instanceof Error ? e.message : e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

async function loadModels(): Promise<void> {
  aiStatus = '正在获取模型列表…'
  redraw()
  try {
    models = await window.qqpet.aiModels({ url: s.aiUrl, key: s.aiKey })
    aiStatus = models.length ? '选择一个模型，选中后会自动测试，通过才会启用' : '接口没有返回任何模型'
  } catch (e) {
    models = []
    aiStatus = `获取失败：${reason(e)}`
  }
  redraw()
}

/** A model is saved, and AI turned on, only if it answers. */
async function testModel(model: string): Promise<void> {
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

/** Changing where to connect turns AI off until a model passes the test again. */
const setAi = (patch: { aiUrl?: string; aiKey?: string }): void => {
  update('settings', { ...patch, aiModel: '' })
  models = []
  aiStatus = ''
}

const aiOptions = (): Option[] => [
  { type: 'input', label: '接口地址（OpenAI 兼容，以 /v1 结尾）', value: () => s.aiUrl, set: (v) => setAi({ aiUrl: v.trim() }) },
  { type: 'input', label: 'API Key（本地服务可不填）', value: () => s.aiKey, set: (v) => setAi({ aiKey: v.trim() }) },
  { type: 'button', label: '获取模型列表', run: () => void loadModels() },
  ...models.map((m): Option => ({ type: 'radio', label: m, on: () => s.aiModel === m, run: () => void testModel(m) })),
  { type: 'see', label: '状态', value: aiStatus || (s.aiModel ? `已启用：${s.aiModel}` : '未启用') },
  ...(s.aiModel ? [{ type: 'button' as const, label: '关闭 AI', run: () => setAi({}) }] : []),
]

const FACE_TIP = '使用互动动作：鼠标放入宠物范围1s后，开启点位可进行点击~'
const s = save.settings

const TABS: { label: string; options: Option[] }[] = [
  {
    label: '全局设置',
    options: [
      { type: 'button', label: '重生~~~（注意数据丢失）', run: readopt },
      { type: 'button', label: '重生为另一个性别~~~（注意数据丢失）', run: rebornAsOther },
      { type: 'button', label: '宠物不见了？点我试试', run: homing },
      { type: 'slider', label: '透明度', value: () => s.opacity, step: (d) => setOpacity(s.opacity + d) },
      { type: 'radio', label: '开机自启', on: () => s.autoStart, run: toggleAutoStart },
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
      { type: 'radio', label: '开启高清画质', title: '高清托盘图标与窗口边框，新打开的窗口生效；高清界面素材重启后生效', on: () => s.hd, run: () => setHd(!s.hd) },
    ],
  },
  {
    label: '存档',
    options: [
      { type: 'button', label: '导出存档', title: '把当前宠物保存成一个文件，可用于备份或换电脑', run: exportSave },
      { type: 'button', label: '导入存档（支持原版 config.json）', title: '用存档文件替换当前宠物，导入后自动重启', run: importSave },
    ],
  },
  {
    label: '工具',
    options: [
      { type: 'radio', label: '实时监听播报剪切板', title: '复制文字后，宠物会把它念出来', on: () => s.clip, run: () => update('settings', { clip: !s.clip }) },
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
      { type: 'see', label: '软件', value: `QQPet v${version}` },
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
    const knob = div('sl_center_z', div('slc_z'))
    knob.style.left = `${o.value() * 100}%`
    const line = div(
      'sliderLine f1 w100 fcc mt8',
      button(
        'sl_down focusPress',
        act(() => o.step(-0.1)),
      ),
      div('sl_center f1 por', knob),
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
  }
  const row = div('childrens', inner)
  row.title = o.title ?? ''
  return row
}

let close = (): void => {}

export function openSetup(): void {
  close()
  let tab = 0
  const left = div('leftScroll fcC')
  const right = div('rightScroll')
  const draw = (): void => {
    const pick = (i: number) => (): void => {
      tab = i
      draw()
    }
    left.replaceChildren(...TABS.map((t, i) => button(i === tab ? 'lm_once focusPress fcc activeMenu' : 'lm_once focusPress fcc', pick(i), t.label)))
    right.replaceChildren(div('right_title ml16', TABS[tab].label), div('children', ...TABS[tab].options.map((o) => option(o, draw))))
  }
  draw()
  redraw = draw
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
  close = (): void => {
    remove()
    close = () => {}
  }
}
