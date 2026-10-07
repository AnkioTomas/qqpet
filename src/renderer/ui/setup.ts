import { allGoods, type GoodType } from '../pet/data/goods'
import { give } from '../pet/items'
import { speak } from '../pet/pet'
import { rand } from '../pet/rand'
import { addInfo, info, save, setInfo, update } from '../pet/store'
import { openFrame } from './box'
import './css/setup.css'
import { button, div } from './dom'
import { setFaceClick } from './face'
import { readopt, setHidden } from './menu'

type Option = { label: string; title?: string } & (
  | { type: 'radio'; on: () => boolean; run: () => void }
  | { type: 'slider'; value: () => number; step: (d: number) => void }
  | { type: 'button'; run: () => void }
  | { type: 'see'; value: string }
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
      {
        type: 'radio',
        label: '是否开启互动动作(开启后会导致点击位置不可进行宠物移动~)',
        title: FACE_TIP,
        on: () => s.faceClick > 0,
        run: () => setFaceClick(s.faceClick ? 0 : 1),
      },
      { type: 'radio', label: '是否开启互动动作指示器', title: FACE_TIP, on: () => s.faceClick === 2, run: () => setFaceClick(s.faceClick === 2 ? 1 : 2) },
      { type: 'radio', label: '开启免打扰模式', on: () => s.quiet, run: () => update('settings', { quiet: !s.quiet }) },
      { type: 'radio', label: '开启高清画质', title: '高清托盘图标与窗口边框，新打开的窗口生效', on: () => s.hd, run: () => setHd(!s.hd) },
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
  { label: '关于', options: [{ type: 'see', label: '基本信息', value: '版本：T800' }] },
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
