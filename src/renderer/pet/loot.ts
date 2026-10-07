import { parseGood, type Good } from './data/goods'
import POOLS from './data/pool.json'

/** Chance of an epic (pool 0), heirloom (1) or rare (2) good. */
const WEIGHTS = [0.02, 0.25, 0.75]

function draw(pool: number | null): string {
  if (pool === null) {
    let r = Math.random()
    pool = WEIGHTS.findIndex((w) => (r -= w) <= 0)
  }
  const list = POOLS[pool]
  return list[Math.floor(Math.random() * list.length)]
}

/** n random goods from `pool`, or each from a pool picked by WEIGHTS (the original's Pt). */
export function loot(n: number, pool: number | null = null): Good[] {
  return Array.from({ length: n }, () => parseGood(draw(pool)))
}
