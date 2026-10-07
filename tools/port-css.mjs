// Ports a component stylesheet from the original Vue build.
//
//   node tools/port-css.mjs <in.css> <.scope> [data-v-id] > out.css
//
// Keeps the rules of one component (those carrying [data-v-id]; without an id,
// the unscoped global rules), strips the scope attribute, prefixes every
// selector with `.scope ` (wrap the component's markup in that class; pass ''
// for global styles) and points
// `../pet/` URLs at the app root. At-rules (@keyframes) are only kept, as is,
// when converting a whole file.
import { readFileSync } from 'node:fs'

const [file, scope, id] = process.argv.slice(2)
const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const rules = []
for (let i = 0; i < css.length;) {
  const open = css.indexOf('{', i)
  if (open < 0) break
  let depth = 1
  let j = open + 1
  for (; depth; j++) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0
  rules.push({
    head: css.slice(i, open).trim(),
    body: css.slice(open + 1, j - 1),
  })
  i = j
}

const fixUrls = (s) => s.replace(/url\((['"]?)\.\.\/pet\//g, 'url($1/pet/')
const out = []
for (const { head, body } of rules) {
  if (head.startsWith('@')) {
    if (!id) out.push(`${head} {${fixUrls(body)}}`)
    continue
  }
  if (id ? !head.includes(`[data-v-${id}]`) : head.includes('[data-v-')) continue
  const selectors = head
    .split(',')
    .map((s) => s.trim().replace(/\[data-v-[0-9a-f]+]/g, ''))
    .map((s) => (s.startsWith(scope) ? s : `${scope} ${s}`))
  out.push(`${selectors.join(',\n')} {${fixUrls(body)}}`)
}
console.log(out.join('\n'))
