import { elapsed, stopTask } from '../pet/activity'
import CHINA from '../pet/data/china.json'
import { pay } from '../pet/items'
import { PROVINCES, travel } from '../pet/jobs'
import { speak } from '../pet/pet'
import { activity, info, save, update } from '../pet/store'
import { resetTour } from '../pet/tasks'
import { openBox } from './box'
import './css/travel.css'
import { button, div, img } from './dom'
import { windowView } from './window-view'

const SVG = 'http://www.w3.org/2000/svg'

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  return e
}

function stopTravel(): void {
  if (!activity('trip')) return
  stopTask()
  speak({ c: 'state', s: 'overTripUp', now: true }, 'speak')
}

function finishTour(): void {
  windowView({
    title: '旅游~~',
    msg: '该操作将清除旅游数据，并且可重新做相关旅游任务，确认花费8888元宝进行完成旅游成就么？',
    ok: (close) => {
      if (pay(8888)) {
        update('gameSaveDatas', { travel_china: [], travel_china_num: save.gameSaveDatas.travel_china_num + 1 })
        resetTour()
      }
      close()
    },
  })
}

let open = false

/** The China map of visited provinces, with the travel buttons. */
export function openTravel(): void {
  if (open) return
  open = true

  const map = svg('svg', { viewBox: `0 0 ${CHINA.w} ${CHINA.h}` })
  // Text nodes are updated in place so an open tooltip survives the refresh.
  const regions = CHINA.provinces.map((p) => {
    const path = svg('path', { d: p.d })
    const tooltip = new Text()
    path.appendChild(svg('title', {})).append(tooltip)
    const label = svg('text', { x: p.x, y: p.y })
    label.textContent = p.name
    map.append(path)
    return { name: p.name, path, tooltip, label }
  })
  map.append(...regions.map((r) => r.label))

  const tipText = new Text()
  const badge = img('lvcjImg', 'pet/achievement/travel.svg')
  const badgeBox = div('', badge)
  const tip = div('tip fc fText', tipText, badgeBox)
  const go = button('but_normal fcc mr8', travel, ' 去旅行 ')
  const stop = button('but_normal fcc', stopTravel)
  const finish = button('but_normal fcc ml8', finishTour, ' 完成旅游成就 ')

  const refresh = (): void => {
    const visited = save.gameSaveDatas.travel_china
    for (const r of regions) {
      const n = visited.find((t) => t.name === r.name)?.value ?? 0
      r.path.setAttribute('fill', n ? '#ff5428' : '#eeeeee')
      r.tooltip.data = r.name + (n ? `：已点亮${n}次` : '：未点亮')
    }
    const times = save.gameSaveDatas.travel_china_num
    badgeBox.className = times ? 'lvcj' : 'noneLvcj'
    badge.title = `旅行成就*${times || '未点亮'}`
    tipText.data = ` 提示: 每次随机旅行，旅行时间为60分钟 --- 当前已点亮 ${visited.length} 个城市（共${PROVINCES.length}个） `
    const city = activity('trip')
    go.classList.toggle('disable', Boolean(city))
    stop.classList.toggle('disable', !city)
    stop.textContent = (city ? `当前所在城市：${city} 已经旅行 ${elapsed() | 0}分钟` : '') + ' 停止旅行 '
    finish.style.display = visited.length === PROVINCES.length ? '' : 'none'
  }
  refresh()
  const timer = window.setInterval(refresh, 1000)

  const content = div('travel fC', tip, div('travelMain f1', map), div('toTarvelBut fcc w100', go, stop, finish))
  openBox(div('ui-travel', content), {
    vip: info.pinkDiamond,
    onClose: () => {
      clearInterval(timer)
      open = false
    },
  })
}
