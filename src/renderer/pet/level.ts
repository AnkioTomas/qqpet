export type Stage = 'Egg' | 'Kid' | 'Adult'

/** Growth needed to leave level n (the original's getLevelRequirement). */
const need = (n: number): number => 100 * n + (25 * n * (n + 1) * (2 * n + 1)) / 6

export function levelOf(growth: number): { level: number; upGrowth: number; nextGrowth: number } {
  let level = 1
  while (growth >= need(level)) level++
  return { level, upGrowth: need(level - 1), nextGrowth: need(level) }
}

export const stageOf = (level: number): Stage => (level >= 16 ? 'Adult' : level >= 5 ? 'Kid' : 'Egg')
