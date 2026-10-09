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
    const items = tasks(tab).map((t, i) =>
      div(
        'taskOnce fc',
        div('to_left f1 fC w0', div('to_label', `${t.label}（${t.done}/${t.num}） `), div('to_msg', t.msg)),
        div(
          'to_right fc',
          ...t.good.map((g) => Object.assign(img('goodImg', g.url), { title: `${g.outOfPrint ? '绝版：' : ''}${g.name}*${g.num}` })),
          button(
            t.take ? 'but_small disable' : 'but_small',
            () => {
              if (t.take) return
              const goods = claim(tab, i)
              render()
              showResult(root, goods || [], '还没完成任务哦！~~')
            },
            t.take ? '已领取' : '领取',
          ),
        ),
      ),
    )
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
