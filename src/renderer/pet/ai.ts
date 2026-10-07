import type { AiMessage } from '../../shared/ipc'
import { dayText } from './calendar'
import { info, save } from './store'

/** A model is saved only once it passed the settings test. */
export const aiOn = (): boolean => save.settings.aiModel !== ''

const MAX = 80

function persona(): string {
  const c = save.petComputedlInfo
  const pct = (n: number, max: number): string => `${Math.round((n / max) * 100)}%`
  const now = new Date()
  return [
    `你是QQ宠物里的一只${info.sex === 'GG' ? '男生' : '女生'}小企鹅，名叫「${info.name}」，${c.level}级，主人叫「${info.host}」。`,
    `你现在的状态：饱食${pct(info.hunger, c.hungerMax)}，清洁${pct(info.clean, c.cleanMax)}，心情${pct(info.mood, c.moodMax)}，健康${info.health}/5。`,
    `现在是${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}点${now.getMinutes()}分，${dayText()}。`,
    '用可爱、亲昵的口吻说中文，像小孩子撒娇；每次只说一两句话，不超过40个字；不要用Markdown、不要换行。',
  ].join('\n')
}

/** The pet's reply in character; null when AI is off or the request fails, so callers fall back to the original lines. */
export async function ask(messages: AiMessage[]): Promise<string | null> {
  if (!aiOn()) return null
  const s = save.settings
  try {
    const reply = await window.qqpet.aiChat({ url: s.aiUrl, key: s.aiKey, model: s.aiModel }, [{ role: 'system', content: persona() }, ...messages])
    return reply.replace(/\s+/g, ' ').slice(0, MAX) || null
  } catch (e) {
    console.warn('AI request failed:', e)
    return null
  }
}

/** Something the idle pet says on its own, from its state and the date. */
export const idleTalk = (): Promise<string | null> =>
  ask([{ role: 'user', content: '（主人在旁边忙，没有说话。结合你现在的状态、时间和日期，主动对主人说一句话。）' }])

/** Copied text: translated when foreign, otherwise remarked on. */
export const clipTalk = (text: string): Promise<string | null> =>
  ask([
    {
      role: 'user',
      content: `主人刚复制了下面这段文字：\n${text.slice(0, 500)}\n\n如果它是外文，你的回答必须是它的中文翻译，以「翻译：」开头；如果是中文，就用一句话俏皮地点评。`,
    },
  ])
