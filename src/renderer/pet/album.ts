import DATA from './data/album.json'
import { rand } from './rand'
import { save, update } from './store'

/** A travel photo: `p` the province it shows ('' for anywhere), `b` with travel buddies (the frog and friends) in it. */
export interface Photo {
  id: string
  p: string
  b: boolean
}
/** A photo the pet brought back: from which trip, and when (unix seconds). */
export interface Shot {
  id: string
  city: string
  d: number
}

export const PHOTOS: Photo[] = DATA
/** Chance that a trip's photo has travel buddies in it. */
const BUDDY = 0.4

export const photoUrl = (id: string): string => `pet/album/${id}.webp`
export const isBuddy = (id: string): boolean => PHOTOS.some((x) => x.id === id && x.b)
/** saveJsonData.album, oldest first. */
export const shots = (): Shot[] => JSON.parse(save.saveJsonData.album || '[]')

/** A new photo from a trip to `city`, kept in the album; null when none is left for it. */
export function takePhoto(city: string): Shot | null {
  const taken = new Set(shots().map((s) => s.id))
  const left = PHOTOS.filter((x) => !taken.has(x.id))
  const b = Math.random() < BUDDY
  // The rolled kind first, then the other; this province's photos before those of anywhere. Another province's never.
  const pool = [b, !b].flatMap((kind) => [city, ''].map((p) => left.filter((x) => x.b === kind && x.p === p))).find((l) => l.length)
  if (!pool) return null
  const shot = { id: pool[rand(0, pool.length - 1)].id, city, d: Math.floor(Date.now() / 1000) }
  update('saveJsonData', { album: JSON.stringify([...shots(), shot]) })
  return shot
}
