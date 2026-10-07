import { bury, machine, speak } from '../pet/pet'
import { info, paused, petSize, save, setPaused, setTray } from '../pet/store'
import { openGoods } from './control'
import './css/menu.css'
import { button, div, img } from './dom'
import { openShop } from './shop'

const WIDTH = 110

interface Item {
  label: string
  run?: () => void
  children?: Item[]
  /** Shows the check mark. */
  on?: boolean
  title?: string
}

/** The original's 9-slice image frame ("imgBjBox") behind `content`. */
function frame(content: HTMLElement): HTMLElement {
  const src = (n: number): string => `pet/Menu/ditu0${n}.png`
  const row = (cls: string, n: number): HTMLElement => div(`${cls} fcc`, img(`${cls}1`, src(n)), img(`${cls}2 f1`, src(n + 1)), img(`${cls}3`, src(n + 2)))
  const left = img('content1', src(4))
  const right = img('content3', src(6))
  left.style.width = '12px'
  right.style.width = '21px'
  const middle = div('content fcc f1', left, img('content2 f1 h100', src(5)), right)
  return div('imgBjBoxFrame', div('styleBox fC', row('head', 1), middle, row('foot', 7)), div('slotMain', content))
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

async function readopt(): Promise<void> {
  closeMenu()
  const message = '点击将会清空当前宠物数据，并且重置为未领养状态，请慎重选择'
  if ((await window.qqpet.messageBox({ type: 'question', title: '重新领养宠物~', message })) === 1) window.qqpet.resetPet()
}

function toggleHidden(): void {
  const body = document.body.classList
  if (body.contains('petHidden')) speak({ s: '[host],我出来啦~~有没有想我啊', now: true }, 'appear', { start: () => body.remove('petHidden') })
  else speak({ s: '[host],我隐身啦~~', now: true }, 'hide', { end: () => body.add('petHidden') })
}

function togglePaused(): void {
  setPaused(!paused)
  speak({ c: 'state', s: paused ? 'stopGrowth' : 'startGrowth', now: true }, 'speak')
}

function items(adopt: () => void): Item[] {
  const leave = { label: '退出宠物', run: quit }
  if (!save.havePet) return [{ label: '选择宠物', run: adopt }, leave]
  if (save.isBury) {
    const title = '点击将会清空当前宠物数据，并且重置为未领养状态，请慎重选择'
    return [...['您的宠物', '已被埋葬~', '请重新', '领养一个', '把！~'].map((label) => ({ label, title, run: readopt })), leave]
  }
  if (info.health === 0) return [{ label: '打开商城', run: openShop }, { label: '埋葬宠物', run: () => bury() }, leave]
  return [
    { label: '打开商城', run: openShop },
    {
      label: '喂养宠物',
      children: [
        { label: '喂养', run: () => openGoods('food') },
        { label: '清洗', run: () => openGoods('clean') },
        { label: '吃药', run: () => openGoods('medicine') },
      ],
    },
    { label: document.body.classList.contains('petHidden') ? '显示宠物' : '隐藏宠物', run: toggleHidden },
    { label: paused ? '开始成长' : '停止成长', on: paused, run: togglePaused },
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
      const sub = it.children && div(`r_cMain${toLeft ? ' toLeft' : ''}`, frame(div('CMenuList fC py6', ...it.children.map(child))))
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
 * Opens the context menu at window point (x, y). From the pet it hangs at the
 * pet's right side (left near the screen edge) at height y; from the tray it
 * opens from (x, y) toward the screen's middle.
 */
export function openMenu(at: { x: number; y: number; pet: boolean }, adopt: () => void): void {
  closeMenu()
  const petRight = info.lastX + petSize()
  const toLeft = at.pet && petRight >= innerWidth - 220
  const menu = div('rightMenu focusPress', frame(list(items(adopt), toLeft)))
  menu.dataset.hit = ''
  menu.style.width = `${WIDTH}px`
  const { x, y } = at
  if (at.pet) {
    menu.style.left = `${toLeft ? info.lastX : petRight}px`
    menu.style.top = `${y}px`
    if (toLeft) menu.style.transform = 'translate(-100%, 0)'
  } else {
    menu.style.left = `${Math.min(Math.max(x - WIDTH / 2, 0), innerWidth - WIDTH)}px`
    if (y < innerHeight / 2) menu.style.top = `${Math.max(y, 0)}px`
    else menu.style.bottom = `${innerHeight - y}px`
  }
  current = div('ui-menu', menu)
  document.body.appendChild(current)
}
