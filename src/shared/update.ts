import type { Fetch, Release } from './ipc'

/** GitHub's latest-release API, proxied. */
const API = 'https://api.ankio.net/gh/repos/AnkioTomas/qqpet/releases/latest'

interface Reply {
  tag_name: string
  html_url: string
}

/** Rejects while offline or when the proxy fails. */
export async function latestRelease(fetch: Fetch): Promise<Release> {
  const r = await fetch(API, { signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 100)}`)
  const d = (await r.json()) as Reply
  return { version: d.tag_name.replace(/^v/, ''), url: d.html_url }
}
