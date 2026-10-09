import type { PetSwf } from '../swf/pet-swf'
import { route, type PoseOpt, type Target } from './router'
import { applyEdge, info, mood, stage } from './store'

export interface Pose {
  /** Action name, see router. */
  a: string
  /** Explicit animation instead of the routed one. */
  opt?: Target
  /** Runs when this pose starts playing. */
  s?: () => void
  /** Runs when the pose after this one starts. */
  e?: () => void
}

/** At health 1 everything except these turns into the dying animation. */
const DYING_ALLOWED = ['cure', 'die', 'revival', 'hide', 'appear', 'enter']

/**
 * Pose sequencer, polled at the SWF frame rate like the original. A pose ends
 * on its last frame; single-frame poses (Stand, Die) and "normal" hold until
 * something is queued. `play` preempts and clears the queue, `add` appends.
 */
export class Machine {
  pose: Pose = { a: 'enter' }
  private poseOpt: PoseOpt | undefined
  private queue: Pose[] = []
  private next: Pose | null = null
  private changing = false

  constructor(
    private swf: PetSwf,
    private onChange: (over: Pose, next: Pose) => void,
  ) {}

  start(): void {
    setInterval(() => this.tick(), 1000 / 12)
  }

  add(p: Pose): void {
    // Peek SWFs only draw a sliver. A queued play/speak is a full-body clip in the same box.
    if (this.pose.a === 'hideleft' || this.pose.a === 'hideright') return
    this.queue.push(p)
  }

  play(p: Pose): void {
    this.next = p
  }

  private tick(): void {
    const f = this.swf.front
    const last = f.totalFrames - 1
    const freezeAt = this.poseOpt?.overCurrentFrame
    if (freezeAt && f.currentFrame >= freezeAt && f.isPlaying) f.stop()
    if (this.changing) return
    const hold = this.pose.a === 'normal' || this.pose.a === 'hideleft' || this.pose.a === 'hideright' || this.pose.a === 'drag' || this.pose.a === 'walk'
    const holding = (hold && !this.queue.length) || f.currentFrame !== last || (last === 0 && !this.queue.length)
    if (!this.next && holding) return

    const p = this.next ?? this.queue.shift() ?? { a: applyEdge() ?? 'normal' }
    if (info.health === 1 && !DYING_ALLOWED.includes(p.a)) p.a = 'dying'
    if (this.poseOpt?.afterState && !this.poseOpt.afterState.includes(p.a)) return
    if (this.next) this.queue = []
    this.next = null
    this.changing = true

    const target = p.opt ?? route(info.sex, stage(), p.a, mood())
    this.poseOpt = target.opt.opt
    void this.swf.load(target.url).then(() => {
      const over = this.pose
      this.pose = p
      this.changing = false
      this.onChange(over, p)
    }).catch(() => {
      this.changing = false
      if (p.a !== 'normal') this.next = { a: 'normal' }
    })
  }
}
