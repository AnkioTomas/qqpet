import { claim, TABS, tasks, type Tab } from '../pet/tasks'
import { openBox } from './box'
import './css/task.css'
import { button, div, img } from './dom'
import { showResult } from './result'

let open = false

export function openTask(): void {
  if (open) return
  open = true
  const root = div('ui-task')
  let tab: Tab = 'daily'

  const render = (): void => {
    const items = tasks(tab).map((t, i) => {
      const ready = !t.take && t.done >= t.num
      const state = t.take ? 'claimed' : ready ? 'ready' : 'pending'
      const reward = document.createElement('button')
      reward.type = 'button'
      reward.className = `but_small task-reward task-reward--${state}`
      reward.disabled = !ready
      reward.textContent = t.take ? '✓ 已领取' : ready ? '领取奖励' : '未达成'
      reward.addEventListener('click', () => {
        if (!ready) return
        const goods = claim(tab, i)
        render()
        showResult(root, goods || [], '还没完成任务哦！~~')
      })
      return div(
        'taskOnce fc',
        div('to_left f1 fC w0', div('to_label', `${t.label}（${Math.min(t.done, t.num)}/${t.num}） `), div('to_msg', t.msg)),
        div(
          'to_right fc',
          ...t.good.map((g) => Object.assign(img('goodImg', g.url), { title: `${g.outOfPrint ? '绝版：' : ''}${g.name}*${g.num}` })),
          reward,
        ),
      )
    })
    const tabs = (Object.keys(TABS) as Tab[]).map((k) =>
      button(
        k === tab ? 't_tab mr8 active' : 't_tab mr8',
        () => {
          tab = k
          render()
        },
        TABS[k],
      ),
    )
    root.replaceChildren(div('task fC', div('t_top f1 fC h0', div('t_title', '活动列表'), div('t_tabs', ...tabs), div('tasks f1 mt8 h0', ...items))))
  }
  render()
  openBox(root, { onClose: () => (open = false) })
}
