import type { ControlledProgress, ProgressUpdate } from '../shared/protocol.ts'

// Process-local telemetry only: never stores prompts, output, credentials, or reports.
export class ProgressStore {
  private readonly runs = new Map<string, ControlledProgress>()
  private readonly now: () => number
  constructor(now = Date.now) { this.now = now }

  start(runId: string, trials: number, limits: { runTimeoutMs: number; checkTimeoutMs: number }) {
    this.prune()
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(runId)) throw new Error('Invalid progress runId')
    if (this.runs.has(runId)) throw new Error('Duplicate progress runId')
    if (this.runs.size >= 32) throw new Error('Too many tracked runs; try again later')
    const now = this.now()
    this.runs.set(runId, {
      runId, trials, totalVariants: trials * 2, completedVariants: 0, completedDurationMs: 0,
      phase: 'preparing', startedAt: now, phaseStartedAt: now, updatedAt: now,
      trial: 0, variant: null, presetName: '', events: 0, lastActivityAt: null, ...limits,
    })
    return (update: ProgressUpdate) => {
      const current = this.runs.get(runId)
      if (!current) return
      const now = this.now()
      const phaseChanged = (update.phase !== undefined && update.phase !== current.phase)
        || (update.variant !== undefined && update.variant !== current.variant)
      this.runs.set(runId, {
        ...current, ...update, updatedAt: now, phaseStartedAt: phaseChanged ? now : current.phaseStartedAt,
        completedDurationMs: update.completedVariants !== undefined && update.completedVariants > current.completedVariants
          ? now - current.startedAt : current.completedDurationMs,
      })
    }
  }

  read(runId: string): ControlledProgress | null {
    this.prune()
    const current = this.runs.get(runId)
    return current ? { ...current } : null
  }

  private prune() {
    for (const [id, run] of this.runs) {
      if ((run.phase === 'completed' || run.phase === 'failed') && this.now() - run.updatedAt > 10 * 60_000) this.runs.delete(id)
    }
  }
}
