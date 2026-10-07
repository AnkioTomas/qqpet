import { isBuddy, photoUrl, PHOTOS, shots, type Shot } from '../pet/album'
import { openFrame } from './box'
import './css/album.css'
import { formatDate } from './date'
import { button, div, img } from './dom'

const caption = (s: Shot): string => `${s.city}${isBuddy(s.id) ? ' · 和旅游搭子' : ''} · ${formatDate(s.d, 'YYYY-MM-DD')}`

/** A photo at full size; `id` must be in the album. */
export function openPhoto(id: string): void {
  const s = shots().find((x) => x.id === id)!
  const remove = openFrame(
    div(
      'ui-photo fC',
      img('photoImg', photoUrl(id)),
      div(
        'photoBar fc',
        div('f1', caption(s)),
        button('photoClose fcc', () => remove(), '×'),
      ),
    ),
  )
}

/** Every photo brought back, newest first. */
export function albumView(): HTMLElement {
  const list = shots().reverse()
  const items = list.map((s) => button('albumItem fC', () => openPhoto(s.id), img('albumImg', photoUrl(s.id)), div('albumCap', caption(s))))
  return div(
    'album fC',
    div('albumTip', `已收集 ${list.length} / ${PHOTOS.length} 张旅行照片，点击照片查看大图`),
    items.length ? div('albumGrid f1 h0', ...items) : div('albumEmpty f1 fcc', '还没有照片哦，让宠物去旅行吧~'),
  )
}
