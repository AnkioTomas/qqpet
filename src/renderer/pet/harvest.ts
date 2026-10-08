import { farmNews, openFarm } from '../ui/farm'
import { openFishing } from '../ui/fishing'
import { ripeFish } from './fishing'

/** Between two reminders, so a pet that keeps finding things does not nag. */
const QUIET = 30 * 60_000

/** What the pet has told already: only more ripe plots, disasters or fish are news. */
let told = { ripe: 0, pests: 0, fish: 0 }
let last = -QUIET

/** Ripe crops, crop disasters and ripe fish noticed since the last reminder, and where to go; null if nothing new or too soon. */
export async function harvestNews(): Promise<{ s: string; ok: () => void } | null> {
  // An open farm hides nothing new: keep what was told.
  const seen = { ...((await farmNews()) ?? told), fish: ripeFish() }
  const news = seen.ripe > told.ripe || seen.pests > told.pests || seen.fish > told.fish
  if (news && Date.now() - last < QUIET) return null
  told = seen
  if (!news) return null
  last = Date.now()
  const parts = [
    seen.ripe && `农场有${seen.ripe}块地的庄稼熟了`,
    seen.pests && `农场里${seen.pests}块地长草、生虫或者干旱了，再不管要减产啦`,
    seen.fish && `鱼塘里有${seen.fish}条鱼可以收了`,
  ].filter(Boolean)
  return { s: `[host]，${parts.join('，')}~`, ok: seen.ripe || seen.pests ? openFarm : openFishing }
}
