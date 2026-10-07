import { net } from 'electron'
import type { AiConfig, AiMessage } from '../shared/ipc'

/** The fields used from an OpenAI-compatible reply. */
interface Models {
  data: { id: string }[]
}
interface Completion {
  choices: { message: { content: string } }[]
}

/** One request to an OpenAI-compatible API; a non-2xx status throws with the server's message. */
async function call<T>(c: Omit<AiConfig, 'model'>, path: string, body?: object): Promise<T> {
  const r = await net.fetch(c.url.replace(/\/+$/, '') + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(c.key && { Authorization: `Bearer ${c.key}` }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
  return (await r.json()) as T
}

export async function aiModels(c: Omit<AiConfig, 'model'>): Promise<string[]> {
  return (await call<Models>(c, '/models')).data.map((m) => m.id)
}

export async function aiChat(c: AiConfig, messages: AiMessage[]): Promise<string> {
  // Qwen-style models write their reasoning into the reply unless thinking is off; other servers ignore the field.
  const r = await call<Completion>(c, '/chat/completions', { model: c.model, messages, max_tokens: 300, chat_template_kwargs: { enable_thinking: false } })
  return r.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim()
}
