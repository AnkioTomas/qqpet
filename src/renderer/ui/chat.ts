import type { AiMessage } from '../../shared/ipc'
import { ask, note } from '../pet/ai'
import { listGoods } from '../pet/goods'
import { useItem } from '../pet/items'
import { work, workGoods } from '../pet/jobs'
import { speak } from '../pet/pet'
import { info, save, update } from '../pet/store'
import { openBox } from './box'
import './css/chat.css'
import { button, div } from './dom'
import { setHidden } from './menu'

const DO =
  '回复写成：动作 台词。动作只能是 FEED、CLEAN、WORK、HIDE、QUIET 或 NONE。FEED=吃背包食物，CLEAN=用清洁用品，WORK=去打工，HIDE=隐身，QUIET=免打扰。不是办事就写 NONE。台词必须写在动作后面，不要只回动作词。'

const ACT = /^(FEED|CLEAN|WORK|HIDE|QUIET|NONE)\b[:：]?\s*(.*)$/i

function parse(text: string): { act: string; say: string } {
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const head = lines[0] ?? ''
  const m = head.match(ACT)
  if (!m) return { act: 'NONE', say: text.replace(/\s+/g, ' ').trim() }
  return { act: m[1].toUpperCase(), say: m[2].trim() || lines[1] || '' }
}

function doAct(act: string, say: string): void {
  if (act === 'FEED') {
    const g = listGoods('food', 1, 1).list[0]
    if (g) return useItem(g, false, say)
  } else if (act === 'CLEAN') {
    const g = listGoods('clean', 1, 1).list[0]
    if (g) return useItem(g, false, say)
  } else if (act === 'WORK') {
    const g = workGoods()[0]
    if (g && work(g)) return
  } else if (act === 'HIDE' && !save.settings.hidden) {
    speak({ s: say, now: true, ai: false }, 'hide', { end: () => setHidden(true) })
    return
  } else if (act === 'QUIET' && !save.settings.quiet) {
    speak({ s: say, now: true, ai: false }, 'speak', { start: () => update('settings', { quiet: true }) })
    return
  }
  speak({ s: say, now: true, ai: false }, 'speak')
}

/** The conversation, kept until the app quits; the latest turns go to the AI. */
const history: AiMessage[] = []
const TURNS = 12

let close: (() => void) | null = null

/** Chat with the pet; replies also come in its speech bubble. The window keeps keyboard focus while this is open. */
export function openChat(): void {
  if (close) return
  const log = div('chatLog f1')
  const show = (m: AiMessage): void => {
    log.append(div(`chatLine ${m.role}`, m.content))
    log.scrollTop = log.scrollHeight
  }
  history.forEach(show)
  const input = Object.assign(document.createElement('input'), { className: 'chatInput f1', maxLength: 200, placeholder: `和${info.name}说点什么，回车发送` })

  async function send(): Promise<void> {
    const content = input.value.trim()
    if (!content || input.disabled) return
    input.value = ''
    input.disabled = true
    const said: AiMessage = { role: 'user', content }
    show(said)
    const reply = await ask([...history.slice(-TURNS), said], DO)
    const { act, say } = parse(reply ?? '')
    const line = reply ? say || '……' : '呜…我现在脑袋转不动，等会儿再聊吧~'
    if (reply) history.push(said, { role: 'assistant', content: line })
    show({ role: 'assistant', content: line })
    note('刚和主人聊过天')
    if (reply) doAct(act, line)
    input.disabled = false
    input.focus()
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void send()
  })

  close = openBox(
    div(
      'ui-chat',
      div(
        'chatMain fC',
        div('chatTitle', `和${info.name}聊天`),
        log,
        div(
          'chatBar fc',
          input,
          button('chatSend fcc', () => void send(), '发送'),
        ),
      ),
    ),
    {
      onClose: () => {
        window.qqpet.setFocusable(false)
        close = null
      },
    },
  )
  window.qqpet.setFocusable(true)
  input.focus()
}
