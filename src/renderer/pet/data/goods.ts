import type { SelfGoodDatas, SelfGoodUseOption, StudyInfo } from '../../../shared/save'
import GOODS from './goods.json'

export type GoodType = keyof SelfGoodDatas
/** Goods that stay in effect for a while (`useTimeing` minutes). */
export type TimedType = keyof SelfGoodUseOption

export interface Good {
  id: string
  name: string
  type: GoodType
  url: string
  desc?: string
  /** 元宝; -1 is not for sale. */
  price?: number
  needLevel?: number
  /** Pink diamond members only. */
  PD?: boolean
  hunger?: number
  clean?: number
  mood?: number
  intel?: number
  charm?: number
  strong?: number
  /** Extra growth per hour while in effect. */
  group?: number
  /** Minutes the good stays in effect. */
  useTimeing?: number
  /** nums: amount added to petInfo[useId ?? id] per unit. */
  value?: number
  useId?: string
  /** Work and study: minutes it takes. */
  useTime?: number
  /** Work: 元宝 earned, and the levels and stats it requires. */
  yb?: number
  education?: Partial<StudyInfo>
  useArtt?: Partial<Record<'charm' | 'intel' | 'strong', number>>
  /** Study: subject name, lessons before the exam and the studyInfo value the school starts at. */
  object?: string
  tolkName?: string
  classNum?: number
  classNumUp?: number
  /** Count owned (inventory) or 1. */
  num: number
}

const TABLE = GOODS as unknown as Record<GoodType, Record<string, Omit<Good, 'num'>>>

export const goodOf = (type: GoodType, id: string, num = 1): Good => ({
  ...TABLE[type][`_${id}`],
  num,
})

/** Every good of a type, in table order. */
export const allGoods = (type: GoodType): Good[] => Object.values(TABLE[type]).map((g) => ({ ...g, num: 1 }))

/** A good by id alone; ids are unique across types. */
export function findGood(id: string): Good {
  const type = (Object.keys(TABLE) as GoodType[]).find((t) => TABLE[t][`_${id}`])!
  return goodOf(type, id)
}

/** " 魅力+1 智力+2"-style attribute gains, or ''. */
export const attrs = (g: Good): string =>
  (
    [
      ['魅力', g.charm],
      ['智力', g.intel],
      ['武力', g.strong],
      ['心情', g.mood],
    ] as const
  )
    .filter(([, v]) => v)
    .map(([k, v]) => ` ${k}+${v}`)
    .join('')

/** Tooltip lines of a good, as in the original's item panels. */
export function describe(g: Good): string[] {
  if (g.type === 'nums') return [`获得${g.name}*${g.value}`, g.desc ?? '']
  const a = attrs(g)
  const lines = [
    g.desc,
    g.hunger && `饥饿：${g.hunger}`,
    g.clean && `清洁：${g.clean}`,
    a && `属性：${a}`,
    g.group && `成长值：${g.group}`,
    g.useTimeing && `持续时间：${g.useTimeing}分钟`,
  ]
  return lines.filter((l): l is string => Boolean(l))
}

export const TYPE_NAMES: Record<GoodType, string> = {
  food: '食物',
  clean: '日用品',
  medicine: '药品',
  toy: '玩具',
  nums: '功能',
  background: '背景',
  service: '服务',
  work: '工作',
  study: '学习',
  trip: '学习',
}
