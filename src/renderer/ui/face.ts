import { FACE } from '../pet/data/face'
import { machine } from '../pet/pet'
import { rand } from '../pet/rand'
import { info, mood, save, setInfo, stage, update } from '../pet/store'
import { floatMood } from './float'

const HOVER_MS = 300

const layer = document.createElement('div')
layer.className = 'face'
const petEl = document.getElementById('pet')!
petEl.appendChild(layer)

function poke(key: string, s = 1, e = s): void {
  layer.replaceChildren()
  update('gameSaveDatas', { ddw: save.gameSaveDatas.ddw + 1 })
  const v = rand(5, 15)
  void floatMood(v)
  setInfo('mood', Math.min(info.mood + v, 1000))
  const dir = stage() === 'Adult' ? `Adult/${mood()}` : stage()
  machine.play({ a: 'faceActive', opt: { url: `pet/Action/${info.sex}/${dir}/interact/${key}${rand(s, e)}.swf`, opt: {} } })
}

function show(): void {
  const st = stage()
  const points = st === 'Adult' ? FACE[info.sex].Adult[mood()] : FACE[info.sex][st]
  layer.replaceChildren(
    ...Object.entries(points).map(([key, p]) => {
      const d = document.createElement('div')
      d.className = 'point'
      d.style.left = p.left
      d.style.top = p.top
      d.addEventListener('click', () => poke(key, p.s, p.e ?? p.s))
      return d
    }),
  )
}

// Spots appear after hovering an idle pet without a button held.
let timer = 0
petEl.addEventListener('pointerenter', () => {
  timer = window.setTimeout(() => machine.pose.a === 'normal' && show(), HOVER_MS)
})
for (const ev of ['pointerleave', 'pointerdown'] as const) {
  petEl.addEventListener(ev, (e) => {
    if (layer.contains(e.target as Node)) return
    clearTimeout(timer)
    layer.replaceChildren()
  })
}
