import type { AiMessage } from '../../shared/ipc'
import { ask } from '../pet/ai'
import { speak } from '../pet/pet'
import { info } from '../pet/store'
import { openFrame } from './box'
import './css/chat.css'
import { button, div } from './dom'

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
    const reply = await ask([...history.slice(-TURNS), said])
    if (reply) history.push(said, { role: 'assistant', content: reply })
    show({ role: 'assistant', content: reply ?? '呜…我现在脑袋转不动，等会儿再聊吧~' })
    if (reply) speak({ s: reply, now: true, ai: false }, 'speak')
    input.disabled = false
    input.focus()
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void send()
  })

  const remove = openFrame(
    div(
      'ui-chat',
      div(
        'chatMain fC',
        div(
          'chatTitle fc',
          div('f1', `和${info.name}聊天`),
          button('chatClose', () => close?.(), '×'),
        ),
        log,
        div(
          'chatBar fc',
          input,
          button('chatSend fcc', () => void send(), '发送'),
        ),
      ),
    ),
  )
  window.qqpet.setFocusable(true)
  input.focus()
  close = () => {
    remove()
    window.qqpet.setFocusable(false)
    close = null
  }
}
