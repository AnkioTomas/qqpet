// Minimal CDP client: node cdp.mjs <port> <expression> [screenshot.png]
import { writeFileSync } from 'node:fs'
const [port, expr, shot] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const my = ++id
    const on = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== my) return
      ws.removeEventListener('message', on)
      resolve(msg.result ?? msg.error)
    }
    ws.addEventListener('message', on)
    ws.send(JSON.stringify({ id: my, method, params }))
  })
console.log(page.url)
const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
console.log(JSON.stringify(r.result?.value ?? r, null, 1))
if (shot) {
  const s = await call('Page.captureScreenshot', { format: 'png' })
  writeFileSync(shot, Buffer.from(s.data, 'base64'))
}
ws.close()
