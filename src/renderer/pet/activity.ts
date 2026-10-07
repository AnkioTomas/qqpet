import { refreshTray, setActivity } from './store'

type Key = 'work' | 'study' | 'trip'

interface Task {
  key: Key
  minutes: number
  /** Asked every tick with the minutes done; true ends the task right away. */
  early?: (done: number) => boolean
  end: (early: boolean) => void
}

// Work, study and travel exclude each other, so one slot is enough. Like the
// original, a running task does not survive a restart.
let task: (Task & { done: number }) | null = null

export const elapsed = (): number => task?.done ?? 0

/** Starts a task; `value` is what activeOption shows (job id, city). */
export function startTask(t: Task, value: string): void {
  task = { ...t, done: 0 }
  setActivity(t.key, value)
  refreshTray()
}

/** Drops the running task without its end; returns its key. */
export function stopTask(): Key | null {
  if (!task) return null
  const { key } = task
  task = null
  setActivity(key, null)
  refreshTray()
  return key
}

/** Counts growing minutes; ends the task when it is due or ends early. */
export function advanceTask(minutes: number): void {
  if (!task) return
  const t = task
  t.done = Math.min(t.done + minutes, t.minutes)
  const early = Boolean(t.early?.(t.done))
  if (!early && t.done < t.minutes) return
  stopTask()
  t.end(early)
}
