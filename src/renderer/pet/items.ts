import { floatMood } from '../ui/float'
import { windowView } from '../ui/window-view'
import { goodOf, type Good, type TimedType } from './data/goods'
import { DEAD, illOf } from './data/ills'
import { addGood, hasGood, startTimed, takeGood } from './goods'
import { speak } from './pet'
import { activity, addInfo, info, save, setInfo } from './store'

/** Deducts 元宝; on shortage shows the original's alert and returns false. */
export function pay(price: number): boolean {
  if (info.yb < price) {
    windowView({ msg: '抱歉您的余额不足' })
    return false
  }
  setInfo('yb', info.yb - price)
  return true
}

/** Stat effects of a good; eating and cleaning come with `extra` mood. */
function apply(g: Good, extra = 0): void {
  const c = save.petComputedlInfo
  if (g.hunger) setInfo('hunger', Math.min(info.hunger + g.hunger, c.hungerMax))
  if (g.clean) setInfo('clean', Math.min(info.clean + g.clean, c.cleanMax))
  const mood = (g.mood ?? 0) + extra
  if (mood) {
    void floatMood(mood)
    setInfo('mood', Math.min(info.mood + mood, c.moodMax))
  }
  if (g.intel) addInfo('intel', g.intel)
  if (g.charm) addInfo('charm', g.charm)
  if (g.strong) addInfo('strong', g.strong)
}

/** Dialog category, pet action and bonus mood per everyday good type. */
const DAILY: Record<TimedType, { c: string; action: string; extra: number }> = {
  food: { c: 'eat', action: 'eat', extra: 20 },
  clean: { c: 'clean', action: 'clean', extra: 20 },
  toy: { c: 'toy', action: 'speak', extra: 0 },
  background: { c: 'pay', action: 'speak', extra: 0 },
}

/**
 * Uses one of a good. `free` skips the inventory (the doctor already charged
 * for it). The good is taken when its animation starts, so a use that is
 * preempted costs nothing.
 */
export function useItem(g: Good, free = false): void {
  if (g.type !== 'medicine' && info.health === 0) return speak({ c: 'state', s: 'die' })
  if (!free && !hasGood(g.type, g.id)) return
  const take = (): boolean => takeGood(g) || free

  if (g.type === 'nums') {
    const key = (g.useId ?? g.id) as 'yb' | 'growth' | 'health'
    return windowView({
      title: `使用-${g.name}`,
      msg: '选择使用数量',
      goods: [g],
      max: g.num,
      ok: (close, n) => {
        if (takeGood(g, n)) setInfo(key, Math.max(info[key] + n * g.value!, 0))
        close()
      },
    })
  }
  if (g.type === 'medicine') return medicine(g, take)

  const d = DAILY[g.type as TimedType]
  speak({ c: d.c, s: g.type, now: true }, d.action, {
    start: () => {
      if (!take()) return
      if (g.useTimeing) startTimed(g as Good & { type: TimedType })
      apply(g, d.extra)
    },
  })
}

function medicine(g: Good, take: () => boolean): void {
  if (g.id === DEAD.cure.id) {
    const revive = (): void => {
      if (!take()) return
      apply(g)
      setInfo('health', 5)
    }
    if (info.health === 0) return revive()
    return windowView({
      title: '使用还魂丹？',
      msg: '您的宠物未死亡，确定需要使用还魂丹进行治疗?',
      goods: [g],
      ok: (close) => {
        speak({ s: '[host],向天再借100年！~', now: true }, 'cure')
        revive()
        close()
      },
    })
  }
  if (info.health === 5) return speak({ s: '[host],我不需要吃药哦~', now: true }, 'speak')
  if (info.health === 0) return speak({ s: '[host]，这个不能让我复活哦~' })

  const ill = illOf(activity('ill')! + info.health)
  const right = g.id === ill.cure.id
  const effect = (): void => {
    if (!take()) return
    setInfo('health', right ? 5 : info.health - 1)
    apply(g)
  }
  // The right cure heals as the animation starts; a wrong one hurts when it ends.
  speak({ s: right ? ill.successTolk : ill.errTolk, now: true }, 'cure', right ? { start: effect } : { end: effect })
}

/** Unit price; pink diamond members get 20% off. */
export const price = (g: Good): number => g.price! * (info.pinkDiamond ? 0.8 : 1)

/** Buys n of a good; `quiet` skips the thank-you line (cart checkout). */
export function buy(g: Good, n = 1, quiet = false): boolean {
  if (g.needLevel && save.petComputedlInfo.level < g.needLevel) {
    speak({ s: '[host],我现在没到购买年龄哦~~' }, 'speak')
    return false
  }
  if (g.PD && !info.pinkDiamond) {
    speak({ s: '[host],你要帮我开通粉钻贵族才能购买哦~~' }, 'speak')
    return false
  }
  if (!pay(price(g) * n)) return false
  addGood(g.type, g.id, n)
  if (!quiet) speak({ c: 'pay', s: g.type, now: true }, 'speak')
  return true
}

/** The doctor: a consultation by health, then the cure, from the inventory or bought on the spot (price +20%). */
export function doctor(): void {
  const line = activity('ill')
  if (!line) return speak({ s: '[host],我不需要看病的~', now: true }, 'speak')
  if (info.health === 0) return prescribe(goodOf('medicine', DEAD.cure.id), '您的宠物已经死亡，需要使用')
  const fee = (5 - info.health) * 10
  windowView({
    title: '看病',
    msg: `当前需要花费${fee}元宝，点击确认进行看病~`,
    ok: () => {
      if (!pay(fee)) return
      const ill = illOf(line + info.health)
      prescribe(goodOf('medicine', ill.cure.id), `您的宠物患上了${ill.name}， 需要使用`)
    },
  })
}

function prescribe(g: Good, diagnosis: string): void {
  const owned = hasGood('medicine', g.id)
  const cost = (g.price || 50) * 1.2
  windowView({
    title: '诊断结果',
    msg: diagnosis + g.name + (owned ? ',进行治疗，点击确认即可快速治疗~' : `,点击确认花费${cost}元宝进行治疗`),
    goods: [g],
    ok: (close) => {
      if (!owned && !pay(cost)) return
      useItem(g, !owned)
      close()
    },
  })
}
