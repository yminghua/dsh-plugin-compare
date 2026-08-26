import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { ProofCollector, type CapturedEvent } from './core/index.ts'
import { registerProofApi } from './host/api.ts'
import './host/services.ts'
import './shared/cordis.ts'

export const name = 'dsh-proof'
export const inject = ['connection', 'sessionQuery', 'agents', 'sessions', 'agentPresets']

export interface Config {
  maxRuns?: number
  runTimeoutMs?: number
  checkTimeoutMs?: number
}

export function apply(ctx: Context, _config: Config): void {
  const collector = new ProofCollector()
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    collector.record(String(session.id), event as CapturedEvent)
  })
  registerProofApi(ctx, {
    maxRuns: positiveInteger(_config.maxRuns, 100),
    runTimeoutMs: positiveInteger(_config.runTimeoutMs, 15 * 60_000),
    checkTimeoutMs: positiveInteger(_config.checkTimeoutMs, 5 * 60_000),
  })
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback
}

export * from './core/index.ts'
