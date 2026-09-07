import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { ComparisonCollector, type CapturedEvent } from './core/index.ts'
import { registerComparisonApi } from './host/api.ts'
import './host/services.ts'
import './shared/cordis.ts'

export const name = 'dsh-plugin-compare'
export const inject = ['connection', 'sessionQuery', 'agents', 'sessions', 'agentPresets', 'llm']

export interface Config {
  maxRuns?: number
  runTimeoutMs?: number
  checkTimeoutMs?: number
  maxTrials?: number
}

export function apply(ctx: Context, _config: Config): void {
  const collector = new ComparisonCollector()
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    collector.record(String(session.id), event as CapturedEvent)
  })
  registerComparisonApi(ctx, {
    maxRuns: positiveInteger(_config.maxRuns, 100),
    runTimeoutMs: positiveInteger(_config.runTimeoutMs, 15 * 60_000),
    checkTimeoutMs: positiveInteger(_config.checkTimeoutMs, 5 * 60_000),
    maxTrials: Math.min(positiveInteger(_config.maxTrials, 10), 10),
  })
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback
}

export * from './core/index.ts'
