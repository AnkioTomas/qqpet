import EXAM from '../pet/data/exam.json'
import { openFrame } from './box'
import './css/exam.css'
import { button, div } from './dom'
import { windowView } from './window-view'

const shuffle = <T>(a: T[]): T[] => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** The promotion exam of study topic `topic`: three random questions of its bank, all must be right. */
export function openExam(topic: string, pass: () => void): void {
  // The bank lists most answers first.
  const questions = shuffle(EXAM[topic as keyof typeof EXAM])
    .slice(0, 3)
    .map((q) => ({ ...q, options: shuffle(q.options) }))
  const picked = questions.map(() => -1)
  let at = 0
  const box = div('answerQuestions fC por')
  const close = openFrame(div('ui-exam', box))

  const go = (d: number) => (): void => {
    if (d < 0 || picked[at] >= 0) at += d
    render()
  }
  const submit = (): void => {
    if (picked[at] < 0) return
    close()
    if (questions.every((q, i) => q.options[picked[i]] === q.answer)) pass()
    else windowView({ title: '升学结果', msg: '抱歉未通过！' })
  }

  function render(): void {
    const q = questions[at]
    const last = at === questions.length - 1
    const options = q.options.map((o, i) =>
      button(
        'aq_option fc',
        () => {
          picked[at] = i
          render()
        },
        div(i === picked[at] ? 'choose chooseAQ' : 'choose'),
        div('w0 f1', o),
      ),
    )
    box.replaceChildren(
      button('close', close),
      div('a_title', '升学考试：'),
      div(
        'a_Question fC f1',
        div('aq_title', q.title),
        div('aq_options fccw f1', ...options),
        div(
          'aq_buts fca',
          ...(at ? [button('fcc wsnw aqb', go(-1), ' 上一题 ')] : []),
          last ? button('fcc wsnw aqb', submit, ' 提交 ') : button('fcc wsnw aqb', go(1), ' 下一题 '),
        ),
      ),
    )
  }
  render()
}
