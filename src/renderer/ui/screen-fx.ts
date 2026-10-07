import { save, update } from '../pet/store'

const DOTS = 60
const LINK = 140
const RGB = '64, 158, 255'

const canvas = document.createElement('canvas')
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1'
const g = canvas.getContext('2d')!
const cursor = { x: -1e4, y: -1e4, vx: 0, vy: 0 }
window.qqpet.onCursor((p) => Object.assign(cursor, p))
const dots = Array.from({ length: DOTS }, () => ({
  x: Math.random() * innerWidth,
  y: Math.random() * innerHeight,
  vx: Math.random() - 0.5,
  vy: Math.random() - 0.5,
}))

function draw(): void {
  if (!canvas.isConnected) return
  const r = devicePixelRatio
  if (canvas.width !== innerWidth * r || canvas.height !== innerHeight * r) {
    canvas.width = innerWidth * r
    canvas.height = innerHeight * r
  }
  g.setTransform(r, 0, 0, r, 0, 0)
  g.clearRect(0, 0, innerWidth, innerHeight)
  g.fillStyle = `rgba(${RGB}, 0.8)`
  for (const d of dots) {
    d.x += d.vx
    d.y += d.vy
    if (d.x < 0 || d.x > innerWidth) d.vx = -d.vx
    if (d.y < 0 || d.y > innerHeight) d.vy = -d.vy
    g.fillRect(d.x - 1.5, d.y - 1.5, 3, 3)
  }
  // The cursor is one more dot that does not move by itself.
  const all = [...dots, cursor]
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)
      if (d >= LINK) continue
      g.strokeStyle = `rgba(${RGB}, ${(1 - d / LINK) * 0.6})`
      g.beginPath()
      g.moveTo(all[i].x, all[i].y)
      g.lineTo(all[j].x, all[j].y)
      g.stroke()
    }
  }
  g.strokeStyle = `rgba(${RGB}, 0.35)`
  g.setLineDash([6, 6])
  g.beginPath()
  g.moveTo(cursor.x, 0)
  g.lineTo(cursor.x, innerHeight)
  g.moveTo(0, cursor.y)
  g.lineTo(innerWidth, cursor.y)
  g.stroke()
  g.setLineDash([])
  requestAnimationFrame(draw)
}

function show(on: boolean): void {
  if (!on) return canvas.remove()
  document.body.appendChild(canvas)
  requestAnimationFrame(draw)
}
show(save.settings.screenFx)

/** Floating dots linked to each other and to the cursor, plus cursor guide lines. */
export function setScreenFx(on: boolean): void {
  update('settings', { screenFx: on })
  show(on)
}
