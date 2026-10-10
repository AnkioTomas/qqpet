// The overlay window of the mobile bridges covers what the page draws, and takes
// every touch inside it. The pet's SWF box is mostly transparent, so only the
// part of the animation that has pixels counts.

// Ruffle's WebGL canvases are cleared once composited; reading them back needs the drawing buffer kept.
const getContext = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, attrs?: object) => RenderingContext | null
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attrs?: object) {
  return getContext.call(this, type, type.startsWith('webgl') ? { ...attrs, preserveDrawingBuffer: true } : attrs)
} as typeof HTMLCanvasElement.prototype.getContext

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

const SIDE = 64
const ALPHA = 16
/** Antialiased edges fade below ALPHA; the margin keeps them in. */
const PAD = 0.03
const LOOK_MS = 150
/** A player unseen this long was hidden. PetSwf shows each new movie by swapping its two players, so an unbroken show plays it from the start. */
const GAP_MS = 500

const probe = document.createElement('canvas')
probe.width = probe.height = SIDE
const pen = probe.getContext('2d')!
/**
 * Per movie URL: everything it has drawn so far, as fractions of its box (null when nothing), and whether it once
 * played through. Pet actions fly things far out late in their timeline (icons at 12 s of 20), so until then the
 * window keeps the whole box.
 */
const movies = new Map<string, { part: Box | null; known: boolean }>()
/** Per player: the movie it shows, since when without a break, and the last look. */
const shows = new WeakMap<Element, { url: string; since: number; seen: number; at: number; part: Box | null }>()

function union(a: Box | null, b: Box | null): Box | null {
  if (!a || !b) return a ?? b
  return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) }
}

function look(canvas: HTMLCanvasElement): Box | null {
  pen.clearRect(0, 0, SIDE, SIDE)
  pen.drawImage(canvas, 0, 0, SIDE, SIDE)
  const px = pen.getImageData(0, 0, SIDE, SIDE).data
  let [l, t, r, b] = [SIDE, SIDE, -1, -1]
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] <= ALPHA) continue
    const x = ((i - 3) / 4) % SIDE
    const y = Math.floor((i - 3) / 4 / SIDE)
    ;[l, t, r, b] = [Math.min(l, x), Math.min(t, y), Math.max(r, x + 1), Math.max(b, y + 1)]
  }
  return r < 0 ? null : { left: l / SIDE - PAD, top: t / SIDE - PAD, right: r / SIDE + PAD, bottom: b / SIDE + PAD }
}

/** Adds a look to the movie's record; its whole drawn part once it played through, undefined before. */
function learn(url: string, part: Box | null, through: boolean): Box | null | undefined {
  let m = movies.get(url)
  if (!m) movies.set(url, (m = { part: null, known: false }))
  m.part = union(m.part, part)
  m.known ||= through
  return m.known ? m.part : undefined
}

function drawn(player: RufflePlayerElement, box: DOMRect): Box | null {
  const canvas = player.shadowRoot?.querySelector('canvas')
  const url = player.dataset.swf
  const meta = player.ruffle().metadata
  if (!canvas || !url || !meta) return box
  const now = performance.now()
  let s = shows.get(player)
  if (!s || s.url !== url || now - s.seen > GAP_MS) shows.set(player, (s = { url, since: now, seen: now, at: 0, part: null }))
  s.seen = now
  if (now - s.at > LOOK_MS) [s.at, s.part] = [now, look(canvas)]
  // A one-frame movie is drawn by its script (the mood "+5"): what it drew before says nothing about what comes next.
  const p = meta.numFrames > 1 ? learn(url, s.part, now - s.since >= (meta.numFrames / meta.frameRate) * 1000) : s.part
  if (p === undefined) return box
  if (!p) return null
  const { left, top, width: w, height: h } = box
  return { left: left + p.left * w, top: top + p.top * h, right: left + p.right * w, bottom: top + p.bottom * h }
}

/** What of `el` the window must cover; null for nothing. Inside the pet only its drawn pixels and face spots count. */
export function cover(el: Element): Box | null {
  const box = el.getBoundingClientRect()
  // A hidden pet (opacity 0) or speech bubble (visibility hidden) must not keep a window that swallows touches.
  if (!box.width || !box.height || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null
  if (!el.closest('#pet') || el.matches('.point')) return box
  return el.tagName === 'RUFFLE-PLAYER' ? drawn(el as RufflePlayerElement, box) : null
}
