import { bury, machine, speak } from '../pet/pet'
import { info, save, setPaused, setTray, update } from '../pet/store'
import { openChat } from './chat'
import { openGoods } from './control'
import './css/menu.css'
import { button, div } from './dom'
import { frame } from './frame'
import { openPetInfo } from './petinfo'
import { openSetup } from './setup'
import { openShop } from './shop'
import { windowView } from './window-view'

const ditu = (n: number): string => `pet/Menu/ditu0${n}.png`

const WIDTH = 110

interface Item {
  label: string
  run?: () => void
  children?: Item[]
  /** Shows the check mark. */
  on?: boolean
  title?: string
}

let current: HTMLElement | null = null

export function closeMenu(): void {
  current?.remove()
  current = null
}

function quit(): void {
  closeMenu()
  if (!save.havePet || info.health === 0) return window.qqpet.quit()
  machine.play({ a: 'exit', s: () => setTray('leave'), e: () => window.qqpet.quit() })
}

export function readopt(): void {
  closeMenu()
  windowView({ title: '重新领养宠物~', msg: '点击将会清空当前宠物数据，并且重置为未领养状态，请慎重选择', ok: () => window.qqpet.resetPet() })
}

export function setHidden(on: boolean): void {
  document.body.classList.toggle('petHidden', on)
  update('settings', { hidden: on })
}
document.body.classList.toggle('petHidden', save.settings.hidden)

function toggleHidden(): void {
  if (save.settings.hidden) speak({ s: '[host],我出来啦~~有没有想我啊', now: true }, 'appear', { start: () => setHidden(false) })
  else speak({ s: '[host],我隐身啦~~', now: true }, 'hide', { end: () => setHidden(true) })
}

function togglePaused(): void {
  setPaused(!save.settings.paused)
  speak({ c: 'state', s: save.settings.paused ? 'stopGrowth' : 'startGrowth', now: true }, 'speak')
}

function items(adopt: () => void): Item[] {
  const leave = { label: '退出宠物', run: quit }
  if (!save.havePet) return [{ label: '选择宠物', run: adopt }, leave]
  if (save.isBury) {
    const title = '点击将会清空当前宠物数据，并且重置为未领养状态，请慎重选择'
    return [...['您的宠物', '已被埋葬~', '请重新', '领养一个', '把！~'].map((label) => ({ label, title, run: readopt })), leave]
  }
  const help = {
    label: '设置帮助',
    children: [
      { label: '宠物资料', run: openPetInfo },
      { label: '系统设置', run: openSetup },
    ],
  }
  if (info.health === 0) return [{ label: '打开商城', run: openShop }, help, { label: '埋葬宠物', run: () => bury() }, leave]
  return [
    { label: '和我聊天', run: openChat },
    { label: '打开商城', run: openShop },
    {
      label: '喂养宠物',
      children: [
        { label: '喂养', run: () => openGoods('food') },
        { label: '清洗', run: () => openGoods('clean') },
        { label: '吃药', run: () => openGoods('medicine') },
      ],
    },
    { label: save.settings.hidden ? '显示宠物' : '隐藏宠物', run: toggleHidden },
    help,
    { label: save.settings.paused ? '开始成长' : '停止成长', on: save.settings.paused, run: togglePaused },
    leave,
  ]
}

const pick = (it: Item) => (): void => {
  if (it.children) return
  closeMenu()
  it.run!()
}

function list(entries: Item[], toLeft: boolean): HTMLElement {
  return div(
    'menuList fC py6',
    ...entries.map((it) => {
      const sub = it.children && div(`r_cMain${toLeft ? ' toLeft' : ''}`, frame(div('CMenuList fC py6', ...it.children.map(child)), ditu, [12, 21]))
      if (sub) sub.style.width = `${WIDTH}px`
      const row = button(
        'menu fc',
        pick(it),
        div(it.on ? 'chooseDo py2' : 'choose py2'),
        div('centent f1 py2', it.label),
        sub ? div('right py2', sub) : div('rightNormal py2'),
      )
      row.title = it.title ?? ''
      return row
    }),
  )
}

const child = (it: Item): HTMLElement => button('menuC fc', pick(it), div('chooseC py2'), div('cententC f1 py2', it.label), div('rightNormalC py2'))

/**
 * Opens the context menu at window point (x, y), toward the screen's middle:
 * from the pet its corner sits at the cursor, from the tray it is centered on x.
 */
export function openMenu(at: { x: number; y: number; pet: boolean }, adopt: () => void): void {
  closeMenu()
  const { x, y } = at
  const left = Math.min(Math.max(at.pet ? x : x - WIDTH / 2, 0), innerWidth - WIDTH)
  const menu = div('rightMenu focusPress', frame(list(items(adopt), left + 2 * WIDTH > innerWidth), ditu, [12, 21]))
  menu.dataset.hit = ''
  menu.style.width = `${WIDTH}px`
  menu.style.left = `${left}px`
  if (y < innerHeight / 2) menu.style.top = `${Math.max(y, 0)}px`
  else menu.style.bottom = `${Math.max(innerHeight - y, 0)}px`
  current = div('ui-menu', menu)
  document.body.appendChild(current)
}
